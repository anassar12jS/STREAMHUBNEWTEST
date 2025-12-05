
import React, { useEffect, useState, useRef } from 'react';
import { TMDBResult, TMDBDetail, MediaType, Stream, TMDBVideo, Collection } from '../types';
import { getDetails, getVideos, getRecommendations, getCollection } from '../services/tmdb';
import { getStreams, getEpisodeStreams } from '../services/addonService';
import { isInWatchlist, addToWatchlist, removeFromWatchlist, addToHistory, saveProgress, getProgressForId } from '../services/storage';
import { TMDB_IMAGE_BASE, TMDB_POSTER_BASE } from '../constants';
import { StreamList } from '../components/StreamList';
import { MediaCard } from '../components/MediaCard';
import { Footer } from '../components/Footer';
import { ArrowLeft, Star, Youtube, PlayCircle, Tv, Film, X, Server, AlertCircle, Download, Info, Plus, Check, Sparkles, Captions, ChevronDown, Layers, Zap, Play, Share2, Lightbulb, Shield, ShieldAlert } from 'lucide-react';

interface DetailsProps {
  item: TMDBResult;
  onBack: () => void;
  onPersonClick?: (id: number) => void;
  onNavigate: (view: string) => void;
}

type ServerType = 'vidsrc-wtf' | 'vidsrc-cc' | 'videasy' | 'vidora' | 'cinemaos' | 'vidlink' | 'vidfastpro' | 'direct';
type ActiveSection = 'none' | 'player' | 'downloads';

export const Details: React.FC<DetailsProps> = ({ item, onBack, onPersonClick, onNavigate }) => {
  const [detail, setDetail] = useState<TMDBDetail | null>(null);
  const [trailer, setTrailer] = useState<TMDBVideo | null>(null);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [recommendations, setRecommendations] = useState<TMDBResult[]>([]);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [inLibrary, setInLibrary] = useState(false);
  
  // UI State
  const [activeSection, setActiveSection] = useState<ActiveSection>('none');
  const [server, setServer] = useState<ServerType>('vidsrc-wtf');
  const [directUrl, setDirectUrl] = useState<string>('');
  const [videoError, setVideoError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  
  // Cinema Mode State
  const [cinemaMode, setCinemaMode] = useState(false);
  
  // AdBlock / Sandbox State
  const [adBlockEnabled, setAdBlockEnabled] = useState(false);
  
  const playerRef = useRef<HTMLDivElement>(null);
  const streamsRef = useRef<HTMLDivElement>(null);
  const sectionContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const d = await getDetails(item.id, item.media_type);
        setDetail(d);
        setInLibrary(isInWatchlist(item.id));
        addToHistory(item);
        
        // Check for previous progress
        const progress = getProgressForId(item.id);
        if (progress && progress.season && progress.episode) {
            setSelectedSeason(progress.season);
            setSelectedEpisode(progress.episode);
        }

        const videos = await getVideos(item.id, item.media_type);
        const officialTrailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube') || videos.find(v => v.site === 'YouTube');
        if (officialTrailer) setTrailer(officialTrailer);

        const recs = await getRecommendations(item.id, item.media_type);
        setRecommendations(recs.slice(0, 10));

        if (d.belongs_to_collection) {
            const colData = await getCollection(d.belongs_to_collection.id);
            colData.parts.sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime());
            setCollection(colData);
        } else {
            setCollection(null);
        }

        if (item.media_type === MediaType.MOVIE && d.external_ids?.imdb_id) {
          setLoadingStreams(true);
          const s = await getStreams(MediaType.MOVIE, d.external_ids.imdb_id);
          setStreams(s.streams);
          setLoadingStreams(false);
        }
      } catch (e) {
        console.error("Error loading details", e);
      }
    };
    fetchInfo();
    window.scrollTo(0,0);
  }, [item]);

  useEffect(() => {
    if (item.media_type === MediaType.TV && detail?.external_ids?.imdb_id) {
      const fetchEp = async () => {
        setLoadingStreams(true);
        const s = await getEpisodeStreams(detail.external_ids!.imdb_id!, selectedSeason, selectedEpisode);
        setStreams(s.streams);
        setLoadingStreams(false);
      };
      fetchEp();
    }
  }, [selectedSeason, selectedEpisode, detail]);

  const toggleLibrary = () => {
    if (inLibrary) {
      removeFromWatchlist(item.id);
      setInLibrary(false);
    } else {
      addToWatchlist(item);
      setInLibrary(true);
    }
  };

  const handleRecClick = (rec: TMDBResult) => {
     window.history.pushState({ view: 'details', item: rec }, '', `?id=${rec.id}&type=${rec.media_type}`);
     window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'details', item: rec } }));
     window.scrollTo(0,0);
  };

  const activateSection = (section: ActiveSection) => {
    if (section === 'player') {
        // Save progress when player opens
        saveProgress({
            id: item.id,
            media_type: item.media_type,
            title: detail?.title || detail?.name || '',
            poster_path: detail?.poster_path || null,
            season: item.media_type === MediaType.TV ? selectedSeason : undefined,
            episode: item.media_type === MediaType.TV ? selectedEpisode : undefined,
        });
    }
    
    if (activeSection === section) {
        // Toggle off logic if needed
    } else {
        setActiveSection(section);
    }
    
    setTimeout(() => {
        sectionContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleShare = async () => {
      if (navigator.share) {
          try {
              await navigator.share({
                  title: detail?.title || detail?.name,
                  text: `Check out ${detail?.title || detail?.name} on StreamHub!`,
                  url: window.location.href,
              });
          } catch (err) {
              console.error("Error sharing:", err);
          }
      } else {
          navigator.clipboard.writeText(window.location.href);
          alert("Link copied to clipboard!");
      }
  };

  const getEmbedUrl = () => {
    const tmdbId = item.id;
    const imdbId = detail?.external_ids?.imdb_id;
    const s = selectedSeason;
    const e = selectedEpisode;

    switch (server) {
      case 'vidsrc-wtf':
        return item.media_type === MediaType.MOVIE
          ? `https://vidsrc.wtf/embed/movie/${imdbId}`
          : `https://vidsrc.wtf/embed/tv/${imdbId}/${s}/${e}`;
      case 'vidsrc-cc':
         const vidsrcCcId = imdbId || tmdbId;
        return item.media_type === MediaType.MOVIE
          ? `https://vidsrc.cc/v2/embed/movie/${vidsrcCcId}`
          : `https://vidsrc.cc/v2/embed/tv/${vidsrcCcId}/${s}/${e}`;
      case 'videasy':
        return item.media_type === MediaType.MOVIE
          ? `https://player.videasy.net/movie/${tmdbId}`
          : `https://player.videasy.net/tv/${tmdbId}/${s}/${e}`;
      case 'vidora':
        return item.media_type === MediaType.MOVIE
          ? `https://vidora.su/movie/${tmdbId}`
          : `https://vidora.su/tv/${tmdbId}/${s}/${e}`;
      case 'cinemaos':
        return item.media_type === MediaType.MOVIE
          ? `https://cinemaos.tech/player/${tmdbId}`
          : `https://cinemaos.tech/player/${tmdbId}/${s}/${e}`;
      case 'vidlink':
        return item.media_type === MediaType.MOVIE 
          ? `https://vidlink.pro/movie/${tmdbId}?primaryColor=a855f7` 
          : `https://vidlink.pro/tv/${tmdbId}/${s}/${e}?primaryColor=a855f7`;
      case 'vidfastpro':
        return item.media_type === MediaType.MOVIE 
          ? `https://vidfast.pro/movie/${tmdbId}`
          : `https://vidfast.pro/tv/${tmdbId}/${s}/${e}?autoPlay=true`;
      default:
        return '';
    }
  };

  const handleStreamPlay = (stream: Stream) => {
    setVideoError(false);
    if (stream.url) {
        setDirectUrl(stream.url);
        setServer('direct');
        activateSection('player');
    } else if (stream.infoHash) {
        const magnet = `magnet:?xt=urn:btih:${stream.infoHash}&dn=${encodeURIComponent(stream.title || 'video')}`;
        window.location.href = magnet;
    }
  };

  const handleServerChange = (newServer: ServerType) => {
      setServer(newServer);
      setIframeLoading(true);
      // Reset ad block on server change to ensure compatibility, or keep it if preferred
      // setAdBlockEnabled(false); 
  };

  const openSubtitles = () => {
      if (detail?.external_ids?.imdb_id) {
          window.open(`https://www.opensubtitles.org/en/search/imdbid-${detail.external_ids.imdb_id.replace('tt', '')}`, '_blank');
      }
  };

  const getEpisodeCount = (seasonNum: number) => {
    const seasons = (detail as any)?.seasons;
    if (Array.isArray(seasons)) {
        const season = seasons.find((s: any) => s.season_number === seasonNum);
        return season?.episode_count || 24;
    }
    return 24;
  };

  if (!detail) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4 bg-[var(--bg-main)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--text-main)]"></div>
        <p className="text-[var(--text-muted)] font-medium">Loading...</p>
      </div>
    );
  }

  const backdropUrl = detail.backdrop_path ? `${TMDB_IMAGE_BASE}${detail.backdrop_path}` : '';
  const posterUrl = detail.poster_path ? `${TMDB_POSTER_BASE}${detail.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster';
  const rating = (detail.vote_average || 0).toFixed(1);

  const servers = [
      { id: 'vidsrc-wtf', label: 'VidSrc WTF', icon: Play, badge: 'Fast' },
      { id: 'vidlink', label: 'VidLink', icon: Server, badge: 'Multi' },
      { id: 'vidsrc-cc', label: 'VidSrc CC', icon: PlayCircle, badge: '' },
      { id: 'videasy', label: 'Videasy', icon: Film, badge: '' },
      { id: 'vidora', label: 'Vidora', icon: Zap, badge: '' },
      { id: 'cinemaos', label: 'CinemaOS', icon: Film, badge: '' },
      { id: 'vidfastpro', label: 'VidFast', icon: Zap, badge: 'New' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans transition-colors duration-300 flex flex-col relative overflow-hidden">
      
      {/* Cinema Mode Overlay */}
      <div 
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-700 pointer-events-none ${cinemaMode ? 'opacity-100' : 'opacity-0'}`}
      ></div>

      {/* Trailer Modal */}
      {showTrailerModal && trailer && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 animate-in fade-in">
              <div className="w-full max-w-5xl aspect-video relative bg-black rounded-xl overflow-hidden shadow-2xl">
                  <button onClick={() => setShowTrailerModal(false)} className="absolute top-4 right-4 z-10 bg-black/50 p-2 rounded-full text-white hover:bg-white hover:text-black transition-colors"><X className="w-6 h-6" /></button>
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`} 
                    title={trailer.name} 
                    frameBorder="0" 
                    allow="autoplay; encrypted-media" 
                    allowFullScreen
                  ></iframe>
              </div>
          </div>
      )}

      {/* Background Hero */}
      <div className="absolute inset-0 z-0 h-[70vh]">
        {backdropUrl && (
            <>
                <img src={backdropUrl} alt="bg" className="w-full h-full object-cover opacity-30 blur-sm scale-105" />
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-main)]/60 via-[var(--bg-main)]/90 to-[var(--bg-main)]" />
            </>
        )}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow w-full">
        <div className="mb-6">
            <button onClick={onBack} className="flex items-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" /> <span className="font-medium">Back</span>
            </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[300px_1fr] gap-8 mb-12">
            
            {/* Poster Column */}
            <div className="hidden md:block">
                <div className="sticky top-24 rounded-xl overflow-hidden shadow-2xl border border-[var(--border-color)] aspect-[2/3] group">
                    <img src={posterUrl} alt={detail.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
            </div>

            {/* Info Column */}
            <div className="flex flex-col min-w-0">
                {/* Mobile Poster & Title */}
                <div className="md:hidden flex gap-4 mb-6">
                    <div className="w-28 shrink-0 rounded-lg overflow-hidden shadow-lg border border-[var(--border-color)] aspect-[2/3]">
                        <img src={posterUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col justify-center">
                         <h1 className="text-xl font-bold text-[var(--text-main)] leading-tight mb-1">{detail.title || detail.name}</h1>
                         <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                            <span className="flex items-center gap-1 text-[var(--text-main)] font-bold"><Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {rating}</span>
                            <span>•</span>
                            <span>{(detail.release_date || detail.first_air_date)?.split('-')[0]}</span>
                            <span>•</span>
                            <span className="border border-[var(--border-color)] px-1 rounded">{item.media_type === MediaType.MOVIE ? 'Movie' : 'TV'}</span>
                         </div>
                    </div>
                </div>

                {/* Desktop Title & Meta */}
                <div className="hidden md:block mb-6">
                    <h1 className="text-4xl lg:text-5xl font-black text-[var(--text-main)] mb-2 tracking-tight">{detail.title || detail.name}</h1>
                    {detail.tagline && <p className="text-[var(--text-muted)] italic text-lg mb-4 opacity-80">{detail.tagline}</p>}
                    
                    <div className="flex flex-wrap items-center gap-4 text-[var(--text-muted)] text-sm font-medium">
                        <span className="flex items-center gap-1 text-[var(--text-main)] bg-[var(--bg-card)] px-2 py-1 rounded border border-[var(--border-color)]">
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /> {rating}
                        </span>
                        <span>{(detail.release_date || detail.first_air_date)?.split('-')[0]}</span>
                        {detail.runtime && <span>{Math.floor(detail.runtime / 60)}h {detail.runtime % 60}m</span>}
                        {detail.number_of_seasons && <span>{detail.number_of_seasons} Seasons</span>}
                        <div className="flex gap-2">
                            {detail.genres.map(g => <span key={g.id} className="text-[rgb(var(--primary-color))]">#{g.name}</span>)}
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-[var(--text-main)] font-bold text-lg mb-2 flex items-center gap-2">Overview</h3>
                    <p className="text-[var(--text-muted)] leading-relaxed text-base md:text-lg">{detail.overview}</p>
                </div>

                {/* Cast */}
                {detail.credits && detail.credits.cast.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-[var(--text-main)] font-bold text-sm uppercase tracking-wider mb-4 text-[var(--text-muted)]">Top Cast</h3>
                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                            {detail.credits.cast.slice(0, 10).map(actor => (
                                <div 
                                    key={actor.id} 
                                    className="w-20 md:w-24 shrink-0 text-center cursor-pointer group"
                                    onClick={() => onPersonClick && onPersonClick(actor.id)}
                                >
                                    <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-full overflow-hidden mb-2 border-2 border-[var(--border-color)] group-hover:border-[rgb(var(--primary-color))] transition-colors shadow-lg">
                                        <img 
                                            src={actor.profile_path ? `${TMDB_POSTER_BASE}${actor.profile_path}` : 'https://via.placeholder.com/100x100?text=?'} 
                                            className="w-full h-full object-cover"
                                            alt={actor.name}
                                        />
                                    </div>
                                    <p className="text-xs text-[var(--text-main)] font-bold truncate">{actor.name}</p>
                                    <p className="text-[10px] text-[var(--text-muted)] truncate">{actor.character}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Control Center - Action Bar */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex flex-wrap items-center gap-4 shadow-lg mb-8">
                     <button 
                        onClick={() => activateSection(activeSection === 'player' ? 'none' : 'player')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold transition-all shadow-lg transform hover:scale-105 ${activeSection === 'player' ? 'bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--text-main)]' : 'bg-gradient-to-r from-[rgb(var(--primary-color))] to-blue-600 text-white'}`}
                     >
                        {activeSection === 'player' ? <X className="w-5 h-5" /> : <PlayCircle className="w-5 h-5 fill-current" />}
                        <span>{activeSection === 'player' ? 'Close Player' : 'Play Now'}</span>
                     </button>

                     <button 
                        onClick={() => activateSection(activeSection === 'downloads' ? 'none' : 'downloads')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold border transition-all ${activeSection === 'downloads' ? 'bg-[rgb(var(--primary-color))]/10 border-[rgb(var(--primary-color))] text-[rgb(var(--primary-color))]' : 'bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-hover)]'}`}
                     >
                        <Download className="w-5 h-5" />
                        <span>Downloads</span>
                     </button>
                     
                     <div className="w-[1px] h-8 bg-[var(--border-color)] hidden md:block mx-2"></div>
                     
                     <div className="flex items-center gap-2 w-full md:w-auto justify-center">
                        <button onClick={toggleLibrary} className="p-3 rounded-full bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] transition-colors" title={inLibrary ? "Remove from List" : "Add to List"}>
                            {inLibrary ? <Check className="w-5 h-5 text-[rgb(var(--primary-color))]" /> : <Plus className="w-5 h-5" />}
                        </button>
                        
                        {trailer && (
                            <button onClick={() => setShowTrailerModal(true)} className="p-3 rounded-full bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] transition-colors" title="Watch Trailer">
                                <Youtube className="w-5 h-5 text-red-600" />
                            </button>
                        )}
                        
                        <button onClick={handleShare} className="p-3 rounded-full bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] transition-colors" title="Share">
                            <Share2 className="w-5 h-5" />
                        </button>
                     </div>
                </div>

                {/* DYNAMIC SECTIONS CONTAINER */}
                <div ref={sectionContainerRef} className="scroll-mt-24 relative z-50">
                    
                    {/* PLAYER SECTION */}
                    {activeSection === 'player' && (
                        <div className="mb-10 animate-fade-in-up">
                            {/* TV Episode Selector inside Player */}
                            {item.media_type === MediaType.TV && (
                                <div className="mb-4 bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] flex flex-wrap gap-4 items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold text-[var(--text-main)]">
                                        <Tv className="w-5 h-5 text-[rgb(var(--primary-color))]" />
                                        <span>Now Playing:</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="relative">
                                            <select 
                                                value={selectedSeason} 
                                                onChange={(e) => { setSelectedSeason(Number(e.target.value)); setSelectedEpisode(1); }}
                                                className="appearance-none bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] pl-3 pr-8 py-2 rounded font-bold text-sm focus:border-[rgb(var(--primary-color))] outline-none cursor-pointer"
                                            >
                                                {[...Array(detail.number_of_seasons || 1)].map((_, i) => <option key={i} value={i + 1}>Season {i + 1}</option>)}
                                            </select>
                                            <ChevronDown className="w-3 h-3 absolute right-3 top-3 pointer-events-none text-[var(--text-muted)]" />
                                        </div>
                                        <div className="relative">
                                            <select 
                                                value={selectedEpisode} 
                                                onChange={(e) => setSelectedEpisode(Number(e.target.value))}
                                                className="appearance-none bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] pl-3 pr-8 py-2 rounded font-bold text-sm focus:border-[rgb(var(--primary-color))] outline-none cursor-pointer"
                                            >
                                                {[...Array(getEpisodeCount(selectedSeason))].map((_, i) => <option key={i} value={i + 1}>Episode {i + 1}</option>)}
                                            </select>
                                            <ChevronDown className="w-3 h-3 absolute right-3 top-3 pointer-events-none text-[var(--text-muted)]" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Player Wrapper */}
                            <div className="bg-black/50 p-1 rounded-2xl border border-[var(--border-color)] backdrop-blur-xl shadow-2xl relative overflow-hidden">
                                
                                {/* Server Tabs */}
                                {server !== 'direct' && (
                                    <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 px-1 pt-1 custom-scrollbar">
                                        {servers.map((srv) => {
                                            const Icon = srv.icon;
                                            return (
                                                <button
                                                    key={srv.id}
                                                    onClick={() => handleServerChange(srv.id as ServerType)}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                                                        server === srv.id 
                                                            ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-lg' 
                                                            : 'bg-[var(--bg-input)] text-[var(--text-muted)] border-[var(--border-color)] hover:bg-[var(--bg-hover)]'
                                                    }`}
                                                >
                                                    <Icon className="w-3 h-3" />
                                                    {srv.label}
                                                    {srv.badge && <span className="bg-[rgb(var(--primary-color))] text-white px-1 rounded text-[8px] ml-1">{srv.badge}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Video Area */}
                                <div ref={playerRef} className="w-full aspect-video bg-black rounded-xl overflow-hidden relative group">
                                    
                                    {/* Loading Overlay */}
                                    {server !== 'direct' && iframeLoading && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-4"></div>
                                            <p className="text-white text-xs font-bold animate-pulse">Connecting to Server...</p>
                                        </div>
                                    )}

                                    {/* Player Controls Overlay */}
                                    <div className={`absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-30 transition-opacity duration-300 ${cinemaMode ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setCinemaMode(!cinemaMode)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${cinemaMode ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/50' : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)]'}`}
                                            >
                                                <Lightbulb className={`w-3.5 h-3.5 ${cinemaMode ? 'fill-black' : ''}`} />
                                                {cinemaMode ? 'Lights On' : 'Lights Off'}
                                            </button>

                                            {server !== 'direct' && (
                                                <button 
                                                    onClick={() => setAdBlockEnabled(!adBlockEnabled)}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                                        adBlockEnabled 
                                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' 
                                                            : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)]'
                                                    }`}
                                                    title={adBlockEnabled ? "Popups Blocked (May break some players)" : "Enable Anti-Popup Mode"}
                                                >
                                                    {adBlockEnabled ? <Shield className="w-3.5 h-3.5 fill-current" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                                                    {adBlockEnabled ? 'No Popups' : 'Allow Popups'}
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <button onClick={openSubtitles} className="bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded text-xs font-bold backdrop-blur-md border border-white/10 transition-colors flex items-center gap-1">
                                                <Captions className="w-3.5 h-3.5" /> Subs
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* The Player */}
                                    {server === 'direct' ? (
                                        <div className="w-full h-full bg-black flex items-center justify-center relative z-20">
                                            {!videoError ? (
                                                <video controls autoPlay className="w-full h-full outline-none" src={directUrl} onError={() => setVideoError(true)}></video>
                                            ) : (
                                                <div className="text-center p-6">
                                                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                                                    <p className="text-white font-bold mb-2">Playback Failed</p>
                                                    <a href={directUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white text-black px-6 py-2 rounded font-bold hover:bg-gray-200 transition-colors"><Download className="w-4 h-4" /> Download File</a>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <iframe 
                                            key={server + adBlockEnabled.toString()} // Force re-render on toggle
                                            src={getEmbedUrl()} 
                                            className="w-full h-full relative z-20" 
                                            frameBorder="0" 
                                            allowFullScreen 
                                            allow="autoplay; encrypted-media; picture-in-picture" 
                                            referrerPolicy="origin"
                                            onLoad={() => setIframeLoading(false)}
                                            sandbox={adBlockEnabled ? "allow-forms allow-scripts allow-same-origin allow-presentation allow-encrypted-media" : undefined}
                                        ></iframe>
                                    )}
                                </div>
                            </div>
                            
                            {server === 'direct' && !videoError && (
                                <div className="mt-4 flex items-start gap-3 bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl">
                                    <Info className="w-5 h-5 shrink-0 text-blue-400" />
                                    <p className="text-xs text-blue-300 leading-relaxed">
                                        <span className="font-bold text-blue-200">Tip:</span> If you see a green screen or buffering, the file is likely downloading to the server. Try selecting a <span className="font-bold text-white bg-blue-500/20 px-1 rounded">⚡ CACHED</span> stream from the Downloads section for instant playback.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* DOWNLOADS / TORRENTS SECTION */}
                    {activeSection === 'downloads' && (
                        <div ref={streamsRef} className="animate-fade-in-up bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                             {/* TV Episode Selector inside Downloads */}
                             {item.media_type === MediaType.TV && (
                                <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-input)]/50 flex flex-wrap gap-4 items-center">
                                    <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Select Episode</h3>
                                    <div className="flex gap-2">
                                        <div className="relative">
                                            <select 
                                                value={selectedSeason} 
                                                onChange={(e) => { setSelectedSeason(Number(e.target.value)); setSelectedEpisode(1); }}
                                                className="appearance-none bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] pl-3 pr-8 py-1.5 rounded text-sm font-medium focus:border-[rgb(var(--primary-color))] outline-none cursor-pointer"
                                            >
                                                {[...Array(detail.number_of_seasons || 1)].map((_, i) => <option key={i} value={i + 1}>Season {i + 1}</option>)}
                                            </select>
                                            <ChevronDown className="w-3 h-3 absolute right-3 top-2.5 pointer-events-none text-[var(--text-muted)]" />
                                        </div>
                                        <div className="relative">
                                            <select 
                                                value={selectedEpisode} 
                                                onChange={(e) => setSelectedEpisode(Number(e.target.value))}
                                                className="appearance-none bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] pl-3 pr-8 py-1.5 rounded text-sm font-medium focus:border-[rgb(var(--primary-color))] outline-none cursor-pointer"
                                            >
                                                {[...Array(getEpisodeCount(selectedSeason))].map((_, i) => <option key={i} value={i + 1}>Episode {i + 1}</option>)}
                                            </select>
                                            <ChevronDown className="w-3 h-3 absolute right-3 top-2.5 pointer-events-none text-[var(--text-muted)]" />
                                        </div>
                                    </div>
                                </div>
                             )}

                             <div className="p-4 bg-[var(--bg-input)] border-b border-[var(--border-color)] flex items-center justify-between">
                                <h3 className="font-bold text-[var(--text-main)] flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    Available Streams
                                </h3>
                                {loadingStreams && <span className="text-[10px] font-bold text-[rgb(var(--primary-color))] animate-pulse">SEARCHING TRACKERS...</span>}
                             </div>

                             <div className="p-2">
                                <StreamList streams={streams} loading={loadingStreams} onPlay={handleStreamPlay} />
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {/* Collection Section */}
        {collection && collection.parts.length > 0 && (
             <div className="mt-8 border-t border-[var(--border-color)] pt-12">
                <div className="flex items-center gap-3 mb-8">
                    <Layers className="w-6 h-6 text-[rgb(var(--primary-color))]" />
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--text-main)]">{collection.name}</h2>
                        <p className="text-sm text-[var(--text-muted)]">Watch the full franchise</p>
                    </div>
                </div>
                <div className="flex overflow-x-auto space-x-6 pb-6 custom-scrollbar snap-x">
                    {collection.parts.map(part => (
                        <div key={part.id} className="snap-start">
                             <MediaCard 
                                item={{...part, media_type: MediaType.MOVIE}} 
                                onClick={handleRecClick} 
                            />
                        </div>
                    ))}
                </div>
             </div>
        )}

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
           <div className="mt-8 border-t border-[var(--border-color)] pt-12">
               <h2 className="text-2xl font-bold text-[var(--text-main)] mb-8 flex items-center gap-2">
                   <Sparkles className="w-6 h-6 text-[rgb(var(--primary-color))]" /> You Might Also Like
               </h2>
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                   {recommendations.map(rec => (
                       <MediaCard key={rec.id} item={rec} onClick={handleRecClick} />
                   ))}
               </div>
           </div>
        )}
      </div>
      
      {/* Footer rendered internally to ensure proper spacing */}
      <div className="mt-auto">
         <Footer onNavigate={onNavigate} />
      </div>
    </div>
  );
};
