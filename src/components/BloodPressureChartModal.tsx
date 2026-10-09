import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Heart,
  TrendingUp,
  Printer,
  X,
  Calendar,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
} from 'lucide-react';
import { BloodPressureRecord } from '../types';
import { formatChartDate } from './TrendChart';

interface BloodPressureChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: BloodPressureRecord[];
}

export const BloodPressureChartModal: React.FC<BloodPressureChartModalProps> = ({
  isOpen,
  onClose,
  records,
}) => {
  const [showSystolic, setShowSystolic] = useState<boolean>(true);
  const [showDiastolic, setShowDiastolic] = useState<boolean>(true);
  const [showPulse, setShowPulse] = useState<boolean>(true);
  const [showReferenceLines, setShowReferenceLines] = useState<boolean>(true);

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

  // Prepare chart data points
  const chartData = sortedRecords.map((r, index) => {
    const formatted = formatDisplayDate(r.date);
    const chartDate = formatChartDate(r.date, allDates, r.time);

    return {
      id: r.id,
      index: index + 1,
      rawDate: r.date,
      time: r.time || '',
      chartDate,
      formattedDate: chartDate,
      fullFormattedDate: formatted,
      systolic: r.systolic,
      diastolic: r.diastolic,
      pulse: r.pulse,
      status: r.status,
      statusLabel: r.statusLabel,
      notes: r.notes || '',
    };
  });

  // Custom dot rendering with measured values directly above points
  const renderSystolicDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy || payload?.systolic === undefined) return null;
    return (
      <g key={`sys-${payload.id || cx}-${cy}`}>
        <circle cx={cx} cy={cy} r={4.5} fill="#e11d48" stroke="#ffffff" strokeWidth={1.5} />
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fill="#e11d48"
          fontSize={10}
          fontWeight="700"
          stroke="#ffffff"
          strokeWidth={2.5}
          paintOrder="stroke fill"
          className="select-none pointer-events-none"
        >
          {payload.systolic}
        </text>
      </g>
    );
  };

  const renderDiastolicDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy || payload?.diastolic === undefined) return null;
    return (
      <g key={`dia-${payload.id || cx}-${cy}`}>
        <circle cx={cx} cy={cy} r={4.5} fill="#0284c7" stroke="#ffffff" strokeWidth={1.5} />
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fill="#0284c7"
          fontSize={10}
          fontWeight="700"
          stroke="#ffffff"
          strokeWidth={2.5}
          paintOrder="stroke fill"
          className="select-none pointer-events-none"
        >
          {payload.diastolic}
        </text>
      </g>
    );
  };

  const renderPulseDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy || payload?.pulse === undefined) return null;
    return (
      <g key={`pls-${payload.id || cx}-${cy}`}>
        <circle cx={cx} cy={cy} r={3.5} fill="#059669" stroke="#ffffff" strokeWidth={1.5} />
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fill="#059669"
          fontSize={9.5}
          fontWeight="700"
          stroke="#ffffff"
          strokeWidth={2.5}
          paintOrder="stroke fill"
          className="select-none pointer-events-none"
        >
          {payload.pulse}
        </text>
      </g>
    );
  };

  // Statistical calculations
  const count = sortedRecords.length;
  const avgSys = count > 0 ? Math.round(sortedRecords.reduce((acc, r) => acc + r.systolic, 0) / count) : 0;
  const avgDia = count > 0 ? Math.round(sortedRecords.reduce((acc, r) => acc + r.diastolic, 0) / count) : 0;
  const avgPulse = count > 0 ? Math.round(sortedRecords.reduce((acc, r) => acc + r.pulse, 0) / count) : 0;

  const minSys = count > 0 ? Math.min(...sortedRecords.map((r) => r.systolic)) : 0;
  const maxSys = count > 0 ? Math.max(...sortedRecords.map((r) => r.systolic)) : 0;
  const minDia = count > 0 ? Math.min(...sortedRecords.map((r) => r.diastolic)) : 0;
  const maxDia = count > 0 ? Math.max(...sortedRecords.map((r) => r.diastolic)) : 0;

  const latest = sortedRecords[sortedRecords.length - 1];
  const first = sortedRecords[0];

  // Min and Max for Y-axis calculation
  const allValues = [
    ...(showSystolic ? sortedRecords.map((r) => r.systolic) : []),
    ...(showDiastolic ? sortedRecords.map((r) => r.diastolic) : []),
    ...(showPulse ? sortedRecords.map((r) => r.pulse) : []),
  ];
  const yMin = allValues.length > 0 ? Math.max(30, Math.floor(Math.min(...allValues) / 10) * 10 - 10) : 40;
  const yMax = allValues.length > 0 ? Math.min(260, Math.ceil(Math.max(...allValues) / 10) * 10 + 10) : 180;

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    window.print();
  };

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 sm:p-4 rounded-2xl shadow-xl border border-slate-700 text-xs space-y-2 min-w-[210px] backdrop-blur-md">
          <div className="border-b border-slate-700/80 pb-1.5 flex items-center justify-between gap-2">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              <span>{data.fullFormattedDate}</span>
            </span>
            {data.time && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{data.time}</span>
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-rose-300 font-semibold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                <span>Sistolni (Gornji):</span>
              </span>
              <span className="font-black text-white text-sm">{data.systolic} <span className="text-[10px] font-normal text-slate-300">mmHg</span></span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sky-300 font-semibold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
                <span>Dijastolni (Donji):</span>
              </span>
              <span className="font-black text-white text-sm">{data.diastolic} <span className="text-[10px] font-normal text-slate-300">mmHg</span></span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Puls (otkucaji):</span>
              </span>
              <span className="font-black text-white text-sm">{data.pulse} <span className="text-[10px] font-normal text-slate-300">bpm</span></span>
            </div>
          </div>

          {data.statusLabel && (
            <div className="pt-1.5 border-t border-slate-700/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Ocena stanja:</span>
              <span className="font-bold text-rose-300">{data.statusLabel}</span>
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
      id="blood-pressure-chart-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[96vh]">
        {/* Header (Screen View) */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-700 text-white flex items-center justify-between gap-3 shrink-0 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                  Grafikon kretanja krvnog pritiska i pulsa
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {count} merenja
                </span>
              </div>
              <p className="text-[11px] text-rose-100 flex items-center gap-1.5 mt-0.5">
                <span>Datum po horizontali • Rezultati po vertikali (mmHg i bpm)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Štampaj grafikon i tabelu"
            >
              <Printer className="w-4 h-4 text-rose-600" />
              <span className="hidden sm:inline">Štampaj grafikon</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              title="Zatvori grafikon"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div
          id="printable-chart-content"
          className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-800 text-xs sm:text-sm flex-1 bg-white print:p-0 print:space-y-4"
        >
          {/* Printable Formal Medical Header (Visible in Print & Clean for Doctor) */}
          <div className="border-b-2 border-slate-900 pb-3 hidden print:block">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  IZVEŠTAJ MERENJA KRVNOG PRITISKA I PULSA
                </h1>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Grafikon kretanja: Datum po horizontali • Rezultati po vertikali
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>Datum štampe: <strong>{new Date().toLocaleDateString('sr-RS')}</strong></div>
                <div>Ukupno unetih merenja: <strong>{count}</strong></div>
              </div>
            </div>

            {count > 0 && first && latest && (
              <div className="mt-2 text-xs text-slate-700 flex items-center gap-4">
                <span>Period praćenja: <strong>{first.date} — {latest.date}</strong></span>
                <span>•</span>
                <span>Prosek: <strong>{avgSys}/{avgDia} mmHg ({avgPulse} bpm)</strong></span>
                <span>•</span>
                <span>Raspon sistolnog: <strong>{minSys} - {maxSys} mmHg</strong></span>
              </div>
            )}
          </div>

          {count === 0 ? (
            <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 space-y-3">
              <Activity className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-800 text-base">Nema unetih merenja za prikaz grafikona</h4>
              <p className="text-xs max-w-md mx-auto">
                Unesite podatke o krvnom pritisku u polju za unos. Čim zabeležite merenja, ovde će se automatski iscrtati interaktivni grafikon sa datumima po horizontali i rezultatima po vertikali.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 print:grid-cols-4">
                <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/80">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                    Poslednje merenje
                  </span>
                  <div className="text-base sm:text-lg font-black text-rose-950 mt-0.5">
                    {latest ? `${latest.systolic}/${latest.diastolic}` : '-'} <span className="text-[11px] font-normal text-rose-700">mmHg</span>
                  </div>
                  <div className="text-[10px] text-rose-600 mt-0.5">
                    Puls: {latest ? latest.pulse : '-'} bpm • {latest ? formatDisplayDate(latest.date) : ''}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Prosečan pritisak
                  </span>
                  <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    {avgSys}/{avgDia} <span className="text-[11px] font-normal text-slate-500">mmHg</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Prosečan puls: {avgPulse} bpm
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Raspon sistolnog (Gornjeg)
                  </span>
                  <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    {minSys} — {maxSys} <span className="text-[11px] font-normal text-slate-500">mmHg</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Min / Max zabeleženo
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Raspon dijastolnog (Donjeg)
                  </span>
                  <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    {minDia} — {maxDia} <span className="text-[11px] font-normal text-slate-500">mmHg</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Min / Max zabeleženo
                  </div>
                </div>
              </div>

              {/* Chart Controls & Legend (Screen Only) */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs print:hidden">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold text-slate-700 text-[11px]">Prikaži na grafikonu:</span>

                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-rose-700">
                    <input
                      type="checkbox"
                      checked={showSystolic}
                      onChange={(e) => setShowSystolic(e.target.checked)}
                      className="rounded accent-rose-600 cursor-pointer"
                    />
                    <span>Sistolni (Gornji)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-sky-700">
                    <input
                      type="checkbox"
                      checked={showDiastolic}
                      onChange={(e) => setShowDiastolic(e.target.checked)}
                      className="rounded accent-sky-600 cursor-pointer"
                    />
                    <span>Dijastolni (Donji)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-emerald-700">
                    <input
                      type="checkbox"
                      checked={showPulse}
                      onChange={(e) => setShowPulse(e.target.checked)}
                      className="rounded accent-emerald-600 cursor-pointer"
                    />
                    <span>Puls (otkucaji)</span>
                  </label>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 text-[11px]">
                  <input
                    type="checkbox"
                    checked={showReferenceLines}
                    onChange={(e) => setShowReferenceLines(e.target.checked)}
                    className="rounded accent-slate-600 cursor-pointer"
                  />
                  <span>Referentne granice (140/90 i 120/80)</span>
                </label>
              </div>

              {/* THE CHART CONTAINER: Horizontal Date, Vertical Results */}
              <div className="p-3 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      Grafički prikaz merenja
                    </span>
                    <span className="text-[11px] text-slate-500">
                      (X-osa: Datum merenja • Y-osa: Vrednosti u mmHg / bpm)
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] font-semibold">
                    {showSystolic && (
                      <span className="flex items-center gap-1.5 text-rose-600">
                        <span className="w-3 h-0.5 bg-rose-600 inline-block"></span>
                        Sistolni
                      </span>
                    )}
                    {showDiastolic && (
                      <span className="flex items-center gap-1.5 text-sky-600">
                        <span className="w-3 h-0.5 bg-sky-600 inline-block"></span>
                        Dijastolni
                      </span>
                    )}
                    {showPulse && (
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <span className="w-3 h-0.5 bg-emerald-600 border-t border-dashed border-emerald-600 inline-block"></span>
                        Puls
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full h-[320px] sm:h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 25, right: 20, left: -5, bottom: 25 }}>
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

                      {/* Y-AXIS: Rezultati po vertikali */}
                      <YAxis
                        domain={[yMin, yMax]}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        unit=" mmHg"
                        width={60}
                      />

                      {/* Tooltip removed per user request */}

                      {/* Reference medical threshold lines */}
                      {showReferenceLines && (
                        <>
                          <ReferenceLine
                            y={140}
                            stroke="#e11d48"
                            strokeDasharray="4 4"
                            strokeWidth={1}
                            label={{
                              value: 'Granica hipertenzije (140)',
                              position: 'top',
                              fill: '#e11d48',
                              fontSize: 9,
                            }}
                          />
                          <ReferenceLine
                            y={120}
                            stroke="#10b981"
                            strokeDasharray="3 3"
                            strokeWidth={1}
                            label={{
                              value: 'Optimalan sistolni (120)',
                              position: 'bottom',
                              fill: '#10b981',
                              fontSize: 9,
                            }}
                          />
                          <ReferenceLine
                            y={80}
                            stroke="#0284c7"
                            strokeDasharray="3 3"
                            strokeWidth={1}
                            label={{
                              value: 'Optimalan dijastolni (80)',
                              position: 'bottom',
                              fill: '#0284c7',
                              fontSize: 9,
                            }}
                          />
                        </>
                      )}

                      {/* Line: Sistolni pritisak with values directly above points */}
                      {showSystolic && (
                        <Line
                          type="monotone"
                          dataKey="systolic"
                          name="Sistolni (Gornji)"
                          stroke="#e11d48"
                          strokeWidth={2.5}
                          dot={renderSystolicDot}
                          activeDot={false}
                        />
                      )}

                      {/* Line: Dijastolni pritisak with values directly above points */}
                      {showDiastolic && (
                        <Line
                          type="monotone"
                          dataKey="diastolic"
                          name="Dijastolni (Donji)"
                          stroke="#0284c7"
                          strokeWidth={2.5}
                          dot={renderDiastolicDot}
                          activeDot={false}
                        />
                      )}

                      {/* Line: Puls with values directly above points */}
                      {showPulse && (
                        <Line
                          type="monotone"
                          dataKey="pulse"
                          name="Puls"
                          stroke="#059669"
                          strokeWidth={2}
                          strokeDasharray="4 3"
                          dot={renderPulseDot}
                          activeDot={false}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Table: Chronological Measurement List */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-rose-600" />
                    <span>Hronološka tabela svih merenja ({count})</span>
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
                        <th className="py-2.5 px-3">Pritisak (mmHg)</th>
                        <th className="py-2.5 px-3">Puls</th>
                        <th className="py-2.5 px-3">Kategorija</th>
                        <th className="py-2.5 px-3">Napomena</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedRecords.map((r, idx) => (
                        <tr key={r.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {formatDisplayDate(r.date)} {r.time && <span className="text-slate-400 text-[11px]">({r.time})</span>}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {r.systolic} / {r.diastolic}
                          </td>
                          <td className="py-2 px-3 text-slate-700 font-semibold">
                            {r.pulse} <span className="text-[10px] font-normal text-slate-400">bpm</span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {r.statusLabel}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-500 italic max-w-xs truncate">
                            {r.notes || '-'}
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
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
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
