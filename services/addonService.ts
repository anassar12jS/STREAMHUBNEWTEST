
import { TORRENTIO_BASE_URL } from '../constants';
import { StreamResponse, MediaType } from '../types';

const getBaseUrl = () => {
    const stored = localStorage.getItem('torrentio_url');
    // Robust check: ensure it's not null, not empty, and not just whitespace
    return (stored && stored.trim().length > 0) ? stored : TORRENTIO_BASE_URL;
};

export const getStreams = async (type: MediaType, id: string): Promise<StreamResponse> => {
  const stremioType = type === MediaType.MOVIE ? 'movie' : 'series';
  const baseUrl = getBaseUrl();
  
  if (!id.startsWith('tt')) {
    console.warn("Invalid IMDb ID for streams:", id);
    return { streams: [] };
  }

  try {
    const url = `${baseUrl}/stream/${stremioType}/${id}.json`;
    const res = await fetch(url);
    if (!res.ok) return { streams: [] };
    return await res.json();
  } catch (e) {
    console.error("Failed to fetch streams", e);
    return { streams: [] };
  }
};

export const getEpisodeStreams = async (imdbId: string, season: number, episode: number): Promise<StreamResponse> => {
  const streamId = `${imdbId}:${season}:${episode}`;
  const baseUrl = getBaseUrl();
  
  try {
    const url = `${baseUrl}/stream/series/${streamId}.json`;
    const res = await fetch(url);
    if (!res.ok) return { streams: [] };
    return await res.json();
  } catch (e) {
    console.error("Failed to fetch episode streams", e);
    return { streams: [] };
  }
};
