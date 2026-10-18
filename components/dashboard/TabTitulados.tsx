// components/dashboard/TabTitulados.tsx
import React, { useState } from 'react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
    Cell, PieChart, Pie
} from 'recharts';
import { AlertTriangle, GraduationCap, Briefcase, TableProperties, Users, Building } from 'lucide-react';

type FreqItem = { nombre: string; cantidad: number; porcentaje: number };

interface TabTituladosProps {
    areasInteres: FreqItem[];
    nivelesPosgrado: FreqItem[];
    distribucionSituacionLaboral: FreqItem[];
    distribucionSectoresTitulados?: FreqItem[];
    segmentacionAntiguedad?: {
        juniorCount: number;
        juniorPct: number;
        consolidadoCount: number;
        consolidadoPct: number;
    };
    titulados?: any[];
}

// Paleta institucional UMSS
const COLORES_BARRAS = ['#003770', '#E30613', '#1a5a9e', '#c41010', '#2a7abf', '#e84a4a', '#0e3d6e', '#b50000'];
const COLORES_DONUT = ['#003770', '#E30613', '#2a7abf', '#f59e0b', '#10b981', '#8b5cf6'];

export const TabTitulados: React.FC<TabTituladosProps> = ({
    areasInteres,
    nivelesPosgrado,
    distribucionSituacionLaboral,
    distribucionSectoresTitulados = [],
    segmentacionAntiguedad,
    titulados = [],
}) => {
    const [mostrarTabla, setMostrarTabla] = useState(false);

    // --- Métricas de inserción laboral (HU 1) ---
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

    // --- Concentración crítica de áreas (HU 2: umbral 70% en Top 2) ---
    const areasOrdenadas = [...areasInteres].sort((a, b) => b.cantidad - a.cantidad);
    const top2Pct =
        areasOrdenadas.length >= 2
            ? areasOrdenadas[0].porcentaje + areasOrdenadas[1].porcentaje
            : areasOrdenadas[0]?.porcentaje ?? 0;
    const hayConcentracionCritica = top2Pct >= 70;

    // --- Tabla de frecuencias acumulada con fila de Total ---
    let acumulado = 0;
    const tablaFrecuencias = areasOrdenadas.map((item) => {
        acumulado += item.porcentaje;
        return { ...item, acumulado: Number(Math.min(acumulado, 100).toFixed(1)) };
    });
    const totalCantidadAreas = areasOrdenadas.reduce((acc, curr) => acc + curr.cantidad, 0);

    // Ordenar niveles de posgrado
    const nivelesOrdenados = [...nivelesPosgrado].sort((a, b) => b.cantidad - a.cantidad);
    const totalPosgrados = nivelesOrdenados.reduce((acc, curr) => acc + curr.cantidad, 0);

    return (
        <div className="space-y-6">

            {/* SECCIÓN 1: Alerta de concentración crítica (HU 2) */}
            {areasInteres.length > 0 && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${hayConcentracionCritica
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                    <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${hayConcentracionCritica ? 'text-red-500' : 'text-emerald-500'}`} />
                    <div>
                        <p className="font-bold">
                            {hayConcentracionCritica
                                ? `⚠️ Concentración Crítica de Demanda: Top 2 áreas agrupan el ${top2Pct.toFixed(1)}% de preferencias`
                                : `Distribución equilibrada: Top 2 áreas representan el ${top2Pct.toFixed(1)}% de preferencias`}
                        </p>
                        <p className="text-xs mt-0.5 opacity-80">
                            {hayConcentracionCritica
                                ? `Se justifica técnica y financieramente la apertura de programas de posgrado prioritarios en "${areasOrdenadas[0]?.nombre}" y "${areasOrdenadas[1]?.nombre || areasOrdenadas[0]?.nombre}".`
                                : 'La demanda está diversificada entre múltiples disciplinas tecnológicas. Se aconseja una oferta modular balanceada.'}
                        </p>
                    </div>
                </div>
            )}

            {/* FILA 1: HU 2 (Áreas Prioritarias y Nivel de Formación Avanzada) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* TARJETA 1: Áreas de Interés con alternancia Tabla / Gráfico */}
                <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                                Áreas Tecnológicas Prioritarias (HU 2)
                            </h3>
                            {areasInteres.length > 0 && (
                                <button
                                    onClick={() => setMostrarTabla(!mostrarTabla)}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-umss-azul hover:text-umss-rojo transition-colors border border-slate-200 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100"
                                >
                                    <TableProperties className="h-3.5 w-3.5" />
                                    {mostrarTabla ? 'Ver gráfico' : 'Ver tabla'}
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mb-4">
                            Distribución de frecuencias de formación continua requerida por los titulados.
                        </p>
                    </div>

                    {areasInteres.length > 0 ? (
                        mostrarTabla ? (
                            /* TABLA DE FRECUENCIAS */
                            <div className="overflow-x-auto flex-1">
                                <table className="min-w-full text-xs divide-y divide-slate-200 border border-slate-100 rounded-lg">
                                    <thead className="bg-slate-50 text-slate-700 font-bold">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Área de Interés</th>
                                            <th className="px-3 py-2 text-center">n</th>
                                            <th className="px-3 py-2 text-center">%</th>
                                            <th className="px-3 py-2 text-left">% Acumulado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100 font-sans">
                                        {tablaFrecuencias.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-3 py-2 font-medium text-slate-800">{row.nombre}</td>
                                                <td className="px-3 py-2 text-center font-mono font-semibold text-slate-700">{row.cantidad}</td>
                                                <td className="px-3 py-2 text-center">
                                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-umss-azul border border-blue-100">
                                                        {row.porcentaje}%
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-[120px]">
                                                            <div
                                                                className={`h-1.5 rounded-full ${row.acumulado >= 70 ? 'bg-amber-500' : 'bg-umss-azul'}`}
                                                                style={{ width: `${Math.min(row.acumulado, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="font-mono text-slate-600 font-medium w-12 text-right">
                                                            {row.acumulado}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-200">
                                        <tr>
                                            <td className="px-3 py-2">Total general</td>
                                            <td className="px-3 py-2 text-center font-mono">{totalCantidadAreas}</td>
                                            <td className="px-3 py-2 text-center">100.0%</td>
                                            <td className="px-3 py-2 font-mono text-slate-500">—</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            /* GRÁFICO DE BARRAS */
                            <div className="h-72 sm:h-80 w-full flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={areasOrdenadas} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
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
                                            formatter={(val: any, _name: any, props: any) => [
                                                `${val} titulados (${props.payload?.porcentaje ?? 0}%)`,
                                                'Demanda'
                                            ]}
                                            contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                        />
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
                        </div>
                    )}
                </div>

                {/* TARJETA 2: Nivel de Formación Avanzada (Donut Limpio + Desglose sin solapamientos) */}
                <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800 text-base sm:text-lg mb-1">
                            Nivel de Formación Avanzada Demandada
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Preferencia formativa declarada: Maestría, Especialidad, Doctorado, Diplomado.
                        </p>
                    </div>

                    {nivelesOrdenados.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center flex-1">
                            {/* Gráfico Donut compacto sin labels externos flotantes */}
                            <div className="h-56 sm:h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={nivelesOrdenados}
                                            dataKey="cantidad"
                                            nameKey="nombre"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={52}
                                            outerRadius={80}
                                            paddingAngle={3}
                                        >
                                            {nivelesOrdenados.map((_, idx) => (
                                                <Cell key={idx} fill={COLORES_DONUT[idx % COLORES_DONUT.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(val: any, _name: any, props: any) => [
                                                `${val} titulados (${props.payload?.porcentaje ?? 0}%)`,
                                                props.payload?.nombre
                                            ]}
                                            contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Desglose Lateral Limpio y Responsive */}
                            <div className="space-y-2.5">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                    Total Respuestas: {totalPosgrados}
                                </p>
                                {nivelesOrdenados.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: COLORES_DONUT[idx % COLORES_DONUT.length] }}
                                            />
                                            <span className="font-semibold text-slate-700 truncate">
                                                {item.nombre}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="font-mono font-bold text-slate-800">{item.cantidad}</span>
                                            <span className="font-mono text-slate-500 text-[11px]">({item.porcentaje}%)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                            <GraduationCap className="h-10 w-10 text-slate-300 mb-2" />
                            <p className="text-xs sm:text-sm font-semibold text-slate-600">No se registran datos de posgrado</p>
                        </div>
                    )}
                </div>
            </div>

            {/* FILA 2: HU 1 - Empleabilidad, Situación Laboral y Sectores de Desempeño */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Situación laboral actual con nombres limpios y sin texto cortado */}
                <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                                Situación Laboral Actual (HU 1)
                            </h3>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Ocupación
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">
                            Condición ocupacional declarada por la cohorte de profesionales egresados.
                        </p>
                    </div>

                    {distribucionSituacionLaboral.length > 0 ? (
                        <div className="space-y-4 flex-1">
                            {distribucionSituacionLaboral
                                .sort((a, b) => b.cantidad - a.cantidad)
                                .map((item, idx) => (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                                <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                                                {item.nombre}
                                            </span>
                                            <span className="font-mono font-bold text-slate-800">
                                                {item.cantidad} <span className="text-slate-400 font-normal">({item.porcentaje}%)</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                            <div
                                                className="h-2.5 rounded-full transition-all"
                                                style={{
                                                    width: `${item.porcentaje}%`,
                                                    backgroundColor: COLORES_BARRAS[idx % COLORES_BARRAS.length],
                                                }}
                                            />
                                        </div>
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

                {/* Perfil de Empleabilidad, Inserción y Sector de Desempeño (HU 1) */}
                <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                                Perfil de Inserción y Sectores (HU 1)
                            </h3>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-umss-azul border border-blue-200">
                                Absorción Laboral
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">
                            Indicadores de celeridad en la inserción laboral y distribución en sector público/privado.
                        </p>

                        <div className="space-y-3">
                            {/* Inserción temprana */}
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-start justify-between mb-1.5">
                                    <span className="font-semibold text-slate-700 text-xs sm:text-sm">
                                        Inserción Laboral Temprana (&lt; 4 meses)
                                    </span>
                                    <span className="text-2xl font-extrabold text-emerald-600 leading-none">
                                        {porcentajeInsercion}%
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                                    <div
                                        className="bg-emerald-500 h-2 rounded-full transition-all"
                                        style={{ width: `${porcentajeInsercion}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    {insercionTemprana} de {tituladosConEmpleo.length} profesionales consiguieron trabajo antes de titularse o en menos de 4 meses.
                                </p>
                            </div>

                            {/* Sector de desempeño de titulados (HU 1) */}
                            {distribucionSectoresTitulados.length > 0 && (
                                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-slate-700 text-xs sm:text-sm flex items-center gap-1.5">
                                            <Building className="h-3.5 w-3.5 text-slate-500" />
                                            Sector de Desempeño
                                        </span>
                                        <span className="text-xs text-slate-500 font-medium">
                                            {distribucionSectoresTitulados.reduce((a, b) => a + b.cantidad, 0)} declarados
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {distribucionSectoresTitulados.map((s, idx) => (
                                            <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                                                <p className="text-slate-500 text-[11px]">{s.nombre}</p>
                                                <p className="text-base font-extrabold text-slate-800 mt-0.5">{s.porcentaje}%</p>
                                                <p className="text-[10px] text-slate-400 font-mono">({s.cantidad} titulados)</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Madurez de la cohorte (HU 1: Junior vs Consolidado) */}
                            {segmentacionAntiguedad && (
                                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-umss-azul" />
                                        <div>
                                            <p className="font-bold text-slate-800">Segmentación de Madurez (HU 1)</p>
                                            <p className="text-[11px] text-slate-500">
                                                Junior: {segmentacionAntiguedad.juniorPct}% · Consolidado: {segmentacionAntiguedad.consolidadoPct}%
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-semibold text-umss-azul bg-white px-2 py-1 rounded border border-blue-200">
                                        {segmentacionAntiguedad.consolidadoPct > 50 ? 'Muestra Madura' : 'Muestra Emergente'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};