import { auth } from './firebase-config.js';
import { showConfirm, showToast } from './ui-utils.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const container = document.getElementById('bot-conversations-gallery-container');
if (container) container.innerHTML = '<p style="text-align:center; width:100%;">Script executing... please wait...</p>';

onAuthStateChanged(auth, (user) => {
    if (user) {
        if (container) container.innerHTML = '<p style="text-align:center; width:100%;">User authenticated, fetching conversations...</p>';
        loadBotConversations(user);
    } else {
        if (container) container.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-secondary);">Please log in to view your saved conversations.</p>';
    }
});

const closeTranscriptModal = document.getElementById('close-transcript-modal');
if (closeTranscriptModal) {
    closeTranscriptModal.addEventListener('click', () => {
        document.getElementById('bot-transcript-modal').style.display = 'none';
    });
}

async function loadBotConversations(user) {
    if (!container) return;
    try {
        const token = await user.getIdToken();
        const url = "https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents/users/" + user.uid + "/bot_conversations";
        
        const res = await fetch(url, { headers: { 'Authorization': "Bearer " + token } });
        
        if (res.ok) {
            const data = await res.json();
            const docs = data.documents || [];
            
            if (docs.length === 0) {
                container.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-secondary);">You have no saved conversations.</p>';
                return;
            }
            
            container.innerHTML = '';
            docs.forEach(doc => {
                const fields = doc.fields;
                const rawTitle = fields.title?.stringValue || 'Conversation';
                let rawTimestamp = fields.timestamp?.stringValue || '';
                if (rawTimestamp) rawTimestamp = new Date(rawTimestamp).toLocaleString();
                const historyStr = fields.history?.stringValue || '[]';
                
                // Safe escaping for card display
                const safeTitle = String(rawTitle).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                const safeTimestamp = String(rawTimestamp).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                
                const card = document.createElement('div');
                card.className = 'research-card';
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
                card.style.justifyContent = 'space-between';
                
                card.innerHTML = `
                    <div class="card-content">
                        <div class="card-meta" style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span class="tag">AI Chat</span>
                            <span>${safeTimestamp}</span>
                        </div>
                        <h3 style="font-size: 1.1rem; margin-bottom: 1rem;">${safeTitle}</h3>
                        <p style="color: var(--text-secondary); font-size: 0.9rem;">A saved interactive brainstorming session with Hydrobot.</p>
                    </div>
                    <div style="padding: 0 1.5rem 1.5rem 1.5rem; margin-top: auto; display: flex; gap: 0.5rem;">
                        <button class="btn btn-outline btn-view-chat" style="flex: 1;">View Full Transcript</button>
                        <button class="btn btn-outline btn-delete-chat" style="padding: 0.5rem; border-color: #ff4d4d; color: #ff4d4d;" title="Delete Conversation">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                `;
                
                const btnView = card.querySelector('.btn-view-chat');
                btnView.addEventListener('click', () => {
                    openTranscriptModal(title, historyStr);
                });
                
                const btnDelete = card.querySelector('.btn-delete-chat');
                btnDelete.addEventListener('click', async () => {
                    const confirmed = await showConfirm("Are you sure you want to delete this conversation?");
                    if (confirmed) {
                        btnDelete.disabled = true;
                        btnDelete.innerHTML = '<div class="spinner" style="width: 14px; height: 14px; border-width: 2px; border-left-color: #ff4d4d;"></div>';
                        try {
                            const docName = doc.name;
                            const delUrl = "https://firestore.googleapis.com/v1/" + docName;
                            const delRes = await fetch(delUrl, {
                                method: 'DELETE',
                                headers: { 'Authorization': "Bearer " + token }
                            });
                            if (delRes.ok) {
                                card.remove();
                                showToast("Conversation deleted successfully.", "success");
                                if (container.children.length === 0) {
                                    container.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-secondary);">You have no saved conversations.</p>';
                                }
                            } else {
                                showToast("Failed to delete conversation.", "error");
                                btnDelete.disabled = false;
                                btnDelete.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
                            }
                        } catch (err) {
                            console.error(err);
                            showToast("Error deleting conversation.", "error");
                            btnDelete.disabled = false;
                            btnDelete.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
                        }
                    }
                });
                
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<p style="text-align:center; width:100%; color:#ff6666;">Failed to load conversations.</p>';
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="text-align:center; width:100%; color:#ff6666;">Error loading conversations.</p>';
    }
}

function openTranscriptModal(title, historyStr) {
    const modal = document.getElementById('bot-transcript-modal');
    const titleEl = document.getElementById('bot-transcript-title');
    const contentEl = document.getElementById('bot-transcript-content');
    
    titleEl.innerText = title;
    contentEl.innerHTML = '';
    
    let history = [];
    try {
        history = JSON.parse(historyStr);
    } catch(e) {}
    
    history.forEach(msg => {
        const div = document.createElement('div');
        const isUser = msg.role === 'user';
        
        div.style.background = isUser ? 'rgba(255,255,255,0.05)' : 'rgba(108, 92, 231, 0.1)';
        div.style.border = isUser ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--accent-purple)';
        div.style.padding = '1rem';
        div.style.borderRadius = '8px';
        div.style.color = 'var(--text-primary)';
        div.style.fontSize = '0.9rem';
        div.style.lineHeight = '1.5';
        
        const label = document.createElement('div');
        label.style.fontWeight = 'bold';
        label.style.marginBottom = '0.5rem';
        label.style.color = isUser ? 'white' : 'var(--accent-cyan)';
        label.innerText = isUser ? 'You' : 'Hydrobot';
        
        const text = document.createElement('div');
        text.innerText = msg.parts?.[0]?.text || '';
        
        div.appendChild(label);
        div.appendChild(text);
        contentEl.appendChild(div);
    });
    
    modal.style.display = 'flex';
}
