// components/dashboard/TabEmpleadores.tsx
import React from 'react';
import {
    ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import { Award, Building2 } from 'lucide-react';

interface TabEmpleadoresProps {
    radarCompetencias: Array<{ competencia: string; puntaje: number }>;
    radarVinculacion: Array<{ criterio: string; valor: number }>;
    totalEmpleadores?: number;
}

export const TabEmpleadores: React.FC<TabEmpleadoresProps> = ({
    radarCompetencias,
    radarVinculacion,
    totalEmpleadores = 0,
}) => {
    const tieneDatosCompetencias = totalEmpleadores > 0 && radarCompetencias.some((r) => r.puntaje > 0);
    const tieneDatosVinculacion = totalEmpleadores > 0 && radarVinculacion.some((r) => r.valor > 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* HU 4: Competencias Profesionales */}
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                    <h3 className="font-bold text-slate-800 text-base sm:text-lg mb-1">
                        Evaluación de Competencias Profesionales (HU 4)
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                        Puntaje medio transformado a 1–5 desde tres categorías de acuerdo. No sabe se conserva y se excluye del promedio.
                    </p>
                </div>

                {tieneDatosCompetencias ? (
                    <div className="h-72 sm:h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarCompetencias}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="competencia" fontSize={10} stroke="#475569" />
                                <PolarRadiusAxis angle={30} domain={[0, 5]} fontSize={10} stroke="#94a3b8" />
                                <Radar name="Puntaje Medio" dataKey="puntaje" stroke="#E30613" fill="#E30613" fillOpacity={0.4} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-72 sm:h-80 flex flex-col items-center justify-center text-slate-400 p-6 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                        <Award className="h-10 w-10 text-slate-300 mb-2" />
                        <p className="text-xs sm:text-sm font-semibold text-slate-600">
                            No se registran datos para graficar competencias
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                            Importe las respuestas de la Encuesta a Empleadores para generar la evaluación de competencias.
                        </p>
                    </div>
                )}
            </div>

            {/* Criterio ARCUSUR: Vinculación con el Entorno */}
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                    <h3 className="font-bold text-slate-800 text-base sm:text-lg mb-1">
                        Vinculación y Alianzas Estratégicas (ARCUSUR)
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                        Percepción empresarial sobre convenios, pasantías y retroalimentación curricular.
                    </p>
                </div>

                {tieneDatosVinculacion ? (
                    <div className="h-72 sm:h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarVinculacion}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="criterio" fontSize={10} stroke="#475569" />
                                <PolarRadiusAxis angle={30} domain={[0, 5]} fontSize={10} stroke="#94a3b8" />
                                <Radar name="Nivel de Vinculación" dataKey="valor" stroke="#003770" fill="#003770" fillOpacity={0.35} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-72 sm:h-80 flex flex-col items-center justify-center text-slate-400 p-6 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                        <Building2 className="h-10 w-10 text-slate-300 mb-2" />
                        <p className="text-xs sm:text-sm font-semibold text-slate-600">
                            No se registran datos de vinculación institucional
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                            Importe las respuestas para evaluar convenios, pasantías y relación con organizaciones.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
