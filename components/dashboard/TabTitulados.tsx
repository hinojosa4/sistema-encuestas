// components/dashboard/TabTitulados.tsx
import React, { useState } from 'react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
    Cell, PieChart, Pie, Legend
} from 'recharts';
import { AlertTriangle, GraduationCap, Briefcase, TableProperties } from 'lucide-react';

type FreqItem = { nombre: string; cantidad: number; porcentaje: number };

interface TabTituladosProps {
    areasInteres: FreqItem[];
    nivelesPosgrado: FreqItem[];
    distribucionSituacionLaboral: FreqItem[];
    titulados?: any[];
}

// Colores institucionales UMSS + paleta complementaria
const COLORES_BARRAS = ['#003770', '#E30613', '#1a5a9e', '#c41010', '#2a7abf', '#e84a4a', '#0e3d6e', '#b50000'];
const COLORES_PIE = ['#003770', '#E30613', '#2a7abf', '#f59e0b', '#10b981', '#8b5cf6', '#f97316'];

// Colores de la barra de progreso según la concentración
function getBgConcentracion(pct: number) {
    if (pct >= 70) return 'bg-red-500';
    if (pct >= 50) return 'bg-amber-500';
    return 'bg-emerald-500';
}

function getBadgeConcentracion(pct: number) {
    if (pct >= 70) return 'bg-red-50 text-red-700 border-red-200';
    if (pct >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

export const TabTitulados: React.FC<TabTituladosProps> = ({
    areasInteres,
    nivelesPosgrado,
    distribucionSituacionLaboral,
    titulados = [],
}) => {
    const [mostrarTabla, setMostrarTabla] = useState(false);

    // --- Métricas de inserción laboral ---
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

    const emprendedores = titulados.filter((t) => {
        const situacion = String(t.situacion_laboral_actual || '').toLowerCase();
        return situacion.includes('emprendimiento') || t.origen_emprendimiento;
    }).length;

    const porcentajeEmprendimiento =
        titulados.length > 0 ? Math.round((emprendedores / titulados.length) * 100) : 0;

    // --- Concentración crítica de áreas (top 2 vs total) ---
    const areasOrdenadas = [...areasInteres].sort((a, b) => b.cantidad - a.cantidad);
    const top2Pct =
        areasOrdenadas.length >= 2
            ? areasOrdenadas[0].porcentaje + areasOrdenadas[1].porcentaje
            : areasOrdenadas[0]?.porcentaje ?? 0;
    const hayConcentracionCritica = top2Pct >= 70;

    // --- Tabla de frecuencias acumulada ---
    let acumulado = 0;
    const tablaFrecuencias = areasOrdenadas.map((item) => {
        acumulado += item.porcentaje;
        return { ...item, acumulado: Number(acumulado.toFixed(1)) };
    });

    return (
        <div className="space-y-6">

            {/* SECCIÓN 1: Alerta de concentración crítica (solo si hay datos) */}
            {areasInteres.length > 0 && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${hayConcentracionCritica
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                    <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${hayConcentracionCritica ? 'text-red-500' : 'text-emerald-500'}`} />
                    <div>
                        <p className="font-bold">
                            {hayConcentracionCritica
                                ? `⚠️ Concentración Crítica detectada: Top 2 áreas agrupan el ${top2Pct.toFixed(1)}% de preferencias`
                                : `Distribución equilibrada: Top 2 áreas representan el ${top2Pct.toFixed(1)}% de preferencias`}
                        </p>
                        <p className="text-xs mt-0.5 opacity-80">
                            {hayConcentracionCritica
                                ? `Se justifica técnica y financieramente la apertura de programas modulares en "${areasOrdenadas[0]?.nombre}" y "${areasOrdenadas[1]?.nombre || areasOrdenadas[0]?.nombre}".`
                                : 'La demanda está distribuida entre múltiples áreas. Se recomienda una oferta académica diversificada.'}
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* SECCIÓN 2: Gráfico de áreas de interés */}
                <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                            Áreas Tecnológicas Prioritarias (HU 2)
                        </h3>
                        {areasInteres.length > 0 && (
                            <button
                                onClick={() => setMostrarTabla(!mostrarTabla)}
                                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-umss-azul hover:text-umss-rojo transition-colors border border-slate-200 px-2.5 py-1 rounded-lg"
                            >
                                <TableProperties className="h-3.5 w-3.5" />
                                {mostrarTabla ? 'Ver gráfico' : 'Ver tabla'}
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mb-4">
                        Distribución de preferencias de formación continua según área temática declarada.
                    </p>

                    {areasInteres.length > 0 ? (
                        mostrarTabla ? (
                            /* TABLA DE FRECUENCIAS */
                            <div className="overflow-x-auto flex-1">
                                <table className="min-w-full text-xs divide-y divide-slate-200">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Área de Interés</th>
                                            <th className="px-3 py-2 text-center">n</th>
                                            <th className="px-3 py-2 text-center">%</th>
                                            <th className="px-3 py-2 text-center">% Acumulado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {tablaFrecuencias.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="px-3 py-2 font-medium text-slate-700">{row.nombre}</td>
                                                <td className="px-3 py-2 text-center font-mono">{row.cantidad}</td>
                                                <td className="px-3 py-2 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getBadgeConcentracion(row.acumulado)}`}>
                                                        {row.porcentaje}%
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                                            <div
                                                                className={`h-1.5 rounded-full ${getBgConcentracion(row.acumulado)}`}
                                                                style={{ width: `${Math.min(row.acumulado, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="font-mono text-slate-500 w-10 text-right">{row.acumulado}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            /* GRÁFICO DE BARRAS */
                            <div className="h-72 sm:h-80 w-full flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={areasOrdenadas} margin={{ top: 10, right: 10, left: -20, bottom: 50 }}>
                                        <XAxis
                                            dataKey="nombre"
                                            fontSize={9}
                                            stroke="#64748b"
                                            interval={0}
                                            angle={-30}
                                            textAnchor="end"
                                        />
                                        <YAxis fontSize={11} stroke="#64748b" allowDecimals={false} />
                                        <Tooltip
                                            formatter={(val: any, _name: any, props: any) => [
                                                `${val} titulados (${props.payload?.porcentaje ?? 0}%)`,
                                                'Demanda'
                                            ]}
                                            contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                        />
                                        {areasOrdenadas.map((_, idx) => (
                                            <Cell key={idx} fill={COLORES_BARRAS[idx % COLORES_BARRAS.length]} />
                                        ))}
                                        <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                                            {areasOrdenadas.map((_, idx) => (
                                                <Cell key={idx} fill={COLORES_BARRAS[idx % COLORES_BARRAS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                            <GraduationCap className="h-10 w-10 text-slate-300 mb-2" />
                            <p className="text-xs sm:text-sm font-semibold text-slate-600">No se registran áreas de interés</p>
                            <p className="text-[11px] text-slate-400 mt-1 text-center max-w-xs px-4">
                                Importe las respuestas de la encuesta a titulados para generar este indicador.
                            </p>
                        </div>
                    )}
                </div>

                {/* SECCIÓN 3: Niveles de Posgrado demandados */}
                <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="font-bold text-slate-800 text-base sm:text-lg mb-1">
                        Nivel de Formación Avanzada Demandada
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                        Tipo de posgrado de mayor preferencia entre titulados: Maestría, Especialidad, Doctorado.
                    </p>

                    {nivelesPosgrado.length > 0 ? (
                        <div className="h-72 sm:h-80 flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={nivelesPosgrado}
                                        dataKey="cantidad"
                                        nameKey="nombre"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label={({ nombre, porcentaje }: any) => `${nombre ? nombre.split(' ')[0] : ''} ${porcentaje}%`}
                                        labelLine={true}
                                    >
                                        {nivelesPosgrado.map((_, idx) => (
                                            <Cell key={idx} fill={COLORES_PIE[idx % COLORES_PIE.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(val: any, name: any, props: any) => [
                                            `${val} titulados (${props.payload?.porcentaje ?? 0}%)`,
                                            props.payload?.nombre
                                        ]}
                                        contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                    />
                                    <Legend
                                        formatter={(value) => <span style={{ fontSize: '11px' }}>{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                            <GraduationCap className="h-10 w-10 text-slate-300 mb-2" />
                            <p className="text-xs sm:text-sm font-semibold text-slate-600">No se registran datos de nivel de posgrado</p>
                            <p className="text-[11px] text-slate-400 mt-1 text-center max-w-xs px-4">
                                Este gráfico mostrará la demanda por Maestría, Especialidad y Doctorado.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* SECCIÓN 4: Situación Laboral + Métricas de Inserción */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Situación laboral actual */}
                <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="font-bold text-slate-800 text-base sm:text-lg mb-1">
                        Situación Laboral Actual
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                        Distribución de titulados según condición de empleo, emprendimiento o desempleo.
                    </p>

                    {distribucionSituacionLaboral.length > 0 ? (
                        <div className="space-y-2 flex-1">
                            {distribucionSituacionLaboral
                                .sort((a, b) => b.cantidad - a.cantidad)
                                .map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <span
                                            className="text-[11px] sm:text-xs text-slate-600 w-40 sm:w-48 truncate flex-shrink-0"
                                            title={item.nombre}
                                        >
                                            {item.nombre}
                                        </span>
                                        <div className="flex-1 bg-slate-100 rounded-full h-3 min-w-0">
                                            <div
                                                className="h-3 rounded-full transition-all"
                                                style={{
                                                    width: `${item.porcentaje}%`,
                                                    backgroundColor: COLORES_BARRAS[idx % COLORES_BARRAS.length],
                                                }}
                                            />
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-700 w-16 text-right flex-shrink-0">
                                            {item.cantidad} ({item.porcentaje}%)
                                        </span>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <div className="h-40 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                            <Briefcase className="h-8 w-8 text-slate-300 mb-2" />
                            <p className="text-xs text-slate-500">No hay datos de situación laboral</p>
                        </div>
                    )}
                </div>

                {/* Indicadores de inserción y emprendimiento */}
                <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800 text-base sm:text-lg mb-1">
                            Perfil de Empleabilidad e Inserción
                        </h3>
                        <p className="text-xs text-slate-500 mb-5">
                            Métricas de absorción laboral temprana y perfil emprendedor calculadas sobre la muestra.
                        </p>

                        <div className="space-y-4">
                            {/* Inserción temprana */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-start justify-between mb-2">
                                    <span className="font-semibold text-slate-700 text-xs sm:text-sm">
                                        Tasa de Inserción Laboral Temprana (&lt; 4 meses)
                                    </span>
                                    <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 leading-none">
                                        {porcentajeInsercion}%
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 mb-1.5">
                                    <div
                                        className="bg-emerald-500 h-2 rounded-full transition-all"
                                        style={{ width: `${porcentajeInsercion}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    {insercionTemprana} de {tituladosConEmpleo.length} profesionales se incorporaron antes de titularse o en menos de 4 meses.
                                </p>
                            </div>

                            {/* Emprendimiento */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-start justify-between mb-2">
                                    <span className="font-semibold text-slate-700 text-xs sm:text-sm">
                                        Iniciativa Empresarial y Startups
                                    </span>
                                    <span className="text-2xl sm:text-3xl font-extrabold text-umss-azul leading-none">
                                        {porcentajeEmprendimiento}%
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 mb-1.5">
                                    <div
                                        className="bg-umss-azul h-2 rounded-full transition-all"
                                        style={{ width: `${porcentajeEmprendimiento}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    {emprendedores} de {titulados.length} titulados lideran emprendimientos de base tecnológica o Spin-Off.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};