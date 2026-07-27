import { auth } from './firebase-config.js';
import { showToast } from './ui-utils.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const projectId = "hydrohub-215";
let visitedUid = null;
let currentUid = null;
let visitedFollowers = [];
let visitedFollowing = [];
let isFollowing = false;

// Monitor authentication state to adjust Follow / Edit button visibility
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUid = user.uid;
  } else {
    currentUid = null;
  }
  updateFollowButtonState();
});

async function loadProfileView() {
  const urlParams = new URLSearchParams(window.location.search);
  let targetUid = urlParams.get('user') || urlParams.get('uid');
  let targetHandle = urlParams.get('handle') || urlParams.get('username');

  // Check if URL pathname contains /@handle syntax directly
  const pathname = window.location.pathname;
  if (pathname.includes('/@')) {
    targetHandle = pathname.split('/@')[1].split('/')[0].split('?')[0];
  }

  if (!targetUid && !targetHandle) {
    showNotFound();
    return;
  }

  try {
    const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    let userDoc = null;

    if (targetUid) {
      const res = await fetch(`${base}/users/${targetUid}`).catch(() => null);
      if (res && res.ok) {
        userDoc = await res.json();
      }
    }

    // If no document yet and we have a handle, search across users collection
    if (!userDoc && targetHandle) {
      const allRes = await fetch(`${base}/users`).catch(() => null);
      if (allRes && allRes.ok) {
        const data = await allRes.json();
        if (data.documents) {
          userDoc = data.documents.find(d => {
            const f = d.fields || {};
            return (f.username?.stringValue?.toLowerCase() === targetHandle.toLowerCase());
          });
        }
      }
    }

    if (!userDoc || !userDoc.fields) {
      showNotFound();
      return;
    }

    const fields = userDoc.fields;
    visitedUid = userDoc.name.split('/').pop();

    renderUserData(fields, visitedUid);
    fetchUserPapers(visitedUid, fields.email?.stringValue);

  } catch (err) {
    console.error("Error loading profile view:", err);
    showNotFound();
  }
}

function showNotFound() {
  document.getElementById('profile-loading').style.display = 'none';
  document.getElementById('profile-not-found').style.display = 'block';
}

function renderUserData(f, uid) {
  document.getElementById('profile-loading').style.display = 'none';
  const container = document.getElementById('profile-view-container');
  container.style.display = 'block';

  // Display Name & Handle
  const displayName = f.name?.stringValue || f.displayName?.stringValue || 'HydroStat Researcher';
  document.getElementById('profile-display-name').innerText = displayName;
  document.title = `${displayName} | HydroStat Researcher`;

  const handle = f.username?.stringValue || f.handle?.stringValue;
  if (handle) {
    const pill = document.getElementById('profile-handle-pill');
    pill.innerText = `@${handle}`;
    pill.style.display = 'inline-block';
  }

  // Avatar
  const avatar = f.profilePicture?.stringValue || f.avatarUrl?.stringValue || 'assets/Default%20logo.png';
  document.getElementById('profile-avatar-img').src = avatar;

  // Bio
  const bio = f.bio?.stringValue;
  if (bio) {
    document.getElementById('profile-bio-text').innerText = bio;
  }

  // Meta (University, Field of Study, Location)
  if (f.university?.stringValue) {
    document.getElementById('text-university').innerText = f.university.stringValue;
    document.getElementById('meta-university').style.display = 'inline-flex';
  }
  if (f["field-study"]?.stringValue || f.field_study?.stringValue) {
    document.getElementById('text-field').innerText = f["field-study"]?.stringValue || f.field_study?.stringValue;
    document.getElementById('meta-field').style.display = 'inline-flex';
  }
  if (f.location?.stringValue) {
    document.getElementById('text-location').innerText = f.location.stringValue;
    document.getElementById('meta-location').style.display = 'inline-flex';
  }

  // Followers & Following counts
  visitedFollowers = (f.followers?.arrayValue?.values || []).map(v => v.stringValue).filter(Boolean);
  visitedFollowing = (f.following?.arrayValue?.values || []).map(v => v.stringValue).filter(Boolean);
  
  document.getElementById('stat-followers').innerText = visitedFollowers.length.toString();
  document.getElementById('stat-following').innerText = visitedFollowing.length.toString();
  updateFollowButtonState();

  // Social Links
  let hasSocial = false;
  const github = f.github?.stringValue;
  const linkedin = f.linkedin?.stringValue;
  const orcid = f.orcid?.stringValue;
  const website = f.website?.stringValue;

  if (github) {
    const el = document.getElementById('link-github');
    el.href = github.startsWith('http') ? github : `https://github.com/${github.replace('@', '')}`;
    el.style.display = 'inline-flex';
    hasSocial = true;
  }
  if (linkedin) {
    const el = document.getElementById('link-linkedin');
    el.href = linkedin.startsWith('http') ? linkedin : `https://linkedin.com/in/${linkedin}`;
    el.style.display = 'inline-flex';
    hasSocial = true;
  }
  if (orcid) {
    const el = document.getElementById('link-orcid');
    el.href = orcid.startsWith('http') ? orcid : `https://orcid.org/${orcid}`;
    el.style.display = 'inline-flex';
    hasSocial = true;
  }
  if (website) {
    const el = document.getElementById('link-website');
    el.href = website.startsWith('http') ? website : `https://${website}`;
    el.style.display = 'inline-flex';
    hasSocial = true;
  }
  if (hasSocial) {
    document.getElementById('profile-social-row').style.display = 'flex';
  }
}

function updateFollowButtonState() {
  const btnFollow = document.getElementById('btn-follow');
  const btnEdit = document.getElementById('btn-edit-my-profile');
  if (!btnFollow || !visitedUid) return;

  // If user viewing their own profile, show "Edit Profile" instead of Follow
  if (currentUid && currentUid === visitedUid) {
    btnFollow.style.display = 'none';
    btnEdit.style.display = 'inline-flex';
    return;
  }

  btnEdit.style.display = 'none';
  btnFollow.style.display = 'inline-flex';

  isFollowing = currentUid ? visitedFollowers.includes(currentUid) : false;
  
  if (isFollowing) {
    btnFollow.classList.add('following');
    document.getElementById('follow-icon').innerText = '✓';
    document.getElementById('follow-text').innerText = 'Following';
  } else {
    btnFollow.classList.remove('following');
    document.getElementById('follow-icon').innerText = '+';
    document.getElementById('follow-text').innerText = 'Follow';
  }
}

// Setup button listeners for interactive hover & click
const btnFollow = document.getElementById('btn-follow');
if (btnFollow) {
  btnFollow.addEventListener('click', toggleFollow);
  
  btnFollow.addEventListener('mouseenter', () => {
    if (isFollowing) {
      document.getElementById('follow-icon').innerText = '✕';
      document.getElementById('follow-text').innerText = 'Unfollow';
    }
  });
  
  btnFollow.addEventListener('mouseleave', () => {
    if (isFollowing) {
      document.getElementById('follow-icon').innerText = '✓';
      document.getElementById('follow-text').innerText = 'Following';
    }
  });
}

async function toggleFollow() {
  if (!currentUid || !auth.currentUser) {
    showToast("Please sign in or create an account first to follow community researchers!", "info");
    const navLogin = document.getElementById('nav-login-btn');
    if (navLogin) navLogin.click();
    return;
  }

  const btn = document.getElementById('btn-follow');
  btn.disabled = true;

  try {
    const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    
    // 1. Fetch latest visited user doc to avoid overwriting recent changes
    const vRes = await fetch(`${base}/users/${visitedUid}`);
    const vDoc = await vRes.json();
    let vFollowers = (vDoc.fields?.followers?.arrayValue?.values || []).map(v => v.stringValue).filter(Boolean);

    // 2. Fetch latest current user doc
    const cRes = await fetch(`${base}/users/${currentUid}`);
    const cDoc = await cRes.json();
    let cFollowing = (cDoc.fields?.following?.arrayValue?.values || []).map(v => v.stringValue).filter(Boolean);

    if (isFollowing) {
      // Unfollow
      vFollowers = vFollowers.filter(id => id !== currentUid);
      cFollowing = cFollowing.filter(id => id !== visitedUid);
      isFollowing = false;
    } else {
      // Follow
      if (!vFollowers.includes(currentUid)) vFollowers.push(currentUid);
      if (!cFollowing.includes(visitedUid)) cFollowing.push(visitedUid);
      isFollowing = true;
    }

    // Immediately reflect changes on UI
    visitedFollowers = vFollowers;
    document.getElementById('stat-followers').innerText = vFollowers.length.toString();
    updateFollowButtonState();

    // Persist to Firestore via REST API
    const patchVisited = fetch(`${base}/users/${visitedUid}?updateMask.fieldPaths=followers`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          ...vDoc.fields,
          followers: {
            arrayValue: {
              values: vFollowers.map(id => ({ stringValue: id }))
            }
          }
        }
      })
    });

    const patchCurrent = fetch(`${base}/users/${currentUid}?updateMask.fieldPaths=following`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          ...cDoc.fields,
          following: {
            arrayValue: {
              values: cFollowing.map(id => ({ stringValue: id }))
            }
          }
        }
      })
    });

    await Promise.all([patchVisited, patchCurrent]);

  } catch (err) {
    console.error("Error updating follow state:", err);
    showToast("Could not complete this request. Please try again.", "error");
  } finally {
    btn.disabled = false;
  }
}

async function fetchUserPapers(uid, userEmail) {
  const grid = document.getElementById('profile-papers-grid');
  const countPill = document.getElementById('paper-count-pill');
  if (!grid) return;

  try {
    const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const res = await fetch(`${base}/researchPapers`).catch(() => null);
    if (!res || !res.ok) {
      grid.innerHTML = `<p style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center;">No public research papers found.</p>`;
      return;
    }
    
    const data = await res.json();
    if (!data.documents) {
      grid.innerHTML = `<p style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center;">No public research papers published yet.</p>`;
      return;
    }

    const userPapers = data.documents.filter(doc => {
      const f = doc.fields || {};
      const upUid = f.uploadedBy?.stringValue;
      const upEmail = f.uploaderEmail?.stringValue;
      return (upUid === uid) || (userEmail && upEmail === userEmail);
    });

    countPill.innerText = userPapers.length.toString();

    if (userPapers.length === 0) {
      grid.innerHTML = `<p style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center; padding: 2rem;">No public research papers published by this researcher yet.</p>`;
      return;
    }

    let html = '';
    userPapers.forEach(doc => {
      const f = doc.fields || {};
      const title = f.title?.stringValue || 'Research Paper';
      const desc = f.description?.stringValue || 'Open-access hydrogen fuel research upload.';
      const fileUrl = f.fileUrl?.stringValue || '#';
      const date = f.date?.stringValue || f.timestamp?.stringValue?.split('T')[0] || 'Recent';

      html += `
        <a href="${fileUrl}" target="_blank" class="paper-preview-card">
          <div>
            <h3 class="paper-card-title">${title}</h3>
            <p class="paper-card-desc">${desc}</p>
          </div>
          <div class="paper-card-footer">
            <span>📅 ${date}</span>
            <span style="color: var(--accent-cyan); font-weight: 600;">Read Paper ↗</span>
          </div>
        </a>
      `;
    });

    grid.innerHTML = html;

  } catch (err) {
    console.error("Error fetching researcher papers:", err);
    grid.innerHTML = `<p style="color: #ff6666; grid-column: 1 / -1; text-align: center;">Failed to load published papers.</p>`;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadProfileView);
} else {
  loadProfileView();
}
