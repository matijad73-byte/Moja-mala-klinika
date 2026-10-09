import React, { useState } from 'react';
import {
  Scale,
  Calendar,
  Clock,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  CloudCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Printer,
} from 'lucide-react';
import { BodyWeightRecord } from '../types';
import { BodyWeightChartModal } from './BodyWeightChartModal';

interface BodyWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: BodyWeightRecord[];
  onSaveRecord: (record: Omit<BodyWeightRecord, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  lastSyncedAt?: string;
}

export const BodyWeightModal: React.FC<BodyWeightModalProps> = ({
  isOpen,
  onClose,
  records,
  onSaveRecord,
  onDeleteRecord,
  lastSyncedAt,
}) => {
  const [weight, setWeight] = useState<string>(
    records.length > 0 ? String(records[0].weight) : '80'
  );
  // Datum i vreme se automatski inicijalizuju na trenutno vreme
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>(
    new Date().toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isChartOpen, setIsChartOpen] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = Number(weight);

    if (isNaN(w) || w < 20 || w > 350) {
      alert('Molimo unesite važeću vrednost telesne težine (20 - 350 kg).');
      return;
    }

    setIsSubmitting(true);
    setSaveSuccessMsg(null);

    try {
      await onSaveRecord({
        weight: Math.round(w * 10) / 10,
        date,
        time,
        notes: notes.trim(),
      });

      setSaveSuccessMsg('Telesna težina uspešno upisana i osvežena na OneDrive-u!');
      setNotes('');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Greška pri snimanju telesne težine.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const latestRecord = records[0];
  const count = records.length;

  return (
    <div
      id="body-weight-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-[#0e213e] text-slate-100 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-700 text-white flex items-center justify-between gap-3 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                Telesna težina
              </h3>
              <p className="text-[11px] text-teal-100 flex items-center gap-1.5 mt-0.5">
                <CloudCheck className="w-3.5 h-3.5" />
                <span>Automatski arhivirano na OneDrive lokaciji</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsChartOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Pravljenje grafikona (datum po horizontali, rezultati po vertikali)"
            >
              <TrendingUp className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Pravljenje grafikona</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Zatvori"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Form: Novi upis */}
          <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-teal-600" />
                <span>Novi upis telesne težine</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Jedinica: kg</span>
            </div>

            {/* Weight input with quick stepper buttons */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Telesna težina (kg)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWeight((prev) => String(Math.max(20, Math.round(((Number(prev) || 80) - 0.5) * 10) / 10)))}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-base flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  -
                </button>
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="350"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    required
                    placeholder="80.0"
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-center"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    kg
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setWeight((prev) => String(Math.min(350, Math.round(((Number(prev) || 80) + 0.5) * 10) / 10)))}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-base flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  +
                </button>
              </div>
            </div>

            {/* Datum i vreme automatski u jednom redu */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Datum merenja
                </label>
                <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-xl">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="text-xs bg-transparent outline-none w-full text-slate-700 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Vreme merenja
                </label>
                <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="text-xs bg-transparent outline-none w-full text-slate-700 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Napomena (opciono)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Npr. jutarnje merenje natašte, posle treninga..."
                className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Submit button & Success Alert */}
            <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Scale className="w-4 h-4" />
                <span>
                  {isSubmitting ? 'Snimanje na OneDrive...' : 'Sačuvaj i osveži bazu na OneDrive-u'}
                </span>
              </button>

              {saveSuccessMsg && (
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </span>
              )}
            </div>
          </form>

          {/* Dugme za pravljenje grafikona */}
          <button
            type="button"
            id="btn-body-weight-chart"
            onClick={() => setIsChartOpen(true)}
            className="w-full p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-700 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg flex items-center justify-between gap-3 transition-all cursor-pointer group border border-teal-400/40"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-black leading-tight text-white">
                    Pravljenje grafikona
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                    {count} {count === 1 ? 'merenje' : 'merenja'}
                  </span>
                </div>
                <p className="text-[11px] text-teal-100 mt-0.5 font-normal">
                  Datum po horizontali • Rezultati po vertikali (kg) • Opcija štampe
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white text-teal-800 group-hover:bg-teal-50 transition-colors shadow-xs flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prikaži i štampaj</span>
                <span className="sm:hidden">Grafikon</span>
              </span>
            </div>
          </button>

          {/* Quick Stats if records exist */}
          {latestRecord && (
            <div className="grid grid-cols-2 gap-2.5 p-3 bg-teal-50/60 border border-teal-100 rounded-2xl text-center">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Poslednja težina</span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">
                  {latestRecord.weight} <span className="text-xs font-semibold text-slate-500">kg</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Ukupno merenja</span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">
                  {count}
                </span>
              </div>
            </div>
          )}

          {/* History table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Istorijat merenja ({records.length})</span>
              </span>
              {lastSyncedAt && (
                <span className="text-[10px] text-slate-400">
                  Sinhronizovano: {new Date(lastSyncedAt).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {records.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-500 text-xs">
                Još uvek nema unetih merenja telesne težine. Unesite prvu težinu iznad kako biste započeli evidenciju.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100 bg-white max-h-72 overflow-y-auto">
                {records.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center justify-center shrink-0 font-bold text-xs">
                        <Scale className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {rec.weight} kg
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>{rec.date}</span>
                          {rec.time && <span>• {rec.time}</span>}
                          {rec.notes && (
                            <>
                              <span>•</span>
                              <span className="italic text-slate-600 truncate max-w-[180px]">
                                {rec.notes}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Želite li da obrišete merenje od ${rec.weight} kg iz baze?`)) {
                          onDeleteRecord(rec.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Obriši zapis"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="text-[11px] flex items-center gap-1.5">
            <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>OneDrive sinhronizacija aktivna</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs cursor-pointer transition-colors"
          >
            Zatvori
          </button>
        </div>
      </div>

      {/* Modal za pravljenje grafikona sa opcijom štampe */}
      <BodyWeightChartModal
        isOpen={isChartOpen}
        onClose={() => setIsChartOpen(false)}
        records={records}
      />
    </div>
  );
};
