export function showConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        overlay.style.zIndex = '100000';
        overlay.style.background = 'rgba(8, 12, 20, 0.8)';
        overlay.style.backdropFilter = 'blur(10px)';
        
        const modal = document.createElement('div');
        modal.className = 'modal-content glass-card';
        modal.style.maxWidth = '420px';
        modal.style.width = '90%';
        modal.style.textAlign = 'center';
        modal.style.padding = '2.2rem 2rem';
        modal.style.border = '1px solid rgba(0, 255, 255, 0.3)';
        modal.style.borderRadius = '20px';
        modal.style.boxShadow = '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 25px rgba(0, 255, 255, 0.15)';
        
        const icon = document.createElement('div');
        icon.innerText = '❓';
        icon.style.fontSize = '2.5rem';
        icon.style.marginBottom = '1rem';
        
        const text = document.createElement('p');
        text.innerText = message;
        text.style.color = '#fff';
        text.style.fontSize = '1.1rem';
        text.style.lineHeight = '1.5';
        text.style.marginBottom = '2rem';
        
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '1rem';
        btnContainer.style.width = '100%';
        
        const btnCancel = document.createElement('button');
        btnCancel.className = 'btn btn-outline';
        btnCancel.innerText = 'Cancel';
        btnCancel.style.flex = '1';
        btnCancel.style.padding = '0.7rem';
        btnCancel.style.borderRadius = '25px';
        btnCancel.style.cursor = 'pointer';
        
        const btnConfirm = document.createElement('button');
        btnConfirm.className = 'btn btn-primary';
        btnConfirm.innerText = 'Confirm';
        btnConfirm.style.flex = '1';
        btnConfirm.style.padding = '0.7rem';
        btnConfirm.style.cursor = 'pointer';
        btnConfirm.style.background = 'linear-gradient(135deg, var(--accent-cyan, #00ffff) 0%, #0088ff 100%)';
        btnConfirm.style.color = '#0d121c';
        btnConfirm.style.fontWeight = '700';
        btnConfirm.style.border = 'none';
        btnConfirm.style.borderRadius = '25px';
        
        btnCancel.onclick = () => {
            document.body.removeChild(overlay);
            resolve(false);
        };
        
        btnConfirm.onclick = () => {
            document.body.removeChild(overlay);
            resolve(true);
        };
        
        btnContainer.appendChild(btnCancel);
        btnContainer.appendChild(btnConfirm);
        
        modal.appendChild(icon);
        modal.appendChild(text);
        modal.appendChild(btnContainer);
        overlay.appendChild(modal);
        
        document.body.appendChild(overlay);
    });
}

export function showAlert(message, type = 'info') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        overlay.style.zIndex = '100000';
        overlay.style.background = 'rgba(8, 12, 20, 0.8)';
        overlay.style.backdropFilter = 'blur(10px)';
        
        const modal = document.createElement('div');
        modal.className = 'modal-content glass-card';
        modal.style.maxWidth = '420px';
        modal.style.width = '90%';
        modal.style.textAlign = 'center';
        modal.style.padding = '2.2rem 2rem';
        modal.style.border = '1px solid rgba(0, 255, 255, 0.3)';
        modal.style.borderRadius = '20px';
        modal.style.boxShadow = '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 25px rgba(0, 255, 255, 0.15)';
        
        const icon = document.createElement('div');
        icon.innerText = type === 'error' ? '⚠️' : '⚡';
        icon.style.fontSize = '2.5rem';
        icon.style.marginBottom = '1rem';
        
        const text = document.createElement('p');
        text.innerText = message;
        text.style.color = '#fff';
        text.style.fontSize = '1.1rem';
        text.style.lineHeight = '1.5';
        text.style.marginBottom = '2rem';
        
        const btnConfirm = document.createElement('button');
        btnConfirm.className = 'btn btn-primary';
        btnConfirm.innerText = 'Got it';
        btnConfirm.style.width = '100%';
        btnConfirm.style.padding = '0.75rem';
        btnConfirm.style.cursor = 'pointer';
        btnConfirm.style.background = 'linear-gradient(135deg, var(--accent-cyan, #00ffff) 0%, #0088ff 100%)';
        btnConfirm.style.color = '#0d121c';
        btnConfirm.style.fontWeight = '700';
        btnConfirm.style.border = 'none';
        btnConfirm.style.borderRadius = '25px';
        
        btnConfirm.onclick = () => {
            document.body.removeChild(overlay);
            resolve(true);
        };
        
        modal.appendChild(icon);
        modal.appendChild(text);
        modal.appendChild(btnConfirm);
        overlay.appendChild(modal);
        
        document.body.appendChild(overlay);
    });
}

export function showToast(message, type = 'info') {
    const existing = document.querySelector('.custom-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    
    let icon = "ℹ️";
    if (type === 'success') icon = "✅";
    if (type === 'error') icon = "❌";
    if (type === 'warning') icon = "⚠️";

    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '12px';
    toast.style.background = 'rgba(15, 20, 32, 0.95)';
    toast.style.backdropFilter = 'blur(12px)';
    toast.style.webkitBackdropFilter = 'blur(12px)';
    toast.style.border = '1px solid rgba(0, 255, 255, 0.25)';
    toast.style.boxShadow = '0 12px 35px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 255, 255, 0.2)';
    toast.style.borderRadius = '14px';
    toast.style.padding = '1rem 1.4rem';
    toast.style.zIndex = '100001';
    
    toast.innerHTML = `<span style="font-size: 1.3rem; flex-shrink:0;">${icon}</span> <span style="line-height:1.4; font-size: 0.95rem;">${message}</span>`;
    
    document.body.appendChild(toast);
    
    void toast.offsetWidth;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Attach globally to window for easy access anywhere
if (typeof window !== 'undefined') {
    window.showToast = showToast;
    window.showAlert = showAlert;
    window.showConfirm = showConfirm;
}

export function openDocumentViewer(url) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.padding = '2rem';
    overlay.style.backgroundColor = 'rgba(10, 10, 15, 0.95)';
    overlay.style.backdropFilter = 'blur(10px)';
    
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'flex-end';
    header.style.width = '100%';
    header.style.marginBottom = '1rem';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.innerText = 'Close Viewer';
    closeBtn.style.padding = '0.5rem 1rem';
    closeBtn.style.backgroundColor = 'var(--accent-purple)';
    closeBtn.style.color = '#fff';
    closeBtn.onclick = () => document.body.removeChild(overlay);
    
    header.appendChild(closeBtn);
    
    const iframeContainer = document.createElement('div');
    iframeContainer.className = 'glass-card';
    iframeContainer.style.width = '100%';
    iframeContainer.style.height = '100%';
    iframeContainer.style.overflow = 'hidden';
    iframeContainer.style.padding = '0';
    iframeContainer.style.display = 'flex';
    iframeContainer.style.alignItems = 'center';
    iframeContainer.style.justifyContent = 'center';
    
    const isImage = url.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i) != null;
    const isVideo = url.match(/\.(mp4|webm|ogg)(\?.*)?$/i) != null;
    
    let mediaElement;
    if (isImage) {
        mediaElement = document.createElement('img');
        mediaElement.src = url;
        mediaElement.style.width = '100%';
        mediaElement.style.height = '100%';
        mediaElement.style.objectFit = 'contain';
    } else if (isVideo) {
        mediaElement = document.createElement('video');
        mediaElement.src = url;
        mediaElement.controls = true;
        mediaElement.style.width = '100%';
        mediaElement.style.height = '100%';
        mediaElement.style.objectFit = 'contain';
    } else {
        mediaElement = document.createElement('iframe');
        mediaElement.src = url;
        mediaElement.style.width = '100%';
        mediaElement.style.height = '100%';
        mediaElement.style.border = 'none';
    }
    mediaElement.style.borderRadius = '16px';
    
    iframeContainer.appendChild(mediaElement);
    overlay.appendChild(header);
    overlay.appendChild(iframeContainer);
    
    document.body.appendChild(overlay);
}

export function showTextModal(title, text) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    
    const modal = document.createElement('div');
    modal.className = 'modal-content glass-card';
    modal.style.maxWidth = '600px';
    modal.style.width = '90%';
    modal.style.maxHeight = '80vh';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.textAlign = 'left';
    modal.style.padding = '2rem';
    
    const titleEl = document.createElement('h3');
    titleEl.innerText = title;
    titleEl.style.color = 'var(--accent-cyan)';
    titleEl.style.marginBottom = '1rem';
    
    const contentBox = document.createElement('div');
    contentBox.style.overflowY = 'auto';
    contentBox.style.flex = '1';
    contentBox.style.marginBottom = '1.5rem';
    contentBox.style.paddingRight = '0.5rem';
    
    const textEl = document.createElement('p');
    textEl.innerText = text;
    textEl.style.color = 'var(--text-primary)';
    textEl.style.fontSize = '1rem';
    textEl.style.lineHeight = '1.6';
    textEl.style.whiteSpace = 'pre-wrap';
    
    contentBox.appendChild(textEl);
    
    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.justifyContent = 'flex-end';
    
    const btnConfirm = document.createElement('button');
    btnConfirm.className = 'btn btn-primary';
    btnConfirm.innerText = 'Close';
    btnConfirm.style.padding = '0.75rem 2rem';
    btnConfirm.style.cursor = 'pointer';
    btnConfirm.style.borderRadius = '25px';
    
    btnConfirm.onclick = () => {
        document.body.removeChild(overlay);
    };
    
    btnContainer.appendChild(btnConfirm);
    
    modal.appendChild(titleEl);
    modal.appendChild(contentBox);
    modal.appendChild(btnContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}
