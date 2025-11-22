
import React, { useEffect, useState, useRef } from 'react';
import { TMDBResult, TMDBDetail, MediaType, Stream, TMDBVideo, Collection } from '../types';
import { getDetails, getVideos, getRecommendations, getCollection } from '../services/tmdb';
import { getStreams, getEpisodeStreams } from '../services/addonService';
import { isInWatchlist, addToWatchlist, removeFromWatchlist, addToHistory, saveProgress, getProgressForId } from '../services/storage';
import { TMDB_IMAGE_BASE, TMDB_POSTER_BASE } from '../constants';
import { StreamList } from '../components/StreamList';
import { MediaCard } from '../components/MediaCard';
import { Footer } from '../components/Footer';
import { ArrowLeft, Star, Youtube, PlayCircle, Tv, Film, X, Server, AlertCircle, Download, Info, Plus, Check, Sparkles, Captions, ChevronUp, ChevronDown, Layers, Zap, Play, Share2 } from 'lucide-react';

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
          ? `https://vidsrc.xyz/embed/movie/${tmdbId}`
          : `https://vidsrc.xyz/embed/tv/${tmdbId}/${s}-${e}`;
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

  const servers = [
      { id: 'vidsrc-wtf', label: 'VidSrc WTF', icon: Zap, badge: 'Fastest' },
      { id: 'vidsrc-cc', label: 'VidSrc CC', icon: PlayCircle, badge: 'New' },
      { id: 'vidlink', label: 'VidLink', icon: Server, badge: 'Multi-lang' },
      { id: 'videasy', label: 'Videasy', icon: Film, badge: '' },
      { id: 'vidora', label: 'Vidora', icon: Tv, badge: '' },
      { id: 'cinemaos', label: 'CinemaOS', icon: Layers, badge: '' },
      { id: 'vidfastpro', label: 'VidFast', icon: Zap, badge: '' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans transition-colors duration-300 flex flex-col">
      <div className="fixed inset-0 z-0">
        {backdropUrl && (
            <>
                <img src={backdropUrl} alt="bg" className="w-full h-full object-cover opacity-20 blur-lg scale-105" />
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-main)]/80 via-[var(--bg-main)]/95 to-[var(--bg-main)]" />
            </>
        )}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow w-full">
        <div className="mb-6">
            <button onClick={onBack} className="flex items-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" /> <span className="font-medium">Back</span>
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 lg:gap-12 mb-10">
            <div className="hidden lg:block">
                <div className="sticky top-24 space-y-4">
                    <div className="rounded-lg overflow-hidden shadow-2xl border border-[var(--border-color)] aspect-[2/3] group relative">
                        <img src={posterUrl} alt={detail.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                    </div>
                    {detail.tagline && (
                        <p className="text-center text-sm text-[var(--text-muted)] italic">"{detail.tagline}"</p>
                    )}
                </div>
            </div>

            <div className="flex flex-col min-w-0">
                <div className="lg:hidden flex gap-4 mb-6">
                    <div className="w-28 shrink-0 rounded overflow-hidden shadow-lg border border-[var(--border-color)] aspect-[2/3]">
                        <img src={posterUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col justify-center gap-2 min-w-0 flex-1">
                         <h1 className="text-2xl font-bold text-[var(--text-main)] leading-tight">{detail.title || detail.name}</h1>
                         <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                            <span className="text-[var(--text-main)]">{detail.vote_average.toFixed(1)}</span>
                            <span>•</span>
                            <span>{detail.release_date?.split('-')[0] || 'N/A'}</span>
                         </div>
                         <div className="flex flex-wrap gap-1 mt-1">
                            {detail.genres.slice(0, 3).map(g => <span key={g.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] px-2 py-0.5 rounded text-[10px]">{g.name}</span>)}
                         </div>
                    </div>
                </div>

                <div className="hidden lg:block mb-6">
                    <h1 className="text-5xl font-bold text-[var(--text-main)] mb-4 tracking-tight">{detail.title || detail.name}</h1>
                    <div className="flex items-center gap-4 text-[var(--text-muted)] text-base">
                        <span className="flex items-center gap-1 text-[var(--text-main)] font-bold"><Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> {detail.vote_average.toFixed(1)}</span>
                        <span>{detail.release_date || detail.first_air_date}</span>
                        {detail.runtime && <span>{detail.runtime} min</span>}
                        <div className="flex gap-2 ml-2">
                            {detail.genres.map(g => <span key={g.id} className="border border-[var(--border-color)] bg-[var(--bg-card)]/50 px-3 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm">{g.name}</span>)}
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-[var(--text-main)] font-bold text-lg mb-2 flex items-center gap-2"><Info className="w-4 h-4 opacity-70"/> Overview</h3>
                    <p className="text-[var(--text-muted)] leading-relaxed text-lg">{detail.overview}</p>
                </div>

                {detail.credits && detail.credits.cast.length > 0 && (
                    <div className="mb-10">
                        <h3 className="text-[var(--text-main)] font-bold text-lg mb-4">Top Cast</h3>
                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                            {detail.credits.cast.slice(0, 10).map(actor => (
                                <div 
                                    key={actor.id} 
                                    className="w-20 sm:w-24 shrink-0 text-center cursor-pointer group"
                                    onClick={() => onPersonClick && onPersonClick(actor.id)}
                                >
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full overflow-hidden mb-2 border-2 border-[var(--border-color)] group-hover:border-[rgb(var(--primary-color))] transition-colors">
                                        <img 
                                            src={actor.profile_path ? `${TMDB_POSTER_BASE}${actor.profile_path}` : 'https://via.placeholder.com/100x100?text=?'} 
                                            className="w-full h-full object-cover"
                                            alt={actor.name}
                                        />
                                    </div>
                                    <p className="text-xs text-[var(--text-main)] font-medium truncate group-hover:text-[rgb(var(--primary-color))] transition-colors">{actor.name}</p>
                                    <p className="text-[10px] text-[var(--text-muted)] truncate">{actor.character}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mb-8 sticky top-4 z-20 bg-[var(--bg-main)]/90 backdrop-blur-xl p-2 rounded-2xl border border-[var(--border-color)] shadow-2xl flex flex-wrap gap-3 sm:flex-nowrap items-stretch">
                     <button 
                        onClick={() => activateSection('player')}
                        className={`flex-grow sm:flex-[2] flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg group ${activeSection === 'player' ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-main)] ring-[rgb(var(--primary-color))]' : ''} bg-gradient-to-r from-[rgb(var(--primary-color))] to-purple-600 text-white hover:opacity-90 hover:scale-[1.02]`}
                     >
                        <Play className="w-6 h-6 fill-current" /> 
                        <span>Play Now</span>
                     </button>

                     <button 
                        onClick={() => activateSection('downloads')}
                        className={`flex-grow sm:flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold border transition-all duration-300 ${activeSection === 'downloads' ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)]' : 'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)] hover:bg-[var(--bg-hover)]'}`}
                     >
                        <Download className="w-5 h-5" />
                        <span>Download</span>
                     </button>

                     <div className="flex gap-2 flex-grow sm:flex-none">
                         <button 
                            onClick={toggleLibrary}
                            className={`flex-1 sm:w-16 flex flex-col items-center justify-center gap-1 rounded-xl border transition-colors ${inLibrary ? 'bg-[rgb(var(--primary-color))]/10 border-[rgb(var(--primary-color))] text-[rgb(var(--primary-color))]' : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'}`}
                            title={inLibrary ? "Remove from List" : "Add to List"}
                        >
                            {inLibrary ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            <span className="text-[10px] font-bold uppercase">{inLibrary ? 'Added' : 'List'}</span>
                         </button>

                         {trailer && (
                             <button 
                                onClick={() => setShowTrailerModal(true)}
                                className="flex-1 sm:w-16 flex flex-col items-center justify-center gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/5 transition-all"
                                title="Watch Trailer"
                             >
                                <Youtube className="w-5 h-5" />
                                <span className="text-[10px] font-bold uppercase">Trailer</span>
                             </button>
                         )}

                         <button 
                            onClick={handleShare}
                            className="flex-1 sm:w-16 flex flex-col items-center justify-center gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-all"
                            title="Share"
                         >
                            <Share2 className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase">Share</span>
                         </button>
                     </div>
                </div>

                <div ref={sectionContainerRef} className="scroll-mt-32 min-h-[50px]">
                    {activeSection === 'none' && (
                        <div className="text-center py-10 opacity-50 border-2 border-dashed border-[var(--border-color)] rounded-2xl">
                            <Film className="w-12 h-12 mx-auto mb-2 text-[var(--text-muted)]" />
                            <p className="text-[var(--text-muted)]">Select <span className="font-bold text-[var(--text-main)]">Play Now</span> or <span className="font-bold text-[var(--text-main)]">Download</span> to begin.</p>
                        </div>
                    )}

                    {activeSection === 'player' && (
                        <div ref={playerRef} className="animate-in fade-in slide-in-from-bottom-6 duration-500">
                            <div className="flex flex-col gap-4 bg-[var(--bg-card)] p-2 sm:p-4 rounded-2xl border border-[var(--border-color)] shadow-2xl">
                                {server !== 'direct' && (
                                    <div className="flex items-center gap-3 mb-2 overflow-x-auto pb-2 custom-scrollbar">
                                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase shrink-0 px-2">Server:</span>
                                        {servers.map((srv) => {
                                            const Icon = srv.icon;
                                            return (
                                                <button
                                                    key={srv.id}
                                                    onClick={() => handleServerChange(srv.id as ServerType)}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold whitespace-nowrap transition-all ${
                                                        server === srv.id 
                                                            ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-md' 
                                                            : 'bg-[var(--bg-input)] text-[var(--text-muted)] border-transparent hover:border-[var(--border-color)] hover:text-[var(--text-main)]'
                                                    }`}
                                                >
                                                    <Icon className="w-3 h-3" />
                                                    {srv.label}
                                                    {srv.badge && (
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] ml-1 ${
                                                            server === srv.id 
                                                                ? 'bg-[var(--bg-main)] text-[var(--text-main)]' 
                                                                : 'bg-[rgb(var(--primary-color))] text-white'
                                                        }`}>
                                                            {srv.badge}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {item.media_type === MediaType.TV && (
                                    <div className="flex flex-wrap gap-4 mb-2 bg-[var(--bg-input)]/50 p-3 rounded-xl border border-[var(--border-color)]">
                                        <div className="flex items-center gap-2">
                                            <Tv className="w-4 h-4 text-[var(--text-muted)]" />
                                            <select value={selectedSeason} onChange={(e) => { setSelectedSeason(parseInt(e.target.value)); setSelectedEpisode(1); }} className="bg-transparent font-bold text-[var(--text-main)] outline-none cursor-pointer">
                                                {[...Array(detail.number_of_seasons || 1)].map((_, i) => <option key={i} value={i + 1} className="bg-[var(--bg-card)]">Season {i + 1}</option>)}
                                            </select>
                                        </div>
                                        <div className="w-px h-6 bg-[var(--border-color)] mx-2"></div>
                                        <div className="flex items-center gap-2">
                                             <span className="text-xs font-bold text-[var(--text-muted)] uppercase mr-2">Episode:</span>
                                             <select 
                                                value={selectedEpisode} 
                                                onChange={(e) => setSelectedEpisode(parseInt(e.target.value))}
                                                className="bg-transparent font-bold text-[var(--text-main)] outline-none cursor-pointer"
                                             >
                                                {[...Array(getEpisodeCount(selectedSeason))].map((_, i) => (
                                                    <option key={i} value={i + 1} className="bg-[var(--bg-card)]">Episode {i + 1}</option>
                                                ))}
                                             </select>
                                        </div>
                                    </div>
                                )}

                                <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner relative group ring-1 ring-white/10">
                                    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20 bg-gradient-to-b from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                        <div className="pointer-events-auto flex items-center gap-2">
                                            <button onClick={openSubtitles} className="flex items-center gap-1 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 backdrop-blur-md transition-colors">
                                                <Captions className="w-4 h-4" /> Subtitles
                                            </button>
                                        </div>
                                        <button onClick={() => { setActiveSection('none'); setDirectUrl(''); }} className="pointer-events-auto bg-black/60 hover:bg-red-600 text-white p-2 rounded-full transition-colors backdrop-blur-md border border-white/10"><X className="w-4 h-4" /></button>
                                    </div>
                                    
                                    {server === 'direct' ? (
                                        <div className="w-full h-full bg-black flex items-center justify-center relative">
                                            {!videoError ? (
                                                <video controls autoPlay className="w-full h-full outline-none" src={directUrl} onError={() => setVideoError(true)}></video>
                                            ) : (
                                                <div className="text-center p-6">
                                                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                                                    <p className="text-white font-bold mb-2">Playback Failed</p>
                                                    <a href={directUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white text-black px-6 py-2 rounded font-bold hover:bg-gray-200 transition-colors"><Download className="w-4 h-4" /> Download</a>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-full h-full relative">
                                            {iframeLoading && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--text-main)]"></div>
                                                </div>
                                            )}
                                            <iframe 
                                                key={server}
                                                src={getEmbedUrl()} 
                                                className="w-full h-full" 
                                                frameBorder="0" 
                                                allowFullScreen 
                                                allow="autoplay; encrypted-media; picture-in-picture" 
                                                referrerPolicy="origin"
                                                onLoad={() => setIframeLoading(false)}
                                            ></iframe>
                                        </div>
                                    )}
                                </div>
                                {server === 'direct' && !videoError && <div className="flex items-start justify-center gap-2 text-xs text-[var(--text-muted)] bg-[var(--bg-input)]/30 p-2 rounded-lg border border-[var(--border-color)]"><Info className="w-4 h-4 shrink-0 text-blue-500" /><p><span className="text-[var(--text-main)] font-bold">Tip:</span> If the video is green, try a different server or download the file.</p></div>}
                            </div>
                        </div>
                    )}

                    {activeSection === 'downloads' && (
                        <div ref={streamsRef} className="animate-in fade-in slide-in-from-bottom-6 duration-500">
                             <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-2xl">
                                <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-input)]/50 flex justify-between items-center">
                                    <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                                        <Download className="w-5 h-5 text-[rgb(var(--primary-color))]" /> Available Torrents
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        {loadingStreams && <span className="text-xs text-[var(--text-muted)] animate-pulse uppercase font-bold tracking-wider mr-2">Scanning...</span>}
                                        <button onClick={() => setActiveSection('none')} className="p-1 hover:bg-[var(--bg-hover)] rounded-full"><X className="w-5 h-5 text-[var(--text-muted)]" /></button>
                                    </div>
                                </div>
                                 
                                 {item.media_type === MediaType.TV && (
                                    <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex flex-wrap gap-4 items-center">
                                         <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Select:</span>
                                         <div className="flex items-center gap-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-1.5">
                                             <select value={selectedSeason} onChange={(e) => { setSelectedSeason(parseInt(e.target.value)); setSelectedEpisode(1); }} className="bg-transparent text-[var(--text-main)] text-sm outline-none cursor-pointer">
                                                    {[...Array(detail.number_of_seasons || 1)].map((_, i) => <option key={i} value={i + 1} className="bg-[var(--bg-card)]">Season {i + 1}</option>)}
                                             </select>
                                         </div>
                                         
                                         <div className="flex items-center gap-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-1.5">
                                              <select value={selectedEpisode} onChange={(e) => setSelectedEpisode(parseInt(e.target.value))} className="bg-transparent text-[var(--text-main)] text-sm outline-none cursor-pointer">
                                                  {[...Array(getEpisodeCount(selectedSeason))].map((_, i) => (
                                                      <option key={i} value={i + 1} className="bg-[var(--bg-card)]">Episode {i + 1}</option>
                                                  ))}
                                              </select>
                                         </div>
                                    </div>
                                 )}

                                 {!loadingStreams && streams.length > 0 && (
                                    <div className="bg-[var(--bg-input)]/30 px-4 py-2 border-b border-[var(--border-color)] flex items-center gap-4 text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">
                                        <span className="w-20">Source</span>
                                        <span className="flex-1">File Details</span>
                                        <span className="w-20 text-right">Size</span>
                                    </div>
                                 )}
                                 <div className="p-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                                     <StreamList streams={streams} loading={loadingStreams} onPlay={handleStreamPlay} />
                                 </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
        
        {showTrailerModal && trailer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowTrailerModal(false)}>
                <div className="relative w-full max-w-5xl aspect-video mx-4 bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/20">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowTrailerModal(false); }}
                        className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-red-600 text-white p-2 rounded-full transition-colors backdrop-blur-md"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <iframe 
                        src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`} 
                        className="w-full h-full" 
                        frameBorder="0" 
                        allow="autoplay; encrypted-media" 
                        allowFullScreen
                    ></iframe>
                </div>
            </div>
        )}

        {collection && collection.parts.length > 0 && (
             <div className="mt-12 border-t border-[var(--border-color)] pt-10">
                <div className="flex items-center gap-3 mb-6">
                    <Layers className="w-6 h-6 text-[rgb(var(--primary-color))]" />
                    <div>
                        <h2 className="text-xl font-bold text-[var(--text-main)]">{collection.name}</h2>
                        <p className="text-xs text-[var(--text-muted)]">Part of a franchise</p>
                    </div>
                </div>
                <div className="flex overflow-x-auto space-x-4 pb-4 custom-scrollbar">
                    {collection.parts.map(part => (
                        <MediaCard 
                            key={part.id} 
                            item={{...part, media_type: MediaType.MOVIE}} 
                            onClick={handleRecClick} 
                        />
                    ))}
                </div>
             </div>
        )}

        {recommendations.length > 0 && (
           <div className="mt-12 border-t border-[var(--border-color)] pt-10">
               <h2 className="text-xl font-bold text-[var(--text-main)] mb-6 flex items-center gap-2"><Sparkles className="w-5 h-5 text-[rgb(var(--primary-color))]" /> You Might Also Like</h2>
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">{recommendations.map(rec => <MediaCard key={rec.id} item={rec} onClick={handleRecClick} />)}</div>
           </div>
        )}
      </div>
      
      <div className="relative z-10 w-full">
        <Footer onNavigate={onNavigate} />
      </div>
    </div>
  );
};
