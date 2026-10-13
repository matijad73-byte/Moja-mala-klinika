import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { ParameterTrend } from '../types';

interface ParameterCardProps {
  trend: ParameterTrend;
  isSelected: boolean;
  onSelect: () => void;
}

export const ParameterCard: React.FC<ParameterCardProps> = ({
  trend,
  isSelected,
  onSelect,
}) => {
  const isAbnormal = trend.latestStatus !== 'normal';

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl p-4 border transition-all cursor-pointer relative ${
        isSelected
          ? 'bg-teal-50/50 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
      }`}
    >
      {/* Top row: Name, alias, and category */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {trend.name}
            </h4>
            {trend.alias && (
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                {trend.alias}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{trend.category}</p>
        </div>

        {/* Status Pill */}
        <span
          className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
            trend.latestStatus === 'high' || trend.latestStatus === 'critical'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : trend.latestStatus === 'low'
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {trend.latestStatus === 'normal' && <CheckCircle2 className="w-2.5 h-2.5" />}
          {trend.latestStatus !== 'normal' && <AlertCircle className="w-2.5 h-2.5" />}
          <span>
            {trend.latestStatus === 'high'
              ? 'Povišeno'
              : trend.latestStatus === 'low'
              ? 'Sniženo'
              : 'U granicama'}
          </span>
        </span>
      </div>

      {/* Middle row: Big Value + Unit */}
      <div className="mt-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-xl sm:text-2xl font-black tracking-tight ${
              isAbnormal ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {trend.latestValue !== null ? trend.latestValue : '—'}
          </span>
          <span className="text-xs font-semibold text-slate-500">{trend.unit}</span>
        </div>

        {/* Trend Indicator badge */}
        {trend.changePercent !== undefined ? (
          <div
            className={`text-xs font-semibold flex items-center gap-0.5 ${
              trend.trendMeaning === 'improving'
                ? 'text-emerald-600'
                : trend.trendMeaning === 'worsening'
                ? 'text-rose-600'
                : 'text-slate-500'
            }`}
            title={`Promena u odnosu na prethodni nalaz: ${trend.changePercent}% (${trend.trendMeaning === 'improving' ? 'Povoljan trend' : trend.trendMeaning === 'worsening' ? 'Odstupanje' : 'Stabilno'})`}
          >
            {trend.direction === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
            {trend.direction === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
            {trend.direction === 'stable' && <Minus className="w-3.5 h-3.5" />}
            <span>
              {trend.changePercent > 0 ? `+${trend.changePercent}%` : `${trend.changePercent}%`}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">1 merenje</span>
        )}
      </div>

      {/* Bottom row: Ref interval & data points count */}
      <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="truncate">
          Ref: <strong className="text-slate-700">{trend.refText || `${trend.refMin || 0} - ${trend.refMax || 0}`}</strong>
        </span>
        <span className="flex items-center text-teal-700 font-medium group-hover:underline">
          Grafik <ChevronRight className="w-3 h-3 ml-0.5" />
        </span>
      </div>
    </div>
  );
};
