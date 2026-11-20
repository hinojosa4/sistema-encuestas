'use client';

import { useState } from 'react';
import type { ReportProfile } from '@/lib/reportMultivariate';
import { percentLabel } from './AnalyticsUI';

const number = (value: number | null) => value === null ? 'Sin datos' : value.toLocaleString('es-BO', { maximumFractionDigits: 2 });

function ProfileHeatmap({ profile }: { profile: ReportProfile }) {
    const maximum = Math.max(...profile.cells.map(cell => cell.count), 1);
    const valueLabel = (cell: ReportProfile['cells'][number]) => profile.metricType === 'rate'
        ? `${percentLabel((cell.average ?? 0) * 100)} de contratación`
        : `${number(cell.average)} años de experiencia media`;

    return <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
                <h4 className="font-semibold text-slate-900">Vista rápida por grupos</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">El color representa la cantidad de personas en cada combinación. Pasa el cursor o enfoca una celda para consultar el detalle.</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600" aria-label="Leyenda de intensidad">
                <span>Menor</span><span className="h-3 w-16 rounded bg-gradient-to-r from-teal-50 to-teal-700" aria-hidden="true" /><span>Mayor</span>
            </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white" tabIndex={0} role="region" aria-label={`Mapa de ${profile.title}`}>
            <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                <caption className="sr-only">Mapa de calor de {profile.title}. Las celdas muestran personas, porcentaje y medida resumen.</caption>
                <thead className="bg-umss-azul text-white"><tr>
                    <th scope="col" className="px-3 py-3">{profile.rowLabel}</th>
                    {profile.columns.map(column => <th key={column} scope="col" className="px-3 py-3 text-center">{column}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-200">
                    {profile.rows.map(row => <tr key={row}>
                        <th scope="row" className="whitespace-nowrap bg-slate-50 px-3 py-3 font-medium text-slate-800">{row}</th>
                        {profile.columns.map(column => {
                            const cell = profile.cells.find(item => item.row === row && item.column === column);
                            if (!cell) return <td key={column} className="px-3 py-3 text-center text-slate-400">—</td>;
                            const intensity = cell.count / maximum;
                            return <td key={column} title={`${row} / ${column}: ${cell.count} personas; ${percentLabel(cell.percentOfRow)}; ${valueLabel(cell)}`} className={`px-3 py-3 text-center tabular-nums ${intensity > 0.55 ? 'text-white' : 'text-slate-900'}`} style={{ backgroundColor: `rgba(13, 148, 136, ${0.08 + intensity * 0.82})` }}>
                                <span className="block text-sm font-bold">{cell.count}</span>
                                <span className="block text-[10px] opacity-90">{percentLabel(cell.percentOfRow)}</span>
                            </td>;
                        })}
                    </tr>)}
                </tbody>
            </table>
        </div>
    </div>;
}

function ProfileTable({ profile }: { profile: ReportProfile }) {
    return <div className="overflow-x-auto rounded-xl border border-slate-200" tabIndex={0} role="region" aria-label={profile.title}>
        <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">{profile.title}. Cantidad, porcentaje y medida resumen.</caption>
            <thead className="bg-umss-azul text-white"><tr>
                <th scope="col" className="px-4 py-3">{profile.rowLabel}</th>
                <th scope="col" className="px-4 py-3">{profile.columnLabel}</th>
                <th scope="col" className="px-4 py-3 text-right">Personas</th>
                <th scope="col" className="px-4 py-3 text-right">% del grupo</th>
                <th scope="col" className="px-4 py-3 text-right">{profile.metricLabel}</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-200">
                {profile.cells.filter(cell => cell.count > 0).map(cell => <tr key={`${cell.row}-${cell.column}`}>
                    <th scope="row" className="px-4 py-3 font-medium text-slate-800">{cell.row}</th>
                    <td className="px-4 py-3 text-slate-700">{cell.column}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{cell.count}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{percentLabel(cell.percentOfRow)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{profile.metricType === 'rate' ? percentLabel((cell.average ?? 0) * 100) : `${number(cell.average)} años`}</td>
                </tr>)}
            </tbody>
        </table>
    </div>;
}

export function ReportMultivariateProfiles({ profiles, title = 'Perfiles multivariables del informe', eyebrow = 'Explora perfiles' }: { profiles: ReportProfile[]; title?: string; eyebrow?: string }) {
    const [profileId, setProfileId] = useState(profiles[0]?.id ?? '');
    const profile = profiles.find(item => item.id === profileId) ?? profiles[0];
    if (!profile) return null;
    return <section className="space-y-5 border-t border-slate-200 pt-7" aria-labelledby={`${profile.id}-title`}>
        <header>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">{eyebrow}</p>
            <h3 id={`${profile.id}-title`} className="mt-2 text-xl font-bold tracking-tight text-slate-900">{title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">Cada perfil reúne respuestas relacionadas para facilitar la lectura de los resultados. Describe patrones observados; no demuestra causalidad.</p>
        </header>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <label className="block max-w-2xl text-sm font-medium text-slate-800">Perfil a consultar
                <select value={profile.id} onChange={event => setProfileId(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3 focus-visible:outline-2 focus-visible:outline-teal-700">
                    {profiles.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
            </label>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{profile.description}</p>
            <p className="mt-2 text-xs text-slate-500">Base válida: {profile.total} respuestas · {profile.excluded} excluidas por datos incompletos.</p>
            <ProfileHeatmap profile={profile} />
            <div className="mt-5"><ProfileTable profile={profile} /></div>
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{profile.note}</p>
        </article>
    </section>;
}
