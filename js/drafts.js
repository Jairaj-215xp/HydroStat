import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { openAuthModal } from './auth.js';

const container = document.getElementById('drafts-gallery-container');

onAuthStateChanged(auth, async (user) => {
    if (!container) return;

    if (!user) {
        container.innerHTML = `
            <div style="text-align: center; grid-column: 1 / -1; padding: 3rem 1rem;">
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 1.1rem;">
                    Please log in to view and manage your research drafts.
                </p>
                <button id="btn-drafts-login" class="btn btn-primary" style="padding: 0.7rem 1.8rem;">
                    Log In / Sign Up
                </button>
            </div>
        `;
        const loginBtn = document.getElementById('btn-drafts-login');
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                openAuthModal();
            });
        }
        return;
    }

    container.innerHTML = `
        <div style="text-align: center; grid-column: 1 / -1; padding: 2rem;">
            <p style="color: var(--text-secondary);">Loading your drafts...</p>
        </div>
    `;

    await loadUserDrafts(user);
});

async function loadUserDrafts(user) {
    try {
        const token = await user.getIdToken();
        const url = `https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents/users/${user.uid}/drafts`;

        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            if (res.status === 404) {
                renderEmptyState();
                return;
            }
            throw new Error(`Server returned status ${res.status}`);
        }

        const data = await res.json();
        const docs = data.documents || [];

        if (docs.length === 0) {
            renderEmptyState();
            return;
        }

        // Sort descending by createdAt
        docs.sort((a, b) => {
            const timeA = new Date(a.fields?.createdAt?.timestampValue || 0).getTime();
            const timeB = new Date(b.fields?.createdAt?.timestampValue || 0).getTime();
            return timeB - timeA;
        });

        container.innerHTML = '';

        docs.forEach(docObj => {
            const docName = docObj.name || '';
            const draftId = docName.split('/').pop();
            const f = docObj.fields || {};

            const title = escapeHtml(f.title?.stringValue || 'Untitled Draft');
            const authors = escapeHtml(f.authors?.stringValue || 'Unknown Author');
            const desc = escapeHtml(f.description?.stringValue || 'No description provided.');
            const fileName = f.fileName?.stringValue ? escapeHtml(f.fileName.stringValue) : '';
            const fileUrl = f.fileUrl?.stringValue || '';
            const createdAt = f.createdAt?.timestampValue 
                ? new Date(f.createdAt.timestampValue).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                : 'Recently';

            const card = document.createElement('div');
            card.className = 'glass-card';
            card.id = `draft-card-${draftId}`;
            card.style.cssText = 'display: flex; flex-direction: column; justify-content: space-between; padding: 1.5rem; transition: transform 0.2s, box-shadow 0.2s; position: relative;';

            card.innerHTML = `
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
                        <span style="background: rgba(0, 230, 204, 0.15); color: var(--accent-cyan); font-size: 0.75rem; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid rgba(0, 230, 204, 0.3);">
                            DRAFT
                        </span>
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">
                            Saved ${createdAt}
                        </span>
                    </div>

                    <h3 style="color: #fff; font-size: 1.2rem; margin-bottom: 0.5rem; line-height: 1.4;">
                        ${title}
                    </h3>

                    <p style="color: var(--accent-cyan); font-size: 0.85rem; margin-bottom: 0.8rem;">
                        ${authors}
                    </p>

                    <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                        ${desc}
                    </p>

                    ${fileName ? `
                        <div style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.7); margin-bottom: 1rem; display: flex; align-items: center; gap: 6px;">
                            <span>📎</span> <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;">${fileName}</span>
                        </div>
                    ` : ''}
                </div>

                <div style="display: flex; gap: 0.8rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.08);">
                    <a href="upload.html?draftId=${draftId}" class="btn btn-primary" style="flex: 1; text-align: center; font-size: 0.9rem; padding: 0.5rem 1rem;">
                        Continue Editing
                    </a>
                    <button class="btn btn-outline btn-delete-draft" data-id="${draftId}" style="border-color: rgba(255, 102, 102, 0.4); color: #ff6666; padding: 0.5rem 0.9rem; font-size: 0.9rem;" title="Delete Draft">
                        Delete
                    </button>
                </div>
            `;

            container.appendChild(card);
        });

        // Attach delete handlers
        container.querySelectorAll('.btn-delete-draft').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const draftId = e.currentTarget.dataset.id;
                if (!confirm("Are you sure you want to delete this draft? This cannot be undone.")) {
                    return;
                }

                btn.disabled = true;
                btn.innerText = "...";

                try {
                    const freshToken = await user.getIdToken();
                    const delUrl = `https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents/users/${user.uid}/drafts/${draftId}`;
                    const delRes = await fetch(delUrl, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${freshToken}` }
                    });

                    if (delRes.ok) {
                        const cardEl = document.getElementById(`draft-card-${draftId}`);
                        if (cardEl) cardEl.remove();

                        if (container.children.length === 0) {
                            renderEmptyState();
                        }
                    } else {
                        alert("Could not delete draft. Please try again.");
                        btn.disabled = false;
                        btn.innerText = "Delete";
                    }
                } catch (delErr) {
                    console.error("Delete draft error:", delErr);
                    alert("Network error while deleting draft.");
                    btn.disabled = false;
                    btn.innerText = "Delete";
                }
            });
        });

    } catch (err) {
        console.error("Failed to load drafts:", err);
        container.innerHTML = `
            <div style="text-align: center; grid-column: 1 / -1; padding: 2rem;">
                <p style="color: #ff6666; margin-bottom: 1rem;">Failed to load drafts: ${escapeHtml(err.message)}</p>
                <button id="btn-retry-drafts" class="btn btn-outline" style="padding: 0.5rem 1.2rem;">Retry</button>
            </div>
        `;
        const retryBtn = document.getElementById('btn-retry-drafts');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => loadUserDrafts(user));
        }
    }
}

function renderEmptyState() {
    container.innerHTML = `
        <div style="text-align: center; grid-column: 1 / -1; padding: 4rem 1rem;">
            <p style="color: var(--text-secondary); font-size: 1.1rem; margin-bottom: 1.5rem;">
                You have no unpublished drafts.
            </p>
            <a href="upload.html" class="btn btn-primary" style="padding: 0.7rem 1.8rem; font-size: 1rem;">
                Create Your First Draft
            </a>
        </div>
    `;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
