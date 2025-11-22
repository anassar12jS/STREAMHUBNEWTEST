
import { AniListResult, TMDBResult, MediaType } from '../types';

const GRAPHQL_URL = 'https://graphql.anilist.co';

const fetchAniList = async (query: string, variables: any = {}) => {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables
    })
  };

  const response = await fetch(GRAPHQL_URL, options);
  const json = await response.json();
  return json.data ? json.data.Page.media : [];
};

const ANIME_QUERY = `
query ($page: Int, $perPage: Int, $sort: [MediaSort], $status: MediaStatus, $season: MediaSeason, $seasonYear: Int) {
  Page (page: $page, perPage: $perPage) {
    media (type: ANIME, sort: $sort, status: $status, season: $season, seasonYear: $seasonYear) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        extraLarge
      }
      bannerImage
      description
      averageScore
      format
      status
      genres
      nextAiringEpisode {
        airingAt
        episode
      }
    }
  }
}
`;

export const getTrendingAnime = async (): Promise<AniListResult[]> => {
  return fetchAniList(ANIME_QUERY, {
    page: 1,
    perPage: 10,
    sort: 'TRENDING_DESC'
  });
};

export const getPopularAnime = async (): Promise<AniListResult[]> => {
  return fetchAniList(ANIME_QUERY, {
    page: 1,
    perPage: 20,
    sort: 'POPULARITY_DESC'
  });
};

export const getUpcomingAnime = async (): Promise<AniListResult[]> => {
  return fetchAniList(ANIME_QUERY, {
    page: 1,
    perPage: 10,
    sort: 'POPULARITY_DESC',
    status: 'NOT_YET_RELEASED'
  });
};

export const getSeasonAnime = async (): Promise<AniListResult[]> => {
    // Rough season calculation
    const month = new Date().getMonth();
    let season = 'WINTER';
    if (month >= 2 && month <= 4) season = 'SPRING';
    else if (month >= 5 && month <= 7) season = 'SUMMER';
    else if (month >= 8 && month <= 10) season = 'FALL';

    return fetchAniList(ANIME_QUERY, {
        page: 1,
        perPage: 20,
        season: season,
        seasonYear: new Date().getFullYear(),
        sort: 'POPULARITY_DESC'
    });
};

// Helper to convert AniList result to our app's TMDBResult format for display cards
export const mapAniListToTMDB = (anime: AniListResult): TMDBResult => {
    return {
        id: anime.id, // Note: This is AniList ID, bridging logic handles mapping to TMDB ID later
        title: anime.title.english || anime.title.romaji,
        name: anime.title.english || anime.title.romaji,
        poster_path: anime.coverImage.extraLarge || anime.coverImage.large, // Full URL
        backdrop_path: anime.bannerImage || anime.coverImage.extraLarge,
        overview: anime.description,
        media_type: MediaType.TV, // Anime is generally TV
        vote_average: (anime.averageScore || 0) / 10,
        first_air_date: '2023', // Placeholder
    };
};