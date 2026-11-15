'use client';

import { useMemo, useState } from 'react';
import type { EmployabilityRelation, MultivariateProfile } from '@/lib/employabilityAnalysis';
import { percentLabel } from './AnalyticsUI';

const number = (value: number | null) => value === null ? 'Sin datos' : value.toLocaleString('es-BO', { maximumFractionDigits: 1 });

function RelationTable({ relation }: { relation: EmployabilityRelation }) {
    return <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[620px] text-left text-sm">
            <caption className="sr-only">{relation.title}. Frecuencias y porcentajes por fila.</caption>
            <thead className="bg-umss-azul text-white"><tr>
                <th className="px-4 py-3">{relation.rowLabel}</th>
                {relation.columns.map(column => <th key={column} className="px-4 py-3 text-center">{column}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-200">
                {relation.rows.map(row => <tr key={row}>
                    <th className="bg-slate-50 px-4 py-4 font-semibold text-slate-800">{row}</th>
                    {relation.columns.map(column => {
                        const cell = relation.cells.find(item => item.row === row && item.column === column)!;
                        const intensity = Math.min(100, cell.percentOfRow);
                        return <td key={column} className="px-4 py-4 text-center align-top">
                            <div className="mx-auto max-w-28 rounded-lg bg-slate-100 p-2" style={{ background: `linear-gradient(90deg, rgb(219 234 254) ${intensity}%, rgb(248 250 252) ${intensity}%)` }}>
                                <strong className="text-lg tabular-nums text-slate-900">{cell.count}</strong>
                                <span className="mt-1 block text-xs text-slate-600">{percentLabel(cell.percentOfRow)} del grupo</span>
                            </div>
                        </td>;
                    })}
                </tr>)}
            </tbody>
        </table>
    </div>;
}

export function EmployabilityRelations({ relations, profiles }: { relations: EmployabilityRelation[]; profiles: MultivariateProfile[] }) {
    const [relationId, setRelationId] = useState(relations[0]?.id ?? '');
    const relation = relations.find(item => item.id === relationId) ?? relations[0];
    const [profileId, setProfileId] = useState(profiles[0]?.id ?? '');
    const profile = profiles.find(item => item.id === profileId) ?? profiles[0];
    const preferredP = relation && relation.chi.estado === 'frecuencias_bajas' && relation.chi.fisherP !== null
        ? relation.chi.fisherP : relation?.chi.pValor ?? null;
    const chiMessage = useMemo(() => {
        if (!relation || relation.chi.total < 2) return 'No hay suficientes respuestas válidas para contrastar esta relación.';
        if (preferredP === null) return 'Algunas celdas tienen pocos casos. Se muestra la relación descriptiva, pero no se presenta una conclusión inferencial.';
        return preferredP < relation.chi.alfa
            ? 'Se observa evidencia exploratoria de asociación en esta muestra.'
            : 'No se observa evidencia suficiente de asociación en esta muestra.';
    }, [preferredP, relation]);

    if (!relation || !profile) return null;
    return <section className="space-y-5" aria-labelledby="employability-relations-title">
        <div className="border-t border-slate-200 pt-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Relaciones de empleabilidad</p>
            <h3 id="employability-relations-title" className="mt-2 text-xl font-bold tracking-tight text-slate-900">¿Qué perfiles laborales aparecen en la muestra?</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">Estas comparaciones complementan las frecuencias. Ayudan a ver cómo se distribuye la situación laboral entre grupos, sin afirmar que una variable sea la causa de otra.</p>
        </div>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><h4 className="font-semibold text-slate-900">Cruces con prueba de asociación</h4><p className="mt-1 text-xs text-slate-500">Selecciona una comparación para consultar cantidades y porcentajes por grupo.</p></div>
                <label className="w-full text-sm font-medium text-slate-700 sm:max-w-sm">Comparación
                    <select value={relation.id} onChange={event => setRelationId(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3">{relations.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
                </label>
            </div>
            <p className="mt-4 text-sm text-slate-700">{relation.question}</p>
            <p className="mt-2 text-xs text-slate-500">Base válida: {relation.total} de {relation.total + relation.excluded} respuestas · {relation.excluded} excluidas por falta de una respuesta utilizable.</p>
            <div className="mt-5"><RelationTable relation={relation} /></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Chi-cuadrada</p><p className="mt-1 font-semibold tabular-nums">{relation.chi.chi2 === null ? 'No disponible' : number(relation.chi.chi2)}</p></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">V de Cramér</p><p className="mt-1 font-semibold tabular-nums">{number(relation.chi.vCramer)}</p></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Prueba utilizada</p><p className="mt-1 font-semibold">{preferredP === null ? 'Solo descripción' : relation.chi.estado === 'frecuencias_bajas' ? `Fisher · p ${number(preferredP)}` : `Pearson · p ${number(preferredP)}`}</p></div>
            </div>
            <p className="mt-4 rounded-xl border-l-4 border-umss-azul bg-blue-50 p-4 text-sm leading-relaxed text-slate-700">{chiMessage} No representa causalidad ni necesariamente a toda la población.</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><h4 className="font-semibold text-slate-900">Perfil multivariable</h4><p className="mt-1 text-xs text-slate-500">Cada fila combina dos categorías y resume la experiencia profesional promedio.</p></div>
                <label className="w-full text-sm font-medium text-slate-700 sm:max-w-sm">Perfil a consultar
                    <select value={profile.id} onChange={event => setProfileId(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3">{profiles.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
                </label>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{profile.description} La experiencia ayuda a interpretar el perfil, pero no demuestra que el cargo o el sector produzcan más experiencia.</p>
            <p className="mt-2 text-xs text-slate-500">Base válida: {profile.total} respuestas · {profile.excluded} excluidas.</p>
            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[640px] text-left text-sm"><caption className="sr-only">{profile.title}. Cantidad y experiencia promedio.</caption><thead className="bg-slate-800 text-white"><tr><th className="px-4 py-3">{profile.rowLabel}</th><th className="px-4 py-3">{profile.columnLabel}</th><th className="px-4 py-3 text-right">Personas</th><th className="px-4 py-3 text-right">Experiencia media</th></tr></thead><tbody className="divide-y divide-slate-200">{profile.cells.filter(cell => cell.count > 0).map(cell => <tr key={`${cell.row}-${cell.column}`}><th className="px-4 py-3 font-medium text-slate-800">{cell.row}</th><td className="px-4 py-3 text-slate-700">{cell.column}</td><td className="px-4 py-3 text-right tabular-nums">{cell.count}</td><td className="px-4 py-3 text-right tabular-nums">{cell.averageExperience === null ? 'Sin datos' : `${number(cell.averageExperience)} años`}</td></tr>)}</tbody></table>
            </div>
        </article>
    </section>;
}
