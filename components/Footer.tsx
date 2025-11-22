
import React from 'react';
import { Film, Github, Twitter, Heart } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[var(--bg-card)] border-t border-[var(--border-color)] pt-12 pb-8 mt-auto transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('home')}>
              <div className="h-8 w-8 bg-gradient-to-br from-[rgb(var(--primary-color))] to-blue-500 rounded-lg flex items-center justify-center">
                <Film className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-[var(--text-main)]">StreamHub</span>
            </div>
            <p className="text-[var(--text-muted)] text-sm max-w-xs">
              A modern discovery platform for movies and TV shows. 
              Find where to watch your favorite content instantly.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-[var(--text-main)] font-bold mb-4">Navigation</h3>
              <ul className="space-y-2 text-sm text-[var(--text-muted)]">
                <li><button onClick={() => onNavigate('home')} className="hover:text-[rgb(var(--primary-color))] transition-colors">Home</button></li>
                <li><button onClick={() => onNavigate('discover')} className="hover:text-[rgb(var(--primary-color))] transition-colors">Discover</button></li>
                <li><button onClick={() => onNavigate('library')} className="hover:text-[rgb(var(--primary-color))] transition-colors">Library</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-[var(--text-main)] font-bold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-[var(--text-muted)]">
                <li><button onClick={() => onNavigate('dmca')} className="hover:text-[rgb(var(--primary-color))] transition-colors">DMCA</button></li>
                <li><button onClick={() => onNavigate('privacy')} className="hover:text-[rgb(var(--primary-color))] transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => onNavigate('terms')} className="hover:text-[rgb(var(--primary-color))] transition-colors">Terms of Service</button></li>
              </ul>
            </div>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-[var(--text-main)] font-bold mb-4">Connect</h3>
            <div className="flex items-center gap-4">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="bg-[var(--bg-hover)] p-2 rounded-full hover:bg-[var(--bg-input)] hover:text-[var(--text-main)] text-[var(--text-muted)] transition-colors border border-[var(--border-color)]">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="bg-[var(--bg-hover)] p-2 rounded-full hover:bg-[var(--bg-input)] hover:text-[var(--text-main)] text-[var(--text-muted)] transition-colors border border-[var(--border-color)]">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border-color)] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} StreamHub. This site does not host any files.
          </p>
          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <span>Made with</span>
            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            <span>for educational purposes.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};