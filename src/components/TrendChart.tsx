import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Maximize2,
  Minimize2,
  Printer,
  FileText,
  X,
  SlidersHorizontal,
  Calendar,
  Building2,
  Info,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { ParameterTrend, ParameterStatus } from '../types';

const SHORT_MONTHS_SR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun',
  'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'
];

export function formatChartDate(dateStr: string, allDates?: string[], _timeStr?: string): string {
  if (!dateStr) return '';
  let year = '';
  let month = 0;
  let day = '';

  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      year = parts[0];
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10).toString();
    }
  } else if (dateStr.includes('.')) {
    const parts = dateStr.split('.').filter(Boolean);
    if (parts.length >= 3) {
      day = parseInt(parts[0], 10).toString();
      month = parseInt(parts[1], 10);
      year = parts[2].trim();
    }
  }

  if (month >= 1 && month <= 12 && year) {
    const monthName = SHORT_MONTHS_SR[month - 1];
    const shortYear = year.slice(-2);
    
    // Ako ima više merenja u istom mesecu i godini, prikaži dan radi razlikovanja tačaka
    if (allDates && allDates.length > 0) {
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const countInMonth = allDates.filter((d) => {
        if (!d) return false;
        if (d.startsWith(monthKey)) return true;
        const dParts = d.includes('-') ? d.split('-') : d.split('.');
        if (dParts.length >= 3) {
          const dY = d.includes('-') ? dParts[0] : dParts[2].trim();
          const dM = parseInt(d.includes('-') ? dParts[1] : dParts[1], 10);
          return (dY === year || dY.endsWith(shortYear)) && dM === month;
        }
        return false;
      }).length;
      if (countInMonth > 1) {
        return `${day}. ${monthName} ${shortYear}`;
      }
    }
    // Inače skraćeno samo na mesec i poslednje dve cifre godine (npr. "Maj 21", "Jun 22")
    return `${monthName} ${shortYear}`;
  }

  return dateStr;
}

export function formatSerbianMonth(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const months = [
      'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
      'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
    ];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${months[monthIndex]} ${year}.`;
    }
  }
  return dateStr;
}

interface TrendChartProps {
  trend: ParameterTrend;
  allTrends: ParameterTrend[];
  onSelectCompareTrend?: (trendName: string | null) => void;
  compareTrendName: string | null;
  onPrintFullReport?: () => void;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  trend,
  allTrends,
  onSelectCompareTrend,
  compareTrendName,
  onPrintFullReport,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const compareTrend = allTrends.find((t) => t.name === compareTrendName);

  const hdlTrend = allTrends.find((t) => t.name === 'HDL Holesterol');
  const ldlTrend = allTrends.find((t) => t.name === 'LDL Holesterol');
  const trigTrend = allTrends.find((t) => t.name === 'Trigliceridi');
  const cholTrend = allTrends.find((t) => t.name === 'Ukupni Holesterol');

  // Check if current parameter belongs to lipid panel
  const isLipidParameter =
    trend.category === 'Lipidni status' ||
    trend.name.toLowerCase().includes('holesterol') ||
    trend.name.toLowerCase().includes('trigliceridi');

  // Prepare chart data merging main trend and optional comparison trend without key collision
  const dateMap = new Map<
    string,
    {
      date: string;
      formattedDate: string;
      value: number;
      status: ParameterStatus;
      labName: string;
      refMin?: number | null;
      refMax?: number | null;
      refText?: string;
      compareValue?: number;
      compareStatus?: ParameterStatus;
      compareLab?: string;
    }
  >();

  trend.dataPoints.forEach((p) => {
    const key = p.reportId || `${p.date}_${p.labName}_${p.value}`;
    dateMap.set(key, {
      date: p.date,
      formattedDate: p.formattedDate,
      value: p.value,
      status: p.status,
      labName: p.labName,
      refMin: p.refMin,
      refMax: p.refMax,
      refText: p.refText,
    });
  });

  if (compareTrend) {
    compareTrend.dataPoints.forEach((p) => {
      let matchedKey: string | undefined = undefined;
      for (const [k, v] of dateMap.entries()) {
        if (v.date === p.date) {
          matchedKey = k;
          break;
        }
      }
      if (matchedKey) {
        const existing = dateMap.get(matchedKey);
        if (existing) {
          existing.compareValue = p.value;
          existing.compareStatus = p.status;
          existing.compareLab = p.labName;
        }
      } else {
        const key = p.reportId || `${p.date}_${p.labName}_comp`;
        dateMap.set(key, {
          date: p.date,
          formattedDate: p.formattedDate,
          value: null as any,
          status: 'normal',
          labName: p.labName,
          compareValue: p.value,
          compareStatus: p.status,
          compareLab: p.labName,
        });
      }
    });
  }

  const allDates = Array.from(dateMap.values()).map((p) => p.date);
  const chartData = Array.from(dateMap.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((item) => ({
      ...item,
      chartDate: formatChartDate(item.date, allDates),
    }));

  // Determine Y-domain bounds
  const values = trend.dataPoints.map((p) => p.value);
  if (compareTrend) {
    compareTrend.dataPoints.forEach((p) => values.push(p.value));
  }
  if (trend.refMin !== null && trend.refMin !== undefined) values.push(trend.refMin);
  if (trend.refMax !== null && trend.refMax !== undefined) values.push(trend.refMax);

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = (maxValue - minValue) * 0.15 || 1;
  const yMin = Math.max(0, Number((minValue - padding).toFixed(2)));
  const yMax = Number((maxValue + padding).toFixed(2));

  // Custom dot rendering with measured value displayed directly above each point
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.value === null || payload.value === undefined || isNaN(cy)) return null;

    let fill = '#0d9488'; // base teal
    if (payload.status === 'high' || payload.status === 'critical') fill = '#e11d48'; // high: rose
    else if (payload.status === 'low') fill = '#f59e0b'; // low: amber
    else fill = '#10b981'; // normal: emerald

    return (
      <g key={`dot-${payload.date}-${cx}-${cy}`}>
        <circle
          cx={cx}
          cy={cy}
          r={isFullscreen ? 5.5 : 4.5}
          fill={fill}
          stroke="#ffffff"
          strokeWidth={2}
          className="transition-all"
        />
        {/* Measured result value directly above point */}
        <text
          x={cx}
          y={cy - 9}
          textAnchor="middle"
          fill={fill}
          fontSize={isFullscreen ? 11 : 10}
          fontWeight="700"
          stroke="#ffffff"
          strokeWidth={2.5}
          paintOrder="stroke fill"
          className="select-none pointer-events-none"
        >
          {payload.value}
        </text>
      </g>
    );
  };

  // Compare parameter dot with value directly above point
  const renderCompareDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.compareValue === null || payload.compareValue === undefined || isNaN(cy)) return null;
    return (
      <g key={`comp-dot-${cx}-${cy}`}>
        <circle
          cx={cx}
          cy={cy}
          r={isFullscreen ? 5 : 4}
          fill="#f59e0b"
          stroke="#ffffff"
          strokeWidth={1.5}
        />
        <text
          x={cx}
          y={cy - 9}
          textAnchor="middle"
          fill="#d97706"
          fontSize={isFullscreen ? 11 : 10}
          fontWeight="700"
          stroke="#ffffff"
          strokeWidth={2.5}
          paintOrder="stroke fill"
          className="select-none pointer-events-none"
        >
          {payload.compareValue}
        </text>
      </g>
    );
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 max-w-xs z-50">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
            <span className="font-semibold text-slate-200">{data.formattedDate}</span>
            <span className="text-[10px] text-slate-400 truncate">{data.labName}</span>
          </div>

          <div className="flex items-center justify-between gap-3 pt-0.5">
            <span className="text-slate-300 font-medium">{trend.name}:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-teal-300">
                {data.value !== null ? `${data.value} ${trend.unit}` : '-'}
              </span>
              {data.status !== 'normal' && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    data.status === 'high' || data.status === 'critical'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {data.status === 'high' ? 'Povišeno' : 'Sniženo'}
                </span>
              )}
            </div>
          </div>

          {trend.refText && (
            <div className="text-[11px] text-slate-400">
              Ref. interval:{' '}
              <span className="text-slate-300">
                {trend.refText} {trend.unit}
              </span>
            </div>
          )}

          {compareTrend && data.compareValue !== undefined && (
            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between gap-2">
              <span className="text-slate-400">{compareTrend.name}:</span>
              <span className="font-bold text-amber-300">
                {data.compareValue} {compareTrend.unit}
              </span>
            </div>
          )}

          {isLipidParameter && (
            <div className="pt-1.5 mt-1 border-t border-slate-800 text-[10px] space-y-0.5 text-teal-300">
              <div className="font-semibold text-teal-200">Zbir frakcija za ovaj datum:</div>
              {(() => {
                const hdlVal = hdlTrend?.dataPoints.find((p) => p.date === data.date)?.value;
                const ldlVal = ldlTrend?.dataPoints.find((p) => p.date === data.date)?.value;
                const trigVal = trigTrend?.dataPoints.find((p) => p.date === data.date)?.value;
                const cholVal = cholTrend?.dataPoints.find((p) => p.date === data.date)?.value;
                const vldlVal = trigVal ? (trigVal / 2.2).toFixed(2) : undefined;
                return (
                  <div className="text-slate-300 space-y-0.5">
                    {cholVal !== undefined && (
                      <div>Ukupni: <strong className="text-white">{cholVal} mmol/L</strong></div>
                    )}
                    {hdlVal !== undefined && ldlVal !== undefined && (
                      <div className="text-slate-400">
                        HDL ({hdlVal}) + LDL ({ldlVal}) {vldlVal ? `+ VLDL (${vldlVal})` : ''}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Print chart helper
  const handlePrintChart = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    window.print();
  };

  // Shared inner chart content
  const renderChartCanvas = (heightClass: string) => (
    <div className={`w-full ${heightClass}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 25, right: 25, left: -5, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="chartDate"
            tick={{ fontSize: 10.5, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
            angle={-25}
            textAnchor="end"
            height={45}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
            unit={` ${trend.unit}`}
          />
          {/* Tooltip removed per user request to eliminate popup window */}

          {/* Shaded Reference Corridor between refMin and refMax */}
          {trend.refMin !== null && trend.refMax !== null && (
            <ReferenceArea
              y1={trend.refMin}
              y2={trend.refMax}
              fill="#10b981"
              fillOpacity={0.08}
              stroke="#10b981"
              strokeOpacity={0.25}
              strokeDasharray="4 4"
            />
          )}

          {/* If only refMax exists (e.g. < 5.2) */}
          {trend.refMin === null && trend.refMax !== null && (
            <ReferenceLine
              y={trend.refMax}
              stroke="#10b981"
              strokeDasharray="4 4"
              label={{
                value: `Maks: ${trend.refMax}`,
                fill: '#10b981',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />
          )}

          {/* If only refMin exists */}
          {trend.refMin !== null && trend.refMax === null && (
            <ReferenceLine
              y={trend.refMin}
              stroke="#10b981"
              strokeDasharray="4 4"
              label={{
                value: `Min: ${trend.refMin}`,
                fill: '#10b981',
                fontSize: 10,
                position: 'insideBottomRight',
              }}
            />
          )}

          {/* Primary line for the selected parameter with values directly on points */}
          <Line
            type="monotone"
            dataKey="value"
            name={trend.name}
            stroke="#0d9488"
            strokeWidth={3}
            dot={renderCustomDot}
            activeDot={false}
          />

          {/* Optional second line if comparison parameter selected */}
          {compareTrend && (
            <Line
              type="monotone"
              dataKey="compareValue"
              name={compareTrend.name}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={renderCompareDot}
              activeDot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <>
      {/* =========================================================================
          STANDARD EMBEDDED VIEW (In-page)
         ========================================================================= */}
      <div
        id="trend-chart-container"
        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4 relative group"
      >
        {/* Top Header of Chart */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900">{trend.name}</h3>
              {trend.alias && (
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {trend.alias}
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium border border-teal-100">
                {trend.category}
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
              <span>
                Referentni interval:{' '}
                <strong className="text-slate-700">
                  {trend.refText || `${trend.refMin || 0} - ${trend.refMax || 0}`} {trend.unit}
                </strong>
              </span>
              <span>•</span>
              <span>{trend.dataPoints.length} zabeleženih merenja</span>
            </p>
          </div>

          {/* Actions & Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Latest value & delta */}
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {trend.latestValue}
                </span>
                <span className="text-xs font-semibold text-slate-500">{trend.unit}</span>
              </div>

              {trend.changePercent !== undefined && (
                <div
                  className={`text-[11px] font-semibold flex items-center justify-end gap-1 ${
                    trend.trendMeaning === 'improving'
                      ? 'text-emerald-600'
                      : trend.trendMeaning === 'worsening'
                      ? 'text-rose-600'
                      : 'text-slate-500'
                  }`}
                >
                  {trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
                  {trend.direction === 'down' && <TrendingDown className="w-3 h-3" />}
                  {trend.direction === 'stable' && <Minus className="w-3 h-3" />}
                  <span>
                    {trend.changePercent > 0 ? `+${trend.changePercent}%` : `${trend.changePercent}%`}{' '}
                    u odnosu na pretposlednji
                  </span>
                </div>
              )}
            </div>

            {/* Compare dropdown */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={compareTrendName || ''}
                onChange={(e) => onSelectCompareTrend?.(e.target.value || null)}
                className="text-xs py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 max-w-[140px] sm:max-w-none"
              >
                <option value="">Uporedi sa drugim...</option>
                {allTrends
                  .filter((t) => t.name !== trend.name)
                  .map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.unit})
                    </option>
                  ))}
              </select>
            </div>

            {/* Print & Fullscreen Buttons */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <button
                id="print-chart-btn"
                onClick={handlePrintChart}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1 text-xs font-semibold"
                title="Štampaj grafikon (ili ceo izveštaj)"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Štampaj</span>
              </button>

              {onPrintFullReport && (
                <button
                  id="print-full-report-btn"
                  onClick={onPrintFullReport}
                  className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors flex items-center gap-1 text-xs font-semibold"
                  title="Kompletan štampani izveštaj za ovaj parametar"
                >
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                  <span className="hidden md:inline">Ceo izveštaj</span>
                </button>
              )}

              <button
                id="fullscreen-chart-btn"
                onClick={() => setIsFullscreen(true)}
                className="p-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center gap-1 text-xs font-semibold shadow-xs"
                title="Prikaži grafikon preko celog ekrana"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ceo ekran</span>
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Chart Canvas - clicking opens fullscreen */}
        <div
          onClick={() => setIsFullscreen(true)}
          className="cursor-zoom-in relative rounded-xl hover:bg-slate-50/40 transition-colors"
          title="Kliknite na grafikon za prikaz preko celog ekrana"
        >
          {renderChartCanvas('h-64 sm:h-72')}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg flex items-center gap-1.5 pointer-events-none shadow-sm backdrop-blur-xs">
            <Maximize2 className="w-3 h-3" />
            <span>Kliknite za ceo ekran</span>
          </div>
        </div>

        {/* Legend & Guidance Footer */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>U granicama</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>Povišena vrednost</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Snižena vrednost</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-emerald-100 border border-emerald-300"></span>
              <span>Zelena zona = normalni opseg</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>💡 Savet: Kliknite bilo gde na grafikon za detaljan prikaz preko celog ekrana</span>
          </div>
        </div>

        {/* =========================================================================
            HRONOLOŠKI PREGLED PO MESECIMA (DIREKTNO UGRAĐEN ISPOD GRAFIKONA)
           ========================================================================= */}
        {isLipidParameter && (
          <div className="p-3 sm:p-3.5 rounded-2xl bg-teal-50/90 border border-teal-200/90 text-teal-950 text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-teal-900">
                Medicinsko pravilo lipidnog statusa (Zbir frakcija):
              </p>
              <p className="text-[11px] text-teal-800 leading-relaxed">
                Ukupan holesterol je uvek zbir frakcija: <strong>HDL</strong> ("dobar") + <strong>LDL</strong> ("loš") + <strong>VLDL</strong> (Trigliceridi / 2.2). Zbog toga je Ukupan holesterol uvek veći od pojedinačnih vrednosti LDL i HDL.
              </p>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>Hronološki pregled po mesecima ({chartData.length} {chartData.length === 1 ? 'merenje' : 'merenja'})</span>
            </h4>
            <span className="text-[10px] text-slate-400">
              Hronologija od 2017. do 2025.
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
            {chartData.map((pt, idx) => {
              const isHigh = pt.status === 'high' || pt.status === 'critical';
              const isLow = pt.status === 'low';
              const monthLabel = formatSerbianMonth(pt.date);
              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                    isHigh
                      ? 'bg-rose-50/70 border-rose-200/80 text-rose-950'
                      : isLow
                      ? 'bg-amber-50/70 border-amber-200/80 text-amber-950'
                      : 'bg-slate-50 border-slate-200/80 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 truncate">{monthLabel}</span>
                    {isHigh && (
                      <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-rose-200 text-rose-800 shrink-0">
                        Povišeno
                      </span>
                    )}
                    {isLow && (
                      <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-amber-200 text-amber-800 shrink-0">
                        Sniženo
                      </span>
                    )}
                    {!isHigh && !isLow && (
                      <span className="text-[9px] px-1 py-0.2 rounded font-medium bg-emerald-100 text-emerald-800 shrink-0">
                        Uredno
                      </span>
                    )}
                  </div>

                  <div className="my-1 flex items-baseline gap-1">
                    <span className="text-base font-extrabold text-slate-900">{pt.value}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{trend.unit}</span>
                  </div>

                  {isLipidParameter && (() => {
                    const hdlVal = hdlTrend?.dataPoints.find((p) => p.date === pt.date)?.value;
                    const ldlVal = ldlTrend?.dataPoints.find((p) => p.date === pt.date)?.value;
                    if (hdlVal !== undefined && ldlVal !== undefined) {
                      return (
                        <div className="text-[9px] font-mono text-teal-800 bg-teal-50 px-1 py-0.5 rounded border border-teal-100 my-0.5 truncate">
                          HDL: {hdlVal} • LDL: {ldlVal}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================================================
          FULLSCREEN MODAL VIEW (Preko celog ekrana)
         ========================================================================= */}
      {isFullscreen && (
        <div
          id="fullscreen-chart-modal"
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="bg-white w-full max-w-7xl mx-auto rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[95vh]">
            {/* Fullscreen Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full bg-teal-600 text-white text-xs font-bold uppercase tracking-wider">
                    Prikaz preko celog ekrana
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {trend.name}
                  </h2>
                  {trend.alias && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                      {trend.alias}
                    </span>
                  )}
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-semibold">
                    {trend.category}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1.5">
                  <span>
                    Referentni raspon:{' '}
                    <strong className="text-slate-800">
                      {trend.refText || `${trend.refMin || 0} - ${trend.refMax || 0}`} {trend.unit}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>{trend.dataPoints.length} hronoloških merenja</span>
                  <span>•</span>
                  <span>
                    Najnovija vrednost:{' '}
                    <strong className="text-teal-700 font-bold">
                      {trend.latestValue} {trend.unit}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Fullscreen Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintChart}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200"
                  title="Štampaj grafikon"
                >
                  <Printer className="w-4 h-4 text-slate-700" />
                  <span>Štampaj grafikon</span>
                </button>

                {onPrintFullReport && (
                  <button
                    onClick={() => {
                      setIsFullscreen(false);
                      onPrintFullReport();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Štampaj ceo izveštaj"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Ceo izveštaj za analizu</span>
                  </button>
                )}

                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors ml-1"
                  title="Zatvori ceo ekran (ESC)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Fullscreen Big Chart Area */}
            <div className="p-4 sm:p-8 flex-1 min-h-[380px] sm:min-h-[480px] bg-white">
              {renderChartCanvas('h-[380px] sm:h-[480px]')}
            </div>

            {/* Fullscreen Detailed Data Table of Points */}
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                <span>Hronološki pregled svih pojedinačnih merenja</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {chartData.map((pt, idx) => {
                  const isHigh = pt.status === 'high' || pt.status === 'critical';
                  const isLow = pt.status === 'low';
                  const monthLabel = formatSerbianMonth(pt.date);
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                        isHigh
                          ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                          : isLow
                          ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold">{monthLabel}</span>
                        {isHigh && <span className="text-[10px] text-rose-600 font-bold">Povišeno</span>}
                        {isLow && <span className="text-[10px] text-amber-600 font-bold">Sniženo</span>}
                        {!isHigh && !isLow && <span className="text-[10px] text-emerald-600 font-medium">Uredno</span>}
                      </div>

                      <div className="my-1 flex items-baseline gap-1">
                        <span className="text-base font-extrabold text-slate-900">{pt.value}</span>
                        <span className="text-[10px] text-slate-500">{trend.unit}</span>
                      </div>

                      {isLipidParameter && (() => {
                        const hdlVal = hdlTrend?.dataPoints.find((p) => p.date === pt.date)?.value;
                        const ldlVal = ldlTrend?.dataPoints.find((p) => p.date === pt.date)?.value;
                        if (hdlVal !== undefined && ldlVal !== undefined) {
                          return (
                            <div className="text-[9px] font-mono text-teal-800 bg-teal-50 px-1 py-0.5 rounded border border-teal-100 my-0.5 truncate">
                              HDL: {hdlVal} • LDL: {ldlVal}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div className="text-[10px] text-slate-500 truncate" title={pt.labName}>
                        {pt.labName}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom footer bar */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>Zelena tačka = Uredno</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span>Crvena tačka = Povišeno</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>Žuta tačka = Sniženo</span>
                  </span>
                </div>

                <button
                  onClick={() => setIsFullscreen(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition-colors flex items-center gap-1"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Vrati na uobičajeni prikaz</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
