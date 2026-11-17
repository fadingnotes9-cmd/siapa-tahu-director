import React, { useState, useEffect } from 'react';
import { Sparkles, Eye, Scissors, KeyRound, CheckCircle2, X } from 'lucide-react';
import EpisodeFactoryTab from './components/EpisodeFactoryTab.jsx';
import VisionDoctorTab from './components/VisionDoctorTab.jsx';
import AudioTrimmerTab from './components/AudioTrimmerTab.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('factory');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  useEffect(() => {
    if (!apiKey) setShowKeyModal(true);
  }, []);

  const saveApiKey = () => {
    const cleaned = tempKey.trim();
    localStorage.setItem('gemini_api_key', cleaned);
    setApiKey(cleaned);
    setShowKeyModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto border-x border-slate-900">
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="font-bold text-base tracking-tight text-white">Siapa Tahu Director</h1>
          </div>
          <p className="text-[11px] text-slate-400">Gemini 2.5 Flash • Multimodal Studio</p>
        </div>
        <button
          onClick={() => {
            setTempKey(apiKey);
            setShowKeyModal(true);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
            apiKey
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          {apiKey ? 'API Ready' : 'Set Key'}
        </button>
      </header>

      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        {activeTab === 'factory' && (
          <EpisodeFactoryTab
            apiKey={apiKey}
            onOpenKeyModal={() => {
              setTempKey(apiKey);
              setShowKeyModal(true);
            }}
          />
        )}
        {activeTab === 'qc' && (
          <VisionDoctorTab
            apiKey={apiKey}
            onOpenKeyModal={() => {
              setTempKey(apiKey);
              setShowKeyModal(true);
            }}
          />
        )}
        {activeTab === 'audio' && <AudioTrimmerTab />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-3 py-2 px-2 z-30">
        {[
          { id: 'factory', label: 'Factory', icon: Sparkles },
          { id: 'qc', label: 'QC & Doctor', icon: Eye },
          { id: 'audio', label: 'Loop Audio', icon: Scissors }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
                active ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Konfigurasi Gemini API Key</h3>
              {apiKey && (
                <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Disimpan secara lokal di perangkat (<code>localStorage</code>) untuk memanggil <code>gemini-2.5-flash</code> langsung dari aplikasi.
            </p>
            <input
              type="password"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={saveApiKey}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              Simpan API Key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
