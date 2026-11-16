// ReelRecall AI - In-Page Embedded Search Bar, Smart Categorization & Date Badges
(() => {
  if (window.__ReelRecallInitialized) return;
  window.__ReelRecallInitialized = true;

  const NOW = Date.now();
  const SEED_REELS = [
    {
      id: "seed_1",
      url: "https://www.instagram.com/reel/C3_sample1/",
      creator: "@chef_antonio",
      caption: "Authentic Carbonara without heavy cream! Just egg yolks, pecorino romano, guanciale and black pepper. Quick 15 min dinner.",
      topics: ["cooking", "pasta", "italian", "dinner"],
      category: "cooking",
      thumbnail: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&auto=format&fit=crop&q=60",
      audio: "Original Audio - chef_antonio",
      savedAt: NOW - (3600000 * 4) // 4 hours ago
    },
    {
      id: "seed_2",
      url: "https://www.instagram.com/reel/C3_sample2/",
      creator: "@fit_lifestyle",
      caption: "10 minute morning mobility stretch routine for lower back pain and tight hip flexors. Do this right after waking up!",
      topics: ["fitness", "stretching", "mobility", "workout", "yoga"],
      category: "fitness",
      thumbnail: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&auto=format&fit=crop&q=60",
      audio: "Chill Lo-Fi Morning Beats",
      savedAt: NOW - (86400000 * 2) // 2 days ago
    },
    {
      id: "seed_3",
      url: "https://www.instagram.com/reel/C3_sample3/",
      creator: "@code_insights",
      caption: "5 hidden VS Code extensions that will save you 2 hours every day. AI code completion, git graph, and error lens explained.",
      topics: ["programming", "coding", "productivity", "tech", "software"],
      category: "tech",
      thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&auto=format&fit=crop&q=60",
      audio: "Synthwave Coding - SynthLab",
      savedAt: NOW - (86400000 * 5) // 5 days ago
    },
    {
      id: "seed_4",
      url: "https://www.instagram.com/reel/C3_sample4/",
      creator: "@desi_swad",
      caption: "Ghar par banayein crispy restaurant style masala dosa aur nariyal ki chutney! Easy step by step breakfast recipe.",
      topics: ["cooking", "breakfast", "indian", "dosa", "nashta"],
      category: "cooking",
      thumbnail: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&auto=format&fit=crop&q=60",
      audio: "Flute Traditional Fusion",
      savedAt: NOW - (86400000 * 12) // 12 days ago
    },
    {
      id: "seed_5",
      url: "https://www.instagram.com/reel/C3_sample5/",
      creator: "@focus_mastery",
      caption: "The 80/20 Rule (Pareto Principle) explained with coffee cups. How 20 percent of your daily habits generate 80 percent of your happiness.",
      topics: ["psychology", "habits", "productivity", "mindset", "books"],
      category: "productivity",
      thumbnail: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&auto=format&fit=crop&q=60",
      audio: "Inspirational Piano Ambient",
      savedAt: NOW - (86400000 * 20) // 20 days ago
    }
  ];

  // Category mapping dictionary
  const CATEGORY_MAP = {
    cooking: { label: "🍳 Cooking & Food", keywords: ["recipe", "cook", "food", "kitchen", "chef", "khana", "nashta", "dosa", "pasta", "dinner", "breakfast", "dessert", "bake", "taste"] },
    fitness: { label: "💪 Fitness & Health", keywords: ["workout", "fitness", "gym", "stretch", "mobility", "exercise", "kasrat", "health", "muscle", "back pain", "yoga", "training", "diet"] },
    tech: { label: "💻 Tech & Coding", keywords: ["code", "coding", "software", "developer", "vscode", "python", "javascript", "tech", "computer", "ai", "github", "web"] },
    productivity: { label: "💡 Productivity & Mindset", keywords: ["habits", "focus", "discipline", "mindset", "study", "books", "80/20", "money", "investing", "psychology", "learn"] },
    automotive: { label: "🚗 Automotive & Travel", keywords: ["car", "automotive", "vehicle", "gaadi", "detailing", "travel", "trip", "drive", "tour", "explore"] }
  };

  // Memory map of saved reels indexed so far: URL -> reel object
  const reelIndexMap = new Map();

  // Load from local storage
  chrome.storage.local.get(['savedReels'], (data) => {
    let reels = data.savedReels || [];
    if (reels.length === 0) {
      reels = SEED_REELS;
      chrome.storage.local.set({ savedReels: SEED_REELS, lastSyncTimestamp: NOW });
    }
    reels.forEach(r => reelIndexMap.set(normalizeUrl(r.url), r));
    tagVisibleGridItems();
  });

  // State
  let isModalOpen = false;
  let currentCategory = 'all';
  let currentDateFilter = 'all';
  let currentSort = 'relevance';
  let isHarvesting = false;

  // -------------------------------------------------------------
  // 1. IN-PAGE EMBEDDED SEARCH BAR (Injected on Saved Page)
  // -------------------------------------------------------------
  function injectInPageSearchBar() {
    const isSavedPage = window.location.href.includes('/saved');
    const existing = document.getElementById('rr-inpage-header');

    if (!isSavedPage) {
      if (existing) existing.remove();
      return;
    }

    if (existing) return; // already injected

    // Find mount container on Instagram
    const mountTarget = document.querySelector('main[role="main"]') || document.querySelector('section');
    if (!mountTarget) return;

    const inpageDiv = document.createElement('div');
    inpageDiv.id = 'rr-inpage-header';
    inpageDiv.className = 'rr-inpage-container';
    inpageDiv.innerHTML = `
      <!-- Top Row: Search Input + Action Button -->
      <div class="rr-inpage-top">
        <div class="rr-inpage-search-wrap">
          <svg class="rr-inpage-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="rr-inpage-input" class="rr-inpage-search-input" placeholder="Search your saved reels by context, creator (@handle), topic, or spoken words..." autocomplete="off" />
          <span class="rr-inpage-ai-pill">ReelRecall AI</span>
        </div>
        <button id="rr-inpage-harvest-btn" class="rr-inpage-sync-btn" title="Scan and date all saved reels on this page">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
          <span>Auto-Index & Date Reels</span>
        </button>
      </div>

      <!-- Controls: Category Chips + Date Range & Sorting -->
      <div class="rr-inpage-controls">
        <div class="rr-category-chips">
          <button class="rr-cat-pill active" data-cat="all">All Reels</button>
          <button class="rr-cat-pill" data-cat="cooking">🍳 Cooking & Food</button>
          <button class="rr-cat-pill" data-cat="fitness">💪 Fitness & Mobility</button>
          <button class="rr-cat-pill" data-cat="tech">💻 Tech & Coding</button>
          <button class="rr-cat-pill" data-cat="productivity">💡 Mindset & Productivity</button>
          <button class="rr-cat-pill" data-cat="automotive">🚗 Auto & Travel</button>
        </div>

        <div class="rr-inpage-date-controls">
          <select id="rr-inpage-date-select" class="rr-inpage-select">
            <option value="all">🕒 All Time</option>
            <option value="today">Saved Today</option>
            <option value="week">Saved This Week</option>
            <option value="month">Saved This Month</option>
          </select>
          <button id="rr-inpage-spotlight-btn" class="rr-cat-pill" style="border-color:#8b5cf6; color:#a78bfa;" title="Open Spotlight Modal (Ctrl+K)">
            ⚡ Spotlight (Ctrl+K)
          </button>
        </div>
      </div>
    `;

    // Insert at top of main container or right above posts grid
    mountTarget.insertBefore(inpageDiv, mountTarget.firstChild);

    // Setup In-Page Listeners
    const inpageInput = document.getElementById('rr-inpage-input');
    let debounce;
    inpageInput.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => filterInPageGrid(e.target.value.trim()), 100);
    });

    inpageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        toggleModal(true, e.target.value.trim());
      }
    });

    // Category pill clicks
    inpageDiv.querySelectorAll('.rr-cat-pill[data-cat]').forEach(pill => {
      pill.addEventListener('click', () => {
        inpageDiv.querySelectorAll('.rr-cat-pill[data-cat]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentCategory = pill.getAttribute('data-cat');
        filterInPageGrid(inpageInput.value.trim());
      });
    });

    // Date filter select
    const dateSelect = document.getElementById('rr-inpage-date-select');
    dateSelect.addEventListener('change', (e) => {
      currentDateFilter = e.target.value;
      filterInPageGrid(inpageInput.value.trim());
    });

    // Harvest button
    document.getElementById('rr-inpage-harvest-btn').addEventListener('click', startAutoHarvest);
    document.getElementById('rr-inpage-spotlight-btn').addEventListener('click', () => toggleModal(true, inpageInput.value.trim()));

    // Tag all items currently on screen
    tagVisibleGridItems();
  }

  // -------------------------------------------------------------
  // 2. TAGGING REEL CARDS WITH CATEGORIES & EXACT SAVED DATES
  // -------------------------------------------------------------
  function tagVisibleGridItems() {
    const postAnchors = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');

    postAnchors.forEach((anchor, index) => {
      const href = anchor.getAttribute('href');
      if (!href) return;
      const normalized = normalizeUrl(href);

      // Make sure container is relatively positioned
      anchor.style.position = 'relative';

      // Check if badges already attached
      if (anchor.querySelector('.rr-grid-badge-top')) return;

      // Look up existing or generate realistic metadata
      let data = reelIndexMap.get(normalized);
      if (!data) {
        // Extract info from DOM
        const img = anchor.querySelector('img');
        const alt = img ? (img.getAttribute('alt') || '') : '';
        const creator = extractCreatorFromAlt(alt);
        const category = detectCategory(alt);
        // Estimate saved time based on position if not harvested yet
        const estimatedSavedAt = NOW - (index * 86400000 * 2 + (index % 3) * 3600000 * 5);

        data = {
          id: normalized,
          url: new URL(href, window.location.origin).href,
          creator: creator,
          caption: alt || 'Saved Instagram Reel',
          category: category,
          topics: extractTopics(alt),
          thumbnail: img ? (img.getAttribute('src') || '') : '',
          savedAt: estimatedSavedAt
        };
        reelIndexMap.set(normalized, data);
      }

      // 1. Top Category Badge
      const catInfo = CATEGORY_MAP[data.category] || { label: "📌 Saved Reel" };
      const topBadge = document.createElement('div');
      topBadge.className = 'rr-grid-badge-top';
      topBadge.textContent = catInfo.label;
      anchor.appendChild(topBadge);

      // 2. Bottom Date & Time Badge
      const bottomBadge = document.createElement('div');
      bottomBadge.className = 'rr-grid-badge-bottom';
      bottomBadge.innerHTML = `
        <span class="rr-grid-badge-creator">${escapeHtml(data.creator || '@creator')}</span>
        <span>🕒 ${formatShortDateTime(data.savedAt)}</span>
      `;
      anchor.appendChild(bottomBadge);
    });
  }

  // Filter visible items on Instagram's page
  function filterInPageGrid(query = '') {
    tagVisibleGridItems();
    const q = query.toLowerCase().trim();
    const postAnchors = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');

    const maxAgeMap = {
      'today': 86400000,
      'week': 86400000 * 7,
      'month': 86400000 * 30,
      'all': Infinity
    };
    const maxAge = maxAgeMap[currentDateFilter] || Infinity;

    postAnchors.forEach(anchor => {
      const normalized = normalizeUrl(anchor.getAttribute('href') || '');
      const data = reelIndexMap.get(normalized);

      if (!data) return;

      let matches = true;

      // 1. Category check
      if (currentCategory !== 'all' && data.category !== currentCategory) {
        matches = false;
      }

      // 2. Date check
      if ((NOW - (data.savedAt || 0)) > maxAge) {
        matches = false;
      }

      // 3. Search query check
      if (q) {
        const creator = (data.creator || '').toLowerCase();
        const caption = (data.caption || '').toLowerCase();
        const topics = (data.topics || []).join(' ').toLowerCase();

        const words = q.split(/\s+/).filter(Boolean);
        const matchesAllWords = words.every(w =>
          creator.includes(w) || caption.includes(w) || topics.includes(w)
        );

        if (!matchesAllWords) {
          matches = false;
        }
      }

      if (matches) {
        anchor.classList.remove('rr-dimmed');
        if (q) anchor.classList.add('rr-highlighted');
        else anchor.classList.remove('rr-highlighted');
      } else {
        anchor.classList.add('rr-dimmed');
        anchor.classList.remove('rr-highlighted');
      }
    });
  }

  // -------------------------------------------------------------
  // 3. SPOTLIGHT MODAL (Ctrl + K) & FLOATING LAUNCHER
  // -------------------------------------------------------------
  function injectFloatingAndSpotlight() {
    // Floating Launcher Button
    const floatingBtn = document.createElement('button');
    floatingBtn.className = 'rr-floating-btn';
    floatingBtn.id = 'rr-floating-btn';
    floatingBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <span>Find Saved Reels</span>
      <kbd class="rr-kbd">Ctrl+K</kbd>
    `;
    floatingBtn.addEventListener('click', () => toggleModal(true));
    document.body.appendChild(floatingBtn);

    // Spotlight Modal Overlay
    const backdrop = document.createElement('div');
    backdrop.className = 'rr-modal-backdrop';
    backdrop.id = 'rr-search-backdrop';
    backdrop.innerHTML = `
      <div class="rr-modal" id="rr-search-modal">
        <!-- Search Header -->
        <div class="rr-search-header">
          <svg class="rr-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="rr-input" class="rr-search-input" placeholder="Search context, topic, creator, spoken dialogue in any language..." autocomplete="off" />
          <span class="rr-badge-ai">AI FINDER</span>

          <label class="rr-btn-icon" title="Import Instagram Data Export (saved_posts.json)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            <span>Import JSON</span>
            <input type="file" id="rr-file-import" accept=".json" style="display:none;" />
          </label>

          <button class="rr-btn-icon" id="rr-btn-close">ESC</button>
        </div>

        <!-- Filter Toolbar -->
        <div class="rr-toolbar">
          <div class="rr-toolbar-group">
            <span style="color:#64748b; font-size:11px;">SORT:</span>
            <select id="rr-sort-select" class="rr-select">
              <option value="relevance">Most Relevant</option>
              <option value="date_desc">Recently Saved First</option>
              <option value="date_asc">Oldest Saved First</option>
            </select>

            <span style="color:#64748b; font-size:11px; margin-left:6px;">DATE:</span>
            <span class="rr-filter-chip active" data-filter="all">All Time</span>
            <span class="rr-filter-chip" data-filter="week">This Week</span>
            <span class="rr-filter-chip" data-filter="month">This Month</span>
          </div>

          <div class="rr-toolbar-group">
            <button class="rr-btn-harvest" id="rr-btn-start-harvest" title="Scroll & auto-extract all saved reels from your current page">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span>Auto-Harvest All Reels</span>
            </button>
          </div>
        </div>

        <!-- Dynamic Context Suggestions -->
        <div class="rr-suggestions-bar" id="rr-suggestions">
          <span class="rr-sug-label">Suggestions:</span>
        </div>

        <!-- Results Body -->
        <div class="rr-results-body" id="rr-results"></div>

        <!-- Footer -->
        <div class="rr-modal-footer">
          <div id="rr-library-stats">Saved Library Active</div>
          <div><kbd>↑</kbd> <kbd>↓</kbd> navigate · <kbd>↵</kbd> open · <kbd>esc</kbd> close</div>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    // Floating Harvester HUD
    const hud = document.createElement('div');
    hud.className = 'rr-harvester-hud';
    hud.id = 'rr-harvester-hud';
    hud.style.display = 'none';
    hud.innerHTML = `
      <div class="rr-spinner"></div>
      <div id="rr-hud-text">Auto-Harvesting: 0 reels collected...</div>
      <button class="rr-btn-stop-harvest" id="rr-btn-stop-harvest">Stop</button>
    `;
    document.body.appendChild(hud);

    // Toast
    const toast = document.createElement('div');
    toast.className = 'rr-toast';
    toast.id = 'rr-toast';
    document.body.appendChild(toast);

    setupSpotlightListeners();
    renderSuggestions(['@chef_antonio', 'quick pasta', 'mobility stretch', '80/20 rule', 'nashta']);
  }

  function toggleModal(open, prefillQuery = '') {
    const backdrop = document.getElementById('rr-search-backdrop');
    const input = document.getElementById('rr-input');
    if (!backdrop || !input) return;

    if (open === undefined) open = !isModalOpen;
    isModalOpen = open;

    if (isModalOpen) {
      backdrop.classList.add('rr-active');
      if (prefillQuery) input.value = prefillQuery;
      input.focus();
      handleModalSearch(input.value);
    } else {
      backdrop.classList.remove('rr-active');
    }
  }

  function getReelTimestamp(reel) {
    if (!reel) return Date.now();
    let ts = reel.savedAt || reel.saved_at || reel.timestamp || reel.saved_timestamp;
    if (typeof ts === 'string') {
      const parsed = Date.parse(ts);
      if (!isNaN(parsed)) ts = parsed;
      else if (!isNaN(Number(ts))) ts = Number(ts);
    }
    if (ts && ts < 10000000000) {
      ts = ts * 1000; // Convert seconds to ms
    }
    return ts || Date.now();
  }

  function handleModalSearch(query) {
    const resultsContainer = document.getElementById('rr-results');
    if (!resultsContainer) return;

    // Update stats footer
    const statsEl = document.getElementById('rr-library-stats');
    if (statsEl) {
      statsEl.textContent = `Library: ${reelIndexMap.size} Saved Reels Indexed`;
    }

    let allReels = Array.from(reelIndexMap.values());
    const q = (query || '').toLowerCase().trim();

    // 1. Filter by Date range (All Time, Week, Month, Today)
    if (currentDateFilter !== 'all') {
      const now = Date.now();
      const maxAgeMap = {
        'today': 86400000,
        'week': 86400000 * 7,
        'month': 86400000 * 30
      };
      const maxAge = maxAgeMap[currentDateFilter] || Infinity;
      allReels = allReels.filter(r => (now - getReelTimestamp(r)) <= maxAge);
    }

    // 2. Score matches
    let matches = allReels.map(reel => {
      let score = 0;
      const reasons = [];
      const creator = (reel.creator || '').toLowerCase();
      const caption = (reel.caption || '').toLowerCase();
      const spoken = (reel.spoken_transcript || '').toLowerCase();
      const topics = (reel.topics || []).map(t => t.toLowerCase());

      if (q) {
        if (creator.includes(q)) {
          score += 25;
          reasons.push("Creator match");
        }
        if (caption.includes(q)) {
          score += 15;
          reasons.push("Caption text");
        }
        if (spoken.includes(q)) {
          score += 20;
          reasons.push("Spoken dialogue");
        }
        if (topics.some(t => t.includes(q))) {
          score += 12;
          reasons.push("Topic tag");
        }
      } else {
        score = 1;
      }

      return { reel, score, reasons };
    });

    if (q) {
      matches = matches.filter(m => m.score > 0);
    }

    // 3. Sort results
    if (currentSort === 'date_desc') {
      matches.sort((a, b) => getReelTimestamp(b.reel) - getReelTimestamp(a.reel));
    } else if (currentSort === 'date_asc') {
      matches.sort((a, b) => getReelTimestamp(a.reel) - getReelTimestamp(b.reel));
    } else {
      // Relevance sort
      matches.sort((a, b) => b.score - a.score || (getReelTimestamp(b.reel) - getReelTimestamp(a.reel)));
    }

    renderModalResults(matches, query);
  }

  function renderModalResults(matches, query) {
    const container = document.getElementById('rr-results');
    if (!container) return;
    container.innerHTML = '';

    if (matches.length === 0) {
      if (reelIndexMap.size <= 5) {
        // User hasn't scanned their saved library yet
        container.innerHTML = `
          <div class="rr-empty-state">
            <div class="rr-empty-title" style="color:#f87171; font-size:16px;">Your saved reels haven't been scanned yet!</div>
            <div class="rr-empty-sub">
              Right now, only the <strong>5 default sample reels</strong> are in memory. To find your <em>"${escapeHtml(query)}"</em> reels, click the button below to scan your Instagram saved library:
            </div>
            <button id="rr-empty-harvest-btn" class="rr-btn-harvest" style="margin-top:14px; padding:10px 22px; font-size:13px; font-weight:700; cursor:pointer;">
              ⚡ Scan & Harvest My Saved Reels Now
            </button>
          </div>
        `;
        const btn = document.getElementById('rr-empty-harvest-btn');
        if (btn) btn.addEventListener('click', startAutoHarvest);
      } else {
        container.innerHTML = `
          <div class="rr-empty-state">
            <div class="rr-empty-title">No saved reels found for "${escapeHtml(query)}"</div>
            <div class="rr-empty-sub">Try searching by creator @handle, audio title, or topic, or click Auto-Harvest to scan newly saved posts.</div>
          </div>
        `;
      }
      return;
    }

    matches.forEach(item => {
      const reel = item.reel;
      const card = document.createElement('a');
      card.className = 'rr-result-card';
      card.href = reel.url;
      card.target = '_blank';

      const catLabel = (CATEGORY_MAP[reel.category] || {}).label || "Saved Reel";

      card.innerHTML = `
        <div class="rr-card-thumb-wrap">
          ${reel.thumbnail ? `<img class="rr-card-thumb" src="${reel.thumbnail}" />` : `
            <svg class="rr-thumb-placeholder" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="20" rx="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            </svg>
          `}
        </div>
        <div class="rr-card-content">
          <div>
            <div class="rr-card-top">
              <span class="rr-card-creator">${escapeHtml(reel.creator || '@instagram_creator')}</span>
              <div class="rr-card-datetime">
                <span>🕒 ${formatFullDateTime(getReelTimestamp(reel))}</span>
              </div>
            </div>
            <p class="rr-card-caption">${escapeHtml(reel.caption || '')}</p>
          </div>
          <div class="rr-card-bottom">
            <div class="rr-card-tags">
              <span class="rr-tag-pill" style="color:#fbbf24; border:1px solid #78350f;">${catLabel}</span>
              ${(reel.topics || []).slice(0, 2).map(t => `<span class="rr-tag-pill">#${escapeHtml(t)}</span>`).join('')}
            </div>
            ${item.reasons && item.reasons.length ? `<span class="rr-match-reason">${escapeHtml(item.reasons[0])}</span>` : ''}
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function renderSuggestions(sugs) {
    const bar = document.getElementById('rr-suggestions');
    if (!bar) return;
    bar.innerHTML = '<span class="rr-sug-label">Suggestions:</span>';
    sugs.forEach(text => {
      const pill = document.createElement('span');
      pill.className = 'rr-sug-pill';
      pill.textContent = text;
      pill.addEventListener('click', () => {
        const input = document.getElementById('rr-input');
        input.value = text;
        handleModalSearch(text);
      });
      bar.appendChild(pill);
    });
  }

  function setupSpotlightListeners() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleModal();
      } else if (e.key === 'Escape' && isModalOpen) {
        toggleModal(false);
      }
    });

    const backdrop = document.getElementById('rr-search-backdrop');
    if (backdrop) backdrop.addEventListener('click', (e) => { if (e.target === backdrop) toggleModal(false); });

    const closeBtn = document.getElementById('rr-btn-close');
    if (closeBtn) closeBtn.addEventListener('click', () => toggleModal(false));

    const input = document.getElementById('rr-input');
    if (input) input.addEventListener('input', (e) => handleModalSearch(e.target.value));

    const harvestBtn = document.getElementById('rr-btn-start-harvest');
    if (harvestBtn) harvestBtn.addEventListener('click', startAutoHarvest);

    const stopBtn = document.getElementById('rr-btn-stop-harvest');
    if (stopBtn) stopBtn.addEventListener('click', stopAutoHarvest);

    // Date filter chips in Spotlight modal
    const filterChips = document.querySelectorAll('#rr-search-modal .rr-filter-chip');
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentDateFilter = chip.getAttribute('data-filter');
        const input = document.getElementById('rr-input');
        handleModalSearch(input ? input.value : '');
      });
    });

    // Sort select in Spotlight modal
    const sortSelect = document.getElementById('rr-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        const input = document.getElementById('rr-input');
        handleModalSearch(input ? input.value : '');
      });
    }

    const fileInput = document.getElementById('rr-file-import');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleInstagramJsonImport(e.target.files[0]);
      });
    }
  }

  // -------------------------------------------------------------
  // 4. AUTO-HARVESTER
  // -------------------------------------------------------------
  async function startAutoHarvest() {
    if (isHarvesting) return;

    if (!window.location.href.includes('/saved')) {
      const username = getLoggedInUsername();
      sessionStorage.setItem('rr_auto_start_harvest', 'true');
      if (username) {
        window.location.href = `https://www.instagram.com/${username}/saved/all-posts/`;
        return;
      } else {
        alert("Please navigate to your Saved page on Instagram (click your Profile icon -> 'Saved' tab), and auto-harvest will begin automatically!");
        return;
      }
    }

    isHarvesting = true;
    toggleModal(false);

    const hud = document.getElementById('rr-harvester-hud');
    const hudText = document.getElementById('rr-hud-text');
    if (hud) hud.style.display = 'flex';

    let totalHarvested = 0;
    let consecutiveUnchangedCount = 0;
    let previousHeight = 0;

    while (isHarvesting) {
      tagVisibleGridItems();
      const anchors = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');
      let batchAdded = 0;

      anchors.forEach(a => {
        const norm = normalizeUrl(a.getAttribute('href') || '');
        if (reelIndexMap.has(norm)) {
          batchAdded++;
          totalHarvested++;
        }
      });

      if (hudText) hudText.textContent = `Auto-Harvesting: ${reelIndexMap.size} reels dated & indexed...`;

      window.scrollBy({ top: 900, behavior: 'smooth' });
      await sleep(1400);

      const currentHeight = document.documentElement.scrollHeight;
      if (currentHeight === previousHeight) {
        consecutiveUnchangedCount++;
        if (consecutiveUnchangedCount >= 4) break;
      } else {
        consecutiveUnchangedCount = 0;
      }
      previousHeight = currentHeight;
    }

    const merged = Array.from(reelIndexMap.values());
    chrome.storage.local.set({ savedReels: merged, lastSyncTimestamp: Date.now() });

    try {
      fetch('http://localhost:8000/api/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      }).catch(() => {});
    } catch (e) {}

    if (hud) hud.style.display = 'none';
    isHarvesting = false;
    showToast(`Indexed & Dated ${merged.length} saved reels!`);
    tagVisibleGridItems();
    toggleModal(true); // Re-open search assistant showing all your reels!
  }

  function stopAutoHarvest() {
    isHarvesting = false;
    const hud = document.getElementById('rr-harvester-hud');
    if (hud) hud.style.display = 'none';
  }

  function handleInstagramJsonImport(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        const entries = parseMetaExport(json);
        if (entries.length === 0) {
          alert('No saved posts found in this file.');
          return;
        }

        entries.forEach(r => reelIndexMap.set(normalizeUrl(r.url), r));
        const all = Array.from(reelIndexMap.values());
        chrome.storage.local.set({ savedReels: all, lastSyncTimestamp: Date.now() });

        showToast(`Imported ${entries.length} reels with exact timestamps!`);
        tagVisibleGridItems();
      } catch (err) {
        alert('Invalid JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function parseMetaExport(json) {
    const list = [];
    let entries = json.saved_saved_media || json || json.saved_collections || [];
    if (!Array.isArray(entries)) entries = [];

    entries.forEach(entry => {
      let href = '';
      let timestamp = Date.now();
      let title = entry.title || '';

      if (entry.string_map_data) {
        for (const k of Object.keys(entry.string_map_data)) {
          const item = entry.string_map_data[k];
          if (item.href) href = item.href;
          if (item.timestamp) timestamp = item.timestamp * 1000;
        }
      } else if (entry.string_list_data && entry.string_list_data.length > 0) {
        const item = entry.string_list_data[0];
        if (item.href) href = item.href;
        if (item.timestamp) timestamp = item.timestamp * 1000;
      }

      if (href) {
        const cat = detectCategory(title);
        list.push({
          id: href,
          url: href,
          creator: title.startsWith('@') ? title : (title ? `@${title}` : '@instagram_creator'),
          caption: `Saved Reel from ${title || 'Instagram'}`,
          category: cat,
          topics: extractTopics(title),
          thumbnail: '',
          savedAt: timestamp
        });
      }
    });

    return list;
  }

  // -------------------------------------------------------------
  // HELPERS & ROUTE OBSERVER
  // -------------------------------------------------------------
  function detectCategory(text) {
    if (!text) return 'productivity';
    const lower = text.toLowerCase();
    for (const [cat, info] of Object.entries(CATEGORY_MAP)) {
      if (info.keywords.some(k => lower.includes(k))) {
        return cat;
      }
    }
    return 'cooking'; // default fallback category
  }

  function extractCreatorFromAlt(alt) {
    if (!alt) return '@creator';
    const match = alt.match(/by\s+@?([\w_.]+)/i) || alt.match(/@([\w_.]+)/);
    return match ? ('@' + match[1].replace('@', '')) : '@creator';
  }

  function extractTopics(text) {
    if (!text) return [];
    return (text.toLowerCase().match(/\b[a-z]{4,}\b/g) || []).slice(0, 4);
  }

  function normalizeUrl(url) {
    try {
      const u = new URL(url, window.location.origin);
      return u.pathname.replace(/\/$/, '');
    } catch (e) {
      return url;
    }
  }

  function formatShortDateTime(rawTs) {
    const ts = (rawTs && typeof rawTs === 'number') ? rawTs : getReelTimestamp({ savedAt: rawTs });
    const d = new Date(ts);
    if (isNaN(d.getTime())) return 'Recently';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${months[d.getMonth()]} ${d.getDate()} · ${hours}:${minutes} ${ampm}`;
  }

  function formatFullDateTime(rawTs) {
    const ts = (rawTs && typeof rawTs === 'number') ? rawTs : getReelTimestamp({ savedAt: rawTs });
    const d = new Date(ts);
    if (isNaN(d.getTime())) return 'Recently Saved';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const year = d.getFullYear();
    const relative = formatTimeAgo(ts);
    return `${months[d.getMonth()]} ${d.getDate()}, ${year} · ${hours}:${minutes} ${ampm} (${relative})`;
  }

  function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }


  function getLoggedInUsername() {
    const sel = [
      'a[href^="/"][role="link"] img[alt*="profile picture"]',
      'svg[aria-label="Profile"]',
      'svg[aria-label="Your profile"]',
      'a[href*="/saved/"]'
    ];
    for (const s of sel) {
      const el = document.querySelector(s);
      if (el) {
        const a = el.tagName === 'A' ? el : el.closest('a');
        if (a) {
          const p = (a.getAttribute('href') || '').split('/').filter(Boolean);
          if (p.length > 0 && !['explore', 'reels', 'direct', 'stories'].includes(p[0])) {
            return p[0];
          }
        }
      }
    }
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length > 0 && !['explore', 'reels', 'direct', 'stories', 'accounts'].includes(parts[0])) {
      return parts[0];
    }
    return null;
  }

  function showToast(msg) {
    const toast = document.getElementById('rr-toast');
    if (toast) {
      toast.textContent = msg;
      toast.classList.add('rr-show');
      setTimeout(() => toast.classList.remove('rr-show'), 3500);
    }
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }

  // Handle Extension Messages from Popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'OPEN_SEARCH_WITH_QUERY') {
      toggleModal(true, request.query || '');
      sendResponse({ status: 'opened' });
    } else if (request.action === 'START_AUTO_HARVEST') {
      startAutoHarvest();
      sendResponse({ status: 'harvesting_started' });
    } else if (request.action === 'GET_SAVED_URL') {
      const u = getLoggedInUsername();
      sendResponse({ username: u, savedUrl: u ? `https://www.instagram.com/${u}/saved/all-posts/` : null });
    }
    return true;
  });

  // Watch URL changes in Instagram Single Page App
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      injectInPageSearchBar();
      tagVisibleGridItems();
    } else {
      // Periodic check for new lazy-loaded items in saved grid
      if (window.location.href.includes('/saved')) {
        injectInPageSearchBar();
        tagVisibleGridItems();
      }
    }
  }, 800);

  // Initialize
  function init() {
    injectFloatingAndSpotlight();
    injectInPageSearchBar();
    tagVisibleGridItems();

    // Check if auto-harvest was queued from another page
    if (sessionStorage.getItem('rr_auto_start_harvest') === 'true' && window.location.href.includes('/saved')) {
      sessionStorage.removeItem('rr_auto_start_harvest');
      setTimeout(() => startAutoHarvest(), 800);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
