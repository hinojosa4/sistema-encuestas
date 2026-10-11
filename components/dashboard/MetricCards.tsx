// components/dashboard/MetricCards.tsx
import React from 'react';
import { GraduationCap, Building2 } from 'lucide-react';

interface MetricCardsProps {
    statsAntiguedad: { media: number; desviacionEstandar: number };
    statsDesempleo: { media: number; mediana: number };
    totalTitulados: number;
    totalEmpleadores: number;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
    statsAntiguedad,
    statsDesempleo,
    totalTitulados,
    totalEmpleadores,
}) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Antigüedad Promedio</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-umss-azul mt-1.5">
                    {statsAntiguedad.media} <span className="text-sm font-normal text-slate-500">años</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">Desv. estándar: ±{statsAntiguedad.desviacionEstandar} años</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Desempleo Promedio</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-umss-rojo mt-1.5">
                    {statsDesempleo.media} <span className="text-sm font-normal text-slate-500">meses</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">Mediana: {statsDesempleo.mediana} meses</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Muestra Titulados</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1.5">{totalTitulados}</p>
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                    <GraduationCap className="h-3.5 w-3.5" /> Registros validados
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