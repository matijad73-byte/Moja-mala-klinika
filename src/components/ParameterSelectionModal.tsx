import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Cloud,
  Sparkles,
  Layers,
} from 'lucide-react';
import { ParameterTrend, ParameterCategory } from '../types';

interface ParameterSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  trends: ParameterTrend[];
  selectedParamName: string | null;
  onSelectParameter: (name: string) => void;
  onSyncOneDrive: () => void;
  oneDriveConnected: boolean;
}

const CATEGORIES: (ParameterCategory | 'Sve')[] = [
  'Sve',
  'Lipidni status',
  'Biohemija',
  'Hematologija',
  'Enzimi jetre',
  'Bubrežna funkcija',
  'Zapaljenski markeri',
];

export const ParameterSelectionModal: React.FC<ParameterSelectionModalProps> = ({
  isOpen,
  onClose,
  trends,
  selectedParamName,
  onSelectParameter,
  onSyncOneDrive,
  oneDriveConnected,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ParameterCategory | 'Sve'>('Sve');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTrends = useMemo(() => {
    return trends.filter((t) => {
      if (selectedCategory !== 'Sve' && t.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = t.name.toLowerCase().includes(q);
        const matchAlias = t.alias?.toLowerCase().includes(q);
        const matchCat = t.category.toLowerCase().includes(q);
        if (!matchName && !matchAlias && !matchCat) return false;
      }
      return true;
    });
  }, [trends, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      id="parameter-selection-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-[#0e213e] text-slate-100 rounded-3xl shadow-2xl border border-slate-700 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-[#0a192f]">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-400" />
              <span>Analiza parametara — Šta želiš da vidiš?</span>
            </h2>
            <p className="text-xs text-slate-400">
              Izaberite parametar za prikaz grafikona kretanja kroz vreme i lekarskog komentara
            </p>
          </div>
          <button
            id="close-param-select-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter controls */}
        <div className="p-4 sm:px-6 bg-[#0e213e] border-b border-slate-800 space-y-3">
          {/* Search bar & Refresh from OneDrive */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="param-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pretraži parametar (npr. Glukoza, Holesterol, ALT, WBC...)"
                className="w-full pl-10 pr-4 py-2.5 bg-[#112240] border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition-all"
                autoFocus
              />
            </div>

            <button
              onClick={() => {
                onSyncOneDrive();
              }}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shrink-0 cursor-pointer"
              title="Povuci najnovije nalaze sa OneDrive-a"
            >
              <Cloud className="w-4 h-4 text-sky-400" />
              <span>Povuci iz arhive</span>
            </button>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Parameters List Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-800">
          {filteredTrends.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredTrends.map((trend) => {
                const isSelected = selectedParamName === trend.name;
                return (
                  <button
                    key={trend.name}
                    id={`select-param-${trend.name.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => {
                      onSelectParameter(trend.name);
                      onClose();
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                      isSelected
                        ? 'border-teal-400 bg-teal-950/50 shadow-xs'
                        : 'border-slate-700/80 bg-[#112240] hover:border-teal-400 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors truncate">
                          {trend.name}
                        </span>
                        {trend.alias && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({trend.alias})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="font-bold text-slate-200">
                          {trend.latestValue} {trend.unit}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-400 text-[11px]">
                          {trend.dataPoints.length}{' '}
                          {trend.dataPoints.length === 1 ? 'merenje' : 'merenja kroz vreme'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-slate-300 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                          {trend.category}
                        </span>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            trend.latestStatus === 'normal'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : trend.latestStatus === 'high'
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                              : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {trend.latestStatus === 'normal'
                            ? 'Normalno'
                            : trend.latestStatus === 'high'
                            ? 'Povišeno'
                            : 'Sniženo'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          trend.direction === 'up'
                            ? 'bg-rose-950/80 text-rose-400 border border-rose-800'
                            : trend.direction === 'down'
                            ? 'bg-teal-950/80 text-teal-400 border border-teal-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {trend.direction === 'up' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : trend.direction === 'down' ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <Activity className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">
                {trends.length === 0
                  ? 'Baza parametara je trenutno prazna.'
                  : 'Nije pronađen nijedan parametar za dati upit.'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {trends.length === 0
                  ? 'Analiziraju se isključivo podaci iz Excel tabele. Učitajte Vašu Excel tabelu preko opcije „Učitaj bazu”.'
                  : 'Pokušajte sa drugačijim nazivom parametra ili odaberite kategoriju „Sve”.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Prikazano <strong className="text-slate-800">{filteredTrends.length}</strong> od{' '}
            {trends.length} parametara
          </span>
          <button
            onClick={onClose}
            className="font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
};
