
import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Calendar, PlayCircle, Clock, Zap, Loader2, Filter, Bell, BellRing, RadioReceiver } from 'lucide-react';
import { getAllMatches } from '../services/sports';
import { SportsMatch } from '../types';

interface SportsProps {
  onPlay: (match: SportsMatch) => void;
}

// Memoize TeamLogo to prevent expensive color calculation on every render
const TeamLogo: React.FC<{ name: string, logo?: string, className?: string }> = React.memo(({ name, logo, className = "w-12 h-12" }) => {
    const [imgError, setImgError] = useState(false);

    // Generate a consistent color based on the name (Fallback)
    const getColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    };

    if (logo && !imgError) {
        return (
            <div className={`rounded-full flex items-center justify-center bg-white/10 border border-white/10 shrink-0 overflow-hidden relative ${className}`}>
                <img 
                    src={logo} 
                    alt={name} 
                    className="w-full h-full object-contain p-0.5" 
                    loading="lazy" 
                    onError={() => setImgError(true)} 
                    referrerPolicy="no-referrer"
                />
            </div>
        );
    }

    // Fallback: Initials
    const initials = name.split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const bg = getColor(name);

    return (
        <div 
            className={`rounded-full flex items-center justify-center text-white font-bold shadow-sm border border-white/10 shrink-0 ${className}`} 
            style={{ backgroundColor: bg, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
            {initials}
        </div>
    );
});

export const Sports: React.FC<SportsProps> = ({ onPlay }) => {
  const [matches, setMatches] = useState<SportsMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [notifiedMatches, setNotifiedMatches] = useState<string[]>([]);

  useEffect(() => {
    const loadMatches = async () => {
      try {
        const data = await getAllMatches();
        setMatches(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadMatches();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadMatches, 300000);
    return () => clearInterval(interval);
  }, []);

  // Filtering & Logic
  const { liveMatches, upcomingMatches } = useMemo(() => {
    const now = Date.now();
    
    // 1. Filter
    let filtered = activeCategory === 'ALL' 
        ? matches 
        : matches.filter(m => m.category.toUpperCase() === activeCategory);

    // 2. Sort by popularity/time
    filtered.sort((a, b) => {
        if (a.popular && !b.popular) return -1;
        if (!a.popular && b.popular) return 1;
        return a.date - b.date;
    });

    const live: SportsMatch[] = [];
    const upcoming: SportsMatch[] = [];

    filtered.forEach(m => {
        // Consider match live if starts within last 2 hours or is in future but less than 15 mins away
        const diff = m.date - now;
        if (diff < 15 * 60 * 1000 && diff > -3 * 60 * 60 * 1000) live.push(m);
        else if (diff >= 15 * 60 * 1000) upcoming.push(m);
    });

    return { liveMatches: live, upcomingMatches: upcoming };
  }, [matches, activeCategory]);

  // Extract & Prioritize Categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(matches.map(m => m.category.toUpperCase()))) as string[];
    const priority = ['FOOTBALL', 'FIGHT', 'MOTORSPORT', 'BASKETBALL', 'TENNIS', 'BASEBALL'];

    cats.sort((a, b) => {
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    return ['ALL', ...cats];
  }, [matches]);

  const handleNotify = (match: SportsMatch, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!("Notification" in window)) {
          alert("This browser does not support notifications.");
          return;
      }

      if (Notification.permission === "granted") {
          scheduleNotification(match);
      } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(permission => {
              if (permission === "granted") {
                  scheduleNotification(match);
              }
          });
      }
  };

  const scheduleNotification = (match: SportsMatch) => {
      const now = Date.now();
      const diff = match.date - now;
      
      if (diff > 0) {
          setNotifiedMatches(prev => [...prev, match.title]);
          
          // Notify 5 mins before if possible, else immediately if close
          const timeout = Math.max(0, diff - (5 * 60 * 1000)); 
          
          setTimeout(() => {
              new Notification("Match Starting Soon!", {
                  body: `${match.title} is starting in 5 minutes!`,
                  icon: "https://cdn-icons-png.flaticon.com/512/4221/4221484.png"
              });
          }, timeout);
      }
  };

  const MatchCard: React.FC<{ match: SportsMatch, isLive?: boolean }> = React.memo(({ match, isLive }) => {
      const dateObj = new Date(match.date);
      const timeStr = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const dateStr = dateObj.toLocaleDateString([], {month: 'short', day: 'numeric'});
      const isNotified = notifiedMatches.includes(match.title);
      const [posterFailed, setPosterFailed] = useState(false);

      // 1. POSTER LAYOUT (Featured Events / UFC / Boxing)
      if (match.poster && !posterFailed) {
        return (
            <div 
                onClick={() => isLive && onPlay(match)}
                className={`group relative overflow-hidden rounded-xl border border-[var(--border-color)] transition-all duration-300 aspect-video sm:aspect-[2/1] ${
                    isLive 
                        ? 'cursor-pointer hover:shadow-lg hover:shadow-[rgb(var(--primary-color))]/20 hover:border-[rgb(var(--primary-color))]' 
                        : ''
                }`}
            >
                {/* Background Image */}
                <div className="absolute inset-0">
                    <img 
                        src={match.poster} 
                        alt={match.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        loading="lazy" 
                        onError={() => setPosterFailed(true)}
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-black/40 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent opacity-60"></div>
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
                    {/* Top Bar */}
                    <div className="flex justify-between items-start">
                        <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded border border-white/10 uppercase tracking-wider">
                            {match.category}
                        </span>
                        {isLive && (
                            <span className="bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 animate-pulse shadow-lg shadow-red-900/20">
                                <span className="w-1.5 h-1.5 bg-white rounded-full"></span> LIVE
                            </span>
                        )}
                    </div>

                    {/* Bottom Info */}
                    <div className="mt-auto">
                        <h3 className="text-white font-black text-xl md:text-2xl leading-none drop-shadow-lg text-center mb-3 uppercase italic">
                            {match.title}
                        </h3>
                        
                        <div className="flex items-center justify-between border-t border-white/10 pt-3">
                            <span className="text-xs font-bold text-gray-200 shadow-black drop-shadow-md">
                                {isLive ? 'Streaming Now' : `${dateStr} • ${timeStr}`}
                            </span>

                            {isLive ? (
                                <button className="bg-[rgb(var(--primary-color))] text-white px-4 py-1.5 rounded-full text-xs font-bold hover:scale-105 transition-transform shadow-lg shadow-[rgb(var(--primary-color))]/20 flex items-center gap-1">
                                    <PlayCircle className="w-3.5 h-3.5" /> Watch
                                </button>
                            ) : (
                                <button 
                                    onClick={(e) => handleNotify(match, e)}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-colors border backdrop-blur-md ${isNotified ? 'bg-white text-black border-white' : 'bg-black/40 text-white border-white/20 hover:bg-white/10'}`}
                                >
                                    {isNotified ? <BellRing className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                                    {isNotified ? 'Set' : 'Notify'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
      }

      // 2. STANDARD MATCH CARD (Teams / Football / etc)
      return (
        <div 
            onClick={() => isLive && onPlay(match)}
            className={`group relative overflow-hidden rounded-xl transition-all duration-300 border ${
                isLive 
                    ? 'bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-hover)] border-blue-500/30 hover:border-blue-500/60 cursor-pointer hover:shadow-lg hover:shadow-blue-500/10' 
                    : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--text-muted)]'
            }`}
        >
            <div className="p-3 sm:p-4 flex flex-col h-full gap-3">
                {/* Header */}
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                         <span className="text-[var(--text-muted)] bg-[var(--bg-input)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                            {match.category}
                         </span>
                         {match.popular && !isLive && <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                    </div>
                    
                    {isLive ? (
                        <span className="text-red-500 flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> LIVE
                        </span>
                    ) : (
                        <span className="text-[var(--text-muted)]">{dateStr} • {timeStr}</span>
                    )}
                </div>

                {/* Teams */}
                <div className="flex items-center justify-between gap-2">
                    {match.teams?.home && match.teams?.away ? (
                        <>
                            <div className="flex-1 flex flex-col items-center text-center gap-2 min-w-0">
                                <TeamLogo name={match.teams.home.name} logo={match.teams.home.logo} className="w-12 h-12 text-base" />
                                <span className={`text-xs font-bold leading-tight line-clamp-2 ${isLive ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                                    {match.teams.home.name}
                                </span>
                            </div>
                            
                            <div className="text-[var(--text-muted)] font-black text-xs opacity-30 pb-4">VS</div>

                            <div className="flex-1 flex flex-col items-center text-center gap-2 min-w-0">
                                <TeamLogo name={match.teams.away.name} logo={match.teams.away.logo} className="w-12 h-12 text-base" />
                                <span className={`text-xs font-bold leading-tight line-clamp-2 ${isLive ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                                    {match.teams.away.name}
                                </span>
                            </div>
                        </>
                    ) : (
                        <h3 className="text-sm font-bold text-[var(--text-main)] line-clamp-2 text-center w-full">{match.title}</h3>
                    )}
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                     <span className="text-[10px] text-[var(--text-muted)] font-mono flex items-center gap-1">
                        <RadioReceiver className="w-3 h-3" /> {match.sources.length} Stream{match.sources.length !== 1 ? 's' : ''}
                     </span>
                     
                     {isLive ? (
                         <button className="bg-[var(--text-main)] text-[var(--bg-main)] px-3 py-1 rounded text-xs font-bold flex items-center gap-1 hover:opacity-90">
                            <PlayCircle className="w-3 h-3" /> Watch
                         </button>
                     ) : (
                         <button 
                            onClick={(e) => handleNotify(match, e)}
                            disabled={isNotified}
                            className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors border ${isNotified ? 'bg-[rgb(var(--primary-color))]/10 text-[rgb(var(--primary-color))] border-[rgb(var(--primary-color))]' : 'bg-[var(--bg-input)] text-[var(--text-muted)] border-transparent hover:text-[var(--text-main)]'}`}
                        >
                             {isNotified ? <BellRing className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                             {isNotified ? 'Set' : 'Notify'}
                        </button>
                     )}
                </div>
            </div>
        </div>
      );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 min-h-screen animate-fade-in">
      
      {/* Compact Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/20 shrink-0">
               <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase italic leading-none">Live Sports</h2>
                <p className="text-[10px] text-[var(--text-muted)] font-medium">Real-time events dashboard</p>
            </div>
        </div>
        
        {/* Filter Pills */}
        <div className="w-full md:w-auto overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-colors ${
                            activeCategory === cat 
                            ? 'bg-[var(--text-main)] text-[var(--bg-main)]' 
                            : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-color)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)]'
                        }`}
                    >
                        {cat === 'ALL' ? 'All' : cat}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-[var(--text-muted)] text-xs font-mono animate-pulse">LOADING EVENTS...</p>
        </div>
      ) : matches.length === 0 ? (
         <div className="text-center py-20 text-[var(--text-muted)] bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] border-dashed">
            <Trophy className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No matches found.</p>
         </div>
      ) : (
         <div className="space-y-8">
            {/* Live Section */}
            {liveMatches.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <h3 className="text-lg font-bold text-[var(--text-main)]">Live Now</h3>
                        <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-card)] px-2 py-0.5 rounded-full border border-[var(--border-color)]">
                            {liveMatches.length}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {liveMatches.map((match, idx) => (
                            <MatchCard key={`live-${idx}`} match={match} isLive={true} />
                        ))}
                    </div>
                </div>
            )}

            {/* Upcoming Section */}
            {upcomingMatches.length > 0 && (
                <div>
                     <div className="flex items-center gap-2 mb-4 px-1 mt-8 pt-8 border-t border-[var(--border-color)]">
                        <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                        <h3 className="text-lg font-bold text-[var(--text-main)]">Upcoming</h3>
                        <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-card)] px-2 py-0.5 rounded-full border border-[var(--border-color)]">
                            {upcomingMatches.length}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {upcomingMatches.map((match, idx) => (
                             <MatchCard key={`up-${idx}`} match={match} isLive={false} />
                        ))}
                    </div>
                </div>
            )}
         </div>
      )}
    </div>
  );
};
