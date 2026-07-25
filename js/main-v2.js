if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

import { geminiApiKey } from './env.js';
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { showConfirm, showAlert } from './ui-utils.js';

window.userBookmarks = new Set();
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const token = await user.getIdToken();
            const projectId = "hydrohub-215";
            const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${user.uid}/bookmarks`;
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                const data = await response.json();
                if (data.documents) {
                    data.documents.forEach(doc => {
                        const docId = doc.name.split('/').pop();
                        window.userBookmarks.add(docId);
                    });
                }
                document.querySelectorAll('.btn-bookmark-academic').forEach(btn => {
                    if (window.userBookmarks.has(btn.getAttribute('data-id'))) {
                        btn.style.color = 'var(--accent-cyan)';
                        btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="var(--accent-cyan)" stroke="var(--accent-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
                        btn.setAttribute('data-bookmarked', 'true');
                    }
                });
            }
        } catch (e) {
            console.error(e);
        }
    } else {
        window.userBookmarks = new Set();
        document.querySelectorAll('.btn-bookmark-academic').forEach(btn => {
            btn.style.color = 'var(--text-secondary)';
            btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
            btn.removeAttribute('data-bookmarked');
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    window.scrollTo(0, 0);

    // --- Intersection Observer for Scroll Animations ---
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show-element');
                
                // Trigger number counter if it's a stat box
                if(entry.target.classList.contains('hub-stats')) {
                    const counters = entry.target.querySelectorAll('.stat-number');
                    counters.forEach(counter => {
                        const target = +counter.getAttribute('data-target');
                        animateCounter(counter, target);
                    });
                }
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all elements with hidden-element class
    document.querySelectorAll('.hidden-element').forEach(el => {
        observer.observe(el);
    });

    // --- Number Counter Animation ---
    function animateCounter(element, target) {
        let current = 0;
        const increment = target / 50; // Adjust for speed
        const updateCounter = () => {
            if (current < target) {
                current += increment;
                element.innerText = Math.ceil(current);
                setTimeout(updateCounter, 30);
            } else {
                element.innerText = target;
            }
        };
        updateCounter();
    }


    // --- Mock Data Fallback ---
    const mockData = [
        {
            id: 1, type: 'news', title: 'World\'s Largest Green Hydrogen Plant Opens',
            date: 'Today', desc: 'A massive 250MW electrolyser facility has officially commenced operations...',
            image: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url("assets/hydrogen_plant.png")',
            link: '#'
        },
        {
            id: 2, type: 'ideas', title: 'Solid-State Hydrogen Storage: A Game Changer?',
            date: 'Today', desc: 'Researchers have published a new concept utilizing magnesium hydride to store hydrogen safely...',
            image: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url("assets/hydrogen_car.png")',
            link: '#'
        },
        {
            id: 3, type: 'news', title: 'Automakers Commit to Fuel Cell Truck Fleets',
            date: 'Yesterday', desc: 'A consortium of five leading truck manufacturers has signed an accord to transition...',
            image: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url("assets/hydrogen_car.png")',
            link: '#'
        },
        {
            id: 4, type: 'ideas', title: 'Ocean-Based Electrolysis: Harvesting Fuel at Sea',
            date: 'Yesterday', desc: 'A striking new concept proposes floating offshore platforms that use wave energy...',
            image: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url("assets/hydrogen_plant.png")',
            link: '#'
        },
        {
            id: 5, type: 'news', title: 'Aviation Giant Tests Liquid Hydrogen Engine',
            date: '2 Days Ago', desc: 'A modified commercial jet engine ran for 3 hours solely on liquid hydrogen...',
            image: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url("assets/hydrogen_car.png")',
            link: '#'
        },
        {
            id: 6, type: 'ideas', title: 'Photosynthetic Bacteria: Bio-Hydrogen Production',
            date: '3 Days Ago', desc: 'Synthetic biologists are modifying cyanobacteria strains to continuously excrete hydrogen...',
            image: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url("assets/hydrogen_plant.png")',
            link: '#'
        }
    ];

    let currentData = [];
    const newsContainer = document.getElementById('news-container');
    const filterBtns = document.querySelectorAll('.filter-btn');

    // --- Dynamic Data Fetching from Real News Platform ---
    async function fetchDynamicNews() {
        // Using The Guardian's open API to get reliable news with authentic images
        const API_URL = 'https://content.guardianapis.com/search?q=hydrogen%20fuel%20energy&show-fields=thumbnail,headline,trailText&page-size=12&api-key=test';

        try {
            newsContainer.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-secondary);">Loading latest updates...</p>';
            
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            if (data.response && data.response.results && data.response.results.length > 0) {
                const results = data.response.results;
                
                // Filter out results that don't have a thumbnail to ensure we only show cards with images
                const resultsWithImages = results.filter(item => item.fields && item.fields.thumbnail);

                currentData = resultsWithImages.slice(0, 6).map((item, index) => {
                    const isIdea = item.fields.headline.toLowerCase().includes('concept') || 
                                   item.fields.headline.toLowerCase().includes('research') || 
                                   item.fields.headline.toLowerCase().includes('future') ||
                                   index % 3 === 0; 
                                   
                    // Directly use the high quality image from the news publisher
                    const realImage = item.fields.thumbnail;
                    const bgImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url('${realImage}')`;
                    
                    return {
                        id: index + 1,
                        type: isIdea ? 'ideas' : 'news',
                        title: item.fields.headline,
                        date: new Date(item.webPublicationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                        desc: (item.fields.trailText || '').replace(/<[^>]*>?/gm, '').substring(0, 110) + '...',
                        image: bgImage,
                        link: item.webUrl
                    };
                });
            } else {
                currentData = mockData;
            }
        } catch (error) {
            console.error('Error fetching dynamic news:', error);
            currentData = mockData;
        }
        
        // Ensure active filter is applied on load
        const activeFilter = document.querySelector('.filter-btn.active').getAttribute('data-filter');
        renderNews(activeFilter);
    }

    // --- Render News Cards ---
    function renderNews(filterType) {
        newsContainer.innerHTML = ''; 

        const filteredData = filterType === 'all' 
            ? currentData 
            : currentData.filter(item => item.type === filterType);

        if(filteredData.length === 0) {
             newsContainer.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-secondary);">No updates found for this category.</p>';
             return;
        }

        filteredData.forEach((item, index) => {
            const delayClass = `delay-${(index % 3) + 1}`; 
            
            const card = document.createElement('div');
            card.className = `news-card hidden-element ${delayClass}`;
            
            card.innerHTML = `
                <div class="news-image" style="background-image: ${item.image}">
                    <span class="news-tag">${item.type === 'news' ? 'Global News' : 'New Idea'}</span>
                </div>
                <div class="news-content">
                    <span class="news-date">${item.date}</span>
                    <h3 class="news-title">${item.title}</h3>
                    <p class="news-desc">${item.desc}</p>
                    <a href="${item.link}" target="_blank" class="read-more">Read Full Story <span>&rarr;</span></a>
                </div>
            `;
            
            newsContainer.appendChild(card);
            
            setTimeout(() => observer.observe(card), 10);
        });
    }

    // Initialize fetching
    fetchDynamicNews();

    // --- Filter functionality ---
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add to clicked
            e.target.classList.add('active');
            
            const filterValue = e.target.getAttribute('data-filter');
            renderNews(filterValue);
        });
    });

    // --- Navbar Scroll Effect ---
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(10, 10, 15, 0.9)';
            navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
        } else {
            navbar.style.background = 'rgba(10, 10, 15, 0.7)';
            navbar.style.boxShadow = 'none';
        }
    });

    // --- Chatbot Logic ---
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotPanel = document.getElementById('chatbot-panel');
    const chatbotClose = document.getElementById('chatbot-close');
    const chatbotSave = document.getElementById('chatbot-save');
    const chatInputForm = document.getElementById('chat-input-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    let chatHistory = [];

    chatbotToggle.addEventListener('click', () => {
        chatbotPanel.classList.remove('hidden');
    });

    
    if (chatbotSave) {
        chatbotSave.addEventListener('click', async () => {
            if (!auth || !auth.currentUser) {
                showToast("Please log in to save conversations.", "error");
                return;
            }
            if (chatHistory.length === 0) {
                showToast("No conversation to save.", "error");
                return;
            }
            
            try {
                const token = await auth.currentUser.getIdToken();
                const url = `https://firestore.googleapis.com/v1/projects/hydrohub-215/databases/(default)/documents/users/${auth.currentUser.uid}/bot_conversations`;
                
                // Get the first user prompt as title, max 50 chars
                let title = "New Conversation";
                for (let msg of chatHistory) {
                    if (msg.role === 'user' && msg.parts && msg.parts.length > 0) {
                        title = msg.parts[0].text.substring(0, 50);
                        if (msg.parts[0].text.length > 50) title += '...';
                        break;
                    }
                }
                
                const payload = {
                    fields: {
                        timestamp: { stringValue: new Date().toISOString() },
                        title: { stringValue: title },
                        history: { stringValue: JSON.stringify(chatHistory) }
                    }
                };
                
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                if (res.ok) {
                    showToast("Conversation saved successfully!", "success");
                } else {
                    throw new Error("Failed to save");
                }
            } catch(e) {
                console.error("Error saving conversation", e);
                showToast("Error saving conversation.", "error");
            }
        });
    }

    chatbotClose.addEventListener('click', () => {
        chatbotPanel.classList.add('hidden');
    });

    function appendMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}-message`;
        msgDiv.innerHTML = `<p>${text}</p>`;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showLoading() {
        const loader = document.createElement('div');
        loader.className = 'message ai-message loading-msg';
        loader.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
        chatMessages.appendChild(loader);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return loader;
    }

    async function callGeminiAPI(userText) {
        const apiKey = geminiApiKey;
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        chatHistory.push({ role: 'user', parts: [{ text: userText }] });

        const requestBody = {
            system_instruction: {
                parts: { text: "You are an AI assistant specifically built for a website called HydroStat. Your ONLY purpose is to answer questions related to hydrogen fuel, clean energy, fuel cells, and related technologies. Keep your answers extremely short, crisp, and easy to understand (1-3 sentences max). Most importantly: BE DEFINITIVE AND GIVE CONCRETE NUMBERS. Do NOT hedge or say 'it varies', 'it depends', or 'costs vary'. Instead, provide realistic average numerical estimates, prices, or ranges based on the US/Global market in 2024. If the user asks for a rate or cost, give them an actual dollar amount. If the user asks about ANYTHING else (e.g. coding, general history, recipes, math, etc), politely decline and remind them you can only answer questions about hydrogen and clean energy." }
            },
            contents: chatHistory
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                if (response.status === 400) {
                    return "Invalid API Key. Please verify the key provided in the source code.";
                }
                throw new Error('API Request Failed');
            }

            const data = await response.json();
            const aiText = data.candidates[0].content.parts[0].text;
            chatHistory.push({ role: 'model', parts: [{ text: aiText }] });
            return aiText;

        } catch (error) {
            console.error("Gemini API Error:", error);
            return "Sorry, I am having trouble connecting to the network right now.";
        }
    }

    if (chatInputForm) {
        chatInputForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text) return;

            chatInput.value = '';
            appendMessage(text, 'user');

            const loader = showLoading();
            const responseText = await callGeminiAPI(text);
            
            loader.remove();
            // Simple markdown to HTML conversion for bold text
            const formattedText = responseText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            appendMessage(formattedText, 'ai');
        });
    }
});

    // --- Research Papers Fetching ---
    const researchContainer = document.getElementById('research-container');

    async function fetchResearchPapers() {
        if (!researchContainer) return;

        // Fetching 6 recent papers about hydrogen fuel and green energy using OpenAlex API (Polite Pool)
        const API_URL = 'https://api.openalex.org/works?search=hydrogen%20fuel%20cell&per-page=6&sort=publication_date:desc&mailto=contact@hydrostat.com';

        try {
            researchContainer.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-secondary);">Loading latest academic papers...</p>';
            
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const results = data.results;
                researchContainer.innerHTML = '';
                
                results.forEach((item, index) => {
                    const delayClass = `delay-${(index % 3) + 1}`; 
                    
                    const title = item.title || 'Untitled Research Paper';
                    
                    // OpenAlex authors format mapping
                    let authors = 'Various Authors';
                    if (item.authorships && item.authorships.length > 0) {
                        authors = item.authorships.map(a => a.author.display_name).join(', ');
                    }
                    
                    const pubYear = item.publication_year || 'Recent';
                    const readLink = item.doi || item.id || '#';

                    // Provide a default description if abstract isn't easily available
                    let abstract = 'Read this peer-reviewed academic paper exploring recent advancements in hydrogen technology, production methods, and its role in the clean energy economy.';
                    
                    const card = document.createElement('div');
                    card.className = `research-card glass-card ${delayClass}`;
                    
                    const docId = item.id ? item.id.split('/').pop() : 'doc-' + Date.now();
                    
                    const isBookmarked = window.userBookmarks && window.userBookmarks.has(docId);
                    const bookmarkColor = isBookmarked ? 'var(--accent-cyan)' : 'var(--text-secondary)';
                    const bookmarkFill = isBookmarked ? 'var(--accent-cyan)' : 'none';
                    const bookmarkStroke = isBookmarked ? 'var(--accent-cyan)' : 'currentColor';
                    const bookmarkedAttr = isBookmarked ? 'data-bookmarked="true"' : '';
                    
                    card.innerHTML = `
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <h3>${title}</h3>
                            <button class="btn-bookmark-academic" ${bookmarkedAttr} data-id="${docId}" data-title="${title.replace(/"/g, '&quot;')}" data-url="${readLink}" data-authors="${authors.replace(/"/g, '&quot;')}" data-desc="${abstract.replace(/"/g, '&quot;')}" data-date="${pubYear}" data-source="Academic" style="background: none; border: none; cursor: pointer; color: ${bookmarkColor}; transition: color 0.2s;" title="Bookmark this paper">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="${bookmarkFill}" stroke="${bookmarkStroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                                </button>
                            </div>
                            <div class="research-authors">${authors.substring(0, 60)}${authors.length > 60 ? '...' : ''}</div>
                            <p class="research-abstract">${abstract}</p>
                        </div>
                        <div class="research-footer">
                            <span class="research-date">Published: ${pubYear}</span>
                            <a href="${readLink}" target="_blank" class="btn-outline">Read Paper <span>&nearr;</span></a>
                        </div>
                    `;
                    
                    researchContainer.appendChild(card);
                });
                
                // Attach bookmark listeners for academic papers
                document.querySelectorAll('.btn-bookmark-academic').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const btnEl = e.currentTarget;
                        const paperId = btnEl.getAttribute('data-id');
                        const title = btnEl.getAttribute('data-title') || 'Unknown Paper';
                        const fileUrl = btnEl.getAttribute('data-url') || '#';
                        const authors = btnEl.getAttribute('data-authors') || 'Unknown Author';
                        const desc = btnEl.getAttribute('data-desc') || 'No description provided.';
                        const date = btnEl.getAttribute('data-date') || '';
                        const source = btnEl.getAttribute('data-source') || 'Academic';
                        
                        if (!auth.currentUser) {
                            await showAlert("Please log in to bookmark papers."); 
                            return;
                        }
                        
                        try {
                            const projectId = "hydrohub-215";
                            const token = await auth.currentUser.getIdToken();
                            
                            if (btnEl.getAttribute('data-bookmarked') === 'true') {
                                const confirmRemove = await showConfirm("Are you sure you want to unbookmark this paper?");
                                if (!confirmRemove) return;
                                
                                const deleteUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${auth.currentUser.uid}/bookmarks/${paperId}`;
                                const response = await fetch(deleteUrl, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                
                                if (!response.ok) throw new Error("Failed to unbookmark");
                                
                                btnEl.style.color = 'var(--text-secondary)';
                                btnEl.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
                                btnEl.removeAttribute('data-bookmarked');
                                if (window.userBookmarks) window.userBookmarks.delete(paperId);
                                return;
                            }
                            
                            // Bookmarking
                            btnEl.style.color = 'var(--accent-cyan)';
                            btnEl.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="var(--accent-cyan)" stroke="var(--accent-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
                            
                            const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${auth.currentUser.uid}/bookmarks/${paperId}?updateMask.fieldPaths=paperId&updateMask.fieldPaths=title&updateMask.fieldPaths=fileUrl&updateMask.fieldPaths=authors&updateMask.fieldPaths=description&updateMask.fieldPaths=date&updateMask.fieldPaths=source&updateMask.fieldPaths=savedAt`;
                            
                            const response = await fetch(url, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    fields: {
                                        paperId: { stringValue: paperId },
                                        title: { stringValue: title },
                                        fileUrl: { stringValue: fileUrl },
                                        authors: { stringValue: authors },
                                        description: { stringValue: desc },
                                        date: { stringValue: date },
                                        source: { stringValue: source },
                                        savedAt: { timestampValue: new Date().toISOString() }
                                    }
                                })
                            });
                            
                            if (!response.ok) {
                                const errTxt = await response.text();
                                throw new Error(errTxt);
                            }
                            btnEl.setAttribute('data-bookmarked', 'true');
                            if (window.userBookmarks) window.userBookmarks.add(paperId);
                        } catch (err) {
                            console.error("Failed to process bookmark", err);
                        }
                    });
                });
            } else {
                researchContainer.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-secondary);">No recent papers found.</p>';
            }
        } catch (error) {
            console.error('Error fetching research papers:', error);
            researchContainer.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-secondary);">Failed to load academic papers. Please try again later.</p>';
        }
    }

    fetchResearchPapers();

// Ask a Doubt Form handler
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();
            
            if (!message) return;
            
            const btn = contactForm.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.disabled = true;
            btn.innerText = 'Submitting...';
            
            try {
                const projectId = "hydrohub-215";
                const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
                
                const payload = {
                    fields: {
                        message: { stringValue: message },
                        authorName: { stringValue: name || 'Anonymous' },
                        email: { stringValue: email },
                        createdAt: { timestampValue: new Date().toISOString() }
                    }
                };

                let token = null;
                if (auth.currentUser) {
                    token = await auth.currentUser.getIdToken();
                    payload.fields.authorId = { stringValue: auth.currentUser.uid };
                }

                const headers = { 'Content-Type': 'application/json' };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const res = await fetch(`${firestoreBase}/doubts`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error('Failed to post doubt');
                
                contactForm.reset();
                
                // We don't have showToast imported here, so we will use an alert or just change button text
                btn.innerText = 'Question Posted!';
                setTimeout(() => {
                    window.location.href = 'forum.html';
                }, 1000);
            } catch (error) {
                console.error(error);
                btn.innerText = 'Error! Try Again';
                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerText = originalText;
                }, 3000);
            }
        });
    }
});


