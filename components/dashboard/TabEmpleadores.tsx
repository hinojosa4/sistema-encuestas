// components/dashboard/TabEmpleadores.tsx
import React from 'react';
import {
    ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';

interface TabEmpleadoresProps {
    radarCompetencias: Array<{ competencia: string; puntaje: number }>;
    radarVinculacion: Array<{ criterio: string; valor: number }>;
}

export const TabEmpleadores: React.FC<TabEmpleadoresProps> = ({
    radarCompetencias,
    radarVinculacion,
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* HU 4: Competencias Profesionales */}
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 text-base sm:text-lg mb-1">
                    Evaluación de Competencias Profesionales (HU 4)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                    Puntaje medio asignado por el sector empleador en escala Likert (1 a 5).
                </p>
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
            </div>

            {/* Criterio ARCUSUR: Vinculación con el Entorno */}
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 text-base sm:text-lg mb-1">
                    Vinculación y Alianzas Estratégicas (ARCUSUR)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                    Percepción empresarial sobre convenios, pasantías y retroalimentación curricular.
                </p>
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
            </div>
        </div>
    );
};