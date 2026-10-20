let currentTabType = 'local'; // 'local' or 'session'
let storageData = { local: {}, session: {} };

document.addEventListener('DOMContentLoaded', async () => {
  await loadStorageData();

  // Core Event Listeners
  document.getElementById('btnRefresh').addEventListener('click', loadStorageData);
  document.getElementById('btnLocal').addEventListener('click', () => switchTab('local'));
  document.getElementById('btnSession').addEventListener('click', () => switchTab('session'));

  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', () => {
    updateChipStates();
    renderKeys();
  });

  document.getElementById('btnPurgeFiltered').addEventListener('click', purgeFilteredKeys);
  document.getElementById('btnPurgeAll').addEventListener('click', purgeAllKeys);

  // Preset Chip Listeners
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const filterTerm = e.target.getAttribute('data-filter');

      if (searchInput.value.toLowerCase().trim() === filterTerm.toLowerCase().trim()) {
        searchInput.value = '';
      } else {
        searchInput.value = filterTerm;
      }

      updateChipStates();
      renderKeys();
    });
  });
});

// Helper: Get active tab ID
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Fetch localStorage and sessionStorage from the web page context
async function loadStorageData() {
  showStatus('');
  const tab = await getActiveTab();

  if (!tab || !tab.id) {
    showStatus('No active tab detected.', 'error');
    return;
  }

  // Restrict execution on internal browser pages
  if (
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('edge://') ||
    tab.url.startsWith('about:') ||
    tab.url.startsWith('brave://')
  ) {
    showStatus('Storage access is restricted on browser internal pages.', 'error');
    storageData = { local: {}, session: {} };
    renderKeys();
    return;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const local = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          local[key] = localStorage.getItem(key);
        }

        const session = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          session[key] = sessionStorage.getItem(key);
        }

        return { local, session };
      }
    });

    if (results && results[0]?.result) {
      storageData = results[0].result;
      renderKeys();
    }
  } catch (err) {
    showStatus(`Failed to read page storage: ${err.message}`, 'error');
  }
}

// Tab Switching (localStorage vs sessionStorage)
function switchTab(type) {
  currentTabType = type;
  document.getElementById('btnLocal').classList.toggle('active', type === 'local');
  document.getElementById('btnSession').classList.toggle('active', type === 'session');
  renderKeys();
}

// Update UI styling on active preset chip
function updateChipStates() {
  const currentQuery = document.getElementById('searchInput').value.toLowerCase().trim();
  document.querySelectorAll('.chip').forEach(chip => {
    const filterVal = chip.getAttribute('data-filter').toLowerCase().trim();
    chip.classList.toggle('active', currentQuery === filterVal);
  });
}

// Pattern matching function (supports comma-separated synonyms & wildcards)
function matchPattern(key, query) {
  if (!query) return true;

  // Split search by commas to check multiple keywords (OR logic)
  const terms = query.split(',').map(t => t.trim()).filter(Boolean);

  return terms.some(term => {
    if (term.includes('*')) {
      const regexPattern = '^' + term.replace(/[-\/\\^$+.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*') + '$';
      return new RegExp(regexPattern, 'i').test(key);
    }
    return key.toLowerCase().includes(term.toLowerCase());
  });
}

// Render storage keys into the UI container
function renderKeys() {
  const listContainer = document.getElementById('keyList');
  const searchQuery = document.getElementById('searchInput').value.trim();
  const currentStore = storageData[currentTabType] || {};

  document.getElementById('localCount').textContent = Object.keys(storageData.local).length;
  document.getElementById('sessionCount').textContent = Object.keys(storageData.session).length;

  listContainer.innerHTML = '';

  const allKeys = Object.keys(currentStore);
  const matchedKeys = allKeys.filter(key => matchPattern(key, searchQuery));

  const purgeFilteredBtn = document.getElementById('btnPurgeFiltered');
  purgeFilteredBtn.disabled = !searchQuery || matchedKeys.length === 0;

  if (matchedKeys.length === 0) {
    listContainer.innerHTML = `<div class="empty-state">${
      allKeys.length === 0 ? 'Storage is empty' : 'No matching keys found'
    }</div>`;
    return;
  }

  matchedKeys.forEach(key => {
    const val = currentStore[key];

    const item = document.createElement('div');
    item.className = 'key-item';

    const row = document.createElement('div');
    row.className = 'key-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'key-name';
    nameSpan.textContent = key;

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-single-btn';
    delBtn.textContent = '✕';
    delBtn.title = `Delete "${key}"`;
    delBtn.onclick = () => deleteSingleKey(key);

    row.appendChild(nameSpan);
    row.appendChild(delBtn);

    const valPreview = document.createElement('div');
    valPreview.className = 'value-preview';
    valPreview.textContent = typeof val === 'string' ? val : JSON.stringify(val);

    item.appendChild(row);
    item.appendChild(valPreview);
    listContainer.appendChild(item);
  });
}

// Action: Delete a single specific key
async function deleteSingleKey(key) {
  const tab = await getActiveTab();
  if (!tab) return;

  const type = currentTabType;

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (storageType, targetKey) => {
      const store = storageType === 'local' ? localStorage : sessionStorage;
      store.removeItem(targetKey);
    },
    args: [type, key]
  });

  delete storageData[type][key];
  renderKeys();
}

// Action: Purge all keys matching search filter
async function purgeFilteredKeys() {
  const searchQuery = document.getElementById('searchInput').value.trim();
  if (!searchQuery) return;

  const tab = await getActiveTab();
  if (!tab) return;

  const type = currentTabType;
  const currentStore = storageData[type];
  const keysToDelete = Object.keys(currentStore).filter(key => matchPattern(key, searchQuery));

  if (keysToDelete.length === 0) return;

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (storageType, keys) => {
      const store = storageType === 'local' ? localStorage : sessionStorage;
      keys.forEach(k => store.removeItem(k));
    },
    args: [type, keysToDelete]
  });

  keysToDelete.forEach(k => delete storageData[type][k]);
  renderKeys();
}

// Action: Clear all keys in current active tab
async function purgeAllKeys() {
  const type = currentTabType;
  const currentStore = storageData[type];
  const totalKeys = Object.keys(currentStore).length;

  if (totalKeys === 0) return;

  const confirmClear = confirm(`Are you sure you want to wipe ALL ${totalKeys} keys from ${type}Storage?`);
  if (!confirmClear) return;

  const tab = await getActiveTab();
  if (!tab) return;

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (storageType) => {
      const store = storageType === 'local' ? localStorage : sessionStorage;
      store.clear();
    },
    args: [type]
  });

  storageData[type] = {};
  renderKeys();
}

// UI helper to display error messages
function showStatus(message, type = 'info') {
  const banner = document.getElementById('statusBanner');
  if (!message) {
    banner.className = 'status-banner hidden';
    banner.textContent = '';
    return;
  }
  banner.className = `status-banner ${type}`;
  banner.textContent = message;
}