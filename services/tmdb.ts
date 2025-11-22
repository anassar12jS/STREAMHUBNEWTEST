
import { TMDB_API_KEY, TMDB_BASE_URL } from '../constants';
import { TMDBResult, TMDBDetail, TMDBVideo, MediaType, PersonDetail, Collection } from '../types';

const fetchTMDB = async (endpoint: string, params: Record<string, string> = {}) => {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', TMDB_API_KEY);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB Error: ${res.status}`);
  return res.json();
};

export const getTrending = async (): Promise<TMDBResult[]> => {
  const data = await fetchTMDB('/trending/all/day');
  return data.results;
};

export const getPopularMovies = async (): Promise<TMDBResult[]> => {
  const data = await fetchTMDB('/movie/popular');
  return data.results.map((m: any) => ({ ...m, media_type: MediaType.MOVIE }));
};

export const getPopularTV = async (): Promise<TMDBResult[]> => {
  const data = await fetchTMDB('/tv/popular');
  return data.results.map((t: any) => ({ ...t, media_type: MediaType.TV }));
};

export const getTopRatedMovies = async (): Promise<TMDBResult[]> => {
  const data = await fetchTMDB('/movie/top_rated');
  return data.results.map((m: any) => ({ ...m, media_type: MediaType.MOVIE }));
};

export const getTopRatedTV = async (): Promise<TMDBResult[]> => {
  const data = await fetchTMDB('/tv/top_rated');
  return data.results.map((t: any) => ({ ...t, media_type: MediaType.TV }));
};

export const searchMedia = async (query: string): Promise<TMDBResult[]> => {
  if (!query) return [];
  const data = await fetchTMDB('/search/multi', { query });
  return data.results.filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv');
};

export const getDetails = async (id: number, type: MediaType): Promise<TMDBDetail> => {
  const data = await fetchTMDB(`/${type}/${id}`, { append_to_response: 'external_ids,credits' });
  return { ...data, media_type: type };
};

export const getCollection = async (id: number): Promise<Collection> => {
    return await fetchTMDB(`/collection/${id}`);
};

export const getVideos = async (id: number, type: MediaType): Promise<TMDBVideo[]> => {
  try {
    const data = await fetchTMDB(`/${type}/${id}/videos`);
    return data.results;
  } catch (e) {
    console.warn("Failed to fetch videos", e);
    return [];
  }
};

export const getRecommendations = async (id: number, type: MediaType): Promise<TMDBResult[]> => {
  try {
    const data = await fetchTMDB(`/${type}/${id}/recommendations`);
    return data.results.map((item: any) => ({ ...item, media_type: type }));
  } catch (e) {
    return [];
  }
};

// Person & Cast
export const getPerson = async (id: number): Promise<PersonDetail> => {
  const data = await fetchTMDB(`/person/${id}`);
  return data;
};

export const getPersonCredits = async (id: number): Promise<TMDBResult[]> => {
  const data = await fetchTMDB(`/person/${id}/combined_credits`);
  return data.cast
    .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
    .sort((a: any, b: any) => b.vote_count - a.vote_count);
};

// Discover
export const getGenres = async (type: MediaType) => {
  const data = await fetchTMDB(`/genre/${type}/list`);
  return data.genres;
};

export const discoverMedia = async (
  type: MediaType, 
  sortBy: string = 'popularity.desc', 
  genreId?: number, 
  year?: number,
  page: number = 1
): Promise<TMDBResult[]> => {
  const params: Record<string, string> = {
    sort_by: sortBy,
    include_adult: 'false',
    include_video: 'false',
    page: page.toString(),
  };

  if (sortBy === 'vote_average.desc') {
    params['vote_count.gte'] = '1000';
  }

  if (genreId) params.with_genres = genreId.toString();
  if (year) {
    if (type === MediaType.MOVIE) params.primary_release_year = year.toString();
    if (type === MediaType.TV) params.first_air_date_year = year.toString();
  }

  const data = await fetchTMDB(`/discover/${type}`, params);
  return data.results.map((item: any) => ({ ...item, media_type: type }));
};
