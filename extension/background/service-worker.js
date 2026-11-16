// ReelRecall AI - Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[ReelRecall AI] Extension installed/updated:', details.reason);
  
  // Set up default settings if not already present
  chrome.storage.local.get(['settings'], (data) => {
    if (!data.settings) {
      chrome.storage.local.set({
        settings: {
          enableFloatingButton: true,
          enableMultilingual: true,
          backendApiUrl: 'http://localhost:8000/api'
        }
      });
    }
  });
});

// Listen for external messages or alarms if scheduled sync is desired later
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PING') {
    sendResponse({ status: 'PONG', timestamp: Date.now() });
  }
  return true;
});
