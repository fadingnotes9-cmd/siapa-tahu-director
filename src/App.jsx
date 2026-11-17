import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FolderOpen,
  Eye,
  Scissors,
  KeyRound,
  CheckCircle2,
  X
} from 'lucide-react';
import EpisodeFactoryTab from './components/EpisodeFactoryTab.jsx';
import SavedResultsTab from './components/SavedResultsTab.jsx';
import VisionDoctorTab from './components/VisionDoctorTab.jsx';
import AudioTrimmerTab from './components/AudioTrimmerTab.jsx';
import { AVAILABLE_MODELS } from './utils/gemini.js';
import { getSavedEpisodes } from './utils/db.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('factory');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [deepseekKey, setDeepseekKey] = useState(
    () => localStorage.getItem('deepseek_api_key') || ''
  );
  const [factoryProvider, setFactoryProvider] = useState(
    () => localStorage.getItem('factory_provider') || 'auto'
  );
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem('gemini_model') || 'auto'
  );
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const [tempDeepseekKey, setTempDeepseekKey] = useState(deepseekKey);
  const [tempProvider, setTempProvider] = useState(factoryProvider);
  const [tempModel, setTempModel] = useState(selectedModel);
  const [savedCount, setSavedCount] = useState(0);
  const [savedRefreshSignal, setSavedRefreshSignal] = useState(0);

  useEffect(() => {
    if (!apiKey && !deepseekKey) setShowKeyModal(true);
    getSavedEpisodes().then((list) => setSavedCount(list.length));
  }, []);

  const saveSettings = () => {
    const cleanedGemini = tempKey.trim();
    const cleanedDeepseek = tempDeepseekKey.trim();
    localStorage.setItem('gemini_api_key', cleanedGemini);
    localStorage.setItem('deepseek_api_key', cleanedDeepseek);
    localStorage.setItem('factory_provider', tempProvider);
    localStorage.setItem('gemini_model', tempModel);
    setApiKey(cleanedGemini);
    setDeepseekKey(cleanedDeepseek);
    setFactoryProvider(tempProvider);
    setSelectedModel(tempModel);
    setShowKeyModal(false);
  };

  const openKeyModal = () => {
    setTempKey(apiKey);
    setTempDeepseekKey(deepseekKey);
    setTempProvider(factoryProvider);
    setTempModel(selectedModel);
    setShowKeyModal(true);
  };

  const hasAnyKey = Boolean(apiKey || deepseekKey);
  const keyBadgeLabel =
    deepseekKey && apiKey
      ? 'DS + Gemini'
      : deepseekKey
        ? 'DeepSeek'
        : apiKey
          ? 'Gemini'
          : 'Set Keys';

  const subtitleLabel =
    factoryProvider === 'deepseek' || (factoryProvider === 'auto' && deepseekKey)
      ? 'Hybrid: DeepSeek Text + Gemini Vision'
      : `${selectedModel === 'auto' ? 'Auto Fallback' : selectedModel} • Studio`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto border-x border-slate-900">
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="font-bold text-base tracking-tight text-white">Siapa Tahu Director</h1>
          </div>
          <p className="text-[11px] text-slate-400">{subtitleLabel}</p>
        </div>
        <button
          onClick={openKeyModal}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
            hasAnyKey
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          {keyBadgeLabel}
        </button>
      </header>

      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        <div className={activeTab === 'factory' ? 'block' : 'hidden'}>
          <EpisodeFactoryTab
            apiKey={apiKey}
            deepseekKey={deepseekKey}
            factoryProvider={factoryProvider}
            onOpenKeyModal={openKeyModal}
            isActive={activeTab === 'factory'}
            onEpisodeSaved={() => setSavedRefreshSignal((n) => n + 1)}
          />
        </div>
        <div className={activeTab === 'results' ? 'block' : 'hidden'}>
          <SavedResultsTab
            refreshSignal={savedRefreshSignal}
            onCountChange={setSavedCount}
          />
        </div>
        <div className={activeTab === 'qc' ? 'block' : 'hidden'}>
          <VisionDoctorTab
            apiKey={apiKey}
            onOpenKeyModal={openKeyModal}
          />
        </div>
        <div className={activeTab === 'audio' ? 'block' : 'hidden'}>
          <AudioTrimmerTab />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-4 py-2 px-1.5 z-30">
        {[
          { id: 'factory', label: 'Factory', icon: Sparkles },
          { id: 'results', label: 'Hasil', icon: FolderOpen, badge: savedCount },
          { id: 'qc', label: 'QC & Doctor', icon: Eye },
          { id: 'audio', label: 'Loop Audio', icon: Scissors }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
                active ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5 mb-0.5" />
                {tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-black flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Konfigurasi Hybrid API Keys</h3>
              {hasAnyKey && (
                <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-emerald-400 uppercase">
                1. DeepSeek API Key (Tab 1 Factory)
              </label>
              <input
                type="password"
                value={tempDeepseekKey}
                onChange={(e) => setTempDeepseekKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase">
                2. Gemini API Key (Tab 2 Vision & Fallback)
              </label>
              <input
                type="password"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase">
                Engine Utama Tab 1 (Factory)
              </label>
              <select
                value={tempProvider}
                onChange={(e) => setTempProvider(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="auto">Auto (Prioritas DeepSeek → Fallback Gemini)</option>
                <option value="deepseek">DeepSeek Only (deepseek-chat)</option>
                <option value="gemini">Gemini Only (Free Tier)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase">
                Model Gemini (Vision QC & Fallback)
              </label>
              <select
                value={tempModel}
                onChange={(e) => setTempModel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={saveSettings}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              Simpan Pengaturan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
