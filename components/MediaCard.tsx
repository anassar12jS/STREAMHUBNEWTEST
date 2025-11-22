
import React from 'react';
import { TMDBResult, MediaType } from '../types';
import { TMDB_POSTER_BASE } from '../constants';
import { Star } from 'lucide-react';

interface MediaCardProps {
  item: TMDBResult;
  onClick: (item: TMDBResult) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, onClick }) => {
  const title = item.title || item.name;
  const date = item.release_date || item.first_air_date;
  const year = date ? date.split('-')[0] : 'N/A';
  
  // Handle external URLs (AniList) vs TMDB paths
  const posterUrl = item.poster_path?.startsWith('http') 
    ? item.poster_path 
    : item.poster_path 
        ? `${TMDB_POSTER_BASE}${item.poster_path}` 
        : 'https://picsum.photos/300/450?blur=2';

  return (
    <div 
      className="group relative flex-shrink-0 w-[160px] md:w-[200px] cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-10"
      onClick={() => onClick(item)}
    >
      <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-lg bg-[var(--bg-card)] relative">
        <img 
          src={posterUrl} 
          alt={title} 
          className="w-full h-full object-cover transition-opacity duration-300"
          loading="lazy"
        />
        
        <div className="absolute top-2 right-2 bg-black/70 px-1.5 py-0.5 rounded text-xs font-bold text-yellow-400 flex items-center gap-1 backdrop-blur-sm">
          <Star className="w-3 h-3 fill-yellow-400" />
          {item.vote_average.toFixed(1)}
        </div>
      </div>

      <div className="mt-2 px-1">
        <h3 className="text-sm font-semibold truncate text-[var(--text-main)] group-hover:text-[rgb(var(--primary-color))] transition-colors">{title}</h3>
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mt-1">
          <span>{year}</span>
          <span className="uppercase border border-[var(--border-color)] px-1 rounded text-[10px]">{item.media_type}</span>
        </div>
      </div>
    </div>
  );
};