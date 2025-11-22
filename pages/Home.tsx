
import React, { useEffect, useState } from 'react';
import { getTrending, getPopularMovies, getPopularTV, getTopRatedMovies, getTopRatedTV } from '../services/tmdb';
import { getHistory } from '../services/storage';
import { TMDBResult } from '../types';
import { MediaCard } from '../components/MediaCard';
import { TMDB_IMAGE_BASE } from '../constants';
import { Play, Info, TrendingUp, Star, Film, Clock } from 'lucide-react';

interface HomeProps {
  onSelect: (item: TMDBResult) => void;
}

export const Home: React.FC<HomeProps> = ({ onSelect }) => {
  const [trending, setTrending] = useState<TMDBResult[]>([]);
  const [movies, setMovies] = useState<TMDBResult[]>([]);
  const [series, setSeries] = useState<TMDBResult[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<TMDBResult[]>([]);
  const [topRatedSeries, setTopRatedSeries] = useState<TMDBResult[]>([]);
  const [history, setHistory] = useState<TMDBResult[]>([]);
  const [heroItem, setHeroItem] = useState<TMDBResult | null>(null);

  useEffect(() => {
    setHistory(getHistory());
    const loadData = async () => {
      try {
        const [t, m, s, tm, ts] = await Promise.all([
          getTrending(),
          getPopularMovies(),
          getPopularTV(),
          getTopRatedMovies(),
          getTopRatedTV()
        ]);
        setTrending(t);
        setMovies(m);
        setSeries(s);
        setTopRatedMovies(tm);
        setTopRatedSeries(ts);
        if (t.length > 0) setHeroItem(t[0]);
      } catch (e) {
        console.error("Failed to load home data", e);
      }
    };
    loadData();
  }, []);

  const Top10Row = ({ title, items, typeLabel }: { title: string, items: TMDBResult[], typeLabel: string }) => (
    <div className="mb-12 relative z-10 animate-fade-in">
      <div className="flex items-center justify-between mb-6 px-4">
        <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-[rgb(var(--primary-color))] rounded-full"></div>
            <h2 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight uppercase italic">
                {title}
            </h2>
        </div>
        <div className="hidden md:block h-[1px] flex-1 bg-[var(--border-color)] ml-6 opacity-50"></div>
        <div className="hidden md:flex items-center gap-2 ml-4 px-3 py-1 rounded border border-[var(--border-color)] text-xs font-bold text-[var(--text-muted)] tracking-widest">
             {typeLabel}
        </div>
      </div>
      
      <div className="flex overflow-x-auto overflow-y-hidden overscroll-x-contain space-x-6 px-4 pb-8 custom-scrollbar scroll-smooth snap-x snap-proximity pt-2">
        {items.slice(0, 10).map((item, index) => (
          <div 
            key={item.id} 
            className="snap-start relative min-w-[280px] md:min-w-[360px] aspect-[16/9] rounded-xl cursor-pointer group transition-all duration-300 hover:scale-105 hover:z-10"
            onClick={() => onSelect(item)}
          >
             <div className="absolute -left-4 -bottom-6 z-20 font-black text-[140px] leading-none text-[var(--bg-main)] select-none drop-shadow-2xl" 
                  style={{ WebkitTextStroke: '4px #444', textShadow: '4px 4px 0px #000' }}>
                {index + 1}
             </div>
             <div className="absolute -left-4 -bottom-6 z-30 font-black text-[140px] leading-none text-[var(--bg-main)] select-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
                  style={{ WebkitTextStroke: '2px rgb(var(--primary-color))' }}>
                {index + 1}
             </div>

             <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl relative border border-[var(--border-color)] bg-[var(--bg-card)] ml-6 group-hover:ml-8 transition-all duration-300">
                <img 
                    src={`${TMDB_IMAGE_BASE}${item.backdrop_path}`} 
                    alt={item.name || item.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 right-0 p-4 pl-16">
                    <h3 className="text-white font-black text-xl md:text-2xl leading-none drop-shadow-lg uppercase italic truncate">
                        {item.name || item.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-xs font-bold text-gray-300">
                         <span className="text-green-400">98% Match</span>
                         <span>{(item.first_air_date || item.release_date)?.split('-')[0]}</span>
                         <span className="border border-gray-500 px-1 rounded text-[10px]">HD</span>
                    </div>
                </div>
             </div>
          </div>
        ))}
        <div className="w-4 shrink-0"></div>
      </div>
    </div>
  );

  const Row = ({ title, items, icon: Icon }: { title: string, items: TMDBResult[], icon?: React.ElementType }) => (
    <div className="mb-12 relative z-10">
      <div className="flex items-center gap-3 mb-5 px-4">
        {Icon && <Icon className="w-6 h-6 text-[rgb(var(--primary-color))]" />}
        <h2 className="text-xl md:text-2xl font-bold text-[var(--text-main)] tracking-wide">{title}</h2>
      </div>
      
      <div className="flex overflow-x-auto overflow-y-hidden overscroll-x-contain space-x-4 px-4 pb-4 custom-scrollbar scroll-smooth snap-x snap-proximity">
        {items.map(item => (
          <div key={item.id} className="snap-start">
             <MediaCard item={item} onClick={onSelect} />
          </div>
        ))}
        <div className="w-2 shrink-0"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20 bg-[var(--bg-main)] overflow-x-hidden transition-colors duration-300">
      {heroItem && (
        <div className="relative h-[85vh] w-full mb-16 group">
          <div className="absolute inset-0">
            <img 
              src={`${TMDB_IMAGE_BASE}${heroItem.backdrop_path}`} 
              alt={heroItem.title || heroItem.name} 
              className="w-full h-full object-cover transition-transform duration-[20s] group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-black/60 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-main)] via-black/40 to-transparent"></div>
          </div>

          <div className="absolute bottom-0 left-0 w-full px-4 sm:px-8 md:px-12 pb-16 max-w-7xl mx-auto right-0 flex flex-col gap-4">
             <div className="flex items-center gap-2 animate-fade-in-up">
                <span className="inline-flex items-center gap-1 py-1 px-3 rounded-full bg-red-600/90 backdrop-blur-sm text-white text-xs font-bold tracking-wider uppercase shadow-lg shadow-red-900/20">
                  <TrendingUp className="w-3 h-3" /> Trending #1
                </span>
                <span className="inline-flex items-center gap-1 py-1 px-3 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-bold border border-white/10">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {heroItem.vote_average.toFixed(1)}
                </span>
             </div>
            
            <h1 className="text-4xl md:text-7xl font-black text-white leading-none tracking-tight drop-shadow-xl animate-fade-in-up delay-100">
              {heroItem.title || heroItem.name}
            </h1>
            
            <p className="text-gray-200 text-sm md:text-lg line-clamp-3 md:line-clamp-2 max-w-2xl drop-shadow-md animate-fade-in-up delay-200 font-medium">
              {heroItem.overview}
            </p>
            
            <div className="flex gap-4 pt-4 animate-fade-in-up delay-300">
              <button 
                onClick={() => onSelect(heroItem)}
                className="flex items-center gap-2 bg-white text-black px-8 py-3.5 rounded-lg font-bold hover:bg-gray-200 transition-all transform hover:scale-105 shadow-lg shadow-white/10"
              >
                <Play className="w-5 h-5 fill-black" /> 
                <span>Watch Now</span>
              </button>
              <button 
                 onClick={() => onSelect(heroItem)}
                 className="flex items-center gap-2 bg-white/10 text-white border border-white/20 px-8 py-3.5 rounded-lg font-bold hover:bg-white/20 transition-all backdrop-blur-md"
              >
                <Info className="w-5 h-5" /> 
                <span>Details</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-2">
          {history.length > 0 && (
             <Row title="Continue Watching" items={history} icon={Clock} />
          )}
          {movies.length > 0 && <Top10Row title="TOP 10 Movies" items={movies} typeLabel="MOVIES" />}
          {series.length > 0 && <Top10Row title="TOP 10 Shows" items={series} typeLabel="TV SHOWS" />}
          
          <div className="my-12 border-t border-[var(--border-color)]" />
          
          <Row title="Highest Rated Movies" items={topRatedMovies} icon={Star} />
          <Row title="Highest Rated Series" items={topRatedSeries} icon={Star} />
        </div>
      </div>
    </div>
  );
};
