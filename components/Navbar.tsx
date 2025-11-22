
import React, { useState } from 'react';
import { Search, Film, Menu, X, Settings, Bookmark, Trophy, Compass, Sun, Moon, Ghost, Tv2 } from 'lucide-react';

interface NavbarProps {
  onSearch: (query: string) => void;
  onNavigate: (view: string) => void;
  onOpenSettings: () => void;
  currentMode: 'light' | 'dark';
  onToggleMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearch, onNavigate, onOpenSettings, currentMode, onToggleMode }) => {
  const [query, setQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border-color)] text-[var(--text-main)] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={() => onNavigate('home')}>
            <div className="h-8 w-8 bg-gradient-to-br from-[rgb(var(--primary-color))] to-blue-600 rounded-lg flex items-center justify-center mr-2 shadow-lg">
              <Film className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">StreamHub</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <button onClick={() => onNavigate('home')} className="hover:bg-[var(--bg-hover)] px-3 py-2 rounded-md text-sm font-medium transition-colors">Home</button>
              <button onClick={() => onNavigate('discover')} className="hover:bg-[var(--bg-hover)] px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                <Compass className="w-4 h-4" /> Discover
              </button>
              <button onClick={() => onNavigate('anime')} className="hover:bg-[var(--bg-hover)] px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                <Ghost className="w-4 h-4 text-pink-500" /> Anime
              </button>
              <button onClick={() => onNavigate('livetv')} className="hover:bg-[var(--bg-hover)] px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                <Tv2 className="w-4 h-4 text-green-500" /> Live TV
              </button>
              <button onClick={() => onNavigate('library')} className="hover:bg-[var(--bg-hover)] px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                <Bookmark className="w-4 h-4" /> Library
              </button>
              <button onClick={() => onNavigate('sports')} className="hover:bg-[var(--bg-hover)] px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" /> Sports
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="hidden md:block w-1/3">
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                className="w-full bg-[var(--bg-input)] text-sm rounded-full pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary-color))] text-[var(--text-main)] placeholder-[var(--text-muted)] border border-[var(--border-color)] transition-colors"
                placeholder="Search movies, shows..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
            </form>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
             <button 
                onClick={onToggleMode}
                className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors relative overflow-hidden"
                title={currentMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
             >
                <div className={`transform transition-transform duration-500 ${currentMode === 'dark' ? 'rotate-0' : 'rotate-180'}`}>
                    {currentMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </div>
             </button>

             <button 
               onClick={onOpenSettings}
               className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
               title="Addon Settings"
             >
               <Settings className="w-5 h-5" />
             </button>

            {/* Mobile menu button */}
            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] focus:outline-none"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[var(--bg-card)] pb-4 px-4 border-t border-[var(--border-color)]">
           <form onSubmit={handleSubmit} className="mt-4 relative">
              <input
                type="text"
                className="w-full bg-[var(--bg-input)] rounded-md pl-10 pr-4 py-3 text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary-color))] border border-[var(--border-color)]"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-[var(--text-muted)]" />
            </form>
            <div className="mt-4 space-y-2">
              <button onClick={() => { onNavigate('home'); setIsMobileMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-[var(--bg-hover)]">Home</button>
              <button onClick={() => { onNavigate('discover'); setIsMobileMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-[var(--bg-hover)]">Discover</button>
              <button onClick={() => { onNavigate('anime'); setIsMobileMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-[var(--bg-hover)] text-pink-500">Anime</button>
              <button onClick={() => { onNavigate('livetv'); setIsMobileMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-[var(--bg-hover)] text-green-500">Live TV</button>
              <button onClick={() => { onNavigate('library'); setIsMobileMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-[var(--bg-hover)]">My Library</button>
              <button onClick={() => { onNavigate('sports'); setIsMobileMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-[var(--bg-hover)] text-yellow-500">Live Sports</button>
            </div>
        </div>
      )}
    </nav>
  );
};
