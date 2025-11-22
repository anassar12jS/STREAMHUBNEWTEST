
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, AlertTriangle, Link as LinkIcon, CheckCircle, Palette, Settings, Download, Upload, Database } from 'lucide-react';
import { TORRENTIO_BASE_URL } from '../constants';
import { setTheme, getTheme, exportData, importData } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [activeTheme, setActiveTheme] = useState('purple');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('torrentio_url');
    setUrl(stored || TORRENTIO_BASE_URL);
    setActiveTheme(getTheme());
  }, [isOpen]);

  const handleSave = () => {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
    }
    cleanUrl = cleanUrl.replace('/manifest.json', '').replace(/\/$/, '');
    
    localStorage.setItem('torrentio_url', cleanUrl);
    setTheme(activeTheme);
    
    setSaved(true);
    setTimeout(() => {
        setSaved(false);
        onClose();
        window.location.reload(); // Reload to apply changes globally
    }, 800);
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings?")) {
        localStorage.removeItem('torrentio_url');
        setUrl(TORRENTIO_BASE_URL);
        setActiveTheme('purple');
        setTheme('purple');
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
            onClose();
            window.location.reload();
        }, 800);
    }
  };

  const handleExport = () => {
      const data = exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `streamhub-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const json = event.target?.result as string;
          if (importData(json)) {
              alert("Data imported successfully! Reloading...");
              window.location.reload();
          } else {
              alert("Failed to import data. Invalid file format.");
          }
      };
      reader.readAsText(file);
  };

  const themes = [
      { id: 'purple', color: '#9333ea', label: 'Royal' },
      { id: 'red', color: '#dc2626', label: 'Netflix' },
      { id: 'blue', color: '#2563eb', label: 'Ocean' },
      { id: 'green', color: '#16a34a', label: 'Spotify' },
      { id: 'orange', color: '#ea580c', label: 'Sunset' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-lg rounded-xl shadow-2xl p-6 text-[var(--text-main)] max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)]">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5 text-[rgb(var(--primary-color))]" />
          Settings
        </h2>

        <div className="space-y-8">
            {/* Theme Section */}
            <div>
                <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4" /> Accent Color
                </h3>
                <div className="flex gap-3">
                    {themes.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTheme(t.id)}
                            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${activeTheme === t.id ? 'border-[var(--text-main)] scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                            style={{ backgroundColor: t.color }}
                            title={t.label}
                        >
                            {activeTheme === t.id && <CheckCircle className="w-5 h-5 text-white mix-blend-difference" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Addon Section */}
            <div>
                <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase mb-3 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" /> Stream Source
                </h3>
                <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded px-3 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[rgb(var(--primary-color))] transition-colors font-mono mb-3"
                placeholder="https://torrentio.strem.fun"
                />
                
                <div className="bg-blue-900/10 border border-blue-500/30 rounded p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0" />
                    <div className="text-xs text-blue-400/80 leading-relaxed">
                    For <b>instant 4K streaming</b>, configure <a href="https://torrentio.strem.fun/configure" target="_blank" rel="noreferrer" className="underline hover:text-[var(--text-main)]">Torrentio with Real-Debrid</a> and paste the URL here.
                    </div>
                </div>
            </div>

            {/* Data Section */}
            <div>
                <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4" /> Data Management
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={handleExport}
                        className="flex items-center justify-center gap-2 bg-[var(--bg-input)] border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] py-2 rounded text-sm font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" /> Export Backup
                    </button>
                    <button 
                        onClick={handleImportClick}
                        className="flex items-center justify-center gap-2 bg-[var(--bg-input)] border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] py-2 rounded text-sm font-medium transition-colors"
                    >
                        <Upload className="w-4 h-4" /> Import Data
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                </div>
            </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 pt-4 border-t border-[var(--border-color)]">
           <button 
             onClick={handleReset}
             className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] underline"
            >
                Reset All
            </button>
            <button 
                onClick={handleSave}
                className="bg-[var(--text-main)] text-[var(--bg-main)] hover:opacity-90 px-6 py-2.5 rounded font-bold flex items-center gap-2 transition-colors"
            >
                {saved ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Save className="w-4 h-4" />}
                {saved ? 'Saved!' : 'Save Changes'}
            </button>
        </div>
      </div>
    </div>
  );
};
