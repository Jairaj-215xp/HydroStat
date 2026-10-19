import { auth, db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { openAuthModal } from './auth.js';

const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const fileNameDisplay = document.getElementById('file-name');
const btnSubmit = document.getElementById('btn-submit-upload');
const uploadError = document.getElementById('upload-error');
const uploadSuccess = document.getElementById('upload-success');

let selectedFile = null;
let existingFileUrl = "";

// Check if loaded from Drafts
const urlParams = new URLSearchParams(window.location.search);
let activeDraftId = urlParams.get('draftId');

onAuthStateChanged(auth, async (user) => {
    if (user && activeDraftId) {
        try {
            const token = await user.getIdToken();
            const draftUrl = `https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents/users/${user.uid}/drafts/${activeDraftId}`;
            const res = await fetch(draftUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                const f = data.fields || {};
                if (f.title?.stringValue) document.getElementById('upload-title').value = f.title.stringValue;
                if (f.authors?.stringValue) document.getElementById('upload-authors').value = f.authors.stringValue;
                if (f.description?.stringValue) document.getElementById('upload-desc').value = f.description.stringValue;
                if (f.fileUrl?.stringValue) existingFileUrl = f.fileUrl.stringValue;
                if (f.fileName?.stringValue) {
                    fileNameDisplay.innerText = `Saved Draft File: ${f.fileName.stringValue}`;
                    fileNameDisplay.style.display = 'block';
                }
                const header = document.querySelector('.upload-header h2');
                if (header) header.innerHTML = 'Edit <span>Research Draft</span>';
            }
        } catch (e) {
            console.warn("Notice: could not pre-fill draft:", e);
        }
    }
});

// Drag and drop UI logic
uploadZone.addEventListener('click', () => {
    fileInput.click();
});

uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

function handleFileSelect(file) {
    selectedFile = file;
    fileNameDisplay.innerText = `Selected File: ${file.name}`;
    fileNameDisplay.style.display = 'block';
    uploadError.style.display = 'none';
}

// Submission logic
btnSubmit.addEventListener('click', async () => {
    // 1. Enforce Authentication
    const user = auth.currentUser;
    if (!user) {
        openAuthModal();
        return;
    }

    const title = document.getElementById('upload-title').value.trim();
    const authors = document.getElementById('upload-authors').value.trim();
    const desc = document.getElementById('upload-desc').value.trim();

    // 2. Validate input
    if (!title || !authors || !desc || (!selectedFile && !existingFileUrl)) {
        uploadError.innerText = "Please fill out all fields and select or keep a file.";
        uploadError.style.display = 'block';
        uploadSuccess.style.display = 'none';
        return;
    }

    try {
        btnSubmit.disabled = true;
        btnSubmit.innerText = "Uploading...";
        uploadError.style.display = 'none';

        let downloadURL = existingFileUrl;
        let fileNameStr = selectedFile ? selectedFile.name : (fileNameDisplay.innerText.replace('Saved Draft File: ', '') || 'document.pdf');
        let resourceType = 'raw';

        if (selectedFile) {
            // 3. Upload File to Cloudinary
            console.log("Uploading to Cloudinary...");
            const cloudName = "doakkvedg";
            const uploadPreset = "ml_default";
            
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("upload_preset", uploadPreset);

            const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                method: 'POST',
                body: formData
            });

            if (!cloudinaryResponse.ok) {
                const errBody = await cloudinaryResponse.text();
                throw new Error(`Cloudinary Error: ${errBody}`);
            }

            const cloudinaryData = await cloudinaryResponse.json();
            downloadURL = cloudinaryData.secure_url;
            resourceType = cloudinaryData.resource_type || 'raw';
        }
        
        console.log("Saving metadata to Firestore...");
        
        // 4. Save Metadata to Firestore using REST API
        const token = await user.getIdToken();
        const projectId = "hydrohub-215";
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/researchPapers`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                fields: {
                    title: { stringValue: title },
                    authors: { stringValue: authors },
                    description: { stringValue: desc },
                    fileName: { stringValue: fileNameStr },
                    fileUrl: { stringValue: downloadURL },
                    resourceType: { stringValue: resourceType },
                    upvotesCount: { integerValue: 0 },
                    upvotedBy: { arrayValue: { values: [] } },
                    uploadedBy: { stringValue: user.uid },
                    authorId: { stringValue: user.uid },
                    uploaderEmail: { stringValue: user.email },
                    createdAt: { timestampValue: new Date().toISOString() }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server Error (${response.status}): ${errorText}`);
        }

        // Clean up draft if this was published from a saved draft
        if (activeDraftId) {
            const delDraftUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${user.uid}/drafts/${activeDraftId}`;
            fetch(delDraftUrl, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(e => console.warn("Notice: could not auto-delete draft after publish", e));
            activeDraftId = null;
        }

        console.log("Successfully saved to Firestore!");

        // 5. Success State
        uploadSuccess.innerText = "Research paper uploaded successfully! Redirecting to Community Research...";
        uploadSuccess.style.display = 'block';
        
        // Reset Form
        document.getElementById('upload-title').value = '';
        document.getElementById('upload-authors').value = '';
        document.getElementById('upload-desc').value = '';
        selectedFile = null;
        existingFileUrl = "";
        fileNameDisplay.style.display = 'none';

        setTimeout(() => {
            window.location.href = 'community-research.html';
        }, 1500);
        
    } catch (error) {
        console.error("Upload Error:", error);
        uploadError.innerText = error.message;
        uploadError.style.display = 'block';
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Submit Research";
    }
});

const btnSaveDraft = document.getElementById('btn-save-draft');
if (btnSaveDraft) {
    btnSaveDraft.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) {
            openAuthModal();
            return;
        }

        const title = document.getElementById('upload-title').value.trim();
        const authors = document.getElementById('upload-authors').value.trim();
        const desc = document.getElementById('upload-desc').value.trim();

        if (!title && !authors && !desc && !selectedFile) {
            uploadError.innerText = "Please enter some content to save as a draft.";
            uploadError.style.display = 'block';
            return;
        }

        try {
            btnSaveDraft.disabled = true;
            btnSaveDraft.innerText = "Saving...";
            uploadError.style.display = 'none';

            let downloadURL = "";
            let fileNameStr = "";
            if (selectedFile) {
                fileNameStr = selectedFile.name;
                // For drafts, we might just want to store the metadata if we don't upload the file yet. 
                // But let's upload the file if it exists so the draft is fully complete.
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('upload_preset', 'hydrohub_papers');
                const uploadRes = await fetch('https://api.cloudinary.com/v1_1/dzyaeqoix/auto/upload', {
                    method: 'POST',
                    body: formData
                });
                if (uploadRes.ok) {
                    const data = await uploadRes.json();
                    downloadURL = data.secure_url;
                }
            }

            const token = await user.getIdToken();
            const projectId = "hydrohub-215";
            let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${user.uid}/drafts`;
            let method = 'POST';

            const draftPayloadFields = {
                title: { stringValue: title },
                authors: { stringValue: authors },
                description: { stringValue: desc },
                fileName: { stringValue: fileNameStr || (fileNameDisplay.innerText.replace('Saved Draft File: ', '') || '') },
                fileUrl: { stringValue: downloadURL || existingFileUrl || '' },
                updatedAt: { timestampValue: new Date().toISOString() }
            };

            if (activeDraftId) {
                const mask = ['title', 'authors', 'description', 'fileName', 'fileUrl', 'updatedAt'].map(f => `updateMask.fieldPaths=${f}`).join('&');
                url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${user.uid}/drafts/${activeDraftId}?${mask}`;
                method = 'PATCH';
            } else {
                draftPayloadFields.createdAt = { timestampValue: new Date().toISOString() };
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ fields: draftPayloadFields })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server Error (${response.status}): ${errorText}`);
            }

            uploadSuccess.innerText = activeDraftId 
                ? "Draft updated successfully! Redirecting to My Drafts..." 
                : "Draft saved successfully! Redirecting to My Drafts...";
            uploadSuccess.style.display = 'block';

            setTimeout(() => {
                window.location.href = 'drafts.html';
            }, 1200);

        } catch (error) {
            console.error("Draft Error:", error);
            uploadError.innerText = error.message;
            uploadError.style.display = 'block';
        } finally {
            btnSaveDraft.disabled = false;
            btnSaveDraft.innerText = "Save as Draft";
        }
    });
}
