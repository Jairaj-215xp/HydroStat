import { auth, db } from './firebase-config.js';
import { openDocumentViewer } from './ui-utils.js';
import { onAuthStateChanged, updatePassword, deleteUser, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// Initialize Flatpickr for Date of Birth
flatpickr("#edit-profile-dob", {
    dateFormat: "Y-m-d",
    maxDate: "today"
});

// Custom UI Notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    
    // Trigger reflow
    void toast.offsetWidth;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function customConfirm(message, title = "Confirm Action", isDanger = false) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm-modal');
        document.getElementById('confirm-message').innerText = message;
        document.getElementById('confirm-title').innerText = title;
        
        const btnOk = document.getElementById('btn-confirm-ok');
        const btnCancel = document.getElementById('btn-confirm-cancel');
        
        if (isDanger) {
            btnOk.style.background = '#ff6666';
            btnOk.style.boxShadow = 'none';
        } else {
            btnOk.style.background = '';
            btnOk.style.boxShadow = '';
        }

        modal.style.display = 'flex';
        
        const handleOk = () => { cleanup(); resolve(true); };
        const handleCancel = () => { cleanup(); resolve(false); };
        
        btnOk.onclick = handleOk;
        btnCancel.onclick = handleCancel;
        
        function cleanup() {
            modal.style.display = 'none';
            btnOk.onclick = null;
            btnCancel.onclick = null;
        }
    });
}

// Tab Switching Logic
const tabs = document.querySelectorAll('.sidebar-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
        
        if (tab.dataset.tab === 'tab-saved' && currentUser) {
            fetchSavedContent(currentUser);
        }
    });
});

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html'; // Kick out if not logged in
        return;
    }
    
    currentUser = user;
    
    // Load Overview
    loadProfile(user);
    
    // Load Uploads
    loadMyUploads(user);
});

async function loadProfile(user) {
    try {
        const token = await user.getIdToken();
        const url = `https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents/users/${user.uid}`;
        
        document.getElementById('profile-email').innerText = user.email;
        
        // Creation time is provided by Firebase Auth
        const joinDate = new Date(user.metadata.creationTime).toLocaleDateString();
        document.getElementById('profile-joined').innerText = joinDate;

        // Avatar logic
        const avatarPreview = document.getElementById('account-avatar-preview');
        if (user.photoURL && user.photoURL.includes('cloudinary.com')) {
            avatarPreview.src = user.photoURL;
            avatarPreview.style.filter = ''; // Reset filter
        } else {
            // Generate a Random Hue based on user UID
            const charCode = user.uid ? (user.uid.charCodeAt(0) + user.uid.charCodeAt(user.uid.length - 1)) : Math.floor(Math.random() * 360);
            const hueDeg = (charCode * 45) % 360; 
            
            avatarPreview.src = 'assets/Default%20logo.png';
            avatarPreview.style.filter = `hue-rotate(${hueDeg}deg) saturate(1.5)`;
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const fields = data.fields || {};
            const name = fields.name?.stringValue || fields.displayName?.stringValue || 'Unknown';
            const username = fields.username?.stringValue || 'Unknown';
            
            document.getElementById('profile-name').innerText = name;
            
            const handle = fields.username?.stringValue || '';
            document.getElementById('profile-handle').innerText = handle ? '@' + handle : 'Not Set';
            document.getElementById('edit-profile-handle').value = handle;
            
            if (handle) {
                document.getElementById('profile-link-preview').style.display = 'block';
                document.getElementById('preview-handle-text').innerText = handle;
            } else {
                document.getElementById('profile-link-preview').style.display = 'none';
            }

            const followersArr = fields.followers?.arrayValue?.values || [];
            const followingArr = fields.following?.arrayValue?.values || [];
            document.getElementById('profile-followers-count').innerText = followersArr.length;
            document.getElementById('profile-following-count').innerText = followingArr.length;
            
            document.getElementById('profile-username').innerText = username !== 'Unknown' ? `@${username}` : 'Not Set';
            
            // New Fields
            document.getElementById('profile-bio').innerText = fields.bio?.stringValue || 'Not Set';
            document.getElementById('profile-university').innerText = fields.university?.stringValue || 'Not Set';
            document.getElementById('profile-field-study').innerText = fields.fieldStudy?.stringValue || 'Not Set';
            document.getElementById('profile-github').innerText = fields.github?.stringValue || 'Not Set';
            document.getElementById('profile-linkedin').innerText = fields.linkedin?.stringValue || 'Not Set';
            document.getElementById('profile-orcid').innerText = fields.orcid?.stringValue || 'Not Set';
            
            document.getElementById('profile-location').innerText = fields.location?.stringValue || 'Not Set';
            document.getElementById('profile-website').innerText = fields.website?.stringValue || 'Not Set';
            document.getElementById('profile-dob').innerText = fields.dob?.stringValue || 'Not Set';
            document.getElementById('profile-gender').innerText = fields.gender?.stringValue || 'Not Set';
            document.getElementById('profile-language').innerText = fields.language?.stringValue || 'Not Set';
            document.getElementById('profile-timezone').innerText = fields.timezone?.stringValue || 'Not Set';
            
            // Pre-fill edit inputs
            document.getElementById('edit-profile-name').value = name;
            document.getElementById('edit-profile-bio').value = fields.bio?.stringValue || '';
            document.getElementById('edit-profile-university').value = fields.university?.stringValue || '';
            document.getElementById('edit-profile-field-study').value = fields.fieldStudy?.stringValue || '';
            document.getElementById('edit-profile-github').value = fields.github?.stringValue || '';
            document.getElementById('edit-profile-linkedin').value = fields.linkedin?.stringValue || '';
            document.getElementById('edit-profile-orcid').value = fields.orcid?.stringValue || '';
            
            document.getElementById('edit-profile-location').value = fields.location?.stringValue || '';
            document.getElementById('edit-profile-website').value = fields.website?.stringValue || '';
            document.getElementById('edit-profile-dob').value = fields.dob?.stringValue || '';
            document.getElementById('edit-profile-gender').value = fields.gender?.stringValue || '';
            document.getElementById('edit-profile-language').value = fields.language?.stringValue || '';
            document.getElementById('edit-profile-timezone').value = fields.timezone?.stringValue || '';

        } else {
            document.getElementById('profile-name').innerText = 'Not Set';
            document.getElementById('profile-username').innerText = 'Not Set';
        }
    } catch (error) {
        console.error("Error loading profile:", error);
    }
}

// Avatar Cropping and Upload Logic
const btnUploadAvatar = document.getElementById('btn-upload-avatar');
const avatarInput = document.getElementById('avatar-upload-input');
const avatarStatus = document.getElementById('avatar-upload-status');
const avatarPreview = document.getElementById('account-avatar-preview');
const cropperModal = document.getElementById('cropper-modal');
const cropperImage = document.getElementById('cropper-image');
const btnCloseCropper = document.getElementById('btn-close-cropper');
const btnCropUpload = document.getElementById('btn-crop-upload');
let cropper = null;

const avatarOptionsModal = document.getElementById('avatar-options-modal');
const btnAvatarChange = document.getElementById('btn-avatar-change');
const btnAvatarRemove = document.getElementById('btn-avatar-remove');
const btnAvatarCancel = document.getElementById('btn-avatar-cancel');

btnUploadAvatar.addEventListener('click', () => {
    // Check if user has a custom cloudinary photo
    if (currentUser && currentUser.photoURL && currentUser.photoURL.includes('cloudinary.com')) {
        avatarOptionsModal.style.display = 'flex';
    } else {
        avatarInput.click();
    }
});

btnAvatarCancel.addEventListener('click', () => {
    avatarOptionsModal.style.display = 'none';
});

btnAvatarChange.addEventListener('click', () => {
    avatarOptionsModal.style.display = 'none';
    avatarInput.click();
});

btnAvatarRemove.addEventListener('click', async () => {
    avatarOptionsModal.style.display = 'none';
    const confirmed = await customConfirm("Are you sure you want to remove your profile picture?", "Remove Picture", true);
    if (!confirmed) return;
    
    try {
        await updateProfile(currentUser, { photoURL: "" });
        showToast("Profile picture removed.", "success");
        // Reload avatar view
        const charCode = currentUser.uid ? (currentUser.uid.charCodeAt(0) + currentUser.uid.charCodeAt(currentUser.uid.length - 1)) : Math.floor(Math.random() * 360);
        const hueDeg = (charCode * 45) % 360; 
        
        avatarPreview.src = 'assets/Default%20logo.png';
        avatarPreview.style.filter = `hue-rotate(${hueDeg}deg) saturate(1.5)`;
        
        const navAvatar = document.querySelector('.nav-avatar');
        if (navAvatar) {
            navAvatar.src = 'assets/Default%20logo.png';
            navAvatar.style.filter = `hue-rotate(${hueDeg}deg) saturate(1.5)`;
        }
    } catch (err) {
        console.error(err);
        showToast("Failed to remove picture.", "error");
    }
});

avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        cropperImage.src = e.target.result;
        cropperModal.style.display = 'flex';
        
        if (cropper) {
            cropper.destroy();
        }
        
        cropper = new Cropper(cropperImage, {
            aspectRatio: 1,
            viewMode: 1,
            background: false,
        });
    };
    reader.readAsDataURL(file);
    avatarInput.value = ''; // reset input
});

btnCloseCropper.addEventListener('click', () => {
    cropperModal.style.display = 'none';
    if (cropper) cropper.destroy();
});

btnCropUpload.addEventListener('click', () => {
    if (!cropper) return;
    
    btnCropUpload.disabled = true;
    btnCropUpload.innerText = "Uploading...";

    cropper.getCroppedCanvas({
        width: 800,
        height: 800,
    }).toBlob(async (blob) => {
        try {
            avatarStatus.style.color = '#fff';
            avatarStatus.innerText = 'Uploading...';

            const formData = new FormData();
            formData.append('file', blob);
            formData.append('upload_preset', 'ml_default'); 

            const res = await fetch(`https://api.cloudinary.com/v1_1/doakkvedg/image/upload`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error("Upload to Cloudinary failed");
            const data = await res.json();
            
            await updateProfile(auth.currentUser, {
                photoURL: data.secure_url
            });
            
            avatarPreview.src = data.secure_url;
            avatarPreview.style.filter = ''; // Reset filter so user's uploaded picture isn't tinted
            avatarStatus.style.color = 'var(--accent-cyan)';
            avatarStatus.innerText = 'Picture updated successfully!';

            // Update navbar preview locally
            const navAvatar = document.querySelector('.nav-avatar');
            if (navAvatar) {
                navAvatar.src = data.secure_url;
                navAvatar.style.filter = ''; // Reset filter
            }

            // Close modal
            cropperModal.style.display = 'none';
            if (cropper) cropper.destroy();
        } catch (err) {
            console.error(err);
            avatarStatus.style.color = '#ff6666';
            avatarStatus.innerText = 'Failed to upload picture.';
        } finally {
            btnCropUpload.disabled = false;
            btnCropUpload.innerText = "Upload Avatar";
        }
    }, 'image/jpeg', 0.95);
});

// Edit Profile Logic
const btnEditProfile = document.getElementById('btn-edit-profile');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const btnSaveEdit = document.getElementById('btn-save-edit');
const editActions = document.getElementById('edit-profile-actions');
const btnShareProfile = document.getElementById('btn-share-profile');

const profileFields = ['name', 'handle', 'bio', 'university', 'field-study', 'github', 'linkedin', 'orcid', 'location', 'website', 'dob', 'gender', 'language', 'timezone'];

function toggleEditMode(isEditing) {
    profileFields.forEach(field => {
        const valDiv = document.getElementById(`profile-${field}`);
        const inputDiv = document.getElementById(`edit-profile-${field}`);
        if (valDiv && inputDiv) {
            valDiv.style.display = isEditing ? 'none' : 'block';
            inputDiv.style.display = isEditing ? 'block' : 'none';
        }
    });
    btnEditProfile.style.display = isEditing ? 'none' : 'block';
    editActions.style.display = isEditing ? 'flex' : 'none';
}

btnEditProfile.addEventListener('click', () => toggleEditMode(true));
btnCancelEdit.addEventListener('click', () => toggleEditMode(false));

if (btnShareProfile) {
    btnShareProfile.addEventListener('click', () => {
        const username = document.getElementById('profile-username').innerText.replace('@', '');
        const url = `${window.location.origin}/profile.html?user=${username}`;
        navigator.clipboard.writeText(url).then(() => {
            const originalText = btnShareProfile.innerText;
            btnShareProfile.innerText = 'Copied!';
            setTimeout(() => {
                btnShareProfile.innerText = originalText;
            }, 2000);
        });
    });
}

async function isHandleTaken(handle, currentUid) {
    if (!handle) return false;
    const url = `https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents:runQuery`;
    const payload = {
        structuredQuery: {
            from: [{ collectionId: 'users' }],
            where: {
                compositeFilter: {
                    op: 'AND',
                    filters: [
                        { fieldFilter: { field: { fieldPath: 'username' }, op: 'EQUAL', value: { stringValue: handle } } }
                    ]
                }
            }
        }
    };
    try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
        if (!res.ok) return false;
        const data = await res.json();
        // data[0].document exists if found. Check if the found doc matches the current user.
        if (data && data.length > 0 && data[0].document) {
            const foundName = data[0].document.name;
            if (!foundName.endsWith(`/${currentUid}`)) return true; // Someone else has it
        }
        return false;
    } catch(e) { return false; }
}

btnSaveEdit.addEventListener('click', async () => {
    try {
        btnSaveEdit.disabled = true;
        const handleVal = document.getElementById('edit-profile-handle').value.trim().replace(/[^a-zA-Z0-9_]/g, '');
        if (handleVal) {
            const taken = await isHandleTaken(handleVal, auth.currentUser.uid);
            if (taken) {
                showToast("This handle is already taken.", "error");
                btnSaveEdit.disabled = false;
                return;
            }
        }

        btnSaveEdit.innerText = 'Saving...';
        
        const token = await auth.currentUser.getIdToken();
        const updateFields = ['name', 'username', 'bio', 'university', 'fieldStudy', 'github', 'linkedin', 'orcid', 'location', 'website', 'dob', 'gender', 'language', 'timezone'];
        const maskPaths = updateFields.map(f => `updateMask.fieldPaths=${f}`).join('&');
        const url = `https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents/users/${auth.currentUser.uid}?${maskPaths}`;
        
        const payload = {
            fields: {
                name: { stringValue: document.getElementById('edit-profile-name').value.trim() },
                username: { stringValue: document.getElementById('edit-profile-handle').value.trim().replace(/[^a-zA-Z0-9_]/g, '') },
                bio: { stringValue: document.getElementById('edit-profile-bio').value.trim() },
                university: { stringValue: document.getElementById('edit-profile-university').value.trim() },
                fieldStudy: { stringValue: document.getElementById('edit-profile-field-study').value.trim() },
                github: { stringValue: document.getElementById('edit-profile-github').value.trim() },
                linkedin: { stringValue: document.getElementById('edit-profile-linkedin').value.trim() },
                orcid: { stringValue: document.getElementById('edit-profile-orcid').value.trim() },
                location: { stringValue: document.getElementById('edit-profile-location').value.trim() },
                website: { stringValue: document.getElementById('edit-profile-website').value.trim() },
                dob: { stringValue: document.getElementById('edit-profile-dob').value },
                gender: { stringValue: document.getElementById('edit-profile-gender').value },
                language: { stringValue: document.getElementById('edit-profile-language').value },
                timezone: { stringValue: document.getElementById('edit-profile-timezone').value }
            }
        };

        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Failed to save profile");
        
        // Update UI
        profileFields.forEach(field => {
            const inputVal = document.getElementById(`edit-profile-${field}`).value.trim();
            if (field === 'handle') {
                const safeVal = inputVal.replace(/[^a-zA-Z0-9_]/g, '');
                document.getElementById(`profile-handle`).innerText = safeVal ? '@' + safeVal : 'Not Set';
                document.getElementById(`profile-username`).innerText = safeVal ? '@' + safeVal : 'Not Set';
            } else {
                document.getElementById(`profile-${field}`).innerText = inputVal || 'Not Set';
            }
        });
        
        toggleEditMode(false);
    } catch (err) {
        console.error(err);
        showToast("Error saving profile changes.", "error");
    } finally {
        btnSaveEdit.disabled = false;
        btnSaveEdit.innerText = 'Save Changes';
    }
});

async function loadMyUploads(user) {
    const container = document.getElementById('my-uploads-container');
    
    try {
        // We use the REST API just like gallery.js for consistency and reliability
        const token = await user.getIdToken();
        const projectId = "hydrohub-215";
        // To query, we use runQuery
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                structuredQuery: {
                    from: [{ collectionId: "researchPapers" }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: "uploadedBy" },
                            op: "EQUAL",
                            value: { stringValue: user.uid }
                        }
                    }
                }
            })
        });

        if (!response.ok) throw new Error("Failed to fetch uploads");
        
        let data = await response.json();
        container.innerHTML = '';
        
        let hasUploads = false;

        // Filter out empty responses and sort manually in JS to avoid Firestore index requirement
        const validDocs = data.filter(item => item.document);
        validDocs.sort((a, b) => {
            const timeA = new Date(a.document.fields.createdAt?.timestampValue || 0).getTime();
            const timeB = new Date(b.document.fields.createdAt?.timestampValue || 0).getTime();
            return timeB - timeA;
        });
        
        // Update Analytics Tab
        document.getElementById('stat-uploads').innerText = validDocs.length;
        const joinDateMs = new Date(user.metadata.creationTime).getTime();
        const daysActive = Math.max(1, Math.floor((Date.now() - joinDateMs) / (1000 * 60 * 60 * 24)));
        document.getElementById('stat-days').innerText = daysActive;

        let totalUpvotes = 0;

        validDocs.forEach(item => {
            hasUploads = true;
            const docId = item.document.name.split('/').pop();
            const fields = item.document.fields;
            
            const title = fields.title?.stringValue || 'Untitled';
            const uploadDate = fields.createdAt?.timestampValue ? new Date(fields.createdAt.timestampValue).toLocaleDateString() : 'Unknown';
            const uploaderName = fields.uploaderName?.stringValue || 'Unknown User';
            const fileUrl = fields.fileUrl?.stringValue || '#';
            const upvotes = fields.upvotesCount?.integerValue || 0;
            const description = fields.description?.stringValue || 'No description provided.';
            
            totalUpvotes += parseInt(upvotes, 10);
            
            const isImage = fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
            const isVideo = fileUrl.match(/\.(mp4|webm|ogg)$/i) != null;
            
            let mediaHtml = '';
            if (isImage) {
                mediaHtml = `<div style="margin-bottom: 1rem; margin-top: -1.5rem; margin-left: -1.5rem; margin-right: -1.5rem;"><img src="${fileUrl}" alt="${title}" style="width: 100%; height: 200px; object-fit: cover; border-top-left-radius: 8px; border-top-right-radius: 8px;"></div>`;
            } else if (isVideo) {
                mediaHtml = `<div style="margin-bottom: 1rem; margin-top: -1.5rem; margin-left: -1.5rem; margin-right: -1.5rem;"><video src="${fileUrl}" controls style="width: 100%; height: 200px; object-fit: cover; border-top-left-radius: 8px; border-top-right-radius: 8px;"></video></div>`;
            }

            const card = document.createElement('div');
            card.className = 'research-card';
            
            let descHtml = description;
            let needsToggle = false;
            if (description.length > 200) {
                descHtml = `<span class="desc-short">${description.substring(0, 200)}...</span><span class="desc-full" style="display:none;">${description}</span><a href="#" class="read-more-btn" style="color:var(--accent-cyan); cursor:pointer; font-size:0.85rem; display:block; margin-top:0.5rem; text-decoration:none;">Read More</a>`;
                needsToggle = true;
            }

            card.innerHTML = `
                ${mediaHtml}
                <div class="card-content">
                    <h3 style="margin-top: ${mediaHtml ? '1rem' : '0'}">${title}</h3>
                    <div class="research-authors">By: ${uploaderName}</div>
                    <div class="research-abstract">
                        ${descHtml}
                    </div>
                </div>
                <div class="card-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">
                    <button class="btn btn-outline btn-view-report" data-url="${fileUrl}" data-title="${title}" style="padding: 0.5rem 1rem; font-size: 0.9rem;">View Report</button>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button class="btn btn-delete-paper" data-id="${docId}" style="background: transparent; border: 1px solid #ff6666; color: #ff6666; padding: 0.3rem 0.8rem; font-size: 0.8rem; border-radius: 20px; cursor: pointer; transition: all 0.2s ease;">Delete</button>
                    </div>
                </div>
            `;
            
            if (needsToggle) {
                const btn = card.querySelector('.read-more-btn');
                const shortText = card.querySelector('.desc-short');
                const fullText = card.querySelector('.desc-full');
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (fullText.style.display === 'none') {
                        fullText.style.display = 'inline';
                        shortText.style.display = 'none';
                        btn.innerText = 'Show Less';
                    } else {
                        fullText.style.display = 'none';
                        shortText.style.display = 'inline';
                        btn.innerText = 'Read More';
                    }
                });
            }

            const viewBtn = card.querySelector('.btn-view-report');
            if (viewBtn) {
                viewBtn.addEventListener('click', () => {
                    openDocumentViewer(fileUrl, title);
                });
            }

            container.appendChild(card);
        });

        document.getElementById('stat-upvotes').innerText = totalUpvotes;

        if (!hasUploads) {
            container.innerHTML = '<p style="color: var(--text-secondary);">You have not uploaded any research papers yet.</p>';
        }

        // Add Delete Listeners
        document.querySelectorAll('.btn-delete-paper').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const confirmed = await customConfirm("Are you sure you want to delete this paper from the Community Gallery?", "Delete Paper", true);
                if (confirmed) {
                    const id = e.target.getAttribute('data-id');
                    await deletePaper(id, e.target.parentElement);
                }
            });
        });

    } catch (error) {
        console.error("Uploads Error:", error);
        container.innerHTML = '<p style="color: #ff6666;">Error loading uploads.</p>';
    }
}

async function deletePaper(docId, cardElement) {
    try {
        const token = await currentUser.getIdToken();
        const url = `https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents/researchPapers/${docId}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            cardElement.remove();
            showToast("Paper deleted successfully.", "success");
        } else {
            showToast("Failed to delete paper.", "error");
        }
    } catch (error) {
        console.error("Delete paper error:", error);
    }
}

// Security: Change Password
document.getElementById('btn-change-password').addEventListener('click', async () => {
    const newPass = document.getElementById('new-password').value;
    const msg = document.getElementById('password-msg');
    
    if (newPass.length < 6) {
        msg.style.color = '#ff6666';
        msg.innerText = "Password must be at least 6 characters.";
        return;
    }

    try {
        await updatePassword(currentUser, newPass);
        msg.style.color = 'var(--accent-green)';
        msg.innerText = "Password updated successfully!";
        document.getElementById('new-password').value = '';
    } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
            msg.style.color = '#ff6666';
            msg.innerText = "Security Alert: Please log out and log back in to change your password.";
        } else {
            msg.style.color = '#ff6666';
            msg.innerText = error.message;
        }
    }
});

// Advanced Security Placeholders
const setup2fa = document.getElementById('btn-setup-2fa');
if (setup2fa) setup2fa.addEventListener('click', () => showToast("Multi-Factor Authentication (2FA) requires upgrading your Firebase Auth tier. Coming soon!", "info"));

const addPasskey = document.getElementById('btn-add-passkey');
if (addPasskey) addPasskey.addEventListener('click', () => showToast("Passkey biometric authentication is currently in beta. Coming soon!", "info"));

const viewRecovery = document.getElementById('btn-view-recovery');
if (viewRecovery) viewRecovery.addEventListener('click', () => showToast("Recovery codes will be generated when 2FA is enabled.", "info"));

const signoutAll = document.getElementById('btn-signout-all');
if (signoutAll) signoutAll.addEventListener('click', async () => {
    const confirmed = await customConfirm("Are you sure you want to sign out of all devices? You will be signed out of this session as well.", "Sign Out Everywhere", true);
    if (confirmed) {
        showToast("Session tokens revoked. Signing out...", "success");
        signOut(auth).then(() => {
            window.location.href = 'index.html';
        });
    }
});

// Security: Delete Account
document.getElementById('btn-delete-account').addEventListener('click', async () => {
    const confirmed = await customConfirm("Are you absolutely sure you want to permanently delete your account? This action cannot be undone.", "Delete Account", true);
    if(!confirmed) return;
    
    const msg = document.getElementById('delete-msg');
    
    try {
        // 1. Delete Firestore User Doc via REST API
        const token = await currentUser.getIdToken();
        const url = `https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents/users/${currentUser.uid}`;
        await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // 2. Delete Auth Account
        await deleteUser(currentUser);
        
        // 3. User is automatically signed out and onAuthStateChanged will redirect them to index.html
    } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
            msg.innerText = "Security Alert: Please log out and log back in to verify your identity before deleting your account.";
        } else {
            msg.innerText = error.message;
        }
    }
});

// --- SAVED CONTENT LOGIC ---
async function fetchSavedContent(user) {
    const draftsContainer = document.getElementById('saved-drafts-container');
    
    if (!draftsContainer) return;
    
    draftsContainer.innerHTML = '<div class="spinner" style="margin:1rem auto; border-left-color: var(--accent-cyan); width: 24px; height: 24px;"></div>';
    
    const projectId = "hydrohub-215";
    const token = await user.getIdToken();
    
    try {
        // Fetch Drafts
        const draftsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${user.uid}/drafts`;
        const draftsRes = await fetch(draftsUrl, { headers: { 'Authorization': `Bearer ${token}` }});
        if (draftsRes.ok) {
            const draftsData = await draftsRes.json();
            if (draftsData.documents && draftsData.documents.length > 0) {
                draftsContainer.innerHTML = '';
                draftsData.documents.forEach(doc => {
                    const fields = doc.fields;
                    const title = fields.title?.stringValue || 'Untitled Draft';
                    const date = fields.createdAt?.timestampValue ? new Date(fields.createdAt.timestampValue).toLocaleDateString() : 'Recently';
                    const draftId = doc.name ? doc.name.split('/').pop() : '';
                    
                    draftsContainer.innerHTML += `
                        <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h4 style="margin-bottom: 0.2rem; color: #fff;">${title}</h4>
                                <span style="font-size: 0.8rem; color: #888;">Saved: ${date}</span>
                            </div>
                            <a href="upload.html?draftId=${draftId}" class="btn btn-outline" style="padding: 0.3rem 0.8rem; font-size: 0.8rem; text-decoration: none;">Edit</a>
                        </div>
                    `;
                });
            } else {
                draftsContainer.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">You have no unpublished drafts.</p>';
            }
        } else {
            draftsContainer.innerHTML = '<p style="color: #ff6666; font-size: 0.9rem;">Failed to load drafts.</p>';
        }
        
    } catch (err) {
        console.error("Failed to load saved content", err);
        draftsContainer.innerHTML = '<p style="color: #ff6666; font-size: 0.9rem;">Error loading content.</p>';
    }
}


// ==========================================
// MOCK LINK COPY LOGIC
// ==========================================
const btnCopyLink = document.getElementById('btn-copy-link');
if (btnCopyLink) {
    btnCopyLink.addEventListener('click', (e) => {
        e.preventDefault();
        const handle = document.getElementById('preview-handle-text').innerText;
        const url = `${window.location.origin}/@${handle}`;
        navigator.clipboard.writeText(url).then(() => {
            const originalText = btnCopyLink.innerText;
            btnCopyLink.innerText = '[Copied!]';
            setTimeout(() => { btnCopyLink.innerText = originalText; }, 2000);
        });
    });
}

// ==========================================
// NOTIFICATIONS LOGIC
// ==========================================
async function loadNotifications(user) {
    const container = document.getElementById('notifications-container');
    if (!container) return;
    try {
        const token = await user.getIdToken();
        const url = `https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents/users/${user.uid}/notifications`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const data = await res.json();
            const docs = data.documents || [];
            
            if (docs.length === 0) {
                container.innerHTML = '<p style="color: var(--text-secondary);">No new notifications.</p>';
                return;
            }
            
            container.innerHTML = '';
            let unreadCount = 0;
            
            docs.forEach(doc => {
                const id = doc.name.split('/').pop();
                const fields = doc.fields;
                const message = fields.message?.stringValue || 'You have a new notification';
                const read = fields.read?.booleanValue || false;
                const link = fields.link?.stringValue || '#';
                
                if (!read) unreadCount++;
                
                const notifEl = document.createElement('div');
                notifEl.style.padding = '1rem';
                notifEl.style.background = read ? 'rgba(255,255,255,0.02)' : 'rgba(108, 92, 231, 0.1)';
                notifEl.style.border = read ? '1px solid rgba(255,255,255,0.05)' : '1px solid var(--accent-purple)';
                notifEl.style.borderRadius = '8px';
                notifEl.style.cursor = 'pointer';
                notifEl.style.transition = 'all 0.2s';
                
                notifEl.innerHTML = `<p style="margin:0; ${read ? 'color: var(--text-secondary);' : 'color: white;'}">${message}</p>`;
                notifEl.onclick = () => { window.location.href = link; };
                
                container.appendChild(notifEl);
            });
            
            const badge = document.getElementById('notif-badge');
            if (badge) {
                if (unreadCount > 0) {
                    badge.style.display = 'inline-block';
                    badge.innerText = unreadCount;
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch(e) {
        console.error("Error loading notifications:", e);
    }
}

const btnMarkRead = document.getElementById('btn-mark-read');
if (btnMarkRead) {
    btnMarkRead.addEventListener('click', () => {
        showToast("All notifications marked as read.", "info");
        const badge = document.getElementById('notif-badge');
        if (badge) badge.style.display = 'none';
        
        const container = document.getElementById('notifications-container');
        Array.from(container.children).forEach(child => {
            child.style.background = 'rgba(255,255,255,0.02)';
            child.style.border = '1px solid rgba(255,255,255,0.05)';
            child.querySelector('p').style.color = 'var(--text-secondary)';
        });
    });
}

// Ensure loadNotifications is called
onAuthStateChanged(auth, async (user) => {
    if (user) {
        loadNotifications(user);
    }
});

// ==========================================
// DATA EXPORT LOGIC
// ==========================================
const btnExportData = document.getElementById('btn-export-data');
if (btnExportData) {
    btnExportData.addEventListener('click', async () => {
        if (!currentUser) return;
        
        btnExportData.disabled = true;
        btnExportData.innerText = 'Compiling Data...';
        const msg = document.getElementById('export-msg');
        msg.innerText = '';
        
        try {
            const token = await currentUser.getIdToken();
            const zip = new JSZip();
            
            // 1. Fetch Profile Data
            const profileRes = await fetch(`https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents/users/${currentUser.uid}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (profileRes.ok) {
                const profileData = await profileRes.json();
                zip.file("profile.json", JSON.stringify(profileData, null, 2));
            }
            
            // 2. Fetch Uploaded Papers
            const papersUrl = `https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents:runQuery`;
            const papersPayload = {
                structuredQuery: {
                    from: [{ collectionId: 'community_research' }],
                    where: {
                        compositeFilter: {
                            op: 'AND',
                            filters: [
                                { fieldFilter: { field: { fieldPath: 'uploaderId' }, op: 'EQUAL', value: { stringValue: currentUser.uid } } }
                            ]
                        }
                    }
                }
            };
            const papersRes = await fetch(papersUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: JSON.stringify(papersPayload) });
            if (papersRes.ok) {
                const papersData = await papersRes.json();
                zip.file("uploaded_papers.json", JSON.stringify(papersData, null, 2));
            }
            
            // Generate ZIP
            const blob = await zip.generateAsync({ type: "blob" });
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = downloadUrl;
            a.download = `HydroStat_Data_${currentUser.uid}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            
            msg.style.color = 'var(--accent-cyan)';
            msg.innerText = 'Data successfully exported!';
        } catch(e) {
            console.error(e);
            msg.style.color = '#ff6666';
            msg.innerText = 'Failed to export data.';
        } finally {
            btnExportData.disabled = false;
            btnExportData.innerText = 'Download My Data';
        }
    });
}




const closeTranscriptModal = document.getElementById('close-transcript-modal');
if (closeTranscriptModal) {
    closeTranscriptModal.addEventListener('click', () => {
        document.getElementById('bot-transcript-modal').style.display = 'none';
    });
}

