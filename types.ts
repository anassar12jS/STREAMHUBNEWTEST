

export enum MediaType {
  MOVIE = 'movie',
  TV = 'tv',
  PERSON = 'person'
}

export interface TMDBResult {
  id: number;
  title?: string;
  name?: string; // For TV
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  media_type: MediaType;
  vote_average: number;
  release_date?: string;
  first_air_date?: string; // For TV
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  };
}

export interface CollectionPart {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type: MediaType;
  vote_average: number;
  release_date: string;
}

export interface Collection {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: CollectionPart[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface PersonDetail {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
}

export interface TMDBDetail extends TMDBResult {
  genres: { id: number; name: string }[];
  tagline?: string;
  external_ids?: {
    imdb_id?: string;
  };
  runtime?: number;
  number_of_seasons?: number;
  credits?: {
    cast: CastMember[];
  };
}

export interface TMDBVideo {
  id: string;
  key: string;
  site: string;
  type: string;
  name: string;
  official: boolean;
}

export interface Stream {
  name?: string;
  title?: string;
  infoHash?: string;
  fileIdx?: number;
  url?: string;
  behaviorHints?: {
    bingeGroup?: string;
  };
}

export interface StreamResponse {
  streams: Stream[];
}

export interface SportsTeam {
  name: string;
  logo?: string;
}

export interface SportsMatchSource {
  source: string;
  id: string;
}

export interface SportsMatch {
  title: string;
  date: number; // Timestamp
  category: string;
  poster?: string;
  teams?: { home: SportsTeam; away: SportsTeam };
  sources: SportsMatchSource[];
  popular?: boolean;
}

export interface SportsStream {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  embedUrl: string;
  source: string;
}

export interface WebtorOptions {
  id: string;
  magnet: string;
  width?: string;
  height?: string;
  theme?: 'light' | 'dark';
  poster?: string;
  title?: string;
  imdbId?: string;
  version?: string;
  mode?: string;
}

export interface AniListResult {
  id: number;
  title: {
    romaji: string;
    english: string;
    native: string;
  };
  coverImage: {
    large: string;
    extraLarge: string;
  };
  bannerImage: string;
  description: string;
  averageScore: number;
  format: string;
  status: string;
  nextAiringEpisode?: {
    airingAt: number;
    episode: number;
  };
  genres: string[];
}

export interface IPTVChannel {
  name: string;
  logo?: string;
  group?: string;
  url: string;
}

export interface ContinueWatchingItem {
  id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  season?: number;
  episode?: number;
  timestamp: number; // When they last watched
  progress?: number; // % watched (optional for future)
}

declare global {
  interface Window {
    webtor: {
      push: (options: WebtorOptions) => void;
    };
    Hls?: any;
  }
}