
import { SportsMatch, SportsStream } from '../types';

// ==========================================
// API CONFIGURATION
// ==========================================
const API_DOMAIN = 'https://ppv.to';
const PROXY_URL = 'https://corsproxy.io/?';

// Endpoints
const API_BASE = `${API_DOMAIN}/api`;
const IMG_BASE = `${API_DOMAIN}/api/images`;

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
const fetchApi = async (endpoint: string) => {
  const targetUrl = `${API_BASE}${endpoint}`;
  const url = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    // Fallback: Try direct fetch in case proxy fails or CORS is permissive
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
    if (path.startsWith('http')) return path; 
    
    let finalUrl = '';
    // Handle different path formats from API
    if (path.startsWith('/')) {
        finalUrl = `${API_DOMAIN}${path}.webp`;
    } else {
        finalUrl = `${IMG_BASE}/proxy/${path}.webp`;
    }
    return `${PROXY_URL}${encodeURIComponent(finalUrl)}`;
};

// ==========================================
// SERVICE METHODS
// ==========================================

export const getAllMatches = async (): Promise<SportsMatch[]> => {
    const targetUrl = `${API_BASE}/streams`;
    const url = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('API Failed');
        const data: NewApiResponse = await res.json();
        
        if (!data.success || !data.streams) return [];

        const matches: SportsMatch[] = [];

        // Flatten categories and group by Event Name to handle multiple links
        data.streams.forEach(cat => {
            const categoryName = cat.category;
            
            cat.streams.forEach(stream => {
                // Filter out 24/7 streams (always_live === 1)
                if (stream.always_live) return;

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
        console.error("API Error", e);
        return [];
    }
};

export const getMatchStreams = async (source: string, id: string): Promise<SportsStream[]> => {
  // 1. Handle Direct Iframe (Preferred)
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

  // 2. Handle Stream Lookup via API (Fallback for non-iframe sources)
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
