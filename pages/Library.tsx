

import React, { useState, useEffect } from 'react';
import { TMDBResult, MediaType, IPTVChannel, ContinueWatchingItem } from '../types';
import { getWatchlist, getFavoriteChannels, getProgress } from '../services/storage';
import { MediaCard } from '../components/MediaCard';
import { Bookmark, Calendar, Heart, PlayCircle, Clock, Tv2 } from 'lucide-react';
import { TMDB_POSTER_BASE } from '../constants';

interface LibraryProps {
  onSelect: (item: TMDBResult) => void;
}

export const Library: React.FC<LibraryProps> = ({ onSelect }) => {
  const [items, setItems] = useState<TMDBResult[]>([]);
  const [favChannels, setFavChannels] = useState<IPTVChannel[]>([]);
  const [progressItems, setProgressItems] = useState<ContinueWatchingItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'tv' | 'favorites'>('all');

  useEffect(() => {
    setItems(getWatchlist());
    setFavChannels(getFavoriteChannels());
    setProgressItems(getProgress());
  }, []);

  const filteredItems = items.filter(item => {
      if (activeTab === 'movies') return item.media_type === MediaType.MOVIE;
      if (activeTab === 'tv') return item.media_type === MediaType.TV;
      return true;
  });

  const upcomingItems = items.filter(i => i.media_type === MediaType.TV);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
         <div className="flex items-center gap-3">
            <Bookmark className="w-8 h-8 text-[rgb(var(--primary-color))] fill-[rgb(var(--primary-color))]" />
            <h2 className="text-3xl font-bold text-[var(--text-main)]">My Library</h2>
         </div>

         <div className="flex bg-[var(--bg-card)] p-1 rounded-lg border border-[var(--border-color)] overflow-x-auto max-w-full">
            <button 
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'all' ? 'bg-[rgb(var(--primary-color))] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
            >
                Collection
            </button>
            <button 
                onClick={() => setActiveTab('movies')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'movies' ? 'bg-[rgb(var(--primary-color))] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
            >
                Movies
            </button>
            <button 
                onClick={() => setActiveTab('tv')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'tv' ? 'bg-[rgb(var(--primary-color))] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
            >
                TV Shows
            </button>
            <button 
                onClick={() => setActiveTab('favorites')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'favorites' ? 'bg-[rgb(var(--primary-color))] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
            >
                <Heart className="w-4 h-4" /> Channels
            </button>
         </div>
      </div>

      {/* Continue Watching Section (Only on 'all' tab) */}
      {activeTab === 'all' && progressItems.length > 0 && (
          <div className="mb-12">
              <div className="flex items-center gap-2 mb-4 text-[var(--text-muted)] font-bold text-sm uppercase tracking-wider">
                  <Clock className="w-4 h-4" /> Continue Watching
              </div>
              <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar">
                  {progressItems.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => onSelect({ ...item, media_type: item.media_type } as unknown as TMDBResult)}
                        className="relative min-w-[200px] aspect-video rounded-lg overflow-hidden border border-[var(--border-color)] group cursor-pointer"
                      >
                          <img 
                            src={item.poster_path ? `${TMDB_POSTER_BASE}${item.poster_path}` : ''} 
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" 
                          />
                          <div className="absolute inset-0 bg-black/50 flex flex-col justify-center items-center p-4 text-center">
                              <PlayCircle className="w-10 h-10 text-white mb-2 opacity-80 group-hover:scale-110 transition-transform" />
                              <p className="text-white font-bold text-sm line-clamp-1">{item.title}</p>
                              {item.season && (
                                  <p className="text-gray-300 text-xs">S{item.season} : E{item.episode}</p>
                              )}
                          </div>
                          {/* Progress Bar (Mock visual) */}
                          <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-700">
                              <div className="h-full bg-[rgb(var(--primary-color))]" style={{ width: '45%' }}></div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'favorites' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {favChannels.length > 0 ? favChannels.map((channel, idx) => (
                  <div key={idx} className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-lg flex items-center gap-4">
                      <div className="w-12 h-12 bg-[var(--bg-input)] rounded flex items-center justify-center shrink-0 overflow-hidden">
                        {channel.logo ? (
                            <img src={channel.logo} className="w-full h-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                        ) : (
                            <Tv2 className="w-6 h-6 text-[var(--text-muted)]" />
                        )}
                      </div>
                      <div className="min-w-0">
                          <h4 className="font-bold text-[var(--text-main)] truncate">{channel.name}</h4>
                          <p className="text-xs text-[var(--text-muted)]">{channel.group}</p>
                      </div>
                      <div className="ml-auto">
                          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                      </div>
                  </div>
              )) : (
                  <div className="col-span-full py-20 text-center text-[var(--text-muted)]">
                      <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No favorite channels yet. Go to Live TV to add some!</p>
                  </div>
              )}
          </div>
      ) : (
          filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
              <div className="bg-[var(--bg-card)] p-6 rounded-full mb-4 border border-[var(--border-color)]">
                <Bookmark className="w-12 h-12 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-xl font-medium text-[var(--text-main)] mb-2">Your library is empty</h3>
              <p className="max-w-md text-center">
                Movies and TV shows you add to your watchlist will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredItems.map(item => (
                <MediaCard key={item.id} item={item} onClick={onSelect} />
              ))}
            </div>
          )
      )}
      
      {activeTab === 'tv' && upcomingItems.length > 0 && (
          <div className="mt-12 pt-8 border-t border-[var(--border-color)]">
              <div className="bg-blue-900/10 border border-blue-500/30 p-4 rounded-lg flex gap-4 items-center mb-6">
                 <Calendar className="w-6 h-6 text-blue-400" />
                 <div>
                    <p className="text-blue-400 text-sm">Tracking {upcomingItems.length} TV shows in your library.</p>
                    <p className="text-xs text-blue-400/60">Dates are estimated based on release schedules.</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingItems.map(item => (
                      <div key={item.id} onClick={() => onSelect(item)} className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-lg flex gap-4 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors">
                          <img src={`https://image.tmdb.org/t/p/w200${item.poster_path}`} className="w-16 h-24 object-cover rounded" />
                          <div>
                              <h4 className="font-bold text-[var(--text-main)]">{item.name}</h4>
                              <p className="text-xs text-[var(--text-muted)] mt-1">Next Episode Estimate:</p>
                              <p className="text-sm text-[rgb(var(--primary-color))] font-bold mt-1">Coming Soon</p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};