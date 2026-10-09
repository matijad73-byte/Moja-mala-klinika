import React, { useState } from 'react';
import {
  Heart,
  Calendar,
  Clock,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  CloudCheck,
  TrendingUp,
  Printer,
} from 'lucide-react';
import { BloodPressureRecord, BloodPressureStatus } from '../types';
import { BloodPressureChartModal } from './BloodPressureChartModal';

interface BloodPressureModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: BloodPressureRecord[];
  onSaveRecord: (record: Omit<BloodPressureRecord, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  isSyncing?: boolean;
  lastSyncedAt?: string;
}

export const BloodPressureModal: React.FC<BloodPressureModalProps> = ({
  isOpen,
  onClose,
  records,
  onSaveRecord,
  onDeleteRecord,
  lastSyncedAt,
}) => {
  const [systolic, setSystolic] = useState<string>('120');
  const [diastolic, setDiastolic] = useState<string>('80');
  const [pulse, setPulse] = useState<string>('72');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>(
    new Date().toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isChartOpen, setIsChartOpen] = useState<boolean>(false);

  if (!isOpen) return null;

  // Status helper for history list
  const getStatusInfo = (s: number, d: number): { status: BloodPressureStatus; label: string; color: string } => {
    if (s < 90 || d < 60) {
      return { status: 'hypotension', label: 'Nizak (Hipotenzija)', color: 'text-sky-700 bg-sky-50 border-sky-200' };
    }
    if (s < 120 && d < 80) {
      return { status: 'optimal', label: 'Optimalan', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }
    if (s <= 129 && d <= 84) {
      return { status: 'normal', label: 'Normalan', color: 'text-teal-700 bg-teal-50 border-teal-200' };
    }
    if (s <= 139 || d <= 89) {
      return { status: 'high_normal', label: 'Visoko normalan', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    }
    if (s <= 159 || d <= 99) {
      return { status: 'grade1', label: 'Hipertenzija I', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    }
    if (s <= 179 || d <= 109) {
      return { status: 'grade2', label: 'Hipertenzija II', color: 'text-rose-700 bg-rose-50 border-rose-200' };
    }
    return { status: 'grade3', label: 'Hipertenzija III', color: 'text-red-800 bg-red-100 border-red-300' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = Number(systolic);
    const d = Number(diastolic);
    const p = Number(pulse);

    if (isNaN(s) || isNaN(d) || isNaN(p) || s < 50 || s > 260 || d < 30 || d > 160 || p < 30 || p > 220) {
      alert('Molimo unesite realne vrednosti pritiska i pulsa.');
      return;
    }

    setIsSubmitting(true);
    setSaveSuccessMsg(null);

    try {
      const cls = getStatusInfo(s, d);
      await onSaveRecord({
        systolic: s,
        diastolic: d,
        pulse: p,
        date,
        time,
        status: cls.status,
        statusLabel: cls.label,
        notes: notes.trim(),
      });

      setSaveSuccessMsg('Merenje uspešno upisano u bazu i osveženo na OneDrive-u!');
      setNotes('');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Greška pri snimanju merenja.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Summary statistics
  const count = records.length;
  const avgSys = count > 0 ? Math.round(records.reduce((acc, r) => acc + r.systolic, 0) / count) : 0;
  const avgDia = count > 0 ? Math.round(records.reduce((acc, r) => acc + r.diastolic, 0) / count) : 0;
  const avgPulse = count > 0 ? Math.round(records.reduce((acc, r) => acc + r.pulse, 0) / count) : 0;

  return (
    <div
      id="blood-pressure-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-[#0e213e] text-slate-100 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-700 text-white flex items-center justify-between gap-3 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                Krvni pritisak i puls
              </h3>
              <p className="text-[11px] text-rose-100 flex items-center gap-1.5 mt-0.5">
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
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              title="Zatvori"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-800 text-xs sm:text-sm">
          {/* New Measurement Form */}
          <form onSubmit={handleSubmit} className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3.5">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-rose-600" />
              <span>Novo merenje pritiska i pulsa</span>
            </h4>

            {/* Inputs: Systolic, Diastolic, Pulse */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  Sistolni (Gornji)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="50"
                    max="260"
                    required
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    placeholder="120"
                    className="w-full text-center text-lg sm:text-xl font-bold py-2 px-2 bg-white rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 absolute bottom-1 right-2 hidden sm:inline">mmHg</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  Dijastolni (Donji)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="30"
                    max="160"
                    required
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    placeholder="80"
                    className="w-full text-center text-lg sm:text-xl font-bold py-2 px-2 bg-white rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 absolute bottom-1 right-2 hidden sm:inline">mmHg</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  Puls / Otkucaji
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="30"
                    max="220"
                    required
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    placeholder="72"
                    className="w-full text-center text-lg sm:text-xl font-bold py-2 px-2 bg-white rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 absolute bottom-1 right-2 hidden sm:inline">bpm</span>
                </div>
              </div>
            </div>

            {/* Datum i vreme u jednom redu */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Datum merenja</label>
                <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-xl">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="text-xs bg-transparent outline-none w-full text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Vreme merenja</label>
                <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="text-xs bg-transparent outline-none w-full text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Napomena (opciono)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Npr. pre popijene kafe, posle terapije, nakon šetnje..."
                className="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-rose-500"
              />
            </div>

            {/* Save Button & Success Message */}
            <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Heart className="w-4 h-4 fill-white" />
                <span>{isSubmitting ? 'Snimanje na OneDrive...' : 'Sačuvaj i osveži bazu na OneDrive-u'}</span>
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
            id="btn-blood-pressure-chart"
            onClick={() => setIsChartOpen(true)}
            className="w-full p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white shadow-md hover:shadow-lg flex items-center justify-between gap-3 transition-all cursor-pointer group border border-rose-400/40"
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
                <p className="text-[11px] text-rose-100 mt-0.5 font-normal">
                  Datum po horizontali • Rezultati po vertikali • Opcija štampe
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white text-rose-700 group-hover:bg-rose-50 transition-colors shadow-xs flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prikaži i štampaj</span>
                <span className="sm:hidden">Grafikon</span>
              </span>
            </div>
          </button>

          {/* Average summary if records exist */}
          {count > 0 && (
            <div className="grid grid-cols-3 gap-2 p-3 bg-rose-50/50 border border-rose-100 rounded-2xl text-center">
              <div>
                <span className="text-[10px] text-slate-500 block">Prosečan sistolni</span>
                <span className="text-sm font-bold text-slate-900">{avgSys} mmHg</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Prosečan dijastolni</span>
                <span className="text-sm font-bold text-slate-900">{avgDia} mmHg</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Prosečan puls</span>
                <span className="text-sm font-bold text-slate-900">{avgPulse} bpm</span>
              </div>
            </div>
          )}

          {/* History List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Istorijat merenja ({count})</span>
              </h4>
              {lastSyncedAt && (
                <span className="text-[10px] text-slate-400">
                  Sinhronizovano: {new Date(lastSyncedAt).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {count === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                Još uvek nema unetih merenja. Unesite prve vrednosti iznad kako biste započeli praćenje.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {records.map((r) => {
                  const info = getStatusInfo(r.systolic, r.diastolic);
                  return (
                    <div
                      key={r.id}
                      className="p-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 font-bold text-xs">
                          {r.pulse}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">
                              {r.systolic} / {r.diastolic} <span className="text-[11px] font-normal text-slate-500">mmHg</span>
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${info.color}`}>
                              {r.statusLabel || info.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span>{r.date}</span>
                            {r.time && <span>• {r.time}</span>}
                            {r.notes && <span className="italic text-slate-600">({r.notes})</span>}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteRecord(r.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Obriši merenje"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
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
      <BloodPressureChartModal
        isOpen={isChartOpen}
        onClose={() => setIsChartOpen(false)}
        records={records}
      />
    </div>
  );
};
