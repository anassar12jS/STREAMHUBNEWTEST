
import { TMDBResult, IPTVChannel, ContinueWatchingItem, MediaType } from '../types';

const WATCHLIST_KEY = 'streamhub_watchlist';
const HISTORY_KEY = 'streamhub_history';
const THEME_KEY = 'streamhub_theme';
const MODE_KEY = 'streamhub_mode';
const TV_FAVORITES_KEY = 'streamhub_tv_favorites';
const TV_RECENT_KEY = 'streamhub_tv_recent';
const PROGRESS_KEY = 'streamhub_progress';

// --- Watchlist ---
export const getWatchlist = (): TMDBResult[] => {
  try {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

export const addToWatchlist = (item: TMDBResult) => {
  const list = getWatchlist();
  if (!list.find(i => i.id === item.id)) {
    const updated = [item, ...list];
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
  }
};

export const removeFromWatchlist = (id: number) => {
  const list = getWatchlist();
  const updated = list.filter(i => i.id !== id);
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
};

export const isInWatchlist = (id: number): boolean => {
  const list = getWatchlist();
  return !!list.find(i => i.id === id);
};

// --- History (Recently Watched Metadata) ---
export const getHistory = (): TMDBResult[] => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

export const addToHistory = (item: TMDBResult) => {
  const list = getHistory();
  const filtered = list.filter(i => i.id !== item.id);
  const updated = [item, ...filtered].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
};

// --- Continue Watching (Progress) ---
export const getProgress = (): ContinueWatchingItem[] => {
  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

export const saveProgress = (item: { id: number, media_type: MediaType, title: string, poster_path: string | null, season?: number, episode?: number }) => {
    const list = getProgress();
    const newItem: ContinueWatchingItem = {
        ...item,
        timestamp: Date.now()
    };
    const filtered = list.filter(i => i.id !== item.id);
    const updated = [newItem, ...filtered].slice(0, 20);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated));
};

export const getProgressForId = (id: number): ContinueWatchingItem | undefined => {
    const list = getProgress();
    return list.find(i => i.id === id);
};

// --- Live TV Favorites ---
export const getFavoriteChannels = (): IPTVChannel[] => {
    try {
        const stored = localStorage.getItem(TV_FAVORITES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
};

export const toggleFavoriteChannel = (channel: IPTVChannel) => {
    const list = getFavoriteChannels();
    const exists = list.find(c => c.url === channel.url);
    let updated;
    if (exists) {
        updated = list.filter(c => c.url !== channel.url);
    } else {
        updated = [channel, ...list];
    }
    localStorage.setItem(TV_FAVORITES_KEY, JSON.stringify(updated));
    return !exists; // Returns true if added, false if removed
};

export const isFavoriteChannel = (url: string): boolean => {
    const list = getFavoriteChannels();
    return !!list.find(c => c.url === url);
};

// --- Live TV Recents ---
export const getRecentChannels = (): IPTVChannel[] => {
    try {
        const stored = localStorage.getItem(TV_RECENT_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
};

export const addRecentChannel = (channel: IPTVChannel) => {
    const list = getRecentChannels();
    const filtered = list.filter(c => c.url !== channel.url);
    const updated = [channel, ...filtered].slice(0, 10);
    localStorage.setItem(TV_RECENT_KEY, JSON.stringify(updated));
};

// --- Settings & Data ---
export const getTheme = (): string => localStorage.getItem(THEME_KEY) || 'purple';
export const setTheme = (color: string) => localStorage.setItem(THEME_KEY, color);
export const getMode = (): 'dark' | 'light' => (localStorage.getItem(MODE_KEY) as 'dark' | 'light') || 'dark';
export const setMode = (mode: 'dark' | 'light') => localStorage.setItem(MODE_KEY, mode);

// Export/Import
export const exportData = (): string => {
    const data = {
        watchlist: getWatchlist(),
        history: getHistory(),
        progress: getProgress(),
        tvFavorites: getFavoriteChannels(),
        tvRecent: getRecentChannels(),
        settings: {
            theme: getTheme(),
            mode: getMode(),
            torrentio: localStorage.getItem('torrentio_url')
        }
    };
    return JSON.stringify(data, null, 2);
};

export const importData = (jsonString: string): boolean => {
    try {
        const data = JSON.parse(jsonString);
        if (data.watchlist) localStorage.setItem(WATCHLIST_KEY, JSON.stringify(data.watchlist));
        if (data.history) localStorage.setItem(HISTORY_KEY, JSON.stringify(data.history));
        if (data.progress) localStorage.setItem(PROGRESS_KEY, JSON.stringify(data.progress));
        if (data.tvFavorites) localStorage.setItem(TV_FAVORITES_KEY, JSON.stringify(data.tvFavorites));
        if (data.tvRecent) localStorage.setItem(TV_RECENT_KEY, JSON.stringify(data.tvRecent));
        if (data.settings) {
            if (data.settings.theme) localStorage.setItem(THEME_KEY, data.settings.theme);
            if (data.settings.mode) localStorage.setItem(MODE_KEY, data.settings.mode);
            if (data.settings.torrentio) localStorage.setItem('torrentio_url', data.settings.torrentio);
        }
        return true;
    } catch (e) {
        console.error("Import failed", e);
        return false;
    }
};
