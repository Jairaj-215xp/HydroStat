import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, updateProfile, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const btnSaveProfile = document.getElementById('btn-save-profile');
const profileError = document.getElementById('profile-error');
const profileSuccess = document.getElementById('profile-success');

const inputName = document.getElementById('profile-name');
const inputUsername = document.getElementById('profile-username');
const inputDisplay = document.getElementById('profile-display');
const inputBio = document.getElementById('profile-bio');
const inputUniversity = document.getElementById('profile-university');
const inputFieldStudy = document.getElementById('profile-field-study');

let activeUser = null;

// Listen for auth state and pre-populate fields if user already has data
onAuthStateChanged(auth, async (user) => {
    if (user) {
        activeUser = user;
        
        // Pre-fill name and display name from auth if inputs are empty
        if (user.displayName) {
            if (!inputName.value) inputName.value = user.displayName;
            if (!inputDisplay.value) inputDisplay.value = user.displayName;
        }

        // Try to fetch existing document if any
        try {
            const token = await user.getIdToken();
            const docUrl = `https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents/users/${user.uid}`;
            const res = await fetch(docUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                const f = data.fields || {};
                if (f.name?.stringValue && !inputName.value) inputName.value = f.name.stringValue;
                if (f.username?.stringValue && !inputUsername.value) inputUsername.value = f.username.stringValue;
                if (f.displayName?.stringValue && !inputDisplay.value) inputDisplay.value = f.displayName.stringValue;
                if (f.bio?.stringValue && !inputBio.value) inputBio.value = f.bio.stringValue;
                if (f.university?.stringValue && !inputUniversity.value) inputUniversity.value = f.university.stringValue;
                if (f.fieldStudy?.stringValue && !inputFieldStudy.value) inputFieldStudy.value = f.fieldStudy.stringValue;
            }
        } catch (e) {
            console.warn("Could not pre-fetch profile:", e);
        }
    } else {
        // Not logged in, redirect to home
        window.location.href = 'index.html';
    }
});

// Allow pressing Enter in inputs to submit
[inputName, inputUsername, inputDisplay, inputUniversity, inputFieldStudy].forEach(el => {
    if (el) {
        el.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                btnSaveProfile.click();
            }
        });
    }
});

btnSaveProfile.addEventListener('click', async () => {
    const user = auth.currentUser || activeUser;
    if (!user) {
        showError("Your session expired. Please return to the homepage and log in.");
        return;
    }

    const name = inputName.value.trim();
    const rawUsername = inputUsername.value.trim();
    const displayName = inputDisplay.value.trim();
    const bio = inputBio.value.trim();
    const university = inputUniversity.value.trim();
    const fieldStudy = inputFieldStudy.value.trim();

    // 1. Basic Validation
    if (!name || !rawUsername || !displayName) {
        showError("Please fill out all required fields (Full Name, Unique Username, and Display Name).");
        return;
    }

    // Clean username: lowercase letters, numbers, and underscores
    const cleanUsername = rawUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3) {
        showError("Username must be at least 3 characters and contain only letters, numbers, or underscores.");
        return;
    }

    try {
        btnSaveProfile.disabled = true;
        profileError.style.display = 'none';
        btnSaveProfile.innerText = "Checking username...";

        // Force refresh user session to guarantee fresh tokens and claims
        await user.reload().catch(() => {});
        const freshToken = await user.getIdToken(true);

        // 2. Index-free Unique Username Check
        try {
            const queryUrl = 'https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents:runQuery';
            const queryPayload = {
                structuredQuery: {
                    from: [{ collectionId: "users" }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: "username" },
                            op: "EQUAL",
                            value: { stringValue: cleanUsername }
                        }
                    },
                    limit: 1
                }
            };

            const queryRes = await fetch(queryUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${freshToken}`
                },
                body: JSON.stringify(queryPayload)
            });

            if (queryRes.ok) {
                const queryData = await queryRes.json();
                if (Array.isArray(queryData) && queryData.length > 0 && queryData[0].document) {
                    const existingDocName = queryData[0].document.name || '';
                    if (!existingDocName.endsWith(`/${user.uid}`)) {
                        showError("That username is already taken. Please choose another one.");
                        resetButton();
                        return;
                    }
                }
            }
        } catch (qErr) {
            console.warn("Notice: username query check:", qErr);
            // Non-blocking fallback if query index is unavailable
        }

        // 3. Save / Upsert Profile using Multi-Tier Strategy
        btnSaveProfile.innerText = "Saving Profile...";

        const profileData = {
            name: name,
            username: cleanUsername,
            displayName: displayName,
            bio: bio || '',
            university: university || '',
            fieldStudy: fieldStudy || '',
            email: user.email || '',
            followers: [],
            following: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        let savedSuccessfully = false;
        let lastError = null;

        // Tier 1: Official Firestore SDK setDoc with merge (Native rules & type handling)
        try {
            await setDoc(doc(db, "users", user.uid), profileData, { merge: true });
            savedSuccessfully = true;
        } catch (sdkError) {
            console.warn("Firestore SDK save attempt:", sdkError);
            lastError = sdkError;
        }

        // Tier 2: Firestore REST API (Proper POST create for new docs, PATCH for existing)
        if (!savedSuccessfully) {
            try {
                const restPayload = {
                    fields: {
                        name: { stringValue: name },
                        username: { stringValue: cleanUsername },
                        displayName: { stringValue: displayName },
                        bio: { stringValue: bio || '' },
                        university: { stringValue: university || '' },
                        fieldStudy: { stringValue: fieldStudy || '' },
                        email: { stringValue: user.email || '' },
                        followers: { arrayValue: { values: [] } },
                        following: { arrayValue: { values: [] } },
                        createdAt: { timestampValue: profileData.createdAt },
                        updatedAt: { timestampValue: profileData.updatedAt }
                    }
                };

                const docCheckUrl = `https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents/users/${user.uid}`;
                const checkRes = await fetch(docCheckUrl, { headers: { 'Authorization': `Bearer ${freshToken}` } });

                let saveRes;
                if (!checkRes.ok) {
                    // Document does NOT exist -> POST ?documentId= creates it under allow create: rule
                    const createUrl = `https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents/users?documentId=${user.uid}`;
                    saveRes = await fetch(createUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${freshToken}`
                        },
                        body: JSON.stringify(restPayload)
                    });

                    // If concurrent creation occurred (409 Conflict), fallback to PATCH
                    if (saveRes.status === 409) {
                        const maskPaths = Object.keys(profileData).map(f => `updateMask.fieldPaths=${f}`).join('&');
                        saveRes = await fetch(`${docCheckUrl}?${maskPaths}`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${freshToken}`
                            },
                            body: JSON.stringify(restPayload)
                        });
                    }
                } else {
                    // Document already exists -> PATCH updates it under allow update: rule
                    const maskPaths = Object.keys(profileData).map(f => `updateMask.fieldPaths=${f}`).join('&');
                    saveRes = await fetch(`${docCheckUrl}?${maskPaths}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${freshToken}`
                        },
                        body: JSON.stringify(restPayload)
                    });
                }

                if (saveRes.ok) {
                    savedSuccessfully = true;
                } else {
                    const errData = await saveRes.json().catch(() => null);
                    const errMsg = errData?.error?.message || `Server returned status ${saveRes.status}`;
                    lastError = new Error(errMsg);
                }
            } catch (restErr) {
                console.warn("REST API fallback:", restErr);
                lastError = restErr;
            }
        }

        if (!savedSuccessfully) {
            // Check if failure is due to unverified email
            if (!user.emailVerified && user.providerData?.some(p => p.providerId === 'password')) {
                showVerificationRequired(user);
                resetButton();
                return;
            }
            throw lastError || new Error("Failed to save profile. Please check your network connection.");
        }

        // Update Firebase Auth displayName
        try {
            await updateProfile(user, { displayName: displayName });
        } catch (authErr) {
            console.warn("Could not update auth displayName:", authErr);
        }

        // 4. Non-blocking Welcome Email via EmailJS
        if (typeof emailjs !== 'undefined' && user.email) {
            emailjs.send("service_v451am9", "template_2tqkyjz", {
                to_email: user.email,
                to_name: name,
                display_name: displayName,
                username: cleanUsername
            }).catch(emailErr => console.warn("EmailJS notice:", emailErr));
        }

        // 5. Success Feedback & Redirect
        profileSuccess.innerText = "Profile successfully created! Redirecting to HydroStat...";
        profileSuccess.style.display = 'block';

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1200);

    } catch (error) {
        console.error("Profile Setup Error:", error);
        showError(error.message || "Failed to save profile. Please try again.");
        resetButton();
    }
});

function showError(msg) {
    if (typeof msg === 'string' && (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("insufficient"))) {
        profileError.innerHTML = `
            <div style="line-height: 1.5; font-size: 0.9rem;">
                <strong>Permission Denied by Firebase:</strong><br>
                The database security rules in your Firebase project (<code>hydrohub-215</code>) are currently blocking profile creation.<br>
                Please paste and publish the contents of <code>firestore.rules</code> into your 
                <a href="https://console.firebase.google.com/project/hydrohub-215/firestore/rules" target="_blank" rel="noopener noreferrer" style="color: var(--accent-cyan); text-decoration: underline; font-weight: bold;">
                    Firebase Console Rules Tab
                </a>.
            </div>
        `;
    } else {
        profileError.innerText = msg;
    }
    profileError.style.display = 'block';
    profileSuccess.style.display = 'none';
}

function showVerificationRequired(user) {
    profileError.innerHTML = `
        <div style="line-height: 1.5;">
            <strong>Email Verification Required:</strong><br>
            Please check your inbox (<strong>${user.email}</strong>) and click the verification link before completing your profile.<br>
            <button id="btn-resend-verification" class="btn btn-outline" style="margin-top: 0.8rem; font-size: 0.85rem; padding: 0.4rem 0.8rem; cursor: pointer;">
                Resend Verification Email
            </button>
            <span id="resend-status" style="margin-left: 0.5rem; font-size: 0.85rem; color: var(--accent-cyan);"></span>
        </div>
    `;
    profileError.style.display = 'block';
    profileSuccess.style.display = 'none';

    const btnResend = document.getElementById('btn-resend-verification');
    if (btnResend) {
        btnResend.addEventListener('click', async (e) => {
            e.preventDefault();
            btnResend.disabled = true;
            btnResend.innerText = "Sending...";
            try {
                await sendEmailVerification(user);
                document.getElementById('resend-status').innerText = "Email sent! Check your inbox.";
            } catch (err) {
                document.getElementById('resend-status').innerText = "Could not resend: " + (err.message || "Try again later");
            }
        });
    }
}

function resetButton() {
    btnSaveProfile.disabled = false;
    btnSaveProfile.innerText = "Complete Setup";
}

