import { auth, db } from './firebase-config.js';
import './search.js';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// --- INJECT AUTH MODAL INTO DOM ---
const modalHTML = `
<div id="auth-modal" class="modal-overlay" style="display: none;">
  <div class="modal-content glass-card">
    <button class="modal-close" id="btn-close-modal">&times;</button>
    <div class="modal-header">
      <h2 id="auth-title">Welcome Back</h2>
      <p id="auth-subtitle">Log in to upload and manage your research.</p>
    </div>
    
    <div class="auth-form-group">
      <label>Email</label>
      <input type="email" id="auth-email" placeholder="you@example.com" class="glass-input">
    </div>
    
    <div class="auth-form-group">
      <label>Password</label>
      <input type="password" id="auth-password" placeholder="••••••••" class="glass-input">
      <div id="auth-forgot-container" style="text-align: right; margin-top: 0.5rem;">
        <a href="#" id="auth-forgot-btn" style="color: var(--accent-cyan); font-size: 0.85rem; text-decoration: none;">Forgot Password?</a>
      </div>
    </div>

    <div id="auth-error" style="display: none; background: rgba(255, 77, 77, 0.1); border: 1px solid rgba(255, 77, 77, 0.3); color: #ff6666; padding: 0.8rem; border-radius: 8px; font-size: 0.9rem; margin-top: 1rem; align-items: flex-start; gap: 0.6rem;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top: 2px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      <span id="auth-error-text" style="line-height: 1.4;"></span>
    </div>
    <div id="auth-success" style="display: none; background: rgba(0, 230, 204, 0.1); border: 1px solid rgba(0, 230, 204, 0.3); color: var(--accent-cyan); padding: 0.8rem; border-radius: 8px; font-size: 0.9rem; margin-top: 1rem; align-items: flex-start; gap: 0.6rem;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top: 2px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      <span id="auth-success-text" style="line-height: 1.4;"></span>
    </div>

    <button id="btn-submit-auth" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Log In</button>
    
    <div style="text-align: center; margin: 1rem 0; color: var(--text-secondary); font-size: 0.9rem;">OR</div>
    <button id="btn-google-auth" class="btn btn-outline" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;">
      <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      Continue with Google
    </button>
    
    <p class="auth-switch-text">
      <span id="auth-switch-prompt">Don't have an account?</span> 
      <a href="#" id="auth-switch-btn" style="color: var(--accent-cyan);">Sign Up</a>
    </p>
  </div>
</div>
`;

document.body.insertAdjacentHTML('beforeend', modalHTML);

// --- MODAL LOGIC ---
const authModal = document.getElementById('auth-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const btnSubmitAuth = document.getElementById('btn-submit-auth');
const btnGoogleAuth = document.getElementById('btn-google-auth');
const authSwitchBtn = document.getElementById('auth-switch-btn');
const authSwitchPrompt = document.getElementById('auth-switch-prompt');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');
const authErrorText = document.getElementById('auth-error-text');
const authSuccess = document.getElementById('auth-success');
const authSuccessText = document.getElementById('auth-success-text');
const authForgotContainer = document.getElementById('auth-forgot-container');
const btnForgot = document.getElementById('auth-forgot-btn');

const googleProvider = new GoogleAuthProvider();

let isLoginMode = true;

function getFriendlyErrorMessage(error) {
  const code = error.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
    return 'Invalid email or password. Please try again.';
  }
  if (code === 'auth/email-already-in-use') return 'An account already exists with this email address.';
  if (code === 'auth/weak-password') return 'Your password is too weak. Please use a stronger password.';
  if (code === 'auth/invalid-email') return 'The email address is not valid.';
  if (code === 'auth/too-many-requests') return 'Too many failed attempts. Please try again later.';
  if (code === 'auth/network-request-failed') return 'Network error. Please check your internet connection.';
  if (code === 'auth/unauthorized-domain') return 'Google Sign-In blocked: Your Netlify domain is not added to Firebase Authorized Domains yet.';
  if (code === 'auth/popup-closed-by-user') return 'Google Sign-In popup was closed before completing.';
  
  // Strip the "Firebase: " prefix from unknown errors for a cleaner look
  let msg = error.message || 'An unknown error occurred.';
  if (msg.startsWith('Firebase: ')) {
    msg = msg.replace('Firebase: ', '');
  }
  return msg;
}

export function openAuthModal() {
  authError.style.display = 'none';
  authSuccess.style.display = 'none';
  authModal.style.display = 'flex';
}

function closeAuthModal() {
  authModal.style.display = 'none';
  emailInput.value = '';
  passwordInput.value = '';
}

function showAuthError(message) {
  authErrorText.innerText = message;
  authError.style.display = 'flex';
  authSuccess.style.display = 'none';
}

function showAuthSuccess(message) {
  authSuccessText.innerText = message;
  authSuccess.style.display = 'flex';
  authError.style.display = 'none';
}

btnCloseModal.addEventListener('click', closeAuthModal);

// Close if clicked outside
window.addEventListener('click', (e) => {
  if (e.target === authModal) {
    closeAuthModal();
  }
});

authSwitchBtn.addEventListener('click', (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  authError.style.display = 'none';
  authSuccess.style.display = 'none';
  
  if (isLoginMode) {
    authTitle.innerText = 'Welcome Back';
    authSubtitle.innerText = 'Log in to upload and manage your research.';
    btnSubmitAuth.innerText = 'Log In';
    authSwitchPrompt.innerText = "Don't have an account?";
    authSwitchBtn.innerText = 'Sign Up';
    authForgotContainer.style.display = 'block';
  } else {
    authTitle.innerText = 'Create Account';
    authSubtitle.innerText = 'Join the HydroStat research community.';
    btnSubmitAuth.innerText = 'Sign Up';
    authSwitchPrompt.innerText = "Already have an account?";
    authSwitchBtn.innerText = 'Log In';
    authForgotContainer.style.display = 'none';
  }
});

btnForgot.addEventListener('click', async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  if (!email) {
    showAuthError("Please enter your email address first.");
    return;
  }
  
  btnForgot.innerText = 'Sending...';
  try {
    await sendPasswordResetEmail(auth, email);
    showAuthSuccess("Password reset email sent! Check your inbox.");
  } catch (error) {
    showAuthError(getFriendlyErrorMessage(error));
  } finally {
    btnForgot.innerText = 'Forgot Password?';
  }
});

// --- FIREBASE AUTH LOGIC ---

async function checkProfileAndRedirect(user) {
  // Enforce Email Verification
  if (!user.emailVerified) {
    showAuthError("Please verify your email before continuing. Check your inbox for the link.");
    await signOut(auth); // Log them out to prevent bypass
    return;
  }

  // Check if user has completed profile setup using REST API
  try {
      const token = await user.getIdToken();
      const url = `https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents/users/${user.uid}`;
      const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        // 404 means the document doesn't exist
        if (!window.location.pathname.includes('profile-setup.html')) {
            window.location.href = 'profile-setup.html';
        }
      } else {
          closeAuthModal();
      }
  } catch (error) {
      console.error("Error checking profile:", error);
      // Fallback
      closeAuthModal();
  }
}

[emailInput, passwordInput].forEach(input => {
  if (input) {
      input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
              e.preventDefault();
              if (btnSubmitAuth) btnSubmitAuth.click();
          }
      });
  }
});

btnSubmitAuth.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showAuthError('Please fill in all fields.');
      return;
    }

    btnSubmitAuth.disabled = true;
    btnSubmitAuth.innerText = 'Loading...';

    try {
      if (isLoginMode) {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        await checkProfileAndRedirect(userCred.user);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await sendEmailVerification(user);
        
        showAuthSuccess("Verification email sent! Please check your inbox and verify your email, then log in.");
        
        // Switch to login mode automatically
        isLoginMode = true;
        authTitle.innerText = 'Welcome Back';
        authSubtitle.innerText = 'Log in to upload and manage your research.';
        btnSubmitAuth.innerText = 'Log In';
        authSwitchPrompt.innerText = "Don't have an account?";
        authSwitchBtn.innerText = 'Sign Up';
        authForgotContainer.style.display = 'block';
        passwordInput.value = '';
      }
    } catch (error) {
      console.error("Auth Error:", error);
      showAuthError(getFriendlyErrorMessage(error));
    } finally {
      btnSubmitAuth.disabled = false;
      btnSubmitAuth.innerText = isLoginMode ? 'Log In' : 'Sign Up';
    }
});

btnGoogleAuth.addEventListener('click', async () => {
    btnGoogleAuth.disabled = true;
    const originalText = btnGoogleAuth.innerHTML;
    btnGoogleAuth.innerHTML = 'Connecting...';
    
    try {
      const userCred = await signInWithPopup(auth, googleProvider);
      await checkProfileAndRedirect(userCred.user);
    } catch (error) {
      console.error("Google Auth Error:", error);
      showAuthError(getFriendlyErrorMessage(error));
    } finally {
      btnGoogleAuth.disabled = false;
      btnGoogleAuth.innerHTML = originalText;
    }
});

// --- NAVBAR UPDATE LOGIC ---
onAuthStateChanged(auth, (user) => {
  const navContainer = document.querySelector('.nav-links');
  if (!navContainer) return;

  // Remove existing auth buttons if any
  const existingAuthItem = document.getElementById('nav-auth-item');
  if (existingAuthItem) existingAuthItem.remove();

  const authLi = document.createElement('li');
  authLi.id = 'nav-auth-item';

  if (user) {
    // Generate a Random Hue based on user UID
    const charCode = user.uid ? (user.uid.charCodeAt(0) + user.uid.charCodeAt(user.uid.length - 1)) : Math.floor(Math.random() * 360);
    const hueDeg = (charCode * 45) % 360; // Multiply to spread out the color spectrum
    
    let avatarUrl = 'assets/Default%20logo.png';
    let filterStyle = `filter: hue-rotate(${hueDeg}deg) saturate(1.5);`;
    
    if (user.photoURL && user.photoURL.includes('cloudinary.com')) {
        avatarUrl = user.photoURL;
        filterStyle = ''; // Don't apply filters to custom uploaded pictures
    }

    authLi.innerHTML = `
        <div class="nav-auth-container">
            <img src="${avatarUrl}" alt="Profile" class="nav-avatar" style="${filterStyle}" referrerpolicy="no-referrer">
            <div class="nav-dropdown">
                <div class="dropdown-user-info" style="padding: 0.8rem 1.2rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: rgba(0, 255, 255, 0.03);">
                    <div style="font-weight: 700; color: #fff; font-size: 0.95rem; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.displayName || user.email?.split('@')[0] || 'Researcher'}</div>
                    <div id="nav-dropdown-handle" style="font-size: 0.8rem; color: var(--accent-cyan, #00ffff); margin-bottom: 0.7rem;">@member</div>
                    <div style="display: flex; gap: 0.6rem; align-items: center; font-size: 0.82rem;">
                        <a href="account.html?v=3" style="padding: 0; background: none !important; color: rgba(255,255,255,0.8); display: inline-flex; gap: 4px; align-items: center; width: auto; font-weight: 500;">
                            <strong id="nav-stat-followers" style="color: #fff; font-size: 0.95rem;">0</strong> Followers
                        </a>
                        <span style="color: rgba(255,255,255,0.25);">•</span>
                        <a href="account.html?v=3" style="padding: 0; background: none !important; color: rgba(255,255,255,0.8); display: inline-flex; gap: 4px; align-items: center; width: auto; font-weight: 500;">
                            <strong id="nav-stat-following" style="color: #fff; font-size: 0.95rem;">0</strong> Following
                        </a>
                    </div>
                </div>
                <div style="padding: 0.3rem 0;">
                    <a href="account.html?v=3">My Account</a>
                    <a href="#" id="nav-notifications-btn" style="display: flex; align-items: center; justify-content: space-between;">
                        <span>🔔 Notifications</span>
                        <span id="nav-notif-count" style="background: rgba(0, 255, 255, 0.15); color: var(--accent-cyan, #00ffff); font-size: 0.72rem; padding: 2px 7px; border-radius: 10px; font-weight: 700; border: 1px solid rgba(0, 255, 255, 0.3);">0</span>
                    </a>
                    <a href="#" id="nav-switch-btn">Switch Account</a>
                    <div class="dropdown-divider"></div>
                    <a href="#" id="nav-logout-btn" style="color: #ff6666;">Log Out</a>
                </div>
            </div>
        </div>
    `;
    navContainer.appendChild(authLi);
    
    // Fetch live social stats & notifications count
    fetchNavSocialStats(user);

    // Notifications Click Handler
    const notifBtn = document.getElementById('nav-notifications-btn');
    if (notifBtn) {
        notifBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openGlobalNotificationModal(user);
        });
    }

    // Switch Account Logic
    document.getElementById('nav-switch-btn').addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth).then(() => {
            if (window.location.pathname.includes('account.html') || window.location.pathname.includes('upload.html')) {
                window.location.href = 'index.html';
            } else {
                openAuthModal();
            }
        });
    });

    // Logout Logic
    document.getElementById('nav-logout-btn').addEventListener('click', (e) => {
      e.preventDefault();
      signOut(auth).then(() => {
          if (window.location.pathname.includes('account.html') || window.location.pathname.includes('upload.html')) {
              window.location.href = 'index.html';
          }
      });
    });
  } else {
    // Remove logout button if it exists
    const existingLogoutItem = document.getElementById('nav-logout-item');
    if (existingLogoutItem) existingLogoutItem.remove();

    authLi.innerHTML = `<a href="#" id="nav-login-btn" style="color: var(--accent-cyan); font-weight: bold; border: 1px solid var(--accent-cyan); padding: 0.4rem 1rem; border-radius: 20px;">Login / Sign Up</a>`;
    navContainer.appendChild(authLi);
    
    document.getElementById('nav-login-btn').addEventListener('click', (e) => {
      e.preventDefault();
      openAuthModal();
    });
  }
});

async function fetchNavSocialStats(user) {
  try {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents`;
    
    // 1. Get user profile data (followers & following counts, handle)
    const resUser = await fetch(`${baseUrl}/users/${user.uid}`);
    if (resUser.ok) {
      const uData = await resUser.json();
      const fld = uData.fields || {};
      const followers = fld.followers?.arrayValue?.values || [];
      const following = fld.following?.arrayValue?.values || [];
      const handle = fld.handle?.stringValue || fld.username?.stringValue || user.email?.split('@')[0] || 'member';
      
      const folEl = document.getElementById('nav-stat-followers');
      const finEl = document.getElementById('nav-stat-following');
      const hndEl = document.getElementById('nav-dropdown-handle');
      
      if (folEl) folEl.innerText = followers.length;
      if (finEl) finEl.innerText = following.length;
      if (hndEl) hndEl.innerText = `@${handle}`;
    }

    // 2. Get unread notifications count
    const resNotif = await fetch(`${baseUrl}/users/${user.uid}/notifications`);
    if (resNotif.ok) {
      const nData = await resNotif.json();
      const docs = nData.documents || [];
      let unread = 0;
      docs.forEach(d => {
        if (!d.fields?.read?.booleanValue) unread++;
      });
      const badge = document.getElementById('nav-notif-count');
      if (badge) {
        badge.innerText = unread > 0 ? `${unread} New` : `0`;
        if (unread > 0) {
          badge.style.background = 'linear-gradient(135deg, #ff007f, #7928ca)';
          badge.style.color = '#fff';
          badge.style.borderColor = 'transparent';
          badge.style.boxShadow = '0 0 10px rgba(255, 0, 127, 0.5)';
        }
      }
    }
  } catch (e) {
    console.error("Could not fetch navigation statistics:", e);
  }
}

async function openGlobalNotificationModal(user) {
  let modal = document.getElementById('global-notifications-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'global-notifications-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); z-index: 100000;
      display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.25s ease; padding: 1rem;
    `;
    modal.innerHTML = `
      <div style="background: rgba(15, 22, 40, 0.95); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 16px; width: 100%; max-width: 480px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 255, 255, 0.15); overflow: hidden; transform: translateY(20px); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
        <div style="padding: 1.2rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; background: rgba(0, 255, 255, 0.05);">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span style="font-size: 1.3rem;">🔔</span>
            <h3 style="margin: 0; color: #fff; font-size: 1.1rem; font-weight: 700; font-family: var(--font-heading, sans-serif);">Notifications</h3>
          </div>
          <div style="display: flex; gap: 0.8rem; align-items: center;">
            <button id="modal-mark-all-read" style="background: transparent; color: var(--accent-cyan, #00ffff); border: 1px solid rgba(0,255,255,0.3); padding: 5px 12px; border-radius: 12px; font-size: 0.78rem; cursor: pointer; transition: all 0.2s; font-weight: 600;">Mark Read ✓</button>
            <button id="close-notif-modal" style="background: none; border: none; color: rgba(255,255,255,0.6); font-size: 1.6rem; cursor: pointer; padding: 0; line-height: 1;">&times;</button>
          </div>
        </div>
        <div id="modal-notif-list" style="padding: 1.2rem 1.5rem; max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.8rem;">
          <p style="color: var(--text-secondary, #aaa); margin: 0; text-align: center; padding: 1.5rem 0;">Loading notifications...</p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      modal.firstElementChild.style.transform = 'translateY(0)';
    });
    
    document.getElementById('close-notif-modal').onclick = () => closeGlobalNotificationModal();
    modal.onclick = (e) => { if (e.target === modal) closeGlobalNotificationModal(); };
  } else {
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      modal.firstElementChild.style.transform = 'translateY(0)';
    });
  }

  const listContainer = document.getElementById('modal-notif-list');
  try {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents/users/${user.uid}/notifications`;
    const res = await fetch(baseUrl);
    if (res.ok) {
      const data = await res.json();
      const docs = data.documents || [];
      if (docs.length === 0) {
        listContainer.innerHTML = `
          <div style="text-align: center; padding: 2.5rem 1rem;">
            <div style="font-size: 2.8rem; margin-bottom: 0.6rem; opacity: 0.8;">✨</div>
            <p style="color: #fff; font-weight: 600; font-size: 1.05rem; margin: 0 0 6px 0;">All caught up!</p>
            <p style="color: rgba(255,255,255,0.5); font-size: 0.88rem; margin: 0;">You have no unread notifications right now.</p>
          </div>
        `;
      } else {
        listContainer.innerHTML = '';
        docs.reverse().forEach(doc => {
          const f = doc.fields || {};
          const msg = f.message?.stringValue || 'New activity on HydroStat';
          const read = f.read?.booleanValue || false;
          const link = f.link?.stringValue || 'account.html?v=3';
          
          const item = document.createElement('div');
          item.style.cssText = `
            padding: 0.9rem 1.1rem; border-radius: 12px; transition: all 0.2s; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 1rem;
            background: ${read ? 'rgba(255,255,255,0.03)' : 'rgba(0, 255, 255, 0.08)'};
            border: 1px solid ${read ? 'rgba(255,255,255,0.06)' : 'rgba(0, 255, 255, 0.3)'};
          `;
          item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.8rem;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${read ? 'transparent' : '#00ffff'}; box-shadow: ${read ? 'none' : '0 0 8px #00ffff'}; flex-shrink: 0;"></span>
              <span style="color: ${read ? 'rgba(255,255,255,0.7)' : '#fff'}; font-size: 0.92rem; font-weight: ${read ? '400' : '600'}; line-height: 1.4;">${msg}</span>
            </div>
            <span style="color: rgba(255,255,255,0.4); font-size: 1.2rem;">&rsaquo;</span>
          `;
          item.onmouseover = () => { item.style.transform = 'translateX(4px)'; item.style.background = 'rgba(0, 255, 255, 0.12)'; };
          item.onmouseout = () => { item.style.transform = 'translateX(0)'; item.style.background = read ? 'rgba(255,255,255,0.03)' : 'rgba(0, 255, 255, 0.08)'; };
          item.onclick = () => {
            window.location.href = link;
          };
          listContainer.appendChild(item);
        });
      }
    } else {
      listContainer.innerHTML = `<p style="color: #ff6666; text-align: center;">Could not load notifications at this moment.</p>`;
    }
  } catch (err) {
    console.error("Error loading notification modal:", err);
    listContainer.innerHTML = `<p style="color: #ff6666; text-align: center;">Error loading notifications.</p>`;
  }

  const btnMark = document.getElementById('modal-mark-all-read');
  if (btnMark) {
    btnMark.onclick = async () => {
      if (window.showToast) window.showToast("All notifications marked as read ✓", "success");
      const badge = document.getElementById('nav-notif-count');
      if (badge) {
        badge.innerText = '0';
        badge.style.background = 'rgba(0, 255, 255, 0.15)';
        badge.style.color = 'var(--accent-cyan, #00ffff)';
        badge.style.boxShadow = 'none';
        badge.style.border = '1px solid rgba(0, 255, 255, 0.3)';
      }
      Array.from(listContainer.children).forEach(el => {
        el.style.background = 'rgba(255,255,255,0.03)';
        el.style.border = '1px solid rgba(255,255,255,0.06)';
        const dot = el.querySelector('span:first-child');
        if (dot) { dot.style.background = 'transparent'; dot.style.boxShadow = 'none'; }
        const text = el.querySelector('span:nth-child(2)');
        if (text) { text.style.color = 'rgba(255,255,255,0.7)'; text.style.fontWeight = '400'; }
      });
    };
  }
}

function closeGlobalNotificationModal() {
  const modal = document.getElementById('global-notifications-modal');
  if (modal) {
    modal.style.opacity = '0';
    if (modal.firstElementChild) modal.firstElementChild.style.transform = 'translateY(20px)';
    setTimeout(() => { modal.style.display = 'none'; }, 250);
  }
}



