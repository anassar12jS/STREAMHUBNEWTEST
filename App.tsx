
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Details } from './pages/Details';
import { Library } from './pages/Library';
import { Sports } from './pages/Sports';
import { SportsPlayer } from './pages/SportsPlayer';
import { Discover } from './pages/Discover';
import { Person } from './pages/Person';
import { Anime } from './pages/Anime';
import { LiveTV } from './pages/LiveTV';
import { DMCA, Privacy, Terms } from './pages/Legal';
import { SettingsModal } from './components/SettingsModal';
import { searchMedia, getDetails } from './services/tmdb';
import { getTheme, getMode, setMode as setStorageMode } from './services/storage';
import { TMDBResult, MediaType, SportsMatch } from './types';
import { MediaCard } from './components/MediaCard';

type ViewState = 'home' | 'details' | 'search' | 'library' | 'sports' | 'play-sports' | 'discover' | 'person' | 'anime' | 'livetv' | 'dmca' | 'privacy' | 'terms';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('home');
  const [selectedItem, setSelectedItem] = useState<TMDBResult | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<SportsMatch | null>(null);
  const [searchResults, setSearchResults] = useState<TMDBResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [themeColor, setThemeColor] = useState('147, 51, 234'); // Default Purple
  
  // Initialize mode directly from storage to avoid flash
  const [mode, setMode] = useState<'dark' | 'light'>(getMode());

  // Sync Mode to DOM (HTML Tag)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  // Apply Theme Color from Settings
  useEffect(() => {
    const theme = getTheme();
    const colorMap: Record<string, string> = {
        'purple': '147, 51, 234',
        'red': '220, 38, 38',
        'blue': '37, 99, 235',
        'green': '22, 163, 74',
        'orange': '234, 88, 12'
    };
    setThemeColor(colorMap[theme] || colorMap['purple']);
  }, [isSettingsOpen]);

  const toggleMode = () => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
    setStorageMode(newMode);
  };

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      const type = params.get('type') as MediaType;
      const personId = params.get('person');
      const search = params.get('search');
      const hash = window.location.hash;

      if (id && type) {
        try {
          const details = await getDetails(parseInt(id), type);
          setSelectedItem(details);
          setView('details');
        } catch (e) {
          setView('home');
        }
      } else if (personId) {
          setSelectedPersonId(parseInt(personId));
          setView('person');
      } else if (search) {
        setSearchQuery(search);
        const results = await searchMedia(search);
        setSearchResults(results);
        setView('search');
      } else if (hash === '#library') {
        setView('library');
      } else if (hash === '#sports') {
        setView('sports');
      } else if (hash === '#discover') {
        setView('discover');
      } else if (hash === '#anime') {
        setView('anime');
      } else if (hash === '#livetv') {
        setView('livetv');
      } else if (hash === '#dmca') {
        setView('dmca');
      } else if (hash === '#privacy') {
        setView('privacy');
      } else if (hash === '#terms') {
        setView('terms');
      }
    };
    init();
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        setView(event.state.view);
        setSelectedItem(event.state.item || null);
        if (event.state.personId) setSelectedPersonId(event.state.personId);
        if (event.state.match) setSelectedMatch(event.state.match);
        setSearchQuery(event.state.query || '');
        if (event.state.view === 'search' && event.state.query) {
           searchMedia(event.state.query).then(setSearchResults);
        }
      } else {
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        
        if (hash === '#library') setView('library');
        else if (hash === '#sports') setView('sports');
        else if (hash === '#discover') setView('discover');
        else if (hash === '#anime') setView('anime');
        else if (hash === '#livetv') setView('livetv');
        else if (hash === '#dmca') setView('dmca');
        else if (hash === '#privacy') setView('privacy');
        else if (hash === '#terms') setView('terms');
        else if (!params.get('id')) setView('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setSearchQuery(query);
    const results = await searchMedia(query);
    setSearchResults(results);
    setView('search');
    window.history.pushState({ view: 'search', query }, '', `?search=${encodeURIComponent(query)}`);
  };

  const handleSelect = (item: TMDBResult) => {
    setSelectedItem(item);
    setView('details');
    window.history.pushState({ view: 'details', item }, '', `?id=${item.id}&type=${item.media_type}`);
    window.scrollTo(0, 0);
  };

  const handlePersonSelect = (id: number) => {
    setSelectedPersonId(id);
    setView('person');
    window.history.pushState({ view: 'person', personId: id }, '', `?person=${id}`);
    window.scrollTo(0, 0);
  };

  const handleSportsPlay = (match: SportsMatch) => {
    setSelectedMatch(match);
    setView('play-sports');
    window.history.pushState({ view: 'play-sports', match }, '', '#sports-player');
    window.scrollTo(0, 0);
  };

  const handleNavigate = (target: string) => {
    setView(target as ViewState);
    const path = target === 'home' ? '/' : `#${target}`;
    window.history.pushState({ view: target }, '', path);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    if (window.history.length > 1) window.history.back();
    else handleNavigate('home');
  };

  // Logic to hide Navbar/Footer on specific player pages
  const isFullScreenPlayer = view === 'play-sports';

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans flex flex-col transition-colors duration-300" style={({ '--primary-color': themeColor } as React.CSSProperties)}>
      
      {!isFullScreenPlayer && (
        <Navbar 
            onSearch={handleSearch} 
            onNavigate={handleNavigate} 
            onOpenSettings={() => setIsSettingsOpen(true)} 
            currentMode={mode}
            onToggleMode={toggleMode}
        />
      )}
      
      <main className="flex-grow">
        {view === 'home' && <Home onSelect={handleSelect} />}
        {view === 'library' && <Library onSelect={handleSelect} />}
        {view === 'sports' && <Sports onPlay={handleSportsPlay} />}
        {view === 'play-sports' && selectedMatch && <SportsPlayer match={selectedMatch} onBack={handleBack} />}
        {view === 'discover' && <Discover onSelect={handleSelect} />}
        {view === 'anime' && <Anime onSelect={handleSelect} />}
        {view === 'livetv' && <LiveTV />}
        {view === 'person' && selectedPersonId && <Person id={selectedPersonId} onSelect={handleSelect} onBack={handleBack} />}
        {view === 'dmca' && <DMCA />}
        {view === 'privacy' && <Privacy />}
        {view === 'terms' && <Terms />}
        
        {/* Pass handleNavigate to Details so it can render the Footer internally */}
        {view === 'details' && selectedItem && (
          <Details item={selectedItem} onBack={handleBack} onPersonClick={handlePersonSelect} onNavigate={handleNavigate} />
        )}

        {view === 'search' && (
          <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[var(--text-main)]">Results for "<span className="text-[rgb(var(--primary-color))]">{searchQuery}</span>"</h2>
                <button onClick={() => handleNavigate('home')} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-main)]">Clear</button>
             </div>
            {searchResults.length === 0 ? (
              <div className="text-center text-[var(--text-muted)] mt-20">No results found.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {searchResults.map(item => <MediaCard key={item.id} item={item} onClick={handleSelect} />)}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Hide global footer on details view (rendered internal) and sports player */}
      {view !== 'details' && view !== 'play-sports' && <Footer onNavigate={handleNavigate} />}
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default App;
