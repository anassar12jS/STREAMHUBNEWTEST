
import { SportsMatch, SportsMatchSource, SportsStream } from '../types';

// ==========================================
// NEW API INTEGRATION
// ==========================================
// The backend API for ppv.to
const NEW_API_BASE = 'https://ppv.to'; 

interface NewApiStream {
    id: number;
    name: string; // e.g. "Pelicans at Pacers"
    tag: string;  // e.g. "Local Broadcast"
    poster: string;
    uri_name: string;
    starts_at: number;
    ends_at: number;
    category_name: string;
    iframe?: string;
    always_live: number;
}

interface NewApiCategory {
    category: string;
    id: number;
    streams: NewApiStream[];
}

interface NewApiResponse {
    success: boolean;
    streams: NewApiCategory[];
}

// ... existing streamed.pk constants ...
const PROXY_URL = 'https://corsproxy.io/?';
const API_BASE = 'https://streamed.pk/api';
const IMG_BASE = 'https://streamed.pk/api/images';

// ... existing helpers ...
const fetchApi = async (endpoint: string) => {
  const targetUrl = `${API_BASE}${endpoint}`;
  const url = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    try {
        const directRes = await fetch(targetUrl);
        if (!directRes.ok) throw new Error('Direct fetch failed');
        return await directRes.json();
    } catch (err) {
        throw e;
    }
  }
};

const formatPosterUrl = (path: string) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path; // New API returns full URLs
    
    let finalUrl = '';
    if (path.startsWith('/')) {
        finalUrl = `https://streamed.pk${path}.webp`;
    } else {
        finalUrl = `${IMG_BASE}/proxy/${path}.webp`;
    }
    return `${PROXY_URL}${encodeURIComponent(finalUrl)}`;
};

// ==========================================
// SERVICE METHODS
// ==========================================

const getMatchesFromNewApi = async (): Promise<SportsMatch[]> => {
    const targetUrl = `${NEW_API_BASE}/api/streams`;
    const url = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('New API Failed');
        const data: NewApiResponse = await res.json();
        
        if (!data.success || !data.streams) return [];

        const matches: SportsMatch[] = [];

        // Flatten categories and group by Event Name to handle multiple links
        data.streams.forEach(cat => {
            const categoryName = cat.category;
            
            cat.streams.forEach(stream => {
                // Find existing match to append source (fuzzy match by title + time window)
                // We use a larger window (3 hours) because sometimes start times drift
                let existing = matches.find(m => m.title === stream.name && Math.abs(m.date - (stream.starts_at * 1000)) < 10800000);
                
                if (!existing) {
                    existing = {
                        title: stream.name,
                        category: categoryName,
                        date: stream.starts_at * 1000, // API uses seconds
                        poster: stream.poster,
                        sources: []
                    };
                    matches.push(existing);
                }

                // Add source
                existing.sources.push({
                    source: stream.tag || `Stream ${existing.sources.length + 1}`,
                    // Store the iframe directly if available, otherwise the uri_name for lookup
                    id: stream.iframe ? `iframe:${stream.iframe}` : stream.uri_name
                });
            });
        });

        return matches;
    } catch (e) {
        console.error("New API Error", e);
        return [];
    }
};

export const getAllMatches = async (): Promise<SportsMatch[]> => {
  // Priority: Use New API if configured
  if (NEW_API_BASE) {
      return await getMatchesFromNewApi();
  }

  try {
    const data = await fetchApi('/matches/all');
    if (!Array.isArray(data)) return [];

    return data.map((match: any) => {
        const mapTeam = (team: any) => {
            if (!team) return undefined;
            return {
                name: team.name,
                logo: team.badge ? `${IMG_BASE}/badge/${team.badge}.webp` : undefined
            };
        };

        return {
            ...match,
            poster: match.poster ? formatPosterUrl(match.poster) : undefined,
            teams: match.teams ? {
                home: mapTeam(match.teams.home),
                away: mapTeam(match.teams.away)
            } : undefined
        };
    });
  } catch (e) {
    console.error("Failed to fetch matches:", e);
    return [];
  }
};

export const getMatchStreams = async (source: string, id: string): Promise<SportsStream[]> => {
  // Handle Direct Iframe from New API
  if (id.startsWith('iframe:')) {
      let url = id.replace('iframe:', '');

      // Check if it's a full HTML tag and extract src
      const srcMatch = url.match(/src=["']([^"']+)["']/);
      if (srcMatch && srcMatch[1]) {
          url = srcMatch[1];
      }
      
      // Handle protocol-relative URLs
      if (url.startsWith('//')) {
          url = 'https:' + url;
      }

      return [{
          id: 'direct',
          streamNo: 1,
          language: 'Default',
          hd: true,
          embedUrl: url,
          source: source
      }];
  }

  try {
    const safeSource = source.toLowerCase();
    const safeId = encodeURIComponent(id);
    const data = await fetchApi(`/stream/${safeSource}/${safeId}`);
    
    if (!Array.isArray(data) || !data.length) return [];

    return data as SportsStream[];
  } catch (e) {
    console.error("Failed to fetch streams:", e);
    return [];
  }
};
