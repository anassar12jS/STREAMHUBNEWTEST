
import { SportsMatch, SportsStream } from '../types';

// ==========================================
// API CONFIGURATION
// ==========================================
const PROXY_URL = 'https://corsproxy.io/?';

// Providers
const PPV_BASE = 'https://ppv.to/api';
const STREAMED_BASE = 'https://streamed.pk/api';

interface NewApiStream {
    id: number;
    name: string;
    tag: string;
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

// Helper to fetch through proxy
const fetchApi = async (url: string) => {
  const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
  
  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    // Fallback: Try direct fetch
    try {
        const directRes = await fetch(url);
        if (!directRes.ok) throw new Error('Direct fetch failed');
        return await directRes.json();
    } catch (err) {
        throw e;
    }
  }
};

const formatStreamedPoster = (path: string) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    return `https://streamed.pk${path}.webp`;
};

const formatPPVPoster = (path: string) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    const finalUrl = `https://ppv.to/api/images/proxy/${path}.webp`;
    return `${PROXY_URL}${encodeURIComponent(finalUrl)}`;
};

// ==========================================
// DATA FETCHERS
// ==========================================

const getMatchesFromPPV = async (): Promise<SportsMatch[]> => {
    try {
        const data: NewApiResponse = await fetchApi(`${PPV_BASE}/streams`);
        if (!data.success || !data.streams) return [];

        const matches: SportsMatch[] = [];

        data.streams.forEach(cat => {
            cat.streams.forEach(stream => {
                if (stream.always_live) return;

                // Group by title + time
                let existing = matches.find(m => m.title === stream.name && Math.abs(m.date - (stream.starts_at * 1000)) < 7200000); // 2h window
                
                if (!existing) {
                    existing = {
                        title: stream.name,
                        category: cat.category,
                        date: stream.starts_at * 1000,
                        poster: formatPPVPoster(stream.poster),
                        sources: []
                    };
                    matches.push(existing);
                }

                existing.sources.push({
                    source: stream.tag || `PPV ${existing.sources.length + 1}`,
                    id: stream.iframe ? `iframe:${stream.iframe}` : stream.uri_name
                });
            });
        });
        return matches;
    } catch (e) {
        console.error("PPV API Error", e);
        return [];
    }
};

const getMatchesFromStreamed = async (): Promise<SportsMatch[]> => {
    try {
        const data = await fetchApi(`${STREAMED_BASE}/matches/all`);
        if (!Array.isArray(data)) return [];

        return data.map((m: any) => ({
            title: m.title,
            category: m.category,
            date: m.date,
            poster: m.poster ? formatStreamedPoster(m.poster) : undefined,
            popular: m.popular,
            teams: m.teams ? {
                home: { 
                    name: m.teams.home.name, 
                    logo: m.teams.home.badge ? `https://streamed.pk/api/images/badge/${m.teams.home.badge}.webp` : undefined 
                },
                away: { 
                    name: m.teams.away.name, 
                    logo: m.teams.away.badge ? `https://streamed.pk/api/images/badge/${m.teams.away.badge}.webp` : undefined 
                }
            } : undefined,
            sources: (m.sources || []).map((s: any) => ({
                source: `Streamed ${s.source}`,
                id: `streamed::${s.source}::${s.id}` // Encode source + id for retrieval
            }))
        }));
    } catch (e) {
        console.error("Streamed API Error", e);
        return [];
    }
};

// ==========================================
// EXPORTED METHODS
// ==========================================

export const getAllMatches = async (): Promise<SportsMatch[]> => {
    const [ppvMatches, streamedMatches] = await Promise.all([
        getMatchesFromPPV(),
        getMatchesFromStreamed()
    ]);

    // Use PPV as the strict master list
    const displayMatches = [...ppvMatches];

    displayMatches.forEach(match => {
        // Find corresponding match in Streamed data to enrich sources/metadata
        const found = streamedMatches.find(sm => 
            sm.title === match.title && 
            Math.abs(sm.date - match.date) < 7200000 // 2 hour window
        );

        if (found) {
            // 1. Append links from Streamed
            match.sources.push(...found.sources);

            // 2. If PPV doesn't have team info (logos) but Streamed does, copy it over for better UI
            if (!match.teams && found.teams) {
                match.teams = found.teams;
            }
        }
    });

    return displayMatches;
};

export const getMatchStreams = async (source: string, id: string): Promise<SportsStream[]> => {
  // 1. Handle Streamed.pk
  if (id.startsWith('streamed::')) {
      const parts = id.split('::');
      // id format: streamed::source::id
      if (parts.length >= 3) {
          const realSource = parts[1];
          const realId = parts[2];
          try {
             const data = await fetchApi(`${STREAMED_BASE}/stream/${realSource}/${realId}`);
             return Array.isArray(data) ? data : [];
          } catch (e) {
             console.error("Streamed Stream Error", e);
             return [];
          }
      }
  }

  // 2. Handle Direct Iframe (PPV)
  if (id.startsWith('iframe:')) {
      let url = id.replace('iframe:', '');
      const srcMatch = url.match(/src=["']([^"']+)["']/);
      if (srcMatch && srcMatch[1]) url = srcMatch[1];
      if (url.startsWith('//')) url = 'https:' + url;

      return [{
          id: 'direct',
          streamNo: 1,
          language: 'Default',
          hd: true,
          embedUrl: url,
          source: source
      }];
  }

  // 3. Handle Legacy PPV API (Fallback)
  try {
    const safeSource = source.toLowerCase();
    const safeId = encodeURIComponent(id);
    const data = await fetchApi(`${PPV_BASE}/stream/${safeSource}/${safeId}`);
    
    if (!Array.isArray(data) || !data.length) return [];

    return data as SportsStream[];
  } catch (e) {
    console.error("Failed to fetch streams:", e);
    return [];
  }
};
