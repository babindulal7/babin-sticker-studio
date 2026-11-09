// Storage utilities supporting both Electron IPC and Browser localStorage

export async function storeSave(key, data) {
  const payload = JSON.stringify(data);
  try {
    if (window?.storage?.set) {
      await window.storage.set(key, payload);
    }
  } catch (e) {
    console.warn("Electron storage save error:", e);
  }
  try {
    if (typeof window !== "undefined" && window?.localStorage) {
      window.localStorage.setItem(key, payload);
    }
  } catch (e) {
    console.warn("LocalStorage save error:", e);
  }
}

export async function storeLoad(key) {
  try {
    if (window?.storage?.get) {
      const r = await window.storage.get(key);
      if (r?.value != null) return JSON.parse(r.value);
    }
  } catch (e) {
    console.warn("Electron storage load error:", e);
  }
  try {
    if (typeof window !== "undefined" && window?.localStorage) {
      const raw = window.localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("LocalStorage load error:", e);
  }
  return null;
}
