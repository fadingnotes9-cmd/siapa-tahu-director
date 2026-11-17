const DB_NAME = 'siapa_tahu_director_db';
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('analytics_history')) {
        db.createObjectStore('analytics_history', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('saved_episodes')) {
        db.createObjectStore('saved_episodes', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getHookCalibration() {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const req = tx.objectStore('settings').get('calibrated_hook_rule');
      req.onsuccess = () => resolve(req.result?.value || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setHookCalibration(ruleObj) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({
      key: 'calibrated_hook_rule',
      value: ruleObj,
      updatedAt: new Date().toISOString()
    });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveAnalyticsEntry(entry) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('analytics_history', 'readwrite');
    tx.objectStore('analytics_history').add({
      ...entry,
      createdAt: new Date().toISOString()
    });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAnalyticsHistory() {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction('analytics_history', 'readonly');
      const req = tx.objectStore('analytics_history').getAll();
      req.onsuccess = () => resolve((req.result || []).reverse());
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveEpisodeToFolder(episodeData) {
  const db = await openDB();
  const record = {
    ...episodeData,
    savedAt: new Date().toISOString()
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction('saved_episodes', 'readwrite');
    const req = tx.objectStore('saved_episodes').add(record);
    req.onsuccess = () => resolve({ ...record, id: req.result });
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSavedEpisodes() {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction('saved_episodes', 'readonly');
      const req = tx.objectStore('saved_episodes').getAll();
      req.onsuccess = () => resolve((req.result || []).reverse());
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function deleteSavedEpisode(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('saved_episodes', 'readwrite');
    tx.objectStore('saved_episodes').delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
