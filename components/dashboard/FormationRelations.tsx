'use client';

import { useState } from 'react';
import type { FormationRelation } from '@/lib/formationAnalysis';
import { percentLabel } from './AnalyticsUI';

const number = (value: number | null) => value === null
    ? 'No disponible'
    : value.toLocaleString('es-BO', { maximumFractionDigits: 3 });

function RelationTable({ relation }: { relation: FormationRelation }) {
    const original = relation.originalChi;
    return <div className="overflow-x-auto rounded-xl border border-slate-200" tabIndex={0} role="region" aria-label={relation.title}>
        <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">{relation.title}. Categorías originales, cantidades y porcentajes por fila.</caption>
            <thead className="bg-umss-azul text-white"><tr>
                <th scope="col" className="px-4 py-3">{relation.rowLabel}</th>
                {original.columnas.map(column => <th key={column} scope="col" className="px-4 py-3 text-center">{column}</th>)}
                <th scope="col" className="border-l border-white/25 px-4 py-3 text-center">Total</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-200">
                {original.filas.map((row, rowIndex) => <tr key={row}>
                    <th scope="row" className="bg-slate-50 px-4 py-4 font-semibold text-slate-800">{row}</th>
                    {original.columnas.map((column, columnIndex) => {
                        const count = original.matriz[rowIndex][columnIndex];
                        const expected = original.esperadas[rowIndex][columnIndex];
                        const percent = original.totalesFila[rowIndex] ? count / original.totalesFila[rowIndex] * 100 : 0;
                        const intensity = Math.min(100, percent);
                        return <td key={column} className="px-3 py-3 text-center align-top">
                            <div className="mx-auto max-w-32 rounded-lg p-2" style={{ background: `linear-gradient(90deg, rgb(219 234 254) ${intensity}%, rgb(248 250 252) ${intensity}%)` }}>
                                <strong className="block text-lg tabular-nums text-slate-900">{count}</strong>
                                <span className="mt-1 block text-xs text-slate-600">{percentLabel(percent)} del grupo</span>
                                <span className="mt-1 block text-[11px] text-slate-500">E={number(expected)}</span>
                                {expected < 5 && <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">E &lt; 5</span>}
                            </div>
                        </td>;
                    })}
                    <td className="border-l border-slate-200 bg-slate-50 px-4 py-4 text-center font-semibold tabular-nums">{original.totalesFila[rowIndex]}</td>
                </tr>)}
            </tbody>
            <tfoot className="border-t-2 border-umss-azul bg-umss-azul text-white"><tr>
                <th scope="row" className="px-4 py-3 text-left">Total</th>
                {original.totalesColumna.map((total, index) => <td key={index} className="px-4 py-3 text-center tabular-nums">{total}</td>)}
                <td className="px-4 py-3 text-center tabular-nums">{original.total}</td>
            </tr></tfoot>
        </table>
    </div>;
}

function resultMessage(relation: FormationRelation, pValue: number | null) {
    if (relation.total < 2 || relation.chi.filas.length < 2 || relation.chi.columnas.length < 2) return 'No hay suficientes categorías o respuestas válidas para comparar estos grupos.';
    if (pValue === null) return 'Hay frecuencias esperadas bajas. Se muestra la tabla original y el patrón descriptivo, pero no se fuerza una conclusión estadística.';
    return pValue < relation.chi.alfa
        ? 'Se observa una asociación estadística exploratoria en esta muestra; no demuestra causalidad.'
        : 'No se observa evidencia suficiente de asociación en esta muestra; esto no demuestra independencia.';
}

export function FormationRelations({ relations }: { relations: FormationRelation[] }) {
    const [relationId, setRelationId] = useState(relations[0]?.id ?? '');
    const relation = relations.find(item => item.id === relationId) ?? relations[0];
    if (!relation) return null;

    const pValue = relation.chi.estado === 'frecuencias_bajas' && relation.chi.fisherP !== null ? relation.chi.fisherP : relation.chi.pValor;
    const method = pValue === null
        ? relation.chi.estado === 'frecuencias_bajas' ? 'Pearson no interpretable' : 'Sin contraste'
        : relation.chi.estado === 'frecuencias_bajas' ? `Fisher · p ${number(pValue)}` : `Pearson · p ${number(pValue)}`;
    const status = relation.chi.estado === 'calculada' ? 'Contraste válido' : relation.chi.estado === 'frecuencias_bajas' ? 'Frecuencias esperadas bajas' : 'Datos insuficientes';

    return <section className="space-y-5 border-t border-slate-200 pt-7" aria-labelledby="formation-relations-title">
        <header>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Relaciones de formación</p>
            <h3 id="formation-relations-title" className="mt-2 text-xl font-bold tracking-tight text-slate-900">¿Qué perfiles de formación aparecen?</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">La tabla conserva las categorías originales del informe. Cuando las frecuencias son pequeñas, el contraste estadístico se calcula por separado con categorías agrupadas.</p>
        </header>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><h4 className="font-semibold text-slate-900">Cruces de preferencias</h4><p className="mt-1 text-xs text-slate-500">Observados, porcentajes por fila y esperados, como en el informe académico.</p></div>
                <label className="w-full text-sm font-medium text-slate-700 sm:max-w-sm">Comparación
                    <select value={relation.id} onChange={event => setRelationId(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3">{relations.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
                </label>
            </div>
            <p className="mt-4 text-sm text-slate-700">{relation.question}</p>
            <p className="mt-2 text-xs text-slate-500">Base válida: {relation.originalChi.total} de {relation.originalChi.total + relation.originalChi.excluidos} respuestas · {relation.originalChi.excluidos} excluidas.</p>
            {relation.groupingNote && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">{relation.groupingNote} La tabla superior conserva las categorías originales.</p>}
            <div className="mt-5"><RelationTable relation={relation} /></div>
            <p className="mt-3 text-xs text-slate-500">La prueba y sus indicadores se calculan sobre la versión agrupada cuando se muestra la advertencia de frecuencias bajas.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Chi-cuadrada</p><p className="mt-1 font-semibold tabular-nums">{number(relation.chi.chi2)}</p></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">V de Cramér</p><p className="mt-1 font-semibold tabular-nums">{number(relation.chi.vCramer)}</p></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Estado del contraste</p><p className="mt-1 font-semibold">{status}</p><p className="mt-1 text-xs text-slate-500">{method}</p></div>
            </div>
            <p className="mt-4 rounded-xl border-l-4 border-umss-azul bg-blue-50 p-4 text-sm leading-relaxed text-slate-700">{resultMessage(relation, pValue)}</p>
        </article>
    </section>;
}
