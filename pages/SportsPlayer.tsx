
import React, { useState, useEffect } from 'react';
import { SportsMatch, SportsMatchSource, SportsStream } from '../types';
import { getMatchStreams } from '../services/sports';
import { ArrowLeft, AlertCircle, Loader2, Radio, Zap, ShieldCheck, MonitorPlay, ChevronDown, ChevronUp, Globe } from 'lucide-react';

interface SportsPlayerProps {
  match: SportsMatch;
  onBack: () => void;
}

export const SportsPlayer: React.FC<SportsPlayerProps> = ({ match, onBack }) => {
  // State for expanded source (Provider level)
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  
  // Cache for fetched streams to avoid re-fetching: { "sourceId": [streams] }
  const [streamsCache, setStreamsCache] = useState<Record<string, SportsStream[]>>({});
  
  // Currently loading streams for a source
  const [loadingSourceId, setLoadingSourceId] = useState<string | null>(null);
  
  // Active Playing Stream
  const [activeStream, setActiveStream] = useState<SportsStream | null>(null);
  const [streamError, setStreamError] = useState<boolean>(false);

  // Initialize: Expand first source and try to auto-play its best stream
  useEffect(() => {
    if (match.sources.length > 0) {
      toggleSource(match.sources[0]);
    }
  }, []);

  const toggleSource = async (source: SportsMatchSource) => {
    const sourceKey = `${source.source}-${source.id}`;
    
    // If already expanded, just collapse (unless it was the initial auto-load)
    if (expandedSource === sourceKey && !loadingSourceId) {
        setExpandedSource(null);
        return;
    }

    setExpandedSource(sourceKey);

    // Check cache
    if (streamsCache[sourceKey]) {
        return;
    }

    // Fetch
    setLoadingSourceId(sourceKey);
    try {
        const streams = await getMatchStreams(source.source, source.id);
        setStreamsCache(prev => ({ ...prev, [sourceKey]: streams }));
        
        // Auto-play logic: If nothing is playing, pick the best stream from this source
        if (!activeStream && streams.length > 0) {
             // Prefer HD, then English, then first
             const best = streams.find(s => s.hd && s.language?.toLowerCase().includes('english')) 
                       || streams.find(s => s.hd)
                       || streams[0];
             handlePlayStream(best);
        }
    } catch (e) {
        console.error("Error fetching streams for source", source.source);
    } finally {
        setLoadingSourceId(null);
    }
  };

  const handlePlayStream = (stream: SportsStream) => {
      setActiveStream(stream);
      setStreamError(false);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col animate-fade-in">
      {/* Header */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border-color)] px-4 py-3 flex items-center gap-4 z-20">
        <button 
          onClick={onBack} 
          className="p-2 hover:bg-[var(--bg-hover)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-[var(--text-main)] truncate">{match.title}</h1>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="text-[rgb(var(--primary-color))] font-bold uppercase">{match.category}</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-red-500 font-bold animate-pulse">
               <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> LIVE
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
        {/* Player Container */}
        <div className="flex-1 bg-black flex flex-col relative order-1 lg:order-1">
            <div className="relative w-full h-full flex items-center justify-center aspect-video lg:aspect-auto bg-black">
                {activeStream ? (
                    !streamError ? (
                        <iframe 
                            key={activeStream.embedUrl} // Force re-render on URL change
                            src={activeStream.embedUrl} 
                            className="w-full h-full absolute inset-0" 
                            frameBorder="0" 
                            allowFullScreen 
                            allow="autoplay; encrypted-media; picture-in-picture"
                            referrerPolicy="origin"
                            onError={() => setStreamError(true)}
                        ></iframe>
                    ) : (
                        <div className="text-center p-8">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <p className="text-white font-bold mb-2">Stream Connection Failed</p>
                            <p className="text-[var(--text-muted)] text-sm">Please select a different stream from the list.</p>
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        {loadingSourceId ? (
                            <>
                                <Loader2 className="w-12 h-12 text-[rgb(var(--primary-color))] animate-spin mb-4" />
                                <p className="text-[var(--text-muted)] font-mono animate-pulse">SCANNING FOR STREAMS...</p>
                            </>
                        ) : (
                            <>
                                <MonitorPlay className="w-16 h-16 text-[var(--text-muted)] opacity-20 mb-4" />
                                <p className="text-[var(--text-muted)] text-sm">Select a provider to load streams</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Sidebar / Bottom Bar for Sources */}
        <div className="bg-[var(--bg-card)] border-l border-[var(--border-color)] w-full lg:w-96 flex flex-col shrink-0 lg:h-full h-[40vh] lg:max-h-none order-2 lg:order-2 flex-grow-0">
            <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-input)]/50 shrink-0">
                <h3 className="font-bold text-[var(--text-main)] flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[rgb(var(--primary-color))]" /> 
                    Providers
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Click a provider to see available streams.
                </p>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {match.sources.map((s, i) => {
                    const sourceKey = `${s.source}-${s.id}`;
                    const isExpanded = expandedSource === sourceKey;
                    const isLoading = loadingSourceId === sourceKey;
                    const streams = streamsCache[sourceKey] || [];

                    return (
                        <div key={sourceKey} className="rounded-lg border border-[var(--border-color)] overflow-hidden bg-[var(--bg-card)]">
                            {/* Provider Header */}
                            <button
                                onClick={() => toggleSource(s)}
                                className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                                    isExpanded ? 'bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-hover)]'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isExpanded ? 'bg-[rgb(var(--primary-color))] text-white' : 'bg-[var(--bg-input)] text-[var(--text-muted)]'}`}>
                                        {s.source.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[var(--text-main)] uppercase">{s.source}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                                <ShieldCheck className="w-3 h-3" /> Secure
                                            </span>
                                            {streams.length > 0 && (
                                                <span className="text-[10px] text-[rgb(var(--primary-color))] font-bold">
                                                    {streams.length} Streams
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-[rgb(var(--primary-color))]" /> : 
                                 isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : 
                                 <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
                            </button>

                            {/* Streams List */}
                            {isExpanded && (
                                <div className="bg-[var(--bg-input)] border-t border-[var(--border-color)]">
                                    {isLoading ? (
                                        <div className="p-4 text-center text-[10px] text-[var(--text-muted)] font-mono animate-pulse">Fetching streams...</div>
                                    ) : streams.length === 0 ? (
                                        <div className="p-4 text-center text-[10px] text-[var(--text-muted)]">No streams found for this provider.</div>
                                    ) : (
                                        <div className="divide-y divide-[var(--border-color)]">
                                            {streams.map((stream, idx) => {
                                                const isPlaying = activeStream?.embedUrl === stream.embedUrl;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handlePlayStream(stream)}
                                                        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors text-left group ${isPlaying ? 'bg-[rgb(var(--primary-color))]/10' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-[rgb(var(--primary-color))] animate-pulse' : 'bg-[var(--text-muted)]/30'}`}></div>
                                                            <div className="min-w-0">
                                                                <p className={`text-xs font-bold flex items-center gap-2 ${isPlaying ? 'text-[rgb(var(--primary-color))]' : 'text-[var(--text-main)]'}`}>
                                                                    Stream {stream.streamNo}
                                                                    {stream.hd && <span className="text-[10px] border border-[rgb(var(--primary-color))] px-1 rounded font-black leading-none">HD</span>}
                                                                </p>
                                                                <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 truncate">
                                                                    <Globe className="w-3 h-3" /> {stream.language || 'Unknown'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {isPlaying && <Zap className="w-4 h-4 text-[rgb(var(--primary-color))]" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};
