/**
 * BigQuery Release Hub - Frontend JavaScript
 * Handles fetching, parsing, filtering, searching, and sharing release notes.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Application State
    const state = {
        rawEntries: [],       // Raw entries directly from XML
        releases: [],         // Parsed granular release items
        filteredReleases: [], // Filtered and searched releases
        currentFilter: 'all', // 'all', 'Feature', 'Issue', 'Deprecation', 'Other'
        searchQuery: '',
        sortBy: 'newest',     // 'newest', 'oldest'
        lastSync: null,
        activeShareItem: null // Currently selected item for sharing
    };

    // DOM Elements
    const elements = {
        refreshBtn: document.getElementById('refresh-btn'),
        syncStatus: document.getElementById('sync-status'),
        valTotal: document.getElementById('val-total'),
        valFeatures: document.getElementById('val-features'),
        valIssues: document.getElementById('val-issues'),
        valSync: document.getElementById('val-sync'),
        searchInput: document.getElementById('search-input'),
        searchClear: document.getElementById('search-clear'),
        filterChips: document.getElementById('filter-chips'),
        sortSelect: document.getElementById('sort-select'),
        feedContainer: document.getElementById('feed-container'),
        toastContainer: document.getElementById('toast-container'),
        
        // Modal Elements
        composerModal: document.getElementById('composer-modal'),
        modalClose: document.getElementById('modal-close'),
        modalCancelBtn: document.getElementById('modal-cancel-btn'),
        modalSubmitBtn: document.getElementById('modal-submit-btn'),
        tweetTextarea: document.getElementById('tweet-textarea'),
        charCounter: document.getElementById('char-counter'),
        mockupText: document.getElementById('mockup-text')
    };

    // Initialize the App
    init();

    function init() {
        // Event Listeners
        elements.refreshBtn.addEventListener('click', fetchReleaseNotes);
        elements.searchInput.addEventListener('input', handleSearch);
        elements.searchClear.addEventListener('click', clearSearch);
        elements.sortSelect.addEventListener('change', handleSortChange);
        elements.filterChips.addEventListener('click', handleFilterChange);
        
        // Modal Event Listeners
        elements.modalClose.addEventListener('click', closeComposerModal);
        elements.modalCancelBtn.addEventListener('click', closeComposerModal);
        elements.modalSubmitBtn.addEventListener('click', submitTweet);
        elements.tweetTextarea.addEventListener('input', handleTweetTextareaInput);

        // Initial fetch
        fetchReleaseNotes();
    }

    /* ==========================================================================
       DATA FETCHING & PARSING
       ========================================================================== */
    async function fetchReleaseNotes() {
        setLoadingState(true);
        try {
            const response = await fetch('/api/releases');
            const result = await response.json();

            if (result.status === 'success') {
                state.rawEntries = result.data;
                state.lastSync = new Date();
                
                // Process the raw feed content into granular items
                processReleases(result.data);
                
                updateStats();
                applyFiltersAndRender();
                setSyncStatus('online', 'Synced');
            } else {
                throw new Error(result.message || 'Failed to fetch release notes');
            }
        } catch (error) {
            console.error(error);
            setSyncStatus('offline', 'Sync Error');
            renderError(error.message);
        } finally {
            setLoadingState(false);
        }
    }

    function processReleases(entries) {
        const items = [];
        const parser = new DOMParser();

        entries.forEach(entry => {
            const doc = parser.parseFromString(entry.content, 'text/html');
            const children = Array.from(doc.body.children);
            
            if (children.length === 0) {
                // Fallback for simple content
                const text = entry.content.replace(/<[^>]*>/g, '').trim();
                items.push({
                    id: entry.id,
                    date: entry.title,
                    timestamp: new Date(entry.updated),
                    link: entry.link,
                    type: 'Other',
                    html: entry.content,
                    text: text
                });
                return;
            }

            let currentType = 'Other';
            let currentElements = [];

            children.forEach(child => {
                if (child.tagName === 'H3') {
                    // Save previous item
                    if (currentElements.length > 0) {
                        pushProcessedItem(items, entry, currentType, currentElements);
                        currentElements = [];
                    }
                    currentType = child.textContent.trim();
                } else {
                    currentElements.push(child);
                }
            });

            // Save final item
            if (currentElements.length > 0) {
                pushProcessedItem(items, entry, currentType, currentElements);
            }
        });

        state.releases = items;
    }

    function pushProcessedItem(itemsList, entry, type, elements) {
        const tempDiv = document.createElement('div');
        elements.forEach(el => tempDiv.appendChild(el.cloneNode(true)));
        
        // Ensure standard type classification
        let normalizedType = 'Other';
        if (type.toLowerCase().includes('feature')) {
            normalizedType = 'Feature';
        } else if (type.toLowerCase().includes('issue') || type.toLowerCase().includes('bug')) {
            normalizedType = 'Issue';
        } else if (type.toLowerCase().includes('deprecation')) {
            normalizedType = 'Deprecation';
        }

        itemsList.push({
            id: `${entry.id}_${itemsList.length}`,
            date: entry.title,
            timestamp: new Date(entry.updated),
            link: entry.link,
            type: normalizedType,
            html: tempDiv.innerHTML,
            text: tempDiv.textContent.replace(/\s+/g, ' ').trim()
        });
    }

    /* ==========================================================================
       STATS & UI STATE UPDATES
       ========================================================================== */
    function updateStats() {
        const total = state.releases.length;
        const features = state.releases.filter(r => r.type === 'Feature').length;
        const issues = state.releases.filter(r => r.type === 'Issue').length;

        elements.valTotal.textContent = total;
        elements.valFeatures.textContent = features;
        elements.valIssues.textContent = issues;
        
        if (state.lastSync) {
            elements.valSync.textContent = state.lastSync.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            elements.refreshBtn.classList.add('spinning');
            elements.refreshBtn.disabled = true;
            setSyncStatus('loading', 'Fetching...');
            renderSkeletons();
        } else {
            elements.refreshBtn.classList.remove('spinning');
            elements.refreshBtn.disabled = false;
        }
    }

    function setSyncStatus(status, text) {
        elements.syncStatus.className = 'sync-status';
        elements.syncStatus.classList.add(status);
        elements.syncStatus.querySelector('.status-text').textContent = text;
    }

    /* ==========================================================================
       FILTER, SEARCH & SORT LOGIC
       ========================================================================== */
    function handleSearch(e) {
        state.searchQuery = e.target.value.toLowerCase().trim();
        elements.searchClear.style.display = state.searchQuery ? 'block' : 'none';
        applyFiltersAndRender();
    }

    function clearSearch() {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.searchClear.style.display = 'none';
        applyFiltersAndRender();
    }

    function handleSortChange(e) {
        state.sortBy = e.target.value;
        applyFiltersAndRender();
    }

    function handleFilterChange(e) {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        // Update active chip
        elements.filterChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        state.currentFilter = chip.dataset.filter;
        applyFiltersAndRender();
    }

    function applyFiltersAndRender() {
        let results = [...state.releases];

        // 1. Apply Type Filter
        if (state.currentFilter !== 'all') {
            results = results.filter(release => release.type === state.currentFilter);
        }

        // 2. Apply Search Query
        if (state.searchQuery) {
            results = results.filter(release => {
                return (
                    release.text.toLowerCase().includes(state.searchQuery) ||
                    release.date.toLowerCase().includes(state.searchQuery) ||
                    release.type.toLowerCase().includes(state.searchQuery)
                );
            });
        }

        // 3. Apply Sort Order
        results.sort((a, b) => {
            if (state.sortBy === 'newest') {
                return b.timestamp - a.timestamp;
            } else {
                return a.timestamp - b.timestamp;
            }
        });

        state.filteredReleases = results;
        renderReleases();
    }

    /* ==========================================================================
       RENDERING FUNCTIONS
       ========================================================================== */
    function renderReleases() {
        elements.feedContainer.innerHTML = '';

        if (state.filteredReleases.length === 0) {
            renderEmptyState();
            return;
        }

        state.filteredReleases.forEach(item => {
            const card = document.createElement('article');
            card.className = 'release-card';
            card.setAttribute('aria-label', `${item.type} update on ${item.date}`);
            
            // Format Badge Style class
            const badgeClass = `badge-${item.type.toLowerCase()}`;

            card.innerHTML = `
                <div class="card-header-row">
                    <div class="card-meta">
                        <span class="card-date">${item.date}</span>
                        <span class="card-badge ${badgeClass}">${item.type}</span>
                    </div>
                    <div class="card-actions">
                        <button class="action-btn btn-copy" title="Copy link to this release" aria-label="Copy Release Link">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                            </svg>
                        </button>
                        <button class="action-btn btn-tweet" title="Share update on Twitter" aria-label="Tweet this Release">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    ${item.html}
                </div>
            `;

            // Wire up actions
            card.querySelector('.btn-copy').addEventListener('click', () => copyToClipboard(item.link));
            card.querySelector('.btn-tweet').addEventListener('click', () => shareOnTwitter(item));

            elements.feedContainer.appendChild(card);
        });
    }

    function renderSkeletons() {
        elements.feedContainer.innerHTML = `
            <div class="skeleton-card" aria-hidden="true"></div>
            <div class="skeleton-card" aria-hidden="true"></div>
            <div class="skeleton-card" aria-hidden="true"></div>
        `;
    }

    function renderEmptyState() {
        elements.feedContainer.innerHTML = `
            <div class="empty-card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="M21 21l-4.3-4.3M8 11h6"></path>
                </svg>
                <h3>No matching release notes</h3>
                <p>We couldn't find any release notes matching "${state.searchQuery}" in the "${state.currentFilter}" filter.</p>
                <button id="reset-search-btn" class="btn btn-primary">Clear Filters</button>
            </div>
        `;
        document.getElementById('reset-search-btn').addEventListener('click', () => {
            clearSearch();
            // Reset filters to All
            const allChip = elements.filterChips.querySelector('[data-filter="all"]');
            if (allChip) allChip.click();
        });
    }

    function renderError(message) {
        elements.feedContainer.innerHTML = `
            <div class="error-card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>Failed to load release notes</h3>
                <p>${message || 'An unexpected error occurred while parsing the feed.'}</p>
                <button id="retry-btn" class="btn btn-primary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                    </svg>
                    <span>Try Again</span>
                </button>
            </div>
        `;
        document.getElementById('retry-btn').addEventListener('click', fetchReleaseNotes);
    }

    /* ==========================================================================
       ACTION HANDLERS (CLIPBOARD & TWITTER)
       ========================================================================== */
    function copyToClipboard(url) {
        navigator.clipboard.writeText(url).then(() => {
            showToast('Link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            showToast('Failed to copy link', 'error');
        });
    }

    function shareOnTwitter(item) {
        state.activeShareItem = item;
        
        // Compose tweet content
        const maxDetailsLen = 110;
        let details = item.text;
        
        // Trim and truncate
        if (details.length > maxDetailsLen) {
            details = details.substring(0, maxDetailsLen).trim() + '...';
        }

        const initialTweetText = `Google BigQuery Update [${item.date}] - ${item.type}:\n"${details}"`;
        elements.tweetTextarea.value = initialTweetText;
        
        // Open Modal
        elements.composerModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Disable page scroll
        
        // Update Live Preview and Counter
        updateLivePreview();
    }

    function closeComposerModal() {
        elements.composerModal.style.display = 'none';
        document.body.style.overflow = ''; // Restore page scroll
        state.activeShareItem = null;
    }

    function handleTweetTextareaInput() {
        updateLivePreview();
    }

    function updateLivePreview() {
        if (!state.activeShareItem) return;
        
        const text = elements.tweetTextarea.value;
        const remaining = 280 - text.length;
        
        elements.charCounter.textContent = `${text.length} / 280`;
        
        // Style character counter warning levels
        elements.charCounter.className = 'char-counter';
        if (remaining <= 30 && remaining > 0) {
            elements.charCounter.classList.add('warning');
        } else if (remaining <= 0) {
            elements.charCounter.classList.add('error');
        }
        
        // Enable/Disable Post button
        elements.modalSubmitBtn.disabled = text.length > 280 || text.length === 0;

        // Populate Twitter mockup text and format tags in blue
        const hashtags = '#BigQuery #GoogleCloud';
        const formattedLink = `<span style="color:#1d9bf0; word-break:break-all;">${state.activeShareItem.link}</span>`;
        const formattedHashtags = hashtags.split(' ').map(tag => `<span style="color:#1d9bf0;">${tag}</span>`).join(' ');
        
        const htmlSafeText = escapeHtml(text).replace(/\n/g, '<br>');
        
        elements.mockupText.innerHTML = `
            <div>${htmlSafeText}</div>
            <div style="margin-top: 8px;">${formattedLink}</div>
            <div style="margin-top: 4px;">${formattedHashtags}</div>
        `;
    }

    function submitTweet() {
        if (!state.activeShareItem) return;
        
        const text = elements.tweetTextarea.value;
        
        // Compose final Twitter intent URL
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(state.activeShareItem.link)}&hashtags=BigQuery,GoogleCloud`;
        
        window.open(tweetUrl, '_blank', 'noopener,noreferrer');
        closeComposerModal();
    }

    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Success SVG Checkmark or Alert SVG
        const iconHtml = type === 'success' ? 
            `<div class="toast-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
             </div>` : 
            `<div class="toast-icon" style="color:var(--accent-deprecation)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
             </div>`;

        toast.innerHTML = `
            ${iconHtml}
            <span>${message}</span>
        `;

        elements.toastContainer.appendChild(toast);

        // Animate out and remove
        setTimeout(() => {
            toast.classList.add('toast-fadeout');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    }
});
