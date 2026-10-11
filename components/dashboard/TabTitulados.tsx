// components/dashboard/TabTitulados.tsx
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface TabTituladosProps {
    areasInteres: Array<{ nombre: string; cantidad: number; porcentaje: number }>;
    titulados?: any[];
}

export const TabTitulados: React.FC<TabTituladosProps> = ({ areasInteres, titulados = [] }) => {
    // 1. Cálculo dinámico de Inserción Laboral Temprana (< 4 meses)
    // Lee tiempo_conseguir_primer_empleo o es_primer_empleo indistintamente
    const tituladosConEmpleo = titulados.filter((t) => t.tiempo_conseguir_primer_empleo || t.es_primer_empleo);
    const insercionTemprana = tituladosConEmpleo.filter((t) => {
        const tiempo = String(t.tiempo_conseguir_primer_empleo || t.es_primer_empleo || '').toLowerCase();
        return (
            tiempo.includes('antes de titularse') ||
            tiempo.includes('menos de 1 mes') ||
            tiempo.includes('1 - 4 meses') ||
            tiempo.includes('1-4 meses')
        );
    }).length;

    const porcentajeInsercion =
        tituladosConEmpleo.length > 0
            ? Math.round((insercionTemprana / tituladosConEmpleo.length) * 100)
            : 0;

    // 2. Cálculo dinámico de Emprendimientos / Startups
    const emprendedores = titulados.filter((t) => {
        const situacion = String(t.situacion_laboral_actual || '').toLowerCase();
        return situacion.includes('emprendimiento') || t.origen_emprendimiento;
    }).length;

    const porcentajeEmprendimiento =
        titulados.length > 0
            ? Math.round((emprendedores / titulados.length) * 100)
            : 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* HU 2: Áreas de Mayor Demanda */}
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 text-base sm:text-lg mb-1">
                    Áreas Tecnológicas Prioritarias (HU 2)
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                    Distribución de demandas de formación continua entre los egresados de Sistemas.
                </p>

                {areasInteres.length > 0 ? (
                    <div className="h-72 sm:h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={areasInteres} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                                <XAxis
                                    dataKey="nombre"
                                    fontSize={10}
                                    stroke="#64748b"
                                    interval={0}
                                    angle={-25}
                                    textAnchor="end"
                                />
                                <YAxis fontSize={11} stroke="#64748b" allowDecimals={false} />
                                <Tooltip
                                    formatter={(val: any) => [`${val} profesionales`, 'Demanda']}
                                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                />
                                <Bar dataKey="cantidad" fill="#003770" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-64 flex items-center justify-center text-xs text-slate-400 italic">
                        No se registran datos para graficar las áreas prioritarias.
                    </div>
                )}
            </div>

            {/* Indicadores Dinámicos de Inserción */}
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                    <h3 className="font-bold text-slate-800 text-base sm:text-lg mb-1">
                        Perfil de Empleabilidad e Inserción
                    </h3>
                    <p className="text-xs text-slate-500 mb-6">
                        Métricas de absorción laboral temprana y perfil emprendedor calculadas sobre la muestra actual.
                    </p>

                    <div className="space-y-4 text-sm">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="font-semibold text-slate-700 block">
                                Tasa de Inserción Laboral Temprana (&lt; 4 meses):
                            </span>
                            <span className="text-2xl sm:text-3xl font-bold text-emerald-600">
                                {porcentajeInsercion}%
                            </span>
                            <p className="text-xs text-slate-500 mt-1">
                                {insercionTemprana} de {tituladosConEmpleo.length} profesionales se incorporaron al mercado laboral antes de titularse o en menos de 4 meses.
                            </p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="font-semibold text-slate-700 block">
                                Iniciativa Empresarial y Startups:
                            </span>
                            <span className="text-2xl sm:text-3xl font-bold text-umss-azul">
                                {porcentajeEmprendimiento}%
                            </span>
                            <p className="text-xs text-slate-500 mt-1">
                                {emprendedores} de {titulados.length} titulados lideran emprendimientos de base tecnológica o unidades Spin-Off.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};