import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  HelpCircle,
  RefreshCw,
  FileText,
  Stethoscope,
} from 'lucide-react';
import { HealthTrendSummary, LabReport, ParameterTrend } from '../types';

interface AiInsightsPanelProps {
  reports: LabReport[];
  trends: ParameterTrend[];
  initialSummary?: HealthTrendSummary | null;
}

export const AiInsightsPanel: React.FC<AiInsightsPanelProps> = ({
  reports,
  trends,
  initialSummary,
}) => {
  const [summary, setSummary] = useState<HealthTrendSummary | null>(initialSummary || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSummary = async () => {
    if (reports.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const payloadTrends = trends.map((t) => ({
        name: t.name,
        alias: t.alias,
        category: t.category,
        unit: t.unit,
        latestValue: t.latestValue,
        latestStatus: t.latestStatus,
        previousValue: t.previousValue,
        changePercent: t.changePercent,
        direction: t.direction,
        trendMeaning: t.trendMeaning,
        refMin: t.refMin,
        refMax: t.refMax,
        refText: t.refText,
        history: t.dataPoints.map((dp) => ({
          date: dp.date,
          value: dp.value,
          status: dp.status,
          labName: dp.labName,
        })),
      }));

      const res = await fetch('/api/generate-trend-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reports: reports.map((r) => ({
            id: r.id,
            date: r.date,
            laboratoryName: r.laboratoryName,
          })),
          trends: payloadTrends,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.summary) {
        throw new Error(data.error || 'Neuspešno generisanje AI analize trendova.');
      }

      setSummary(data.summary);
    } catch (err: any) {
      console.error('Error generating AI trends summary:', err);
      setError(err.message || 'Došlo je do greške pri komunikaciji sa Gemini AI servisom.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                AI Klinički Sažetak & Interpretacija Trendova
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-teal-600" />
                <span>Deep Thinking</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Duboka medicinska sinteza kretanja laboratorijskih parametara kroz sve nalaze
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerateSummary}
          disabled={loading || reports.length === 0}
          className="flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-2xs disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Gemini analizira trendove...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{summary ? 'Osveži AI Analizu' : 'Generiši AI Analizu Trendova'}</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {!summary && !loading ? (
        <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
          <Sparkles className="w-6 h-6 mx-auto text-teal-600" />
          <p className="text-xs font-semibold text-slate-700">
            Automatska interpretacija kretanja laboratorijskih parametara
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Kliknite na dugme iznad kako bi Gemini 3.8 Flash model analizirao hronologiju Vaših
            nalaza i generisao izveštaj o poboljšanjima, rizicima i preporukama za lekara.
          </p>
        </div>
      ) : summary ? (
        <div className="space-y-4 text-xs sm:text-sm">
          {/* Overall assessment */}
          <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-950">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900 mb-1 flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-teal-700" />
              Glavna ocena zdravstvenog toka
            </h4>
            <p className="text-xs text-teal-900 leading-relaxed">{summary.overallAssessment}</p>
          </div>

          {/* Two columns: Improvements vs Risks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Key improvements */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Ključna poboljšanja parametara
              </h4>
              <ul className="space-y-1.5 text-xs text-emerald-950">
                {summary.keyImprovements.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Key risks / alerts */}
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
              <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Parametri pod nadzorom
              </h4>
              <ul className="space-y-1.5 text-xs text-amber-950">
                {summary.keyRisksOrAlerts.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Organ Systems breakdown */}
          {summary.systemTrends && summary.systemTrends.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-800">
                Pregled po organskim sistemima
              </div>
              <div className="divide-y divide-slate-100">
                {summary.systemTrends.map((st, idx) => (
                  <div key={idx} className="p-3 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{st.system}: </span>
                      <span className="text-slate-600">{st.description}</span>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        st.status === 'good'
                          ? 'bg-emerald-100 text-emerald-800'
                          : st.status === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {st.status === 'good' ? 'Povoljno' : st.status === 'warning' ? 'Oprez' : 'Stabilno'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Questions for doctor */}
          {summary.questionsForDoctor && summary.questionsForDoctor.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                Preporučena pitanja za Vašeg izabranog lekara
              </h4>
              <ul className="space-y-1 text-xs text-slate-600">
                {summary.questionsForDoctor.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-semibold text-slate-400">{idx + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-[11px] text-slate-400 italic pt-1 text-right">
            *Ova analiza je generisana veštačkom inteligencijom i služi u informativne svrhe. Uvek se
            konsultujte sa Vašim lekarom.
          </div>
        </div>
      ) : null}
    </div>
  );
};
