// components/dashboard/TabTitulados.tsx
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface TabTituladosProps {
    areasInteres: Array<{ nombre: string; cantidad: number; porcentaje: number }>;
}

export const TabTitulados: React.FC<TabTituladosProps> = ({ areasInteres }) => {
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
            </div>

            {/* Indicadores de Inserción */}
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                    <h3 className="font-bold text-slate-800 text-base sm:text-lg mb-1">
                        Perfil de Empleabilidad e Inserción
                    </h3>
                    <p className="text-xs text-slate-500 mb-6">
                        Métricas de absorción laboral temprana y perfil emprendedor.
                    </p>

                    <div className="space-y-4 text-sm">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="font-semibold text-slate-700 block">Tasa de Inserción Laboral Temprana (&lt; 4 meses):</span>
                            <span className="text-2xl sm:text-3xl font-bold text-emerald-600">80%</span>
                            <p className="text-xs text-slate-500 mt-1">
                                Egresados que se incorporan al mercado profesional durante el primer cuatrimestre posterior a la conclusión de estudios.
                            </p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="font-semibold text-slate-700 block">Iniciativa Empresarial y Startups:</span>
                            <span className="text-2xl sm:text-3xl font-bold text-umss-azul">10%</span>
                            <p className="text-xs text-slate-500 mt-1">
                                Profesionales dedicados a emprendimientos propios de base tecnológica o unidades Spin-Off.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};