
import React, { useState, useEffect } from 'react';
import { getTrendingAnime, getPopularAnime, getUpcomingAnime, getSeasonAnime, mapAniListToTMDB } from '../services/anilist';
import { searchMedia } from '../services/tmdb';
import { TMDBResult, AniListResult, MediaType } from '../types';
import { MediaCard } from '../components/MediaCard';
import { Ghost, TrendingUp, Calendar, Star, Flame, Play } from 'lucide-react';

interface AnimeProps {
  onSelect: (item: TMDBResult) => void;
}

export const Anime: React.FC<AnimeProps> = ({ onSelect }) => {
  const [trending, setTrending] = useState<TMDBResult[]>([]);
  const [popular, setPopular] = useState<TMDBResult[]>([]);
  const [season, setSeason] = useState<TMDBResult[]>([]);
  const [upcoming, setUpcoming] = useState<TMDBResult[]>([]);
  const [heroItem, setHeroItem] = useState<AniListResult | null>(null);
  const [loadingHero, setLoadingHero] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [t, p, s, u] = await Promise.all([
        getTrendingAnime(),
        getPopularAnime(),
        getSeasonAnime(),
        getUpcomingAnime()
      ]);

      setTrending(t.map(mapAniListToTMDB));
      setPopular(p.map(mapAniListToTMDB));
      setSeason(s.map(mapAniListToTMDB));
      setUpcoming(u.map(mapAniListToTMDB));
      
      if (t.length > 0) setHeroItem(t[0]);
    };
    fetchData();
  }, []);

  // Smart Select: Bridges AniList ID to TMDB ID
  const handleAnimeSelect = async (item: TMDBResult) => {
    // If the item has a standard TMDB poster path (not http), it's likely already a TMDB item (edge case)
    if (item.poster_path && !item.poster_path.startsWith('http')) {
        onSelect(item);
        return;
    }

    setLoadingHero(true);
    try {
        // Search TMDB for the title
        const results = await searchMedia(item.title || item.name || '');
        // Filter for likely matches (TV or Movie)
        const match = results.find(r => r.media_type === MediaType.TV || r.media_type === MediaType.MOVIE);
        
        if (match) {
            onSelect(match);
        } else {
            // Fallback: Pass as is, though Details page might fail if it expects strictly TMDB ID
            // Ideally show a toast "Not found on TMDB"
            console.warn("Could not bridge to TMDB");
            alert("Stream source not found for this anime.");
        }
    } catch (e) {
        console.error("Bridge error", e);
    } finally {
        setLoadingHero(false);
    }
  };

  const Row = ({ title, items, icon: Icon }: { title: string, items: TMDBResult[], icon?: React.ElementType }) => (
    <div className="mb-12 relative z-10">
      <div className="flex items-center gap-3 mb-5 px-4">
        {Icon && <Icon className="w-6 h-6 text-[rgb(var(--primary-color))]" />}
        <h2 className="text-xl md:text-2xl font-bold text-[var(--text-main)] tracking-wide">{title}</h2>
      </div>
      
      <div className="flex overflow-x-auto overflow-y-hidden overscroll-x-contain space-x-4 px-4 pb-4 custom-scrollbar scroll-smooth snap-x snap-proximity">
        {items.map((item, idx) => (
          <div key={idx} className="snap-start">
             <MediaCard item={item} onClick={handleAnimeSelect} />
          </div>
        ))}
        <div className="w-2 shrink-0"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20 bg-[var(--bg-main)] animate-fade-in">
        
        {/* Anime Hero */}
        {heroItem && (
            <div className="relative h-[70vh] w-full mb-12 group">
                <div className="absolute inset-0">
                    <img 
                        src={heroItem.bannerImage || heroItem.coverImage.extraLarge} 
                        alt={heroItem.title.english} 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/60 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-main)] via-transparent to-transparent"></div>
                </div>

                <div className="absolute bottom-0 left-0 w-full px-6 md:px-12 pb-12 max-w-7xl mx-auto flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-[rgb(var(--primary-color))] text-white text-xs font-bold rounded-full uppercase tracking-wider">
                            #{heroItem.id} Trending
                        </span>
                        {heroItem.nextAiringEpisode && (
                            <span className="px-3 py-1 bg-pink-500 text-white text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> EP {heroItem.nextAiringEpisode.episode} Soon
                            </span>
                        )}
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black text-[var(--text-main)] leading-none drop-shadow-lg">
                        {heroItem.title.english || heroItem.title.romaji}
                    </h1>
                    <div dangerouslySetInnerHTML={{ __html: heroItem.description }} className="text-[var(--text-muted)] text-sm md:text-base max-w-2xl line-clamp-3 font-medium drop-shadow-md" />

                    <div className="flex gap-4 pt-4">
                        <button 
                            onClick={() => handleAnimeSelect(mapAniListToTMDB(heroItem))}
                            disabled={loadingHero}
                            className="flex items-center gap-2 bg-[var(--text-main)] text-[var(--bg-main)] px-8 py-3 rounded-lg font-bold hover:opacity-90 transition-all transform hover:scale-105"
                        >
                           {loadingHero ? 'Locating...' : <><Play className="w-5 h-5 fill-current" /> Watch Now</>}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <div className="flex items-center gap-3 mb-8 border-b border-[var(--border-color)] pb-4">
                <Ghost className="w-8 h-8 text-[rgb(var(--primary-color))]" />
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-main)]">Anime Hub</h1>
                    <p className="text-[var(--text-muted)] text-sm">Powered by AniList & TMDB</p>
                </div>
            </div>

            <Row title="Trending Now" items={trending} icon={TrendingUp} />
            <Row title="Popular This Season" items={season} icon={Flame} />
            <Row title="All Time Favorites" items={popular} icon={Star} />
            <Row title="Upcoming" items={upcoming} icon={Calendar} />
        </div>
    </div>
  );
};
