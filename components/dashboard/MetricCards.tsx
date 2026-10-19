// components/dashboard/MetricCards.tsx
import React from 'react';
import { GraduationCap, Building2 } from 'lucide-react';

interface MetricCardsProps {
    statsAntiguedad: { media: number; mediana: number; desviacionEstandar: number; total: number };
    statsDesempleo: { media: number; mediana: number; total: number };
    totalTitulados: number;
    totalEmpleadores: number;
    segmentacionAntiguedad?: {
        juniorCount: number;
        juniorPct: number;
        consolidadoCount: number;
        consolidadoPct: number;
    };
}

export const MetricCards: React.FC<MetricCardsProps> = ({
    statsAntiguedad,
    statsDesempleo,
    totalTitulados,
    totalEmpleadores,
    segmentacionAntiguedad,
}) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Media de experiencia profesional (HU 1)</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-umss-azul border border-blue-200">
                            Univariado
                        </span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-umss-azul mt-1.5">
                        {statsAntiguedad.total ? statsAntiguedad.media : '—'} <span className="text-sm font-normal text-slate-500">años</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        Mediana: {statsAntiguedad.total ? statsAntiguedad.mediana : '—'} · Desv. muestral: {statsAntiguedad.total > 1 ? statsAntiguedad.desviacionEstandar : '—'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{statsAntiguedad.total} válidas · {totalTitulados - statsAntiguedad.total} excluidas</p>
                    {!statsAntiguedad.total && <p className="text-xs text-slate-500 mt-1">La media aparecerá cuando haya respuestas válidas de experiencia.</p>}
                </div>
                {segmentacionAntiguedad && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600">
                            Hasta 3 años: <strong className="text-slate-800">{segmentacionAntiguedad.juniorPct}%</strong>
                        </span>
                        <span className="text-slate-600">
                            Más de 3: <strong className="text-slate-800">{segmentacionAntiguedad.consolidadoPct}%</strong>
                        </span>
                    </div>
                )}
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Media de desempleo con unidad resuelta</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-umss-rojo mt-1.5">
                    {statsDesempleo.total ? statsDesempleo.media : '—'} <span className="text-sm font-normal text-slate-500">meses</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">Mediana: {statsDesempleo.total ? statsDesempleo.mediana : '—'} meses</p>
                <p className="text-xs text-slate-500 mt-1">{statsDesempleo.total} válidas · {totalTitulados - statsDesempleo.total} excluidas; unidades ambiguas excluidas.</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Muestra Titulados</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1.5">{totalTitulados}</p>
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                    <GraduationCap className="h-3.5 w-3.5" /> Respuestas disponibles
                </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sector Productivo</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1.5">{totalEmpleadores}</p>
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1 font-medium">
                    <Building2 className="h-3.5 w-3.5" /> Empresas e instituciones
                </p>
            </div>
        </div>
    );
};
