
import React, { useState, useEffect, useRef } from 'react';
import { IPTVChannel } from '../types';
import { Tv2, Search, AlertCircle, Upload, Globe, Layers, Film, Heart, Clock, PictureInPicture } from 'lucide-react';
import Hls from 'hls.js';
import { getFavoriteChannels, toggleFavoriteChannel, isFavoriteChannel, getRecentChannels, addRecentChannel } from '../services/storage';

interface ListChildComponentProps {
  index: number;
  style: React.CSSProperties;
  data: {
    channels: IPTVChannel[];
    activeChannel: IPTVChannel | null;
    onSelect: (c: IPTVChannel) => void;
    onToggleFav: (c: IPTVChannel, e: React.MouseEvent) => void;
  };
}

const List: React.FC<{
  height: number;
  width: number;
  itemCount: number;
  itemSize: number;
  className?: string;
  itemData: any;
  children: React.ComponentType<ListChildComponentProps>;
}> = ({ height, width, itemCount, itemSize, className, itemData, children: Row }) => {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = itemCount * itemSize;
  const overscan = 5;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemSize) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    Math.floor((scrollTop + height) / itemSize) + overscan
  );

  const items = [];
  for (let i = startIndex; i <= endIndex; i++) {
    items.push(
      <Row
        key={i}
        index={i}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${itemSize}px`,
          transform: `translateY(${i * itemSize}px)`,
        }}
        data={itemData}
      />
    );
  }

  return (
    <div
      className={className}
      style={{ height, width, overflowY: 'auto', position: 'relative' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
        {items}
      </div>
    </div>
  );
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export const LiveTV: React.FC = () => {
  const [playlistUrl, setPlaylistUrl] = useState('https://iptv-org.github.io/iptv/index.m3u');
  const [playlistSource, setPlaylistSource] = useState<'global' | 'country' | 'category' | 'favorites'>('global');
  const [channels, setChannels] = useState<IPTVChannel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<IPTVChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<IPTVChannel | null>(null);
  const [recentChannels, setRecentChannels] = useState<IPTVChannel[]>([]);
  const [favoritesRefresh, setFavoritesRefresh] = useState(0); // Force re-render for favs

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  
  const debouncedSearch = useDebounce(search, 300);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [listDimensions, setListDimensions] = useState({ width: 0, height: 0 });

  // Load Recents on mount
  useEffect(() => {
    setRecentChannels(getRecentChannels());
    fetchPlaylist(playlistUrl);
  }, []);

  useEffect(() => {
    if (!listContainerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setListDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    resizeObserver.observe(listContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const handleSourceChange = (source: 'global' | 'country' | 'category' | 'favorites') => {
      setPlaylistSource(source);
      setSearch('');
      setSelectedGroup('All');
      setActiveChannel(null);

      if (source === 'favorites') {
          const favs = getFavoriteChannels();
          setChannels(favs);
          setGroups(['All', ...Array.from(new Set(favs.map(c => c.group || 'Uncategorized')))]);
          return;
      }

      let url = 'https://iptv-org.github.io/iptv/index.m3u';
      if (source === 'country') url = 'https://iptv-org.github.io/iptv/index.country.m3u';
      if (source === 'category') url = 'https://iptv-org.github.io/iptv/index.category.m3u';
      setPlaylistUrl(url);
      fetchPlaylist(url);
  };

  const parseM3U = (content: string): { channels: IPTVChannel[], groups: string[] } => {
    const lines = content.split('\n');
    const channelsResult: IPTVChannel[] = [];
    const groupsResult = new Set<string>();
    let currentChannel: Partial<IPTVChannel> = {};

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#EXTINF:')) {
            const info = trimmed.substring(8);
            const name = info.split(',').pop() || '';
            const logo = trimmed.match(/tvg-logo="([^"]*)"/)?.[1];
            const group = trimmed.match(/group-title="([^"]*)"/)?.[1] || 'Uncategorized';
            currentChannel = { name, logo, group };
            if (group) groupsResult.add(group);
        } else if (trimmed.length > 0 && !trimmed.startsWith('#')) {
            if (currentChannel.name) {
                channelsResult.push({ ...currentChannel, url: trimmed } as IPTVChannel);
                currentChannel = {};
            }
        }
    }
    return { channels: channelsResult, groups: Array.from(groupsResult).sort() };
  };

  const fetchPlaylist = async (url: string) => {
    setLoading(true);
    setError(null);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch playlist');
        const text = await res.text();
        const { channels: parsedChannels, groups: parsedGroups } = parseM3U(text);
        
        if (parsedChannels.length === 0) throw new Error('No channels found');
        
        setChannels(parsedChannels);
        setGroups(['All', ...parsedGroups]);
    } catch (e: any) {
        setError(e.message);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    let tempChannels = channels;
    // If in favorites mode, ensure we re-fetch from storage if channels state isn't sync'd
    if (playlistSource === 'favorites') {
        tempChannels = getFavoriteChannels();
    }

    if (selectedGroup !== 'All') {
        tempChannels = tempChannels.filter(c => c.group === selectedGroup);
    }
    if (debouncedSearch.trim() !== '') {
        const lowerCaseSearch = debouncedSearch.toLowerCase();
        tempChannels = tempChannels.filter(c => 
            c.name.toLowerCase().includes(lowerCaseSearch) || 
            (c.group && c.group.toLowerCase().includes(lowerCaseSearch))
        );
    }
    setFilteredChannels(tempChannels);
  }, [debouncedSearch, channels, selectedGroup, playlistSource, favoritesRefresh]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeChannel) return;

    addRecentChannel(activeChannel);
    setRecentChannels(getRecentChannels());

    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(activeChannel.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
        return () => hls.destroy();
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = activeChannel.url;
        video.play();
    }
  }, [activeChannel]);

  const toggleFav = (channel: IPTVChannel, e: React.MouseEvent) => {
      e.stopPropagation();
      toggleFavoriteChannel(channel);
      setFavoritesRefresh(prev => prev + 1); // Force UI update
  };

  const togglePiP = async () => {
      if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
      } else if (videoRef.current && videoRef.current !== document.pictureInPictureElement) {
          try {
            await videoRef.current.requestPictureInPicture();
          } catch (e) {
              console.error("PiP failed", e);
          }
      }
  };

  const handleImport = () => {
      const url = prompt("Enter M3U Playlist URL:");
      if (url) {
          setPlaylistUrl(url);
          fetchPlaylist(url);
      }
  };

  const ChannelRow: React.FC<ListChildComponentProps> = ({ index, style, data }) => {
    const channel = filteredChannels[index];
    if (!channel) return null;
    const isFav = isFavoriteChannel(channel.url);

    return (
      <div style={style}>
        <button
            onClick={() => data.onSelect(channel)}
            className={`w-full text-left p-3 flex items-center gap-3 hover:bg-[var(--bg-hover)] transition-all h-full duration-200 group ${data.activeChannel?.url === channel.url ? 'bg-[rgb(var(--primary-color))]/10' : ''}`}
        >
            <div className={`w-1 absolute left-0 top-0 bottom-0 transition-all duration-300 ${data.activeChannel?.url === channel.url ? 'bg-[rgb(var(--primary-color))]' : 'bg-transparent'}`}></div>
            
            <div className="w-12 h-12 bg-white/5 rounded-md flex items-center justify-center shrink-0 overflow-hidden ml-2 relative">
                {channel.logo ? ( 
                    <img 
                        src={channel.logo} 
                        alt="" 
                        className="w-full h-full object-contain" 
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = `<svg class="w-6 h-6 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>`;
                        }} 
                    />
                ) : ( 
                    <Tv2 className="w-5 h-5 text-[var(--text-muted)]" /> 
                )}
            </div>
            
            <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold truncate ${data.activeChannel?.url === channel.url ? 'text-[rgb(var(--primary-color))]' : 'text-[var(--text-main)]'}`}>{channel.name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{channel.group}</p>
            </div>

            <div 
                onClick={(e) => data.onToggleFav(channel, e)}
                className={`p-2 rounded-full hover:bg-[var(--bg-hover)] transition-colors ${isFav ? 'text-red-500' : 'text-[var(--text-muted)] opacity-0 group-hover:opacity-100'}`}
            >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            </div>
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen animate-fade-in flex flex-col h-screen relative overflow-hidden">
        {activeChannel?.logo && <img src={activeChannel.logo} className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-20 scale-125 transition-all duration-500" />}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-main)] via-[var(--bg-main)]/80 to-[var(--bg-main)] backdrop-blur-sm"></div>

        <div className="max-w-7xl mx-auto px-4 py-6 w-full z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
                <div className="flex items-center gap-3"><Tv2 className="w-8 h-8 text-green-500" /><h1 className="text-3xl font-bold text-[var(--text-main)]">Live TV</h1></div>
                <div className="flex gap-2 flex-wrap">
                    <div className="flex bg-[var(--bg-card)] p-1 rounded-lg border border-[var(--border-color)]">
                        <button onClick={() => handleSourceChange('global')} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${playlistSource === 'global' ? 'bg-[rgb(var(--primary-color))] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><Globe className="w-3 h-3" /> All</button>
                        <button onClick={() => handleSourceChange('favorites')} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${playlistSource === 'favorites' ? 'bg-[rgb(var(--primary-color))] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><Heart className="w-3 h-3" /> Favorites</button>
                        <button onClick={() => handleSourceChange('category')} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${playlistSource === 'category' ? 'bg-[rgb(var(--primary-color))] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><Layers className="w-3 h-3" /> Category</button>
                        <button onClick={() => handleSourceChange('country')} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${playlistSource === 'country' ? 'bg-[rgb(var(--primary-color))] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><Globe className="w-3 h-3" /> Country</button>
                    </div>
                    <button onClick={handleImport} className="bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 h-full"><Upload className="w-3 h-3" /> Import</button>
                </div>
            </div>
        </div>

        <div className="flex-1 min-h-0 z-10 max-w-7xl w-full mx-auto px-4 pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-[var(--border-color)] relative group">
                        {activeChannel ? ( 
                            <>
                                <video ref={videoRef} id="tv-player" controls className="w-full h-full" autoPlay></video>
                                <button 
                                    onClick={togglePiP} 
                                    className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Picture in Picture"
                                >
                                    <PictureInPicture className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)] p-8">
                                <div className="p-4 bg-[var(--bg-card)] rounded-full mb-6 border border-[var(--border-color)]"><Film className="w-12 h-12 text-[rgb(var(--primary-color))]" /></div>
                                <h3 className="text-xl font-bold text-[var(--text-main)]">Welcome to Live TV</h3>
                                <p className="text-center mt-2">Select a channel from the list to start watching.</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Recently Watched Rail */}
                    {recentChannels.length > 0 && (
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                <Clock className="w-3 h-3" /> Recently Watched
                            </div>
                            <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                                {recentChannels.map((rc, i) => (
                                    <button key={i} onClick={() => setActiveChannel(rc)} className="flex-shrink-0 w-24 group">
                                        <div className="w-full aspect-video bg-[var(--bg-input)] rounded-lg flex items-center justify-center mb-1 border border-[var(--border-color)] group-hover:border-[rgb(var(--primary-color))] transition-colors">
                                            {rc.logo ? <img src={rc.logo} className="w-8 h-8 object-contain" /> : <Tv2 className="w-6 h-6 text-[var(--text-muted)]" />}
                                        </div>
                                        <p className="text-[10px] text-[var(--text-main)] truncate text-center">{rc.name}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-1 flex flex-col bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--border-color)]">
                        <div className="grid grid-cols-2 gap-2">
                           <div className="relative"><input type="text" placeholder="Search..." className="w-full bg-[var(--bg-input)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text-main)] focus:outline-none border border-[var(--border-color)]" value={search} onChange={(e) => setSearch(e.target.value)} /><Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" /></div>
                           <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full bg-[var(--bg-input)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none border border-[var(--border-color)]">
                              {groups.map(g => <option key={g} value={g}>{g}</option>)}
                           </select>
                        </div>
                    </div>
                    
                    <div className="flex-1 min-h-0" ref={listContainerRef}>
                        {loading ? ( <div className="p-8 text-center text-[var(--text-muted)] flex flex-col items-center gap-2"><div className="w-6 h-6 border-2 border-[rgb(var(--primary-color))] border-t-transparent rounded-full animate-spin"></div>Loading Playlist...</div>
                        ) : error ? ( <div className="p-8 text-center text-red-500 flex flex-col items-center"><AlertCircle className="w-8 h-8 mb-2" />{error}</div>
                        ) : listDimensions.height > 0 ? (
                            <List 
                                height={listDimensions.height} 
                                itemCount={filteredChannels.length} 
                                itemSize={76} 
                                width={listDimensions.width} 
                                className="custom-scrollbar"
                                itemData={{
                                    channels: filteredChannels,
                                    activeChannel: activeChannel,
                                    onSelect: setActiveChannel,
                                    onToggleFav: toggleFav
                                }}
                            >
                                {ChannelRow}
                            </List>
                        ) : null}
                    </div>
                    <div className="p-2 border-t border-[var(--border-color)] text-xs text-center text-[var(--text-muted)]">
                        {loading ? '...' : `${filteredChannels.length} / ${channels.length}`} Channels
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
