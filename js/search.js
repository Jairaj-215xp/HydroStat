import { auth, db } from './firebase-config.js';

const projectId = "hydrohub-215";
let searchData = { users: [], papers: [], doubts: [], loaded: false, loading: false };
let currentTab = 'all';

// --- INJECT SEARCH MODAL & STYLES ---
const searchModalStyles = `
<style>
  /* Search Trigger Button in Navbar */
  #open-global-search:hover {
    border-color: var(--accent-cyan, #00ffff) !important;
    background: rgba(0, 255, 255, 0.1) !important;
    box-shadow: 0 0 14px rgba(0, 255, 255, 0.3);
    transform: translateY(-1px);
  }
  
  /* Search Modal Overlay */
  .search-modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(8, 12, 20, 0.82);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: 99999;
    display: none;
    justify-content: center;
    align-items: flex-start;
    padding-top: 12vh;
    opacity: 0;
    transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .search-modal-overlay.active {
    display: flex;
    opacity: 1;
  }

  /* Modal Dialog Box */
  .search-modal-box {
    width: 92%;
    max-width: 720px;
    background: rgba(18, 24, 38, 0.96);
    border: 1px solid rgba(0, 255, 255, 0.25);
    border-radius: 20px;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(0, 255, 255, 0.15);
    overflow: hidden;
    transform: scale(0.96) translateY(-10px);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
  }
  .search-modal-overlay.active .search-modal-box {
    transform: scale(1) translateY(0);
  }

  /* Search Header Input */
  .search-input-header {
    display: flex;
    align-items: center;
    padding: 0.5rem 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.25);
  }
  .search-input-header input {
    flex: 1;
    background: transparent;
    border: none;
    color: #fff;
    font-size: 1.2rem;
    padding: 1rem 0;
    outline: none;
    font-family: inherit;
  }
  .search-input-header input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
  .search-esc-badge {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-secondary, rgba(255, 255, 255, 0.7));
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 0.75rem;
    font-family: monospace;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
  }
  .search-esc-badge:hover {
    background: rgba(255, 77, 77, 0.2);
    border-color: #ff6666;
    color: #ff6666;
  }

  /* Filter Tabs */
  .search-filter-tabs {
    display: flex;
    gap: 0.6rem;
    padding: 0.8rem 1.5rem;
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .search-tab-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: var(--text-secondary, #aaa);
    padding: 0.45rem 1.1rem;
    border-radius: 20px;
    font-size: 0.86rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.25s ease;
    white-space: nowrap;
    font-family: inherit;
  }
  .search-tab-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }
  .search-tab-btn.active {
    background: rgba(0, 255, 255, 0.15);
    border-color: var(--accent-cyan, #00ffff);
    color: var(--accent-cyan, #00ffff);
    box-shadow: 0 0 14px rgba(0, 255, 255, 0.25);
  }

  /* Results Container */
  .search-results-area {
    max-height: 55vh;
    overflow-y: auto;
    padding: 1.2rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  
  /* Result Cards */
  .search-result-card {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    padding: 1rem 1.2rem;
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    text-decoration: none;
    color: inherit;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .search-result-card:hover {
    background: rgba(0, 255, 255, 0.07);
    border-color: rgba(0, 255, 255, 0.4);
    transform: translateX(6px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
  
  /* Avatars & Icons */
  .search-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(0, 255, 255, 0.4);
    background: rgba(255,255,255,0.05);
    flex-shrink: 0;
  }
  .search-icon-box {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: rgba(0, 255, 255, 0.1);
    border: 1px solid rgba(0, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    flex-shrink: 0;
  }
  .search-info {
    flex: 1;
    min-width: 0;
  }
  .search-title {
    font-weight: 600;
    font-size: 1.05rem;
    color: #fff;
    margin: 0 0 0.25rem 0;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .search-handle {
    color: var(--accent-cyan, #00ffff);
    font-size: 0.9rem;
    font-weight: 500;
  }
  .search-desc {
    color: rgba(255, 255, 255, 0.65);
    font-size: 0.88rem;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .search-badge-tag {
    font-size: 0.72rem;
    padding: 0.15rem 0.6rem;
    border-radius: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .badge-user { background: rgba(0, 255, 255, 0.15); color: #00ffff; border: 1px solid rgba(0, 255, 255, 0.3); }
  .badge-paper { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
  .badge-forum { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
  
  .search-arrow {
    color: rgba(255, 255, 255, 0.3);
    font-size: 1.25rem;
    transition: color 0.2s ease, transform 0.2s ease;
  }
  .search-result-card:hover .search-arrow {
    color: var(--accent-cyan, #00ffff);
    transform: translateX(3px);
  }
  
  /* Scrollbar */
  .search-results-area::-webkit-scrollbar { width: 6px; }
  .search-results-area::-webkit-scrollbar-track { background: transparent; }
  .search-results-area::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.18); border-radius: 4px; }
  .search-results-area::-webkit-scrollbar-thumb:hover { background: rgba(0, 255, 255, 0.4); }
</style>

<div id="global-search-modal" class="search-modal-overlay">
  <div class="search-modal-box">
    <div class="search-input-header">
      <span style="font-size: 1.4rem; margin-right: 0.8rem; opacity: 0.8;">🔍</span>
      <input type="text" id="global-search-input" placeholder="Search researchers, hydrogen papers, topics..." autocomplete="off">
      <button class="search-esc-badge" id="btn-close-search">ESC</button>
    </div>
    
    <div class="search-filter-tabs">
      <button class="search-tab-btn active" data-tab="all">🌐 All Results</button>
      <button class="search-tab-btn" data-tab="users">👥 Researchers & Users</button>
      <button class="search-tab-btn" data-tab="papers">📄 Research Papers</button>
      <button class="search-tab-btn" data-tab="forum">💬 Forum Q&A</button>
    </div>
    
    <div class="search-results-area" id="search-results-container">
      <div style="text-align: center; padding: 3.5rem 1rem; color: rgba(255, 255, 255, 0.7);">
        <div style="font-size: 2.5rem; margin-bottom: 0.8rem;">⚡</div>
        <p style="font-size: 1.2rem; font-weight: 600; margin-bottom: 0.4rem; color: #fff;">Explore HydroStat</p>
        <p style="font-size: 0.92rem; max-width: 420px; margin: 0 auto;">Search for community researchers by name or handle, browse uploaded open-access research papers, or find Q&A discussions.</p>
      </div>
    </div>
  </div>
</div>
`;

// Inject styles and modal into DOM when ready
function initSearchModal() {
  if (document.getElementById('global-search-modal')) return;
  document.body.insertAdjacentHTML('beforeend', searchModalStyles);

  setupNavbarSearch();

  const modal = document.getElementById('global-search-modal');
  const btnClose = document.getElementById('btn-close-search');
  const input = document.getElementById('global-search-input');
  const tabs = document.querySelectorAll('.search-tab-btn');

  if (btnClose) btnClose.addEventListener('click', closeSearchModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeSearchModal();
    });
  }

  if (input) {
    input.addEventListener('input', triggerFilter);
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.getAttribute('data-tab');
      triggerFilter();
    });
  });

  // Global Keyboard Shortcuts (Ctrl+K or Cmd+K)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggleSearchModal();
    }
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeSearchModal();
    }
  });
}

function setupNavbarSearch() {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks || document.getElementById('nav-search-item')) return;

  const searchLi = document.createElement('li');
  searchLi.id = 'nav-search-item';
  searchLi.style.display = 'inline-flex';
  searchLi.style.alignItems = 'center';
  searchLi.innerHTML = `
    <a href="#" id="open-global-search" style="display: flex; align-items: center; gap: 6px; padding: 0.38rem 0.9rem; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 20px; font-size: 0.9rem; color: #fff; text-decoration: none; transition: all 0.25s ease;">
      <span style="font-size: 0.95rem; line-height: 1;">🔍</span>
      <span style="font-weight: 500;">Search</span>
      <span style="font-size: 0.72rem; padding: 0.12rem 0.45rem; background: rgba(0, 255, 255, 0.12); border: 1px solid var(--accent-cyan, #00ffff); color: var(--accent-cyan, #00ffff); border-radius: 4px; font-family: monospace; margin-left: 4px; letter-spacing: 0.5px;">Ctrl+K</span>
    </a>
  `;

  // Place before auth button if possible
  const authItem = document.getElementById('nav-auth-item');
  if (authItem && authItem.parentNode === navLinks) {
    navLinks.insertBefore(searchLi, authItem);
  } else {
    navLinks.appendChild(searchLi);
  }

  const triggerBtn = document.getElementById('open-global-search');
  if (triggerBtn) {
    triggerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openSearchModal();
    });
  }
}

function openSearchModal() {
  const modal = document.getElementById('global-search-modal');
  const input = document.getElementById('global-search-input');
  if (!modal) return;
  modal.classList.add('active');
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 50);
  }
  fetchSearchData();
}

function closeSearchModal() {
  const modal = document.getElementById('global-search-modal');
  if (modal) modal.classList.remove('active');
}

function toggleSearchModal() {
  const modal = document.getElementById('global-search-modal');
  if (modal && modal.classList.contains('active')) {
    closeSearchModal();
  } else {
    openSearchModal();
  }
}

async function fetchSearchData() {
  if (searchData.loaded || searchData.loading) return;
  searchData.loading = true;
  const container = document.getElementById('search-results-container');
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
        <p>⚡ Fetching community researchers and papers...</p>
      </div>
    `;
  }

  try {
    const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const [usersRes, papersRes, doubtsRes] = await Promise.all([
      fetch(`${base}/users`).catch(() => null),
      fetch(`${base}/researchPapers`).catch(() => null),
      fetch(`${base}/doubts`).catch(() => null)
    ]);

    if (usersRes && usersRes.ok) {
      const uData = await usersRes.json();
      if (uData.documents) {
        searchData.users = uData.documents.map(doc => {
          const f = doc.fields || {};
          return {
            uid: doc.name.split('/').pop(),
            username: f.username?.stringValue || '',
            name: f.name?.stringValue || f.displayName?.stringValue || f.email?.stringValue?.split('@')[0] || 'HydroStat Member',
            bio: f.bio?.stringValue || f.university?.stringValue || f["field-study"]?.stringValue || 'Clean Energy Enthusiast & Researcher',
            avatarUrl: f.profilePicture?.stringValue || f.avatarUrl?.stringValue || 'assets/Default%20logo.png'
          };
        });
      }
    }

    if (papersRes && papersRes.ok) {
      const pData = await papersRes.json();
      if (pData.documents) {
        searchData.papers = pData.documents.map(doc => {
          const f = doc.fields || {};
          return {
            id: doc.name.split('/').pop(),
            title: f.title?.stringValue || f.fileName?.stringValue || 'Research Paper',
            authors: f.authors?.stringValue || 'Community Researcher',
            description: f.description?.stringValue || 'Uploaded to HydroStat Community Research.',
            fileUrl: f.fileUrl?.stringValue || 'community-research.html',
            uploadedBy: f.uploadedBy?.stringValue || ''
          };
        });
      }
    }

    if (doubtsRes && doubtsRes.ok) {
      const dData = await doubtsRes.json();
      if (dData.documents) {
        searchData.doubts = dData.documents.map(doc => {
          const f = doc.fields || {};
          return {
            id: doc.name.split('/').pop(),
            message: f.message?.stringValue || 'Discussion topic',
            authorName: f.authorName?.stringValue || 'Community Member'
          };
        });
      }
    }

    searchData.loaded = true;
    searchData.loading = false;
    triggerFilter();
  } catch (err) {
    console.error("Error fetching global search data:", err);
    searchData.loading = false;
  }
}

function triggerFilter() {
  const input = document.getElementById('global-search-input');
  const query = (input ? input.value.trim().toLowerCase() : '');
  const container = document.getElementById('search-results-container');
  if (!container) return;

  if (!query && !searchData.loaded) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
        <div style="font-size: 2.5rem; margin-bottom: 0.8rem;">⚡</div>
        <p style="font-size: 1.2rem; font-weight: 600; margin-bottom: 0.4rem; color: #fff;">Explore HydroStat</p>
        <p style="font-size: 0.92rem; max-width: 420px; margin: 0 auto;">Search for community researchers by name or handle, browse uploaded open-access research papers, or find Q&A discussions.</p>
      </div>
    `;
    return;
  }

  let matchedUsers = [];
  let matchedPapers = [];
  let matchedDoubts = [];

  if (currentTab === 'all' || currentTab === 'users') {
    matchedUsers = searchData.users.filter(u => 
      u.name.toLowerCase().includes(query) || 
      u.username.toLowerCase().includes(query) || 
      u.bio.toLowerCase().includes(query)
    );
  }

  if (currentTab === 'all' || currentTab === 'papers') {
    matchedPapers = searchData.papers.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.authors.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query)
    );
  }

  if (currentTab === 'all' || currentTab === 'forum') {
    matchedDoubts = searchData.doubts.filter(d =>
      d.message.toLowerCase().includes(query) ||
      d.authorName.toLowerCase().includes(query)
    );
  }

  const totalCount = matchedUsers.length + matchedPapers.length + matchedDoubts.length;

  if (totalCount === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
        <div style="font-size: 2.2rem; margin-bottom: 0.6rem; opacity: 0.7;">📭</div>
        <p style="font-size: 1.1rem; color: #fff;">No matching results found for "${query}"</p>
        <p style="font-size: 0.9rem;">Try searching for a different researcher name, paper keyword, or switch category tabs.</p>
      </div>
    `;
    return;
  }

  let html = '';

  // Render Users
  if (matchedUsers.length > 0) {
    if (currentTab === 'all') {
      html += `<div style="font-size: 0.85rem; font-weight: 600; color: var(--accent-cyan, #00ffff); text-transform: uppercase; letter-spacing: 1px; margin: 0.4rem 0 0.2rem 0;">Researchers & Users (${matchedUsers.length})</div>`;
    }
    matchedUsers.forEach(u => {
      const profileUrl = `profile.html?user=${u.uid}${u.username ? '&handle=' + u.username : ''}`;
      html += `
        <a href="${profileUrl}" class="search-result-card">
          <img src="${u.avatarUrl}" alt="${u.name}" class="search-avatar" onerror="this.src='assets/Default%20logo.png'" referrerpolicy="no-referrer">
          <div class="search-info">
            <div class="search-title">
              <span>${u.name}</span>
              ${u.username ? `<span class="search-handle">@${u.username}</span>` : ''}
              <span class="search-badge-tag badge-user">Researcher</span>
            </div>
            <p class="search-desc">${u.bio}</p>
          </div>
          <div class="search-arrow">&rarr;</div>
        </a>
      `;
    });
  }

  // Render Papers
  if (matchedPapers.length > 0) {
    if (currentTab === 'all' && html.length > 0) {
      html += `<div style="font-size: 0.85rem; font-weight: 600; color: #60a5fa; text-transform: uppercase; letter-spacing: 1px; margin: 0.8rem 0 0.2rem 0;">Research Papers (${matchedPapers.length})</div>`;
    } else if (currentTab === 'all') {
      html += `<div style="font-size: 0.85rem; font-weight: 600; color: #60a5fa; text-transform: uppercase; letter-spacing: 1px; margin: 0.4rem 0 0.2rem 0;">Research Papers (${matchedPapers.length})</div>`;
    }
    matchedPapers.forEach(p => {
      html += `
        <a href="${p.fileUrl}" target="${p.fileUrl !== 'community-research.html' ? '_blank' : '_self'}" class="search-result-card">
          <div class="search-icon-box" style="background: rgba(59, 130, 246, 0.12); border-color: rgba(59, 130, 246, 0.3); color: #60a5fa;">📑</div>
          <div class="search-info">
            <div class="search-title">
              <span>${p.title}</span>
              <span class="search-badge-tag badge-paper">Paper</span>
            </div>
            <p class="search-desc"><strong>By ${p.authors}</strong> &mdash; ${p.description}</p>
          </div>
          <div class="search-arrow">&nearr;</div>
        </a>
      `;
    });
  }

  // Render Doubts / Q&A
  if (matchedDoubts.length > 0) {
    if (currentTab === 'all' && html.length > 0) {
      html += `<div style="font-size: 0.85rem; font-weight: 600; color: #c084fc; text-transform: uppercase; letter-spacing: 1px; margin: 0.8rem 0 0.2rem 0;">Forum Discussions (${matchedDoubts.length})</div>`;
    } else if (currentTab === 'all') {
      html += `<div style="font-size: 0.85rem; font-weight: 600; color: #c084fc; text-transform: uppercase; letter-spacing: 1px; margin: 0.4rem 0 0.2rem 0;">Forum Discussions (${matchedDoubts.length})</div>`;
    }
    matchedDoubts.forEach(d => {
      html += `
        <a href="forum.html" class="search-result-card">
          <div class="search-icon-box" style="background: rgba(168, 85, 247, 0.12); border-color: rgba(168, 85, 247, 0.3); color: #c084fc;">💬</div>
          <div class="search-info">
            <div class="search-title">
              <span>${d.message.length > 55 ? d.message.substring(0, 55) + '...' : d.message}</span>
              <span class="search-badge-tag badge-forum">Q&A Forum</span>
            </div>
            <p class="search-desc">Asked by ${d.authorName}</p>
          </div>
          <div class="search-arrow">&rarr;</div>
        </a>
      `;
    });
  }

  container.innerHTML = html;
}

// Ensure init on page ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSearchModal);
} else {
  initSearchModal();
}
