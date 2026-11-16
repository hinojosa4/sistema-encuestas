'use client';

import { useState } from 'react';
import type { ReportProfile } from '@/lib/reportMultivariate';
import { percentLabel } from './AnalyticsUI';

const number = (value: number | null) => value === null ? 'Sin datos' : value.toLocaleString('es-BO', { maximumFractionDigits: 2 });

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

export function ReportMultivariateProfiles({ profiles, title = 'Perfiles multivariables del informe' }: { profiles: ReportProfile[]; title?: string }) {
    const [profileId, setProfileId] = useState(profiles[0]?.id ?? '');
    const profile = profiles.find(item => item.id === profileId) ?? profiles[0];
    if (!profile) return null;
    return <section className="space-y-5 border-t border-slate-200 pt-7" aria-labelledby={`${profile.id}-title`}>
        <header>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Análisis exploratorio multivariable</p>
            <h3 id={`${profile.id}-title`} className="mt-2 text-xl font-bold tracking-tight text-slate-900">{title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">Cada fila combina dos variables categóricas y resume una tercera variable. Sirve para identificar perfiles observados; no demuestra causalidad.</p>
        </header>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <label className="block max-w-2xl text-sm font-medium text-slate-800">Perfil a consultar
                <select value={profile.id} onChange={event => setProfileId(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3 focus-visible:outline-2 focus-visible:outline-teal-700">
                    {profiles.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
            </label>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{profile.description}</p>
            <p className="mt-2 text-xs text-slate-500">Base válida: {profile.total} respuestas · {profile.excluded} excluidas por datos incompletos.</p>
            <div className="mt-5"><ProfileTable profile={profile} /></div>
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{profile.note}</p>
        </article>
    </section>;
}
