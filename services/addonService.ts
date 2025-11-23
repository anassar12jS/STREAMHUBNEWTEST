
import { TORRENTIO_BASE_URL } from '../constants';
import { StreamResponse, MediaType, Stream } from '../types';

// Additional Providers
const KNIGHTCRAWLER_BASE_URL = 'https://knightcrawler.elfhosted.com';

const getBaseUrl = () => {
    const stored = localStorage.getItem('torrentio_url');
    return (stored && stored.trim().length > 0) ? stored : TORRENTIO_BASE_URL;
};

// Helper to fetch from a specific provider
const fetchFromProvider = async (baseUrl: string, endpoint: string): Promise<Stream[]> => {
    try {
        const res = await fetch(`${baseUrl}${endpoint}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.streams || [];
    } catch (e) {
        // Fail silently for individual providers so one failure doesn't break all
        console.warn(`Provider failed: ${baseUrl}`, e);
        return [];
    }
};

export const getStreams = async (type: MediaType, id: string): Promise<StreamResponse> => {
  const stremioType = type === MediaType.MOVIE ? 'movie' : 'series';
  const torrentioUrl = getBaseUrl();
  
  if (!id.startsWith('tt')) {
    console.warn("Invalid IMDb ID for streams:", id);
    return { streams: [] };
  }

  const endpoint = `/stream/${stremioType}/${id}.json`;

  try {
    // Query both providers in parallel
    const [torrentioStreams, knightCrawlerStreams] = await Promise.all([
        fetchFromProvider(torrentioUrl, endpoint),
        fetchFromProvider(KNIGHTCRAWLER_BASE_URL, endpoint)
    ]);

    // Merge and Deduplicate based on infoHash
    const allStreams = [...torrentioStreams, ...knightCrawlerStreams];
    const uniqueStreams: Stream[] = [];
    const seenHashes = new Set<string>();

    allStreams.forEach(stream => {
        if (stream.infoHash) {
            if (!seenHashes.has(stream.infoHash)) {
                seenHashes.add(stream.infoHash);
                uniqueStreams.push(stream);
            }
        } else {
            // Keep URL-based streams (HTTP) as they don't have infoHash
            uniqueStreams.push(stream);
        }
    });

    return { streams: uniqueStreams };

  } catch (e) {
    console.error("Failed to fetch streams", e);
    return { streams: [] };
  }
};

export const getEpisodeStreams = async (imdbId: string, season: number, episode: number): Promise<StreamResponse> => {
  const streamId = `${imdbId}:${season}:${episode}`;
  const torrentioUrl = getBaseUrl();
  
  const endpoint = `/stream/series/${streamId}.json`;

  try {
    const [torrentioStreams, knightCrawlerStreams] = await Promise.all([
        fetchFromProvider(torrentioUrl, endpoint),
        fetchFromProvider(KNIGHTCRAWLER_BASE_URL, endpoint)
    ]);

    const allStreams = [...torrentioStreams, ...knightCrawlerStreams];
    const uniqueStreams: Stream[] = [];
    const seenHashes = new Set<string>();

    allStreams.forEach(stream => {
        if (stream.infoHash) {
            if (!seenHashes.has(stream.infoHash)) {
                seenHashes.add(stream.infoHash);
                uniqueStreams.push(stream);
            }
        } else {
            uniqueStreams.push(stream);
        }
    });

    return { streams: uniqueStreams };
  } catch (e) {
    console.error("Failed to fetch episode streams", e);
    return { streams: [] };
  }
};
