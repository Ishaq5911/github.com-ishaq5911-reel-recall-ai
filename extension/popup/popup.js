document.addEventListener('DOMContentLoaded', async () => {
  const indexedCountEl = document.getElementById('indexedCount');
  const creatorCountEl = document.getElementById('creatorCount');
  const lastSyncTimeEl = document.getElementById('lastSyncTime');
  const btnAutoHarvest = document.getElementById('btnAutoHarvest');
  const btnOpenInstagramSaved = document.getElementById('btnOpenInstagramSaved');
  const popupSearchInput = document.getElementById('popupSearchInput');
  const statusText = document.getElementById('statusText');
  const popupFileInput = document.getElementById('popupFileInput');

  async function refreshStats() {
    chrome.storage.local.get(['savedReels', 'lastSyncTimestamp'], (data) => {
      const reels = data.savedReels || [];
      indexedCountEl.textContent = reels.length;

      const creators = new Set(reels.map(r => r.creator).filter(Boolean));
      creatorCountEl.textContent = creators.size;

      // Find the most recent savedAt timestamp
      if (reels.length > 0) {
        const latestTime = Math.max(...reels.map(r => r.savedAt || 0));
        lastSyncTimeEl.textContent = formatTimeAgo(latestTime);
      } else {
        lastSyncTimeEl.textContent = 'None';
      }
    });
  }

  function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Never';
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

  await refreshStats();

  // Auto-Harvest Button
  btnAutoHarvest.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab && tab.url && tab.url.includes('instagram.com')) {
      chrome.tabs.sendMessage(tab.id, { action: 'START_AUTO_HARVEST' }, (response) => {
        if (chrome.runtime.lastError) {
          alert('Please refresh your Instagram tab and click again!');
        } else {
          statusText.textContent = 'Harvesting...';
          window.close();
        }
      });
    } else {
      // Not on Instagram, open Instagram
      chrome.tabs.create({ url: 'https://www.instagram.com/' });
      alert("Opened Instagram! Please log in, go to your Profile -> 'Saved' tab, and click Auto-Harvest.");
    }
  });

  // Open Saved Posts
  btnOpenInstagramSaved.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab && tab.url && tab.url.includes('instagram.com')) {
      chrome.tabs.sendMessage(tab.id, { action: 'GET_SAVED_URL' }, (response) => {
        if (response && response.savedUrl) {
          chrome.tabs.update(tab.id, { url: response.savedUrl });
          window.close();
        } else {
          alert("On Instagram, click on your Profile picture in the left menu, then select the 'Saved' tab.");
        }
      });
    } else {
      chrome.tabs.create({ url: 'https://www.instagram.com/' });
    }
  });

  // Popup Search
  popupSearchInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const query = popupSearchInput.value.trim();
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('instagram.com')) {
        chrome.tabs.sendMessage(tab.id, { action: 'OPEN_SEARCH_WITH_QUERY', query: query });
        window.close();
      } else {
        chrome.tabs.create({ url: 'https://www.instagram.com/' });
      }
    }
  });

  // Import JSON File from popup
  if (popupFileInput) {
    popupFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target.result);
          const parsed = parseMetaExport(json);
          if (parsed.length === 0) {
            alert('No saved reels/posts found in this JSON file.');
            return;
          }

          chrome.storage.local.get(['savedReels'], (data) => {
            const existing = data.savedReels || [];
            const map = new Map(existing.map(r => [r.url, r]));
            parsed.forEach(r => map.set(r.url, r));
            const merged = Array.from(map.values());

            chrome.storage.local.set({
              savedReels: merged,
              lastSyncTimestamp: Date.now()
            }, () => {
              alert(`Successfully imported ${parsed.length} reels with exact timestamps! Total library: ${merged.length}`);
              refreshStats();

              // Sync to backend
              fetch('http://localhost:8000/api/index', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(merged)
              }).catch(() => {});
            });
          });
        } catch (err) {
          alert('Failed to parse JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  function parseMetaExport(json) {
    const list = [];
    let entries = [];
    if (json.saved_saved_media && Array.isArray(json.saved_saved_media)) {
      entries = json.saved_saved_media;
    } else if (Array.isArray(json)) {
      entries = json;
    } else if (json.saved_collections && Array.isArray(json.saved_collections)) {
      entries = json.saved_collections;
    }

    entries.forEach(entry => {
      let href = '';
      let timestamp = Date.now();
      let title = entry.title || '';

      if (entry.string_map_data) {
        for (const key of Object.keys(entry.string_map_data)) {
          const item = entry.string_map_data[key];
          if (item.href) href = item.href;
          if (item.timestamp) timestamp = item.timestamp * 1000;
        }
      } else if (entry.string_list_data && entry.string_list_data.length > 0) {
        const item = entry.string_list_data[0];
        if (item.href) href = item.href;
        if (item.timestamp) timestamp = item.timestamp * 1000;
      }

      if (href) {
        list.push({
          id: href,
          url: href,
          creator: title.startsWith('@') ? title : (title ? `@${title}` : '@instagram_creator'),
          caption: `Saved Reel from ${title || 'Instagram'}`,
          thumbnail: '',
          audio: '',
          topics: (title.toLowerCase().match(/\b[a-z]{4,}\b/g) || []).slice(0, 4),
          savedAt: timestamp
        });
      }
    });

    return list;
  }
});
