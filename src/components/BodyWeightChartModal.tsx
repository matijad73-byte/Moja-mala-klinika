import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
  Printer,
  X,
  Calendar,
  Clock,
  Activity,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { BodyWeightRecord } from '../types';
import { formatChartDate } from './TrendChart';

interface BodyWeightChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: BodyWeightRecord[];
}

export const BodyWeightChartModal: React.FC<BodyWeightChartModalProps> = ({
  isOpen,
  onClose,
  records,
}) => {
  const [showAverageLine, setShowAverageLine] = useState<boolean>(true);

  if (!isOpen) return null;

  // Format date helper: YYYY-MM-DD -> DD.MM.YYYY.
  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}.`;
    }
    return dStr;
  };

  // Sort records chronologically (oldest to newest)
  const sortedRecords = [...records].sort((a, b) => {
    const timeA = a.time || '00:00';
    const timeB = b.time || '00:00';
    const dateA = new Date(`${a.date}T${timeA.length === 5 ? timeA : '00:00'}`).getTime();
    const dateB = new Date(`${b.date}T${timeB.length === 5 ? timeB : '00:00'}`).getTime();
    return dateA - dateB;
  });

  const allDates = sortedRecords.map((r) => r.date);

  // Prepare chart data points with differences
  const chartData = sortedRecords.map((r, index) => {
    const formatted = formatDisplayDate(r.date);
    const chartDate = formatChartDate(r.date, allDates, r.time);

    const prevRecord = index > 0 ? sortedRecords[index - 1] : null;
    const diffFromPrev = prevRecord ? Math.round((r.weight - prevRecord.weight) * 10) / 10 : 0;
    const firstRecord = sortedRecords[0];
    const diffFromStart = Math.round((r.weight - firstRecord.weight) * 10) / 10;

    return {
      id: r.id,
      index: index + 1,
      rawDate: r.date,
      time: r.time || '',
      chartDate,
      formattedDate: chartDate,
      fullFormattedDate: formatted,
      weight: r.weight,
      diffFromPrev,
      diffFromStart,
      notes: r.notes || '',
    };
  });

  // Custom dot rendering with weight value directly above point
  const renderWeightDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy || payload?.weight === undefined) return null;
    return (
      <g key={`wt-${payload.id || cx}-${cy}`}>
        <circle cx={cx} cy={cy} r={4.5} fill="#0d9488" stroke="#ffffff" strokeWidth={1.5} />
        <text
          x={cx}
          y={cy - 9}
          textAnchor="middle"
          fill="#0f766e"
          fontSize={10.5}
          fontWeight="700"
          stroke="#ffffff"
          strokeWidth={2.5}
          paintOrder="stroke fill"
          className="select-none pointer-events-none"
        >
          {payload.weight}
        </text>
      </g>
    );
  };

  // Statistical calculations
  const count = sortedRecords.length;
  const weights = sortedRecords.map((r) => r.weight);
  const avgWeight = count > 0 ? Math.round((weights.reduce((a, b) => a + b, 0) / count) * 10) / 10 : 0;
  const minWeight = count > 0 ? Math.min(...weights) : 0;
  const maxWeight = count > 0 ? Math.max(...weights) : 0;
  const firstRecord = sortedRecords[0];
  const latestRecord = sortedRecords[sortedRecords.length - 1];
  const totalChange = count > 1 ? Math.round((latestRecord.weight - firstRecord.weight) * 10) / 10 : 0;

  // Domain for Y-Axis
  const yMin = count > 0 ? Math.max(20, Math.floor(minWeight - 2)) : 50;
  const yMax = count > 0 ? Math.ceil(maxWeight + 2) : 100;

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    window.print();
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 sm:p-4 rounded-2xl shadow-xl border border-slate-700 text-xs space-y-2 min-w-[210px] backdrop-blur-md">
          <div className="border-b border-slate-700/80 pb-1.5 flex items-center justify-between gap-2">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              <span>{data.fullFormattedDate}</span>
            </span>
            {data.time && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{data.time}</span>
              </span>
            )}
          </div>

          <div className="flex items-baseline justify-between py-1">
            <span className="text-teal-300 font-semibold flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              <span>Telesna težina:</span>
            </span>
            <span className="font-black text-white text-base">
              {data.weight} <span className="text-xs font-normal text-slate-300">kg</span>
            </span>
          </div>

          {data.index > 1 && (
            <div className="pt-1.5 border-t border-slate-700/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Od prethodnog merenja:</span>
              <span
                className={`font-bold flex items-center gap-1 ${
                  data.diffFromPrev > 0
                    ? 'text-rose-400'
                    : data.diffFromPrev < 0
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                {data.diffFromPrev > 0 ? `+${data.diffFromPrev}` : data.diffFromPrev} kg
              </span>
            </div>
          )}

          {data.index > 1 && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Od početnog merenja:</span>
              <span
                className={`font-bold ${
                  data.diffFromStart > 0
                    ? 'text-rose-400'
                    : data.diffFromStart < 0
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                {data.diffFromStart > 0 ? `+${data.diffFromStart}` : data.diffFromStart} kg
              </span>
            </div>
          )}

          {data.notes && (
            <div className="text-[11px] text-slate-300 italic pt-1 border-t border-slate-800">
              „{data.notes}”
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const modalContent = (
    <div
      id="body-weight-chart-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[96vh]">
        {/* Header (Screen View) */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-700 text-white flex items-center justify-between gap-3 shrink-0 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                  Grafikon kretanja telesne težine
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {count} merenja
                </span>
              </div>
              <p className="text-[11px] text-teal-100 flex items-center gap-1.5 mt-0.5">
                <span>Datum po horizontali • Rezultati po vertikali (kg)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white text-teal-800 hover:bg-teal-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Štampaj grafikon i tabelu"
            >
              <Printer className="w-4 h-4 text-teal-700" />
              <span className="hidden sm:inline">Štampaj grafikon</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              title="Zatvori grafikon"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div
          id="printable-chart-content"
          className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-800 text-xs sm:text-sm flex-1 bg-white print:p-0 print:space-y-4"
        >
          {/* Printable Formal Medical Header */}
          <div className="border-b-2 border-slate-900 pb-3 hidden print:block">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  IZVEŠTAJ KRETANJA TELESNE TEŽINE
                </h1>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Grafikon kretanja: Datum po horizontali • Rezultati po vertikali (kg)
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>Datum štampe: <strong>{new Date().toLocaleDateString('sr-RS')}</strong></div>
                <div>Ukupno unetih merenja: <strong>{count}</strong></div>
              </div>
            </div>

            {count > 0 && firstRecord && latestRecord && (
              <div className="mt-2 text-xs text-slate-700 flex items-center gap-4">
                <span>Period praćenja: <strong>{firstRecord.date} — {latestRecord.date}</strong></span>
                <span>•</span>
                <span>Početna: <strong>{firstRecord.weight} kg</strong></span>
                <span>•</span>
                <span>Poslednja: <strong>{latestRecord.weight} kg</strong></span>
                <span>•</span>
                <span>
                  Promena:{' '}
                  <strong>
                    {totalChange > 0 ? `+${totalChange}` : totalChange} kg
                  </strong>
                </span>
                <span>•</span>
                <span>Prosek: <strong>{avgWeight} kg</strong></span>
              </div>
            )}
          </div>

          {count === 0 ? (
            <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 space-y-3">
              <Scale className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-800 text-base">Nema unetih merenja za prikaz grafikona</h4>
              <p className="text-xs max-w-md mx-auto">
                Unesite podatke o telesnoj težini u polju za unos. Čim zabeležite prva merenja, ovde će se automatski generisati grafikon sa datumima po horizontali i težinom po vertikali.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 print:grid-cols-5">
                <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200/80">
                  <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">
                    Poslednja težina
                  </span>
                  <div className="text-base sm:text-xl font-black text-teal-950 mt-0.5">
                    {latestRecord.weight} <span className="text-xs font-normal text-teal-700">kg</span>
                  </div>
                  <div className="text-[10px] text-teal-600 mt-0.5">
                    {formatDisplayDate(latestRecord.date)}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Početna težina
                  </span>
                  <div className="text-base sm:text-xl font-black text-slate-900 mt-0.5">
                    {firstRecord.weight} <span className="text-xs font-normal text-slate-500">kg</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {formatDisplayDate(firstRecord.date)}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Ukupna promena
                  </span>
                  <div
                    className={`text-base sm:text-xl font-black mt-0.5 flex items-center gap-1 ${
                      totalChange < 0
                        ? 'text-emerald-700'
                        : totalChange > 0
                        ? 'text-rose-700'
                        : 'text-slate-900'
                    }`}
                  >
                    {totalChange < 0 ? (
                      <TrendingDown className="w-4 h-4 text-emerald-600" />
                    ) : totalChange > 0 ? (
                      <TrendingUp className="w-4 h-4 text-rose-600" />
                    ) : (
                      <Minus className="w-4 h-4 text-slate-400" />
                    )}
                    <span>{totalChange > 0 ? `+${totalChange}` : totalChange} kg</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Od prvog merenja
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Prosečna težina
                  </span>
                  <div className="text-base sm:text-xl font-black text-slate-900 mt-0.5">
                    {avgWeight} <span className="text-xs font-normal text-slate-500">kg</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Prosek {count} merenja
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Raspon (Min - Max)
                  </span>
                  <div className="text-base sm:text-xl font-black text-slate-900 mt-0.5">
                    {minWeight} — {maxWeight} <span className="text-xs font-normal text-slate-500">kg</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Razlika: {Math.round((maxWeight - minWeight) * 10) / 10} kg
                  </div>
                </div>
              </div>

              {/* Chart Controls & Toggle (Screen Only) */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs print:hidden">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 text-[11px]">Opcije grafikona:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={showAverageLine}
                      onChange={(e) => setShowAverageLine(e.target.checked)}
                      className="rounded accent-teal-600 cursor-pointer"
                    />
                    <span>Prikaži liniju proseka ({avgWeight} kg)</span>
                  </label>
                </div>

                <div className="text-[11px] text-slate-500">
                  Jedinica merenja: <strong className="text-slate-800">kilogrami (kg)</strong>
                </div>
              </div>

              {/* THE CHART CONTAINER: Horizontal Date, Vertical Weight */}
              <div className="p-3 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      Grafički prikaz kretanja kilaže
                    </span>
                    <span className="text-[11px] text-slate-500">
                      (X-osa: Datum merenja • Y-osa: Telesna težina u kg)
                    </span>
                  </div>

                  <span className="flex items-center gap-1.5 text-teal-700 font-semibold text-[11px]">
                    <span className="w-3 h-0.5 bg-teal-600 inline-block"></span>
                    Telesna težina (kg)
                  </span>
                </div>

                <div className="w-full h-[320px] sm:h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 25, right: 20, left: -5, bottom: 25 }}>
                      <defs>
                        <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

                      {/* X-AXIS: Datum po horizontali */}
                      <XAxis
                        dataKey="chartDate"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        angle={-25}
                        textAnchor="end"
                        height={45}
                        interval="preserveStartEnd"
                      />

                      {/* Y-AXIS: Rezultati po vertikali (kg) */}
                      <YAxis
                        domain={[yMin, yMax]}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        unit=" kg"
                        width={55}
                      />

                      {/* Tooltip removed per user request */}

                      {/* Average Reference Line */}
                      {showAverageLine && (
                        <ReferenceLine
                          y={avgWeight}
                          stroke="#64748b"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{
                            value: `Prosek (${avgWeight} kg)`,
                            position: 'right',
                            fill: '#475569',
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        />
                      )}

                      {/* Area and Line for Weight with values directly above points */}
                      <Area
                        type="monotone"
                        dataKey="weight"
                        name="Telesna težina"
                        stroke="#0d9488"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#weightGradient)"
                        dot={renderWeightDot}
                        activeDot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Table: Chronological Measurement List */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <span>Hronološka tabela merenja ({count})</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Prikazano od najstarijeg ka najnovijem merenju
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Datum i vreme</th>
                        <th className="py-2.5 px-3">Težina (kg)</th>
                        <th className="py-2.5 px-3">Promena</th>
                        <th className="py-2.5 px-3">Od početka</th>
                        <th className="py-2.5 px-3">Napomena</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {chartData.map((pt, idx) => (
                        <tr key={pt.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {pt.fullFormattedDate} {pt.time && <span className="text-slate-400 text-[11px]">({pt.time})</span>}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900 text-sm">
                            {pt.weight} <span className="text-[10px] font-normal text-slate-500">kg</span>
                          </td>
                          <td className="py-2 px-3">
                            {idx === 0 ? (
                              <span className="text-slate-400 text-[11px]">Početno</span>
                            ) : (
                              <span
                                className={`font-bold text-[11px] ${
                                  pt.diffFromPrev < 0
                                    ? 'text-emerald-600'
                                    : pt.diffFromPrev > 0
                                    ? 'text-rose-600'
                                    : 'text-slate-500'
                                }`}
                              >
                                {pt.diffFromPrev > 0 ? `+${pt.diffFromPrev}` : pt.diffFromPrev} kg
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {idx === 0 ? (
                              <span className="text-slate-400 text-[11px]">-</span>
                            ) : (
                              <span
                                className={`font-semibold text-[11px] ${
                                  pt.diffFromStart < 0
                                    ? 'text-emerald-700'
                                    : pt.diffFromStart > 0
                                    ? 'text-rose-700'
                                    : 'text-slate-500'
                                }`}
                              >
                                {pt.diffFromStart > 0 ? `+${pt.diffFromStart}` : pt.diffFromStart} kg
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-500 italic max-w-xs truncate">
                            {pt.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer (Screen Only) */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Štampaj ovaj grafikon</span>
            </button>
            <span className="text-[11px] text-slate-400 hidden md:inline">
              Pripremljeno za štampu na formatu A4
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs cursor-pointer transition-colors"
          >
            Zatvori grafikon
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
