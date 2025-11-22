
import React, { useState, useEffect } from 'react';
import { TMDBResult, MediaType } from '../types';
import { discoverMedia, getGenres } from '../services/tmdb';
import { MediaCard } from '../components/MediaCard';
import { Filter, ChevronDown, Dices, X, Loader2 } from 'lucide-react';

interface DiscoverProps {
  onSelect: (item: TMDBResult) => void;
}

export const Discover: React.FC<DiscoverProps> = ({ onSelect }) => {
  const [items, setItems] = useState<TMDBResult[]>([]);
  const [mediaType, setMediaType] = useState<MediaType>(MediaType.MOVIE);
  const [genres, setGenres] = useState<{id: number, name: string}[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [loading, setLoading] = useState(false);
  
  // Roulette State
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const years = Array.from({length: 30}, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    getGenres(mediaType).then(setGenres);
  }, [mediaType]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await discoverMedia(mediaType, sortBy, selectedGenre, selectedYear);
        setItems(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [mediaType, sortBy, selectedGenre, selectedYear]);

  const handleSpin = async () => {
      setSpinning(true);
      try {
          // 1. Pick a random page (1-50 to ensure high quality items usually)
          const randomPage = Math.floor(Math.random() * 50) + 1;
          
          // 2. Fetch results from that page with current filters
          const results = await discoverMedia(
            mediaType, 
            'vote_average.desc', // Force high rating for roulette
            selectedGenre,
            undefined, // Any year
            randomPage
          );

          if (results.length > 0) {
              // 3. Pick random item
              const randomItem = results[Math.floor(Math.random() * results.length)];
              
              // 4. Artificial delay for suspense
              setTimeout(() => {
                  setSpinning(false);
                  setIsRouletteOpen(false);
                  onSelect(randomItem);
              }, 1500);
          } else {
              setSpinning(false);
              alert("No luck! Try different filters.");
          }
      } catch (e) {
          setSpinning(false);
          alert("Roulette failed. Try again.");
      }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
            <h2 className="text-3xl font-bold text-[var(--text-main)] mb-2 flex items-center gap-3">
                <Filter className="w-6 h-6 text-[rgb(var(--primary-color))]" />
                Discover
            </h2>
            <p className="text-[var(--text-muted)] text-sm">Find your next favorite from thousands of titles.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
            <select 
                value={mediaType}
                onChange={(e) => { setMediaType(e.target.value as MediaType); setSelectedGenre(undefined); }}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-sm rounded-lg px-4 py-2.5 focus:border-[rgb(var(--primary-color))] outline-none"
            >
                <option value="movie">Movies</option>
                <option value="tv">TV Shows</option>
            </select>

            <select 
                value={selectedGenre || ''}
                onChange={(e) => setSelectedGenre(e.target.value ? Number(e.target.value) : undefined)}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-sm rounded-lg px-4 py-2.5 focus:border-[rgb(var(--primary-color))] outline-none"
            >
                <option value="">All Genres</option>
                {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>

            <select 
                value={selectedYear || ''}
                onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : undefined)}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-sm rounded-lg px-4 py-2.5 focus:border-[rgb(var(--primary-color))] outline-none"
            >
                <option value="">All Years</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-sm rounded-lg px-4 py-2.5 focus:border-[rgb(var(--primary-color))] outline-none"
            >
                <option value="popularity.desc">Most Popular</option>
                <option value="vote_average.desc">Highest Rated</option>
                <option value="primary_release_date.desc">Newest First</option>
            </select>
        </div>
      </div>

      {/* Roulette Floating Button */}
      <button 
        onClick={() => setIsRouletteOpen(true)}
        className="fixed bottom-8 right-8 z-40 bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform border-2 border-white/20 group"
        title="Spin the Roulette"
      >
        <Dices className="w-8 h-8 group-hover:rotate-180 transition-transform duration-500" />
      </button>

      {/* Roulette Modal */}
      {isRouletteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-md rounded-2xl p-8 relative shadow-2xl">
                  <button onClick={() => setIsRouletteOpen(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)]"><X className="w-6 h-6" /></button>
                  
                  <div className="text-center">
                      <div className="w-20 h-20 bg-[var(--bg-hover)] rounded-full flex items-center justify-center mx-auto mb-6">
                          <Dices className={`w-10 h-10 text-pink-500 ${spinning ? 'animate-spin' : ''}`} />
                      </div>
                      <h3 className="text-2xl font-black text-[var(--text-main)] mb-2">Movie Roulette</h3>
                      <p className="text-[var(--text-muted)] mb-8">Can't decide? Let fate choose for you based on your current filters.</p>

                      <div className="bg-[var(--bg-input)] p-4 rounded-lg mb-8 text-left text-sm border border-[var(--border-color)]">
                          <div className="flex justify-between mb-2">
                              <span className="text-[var(--text-muted)]">Type:</span>
                              <span className="font-bold text-[var(--text-main)] uppercase">{mediaType}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-[var(--text-muted)]">Genre:</span>
                              <span className="font-bold text-[var(--text-main)]">{selectedGenre ? genres.find(g => g.id === selectedGenre)?.name : 'Random'}</span>
                          </div>
                      </div>

                      <button 
                        onClick={handleSpin}
                        disabled={spinning}
                        className="w-full py-4 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl font-bold text-lg shadow-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                          {spinning ? <Loader2 className="w-6 h-6 animate-spin" /> : <Dices className="w-6 h-6" />}
                          {spinning ? 'Spinning...' : 'SPIN NOW'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
                <div key={i} className="aspect-[2/3] skeleton-loader rounded-lg"></div>
            ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-muted)]">
            No results found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {items.map(item => (
            <MediaCard key={item.id} item={item} onClick={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};
