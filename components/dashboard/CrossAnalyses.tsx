'use client';
import { useState } from 'react';
import type { CrossAnalysis } from '@/lib/crossAnalysis';
import { percentLabel } from './AnalyticsUI';

const number = (v: number | null) => v === null ? 'No disponible' : v.toLocaleString('es-BO', { maximumFractionDigits: 6 });
export function CrossAnalyses({ analyses }: { analyses: CrossAnalysis[] }) {
    const [id, setId] = useState('A');
    const item = analyses.find(a => a.id === id) ?? analyses[0];
    if (!item) return null;
    const c = item.chi;
    const useFisher = c.estado === 'frecuencias_bajas' && c.fisherP !== null;
    const p = useFisher ? c.fisherP : c.pValor;
    return <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="text-xl font-semibold text-slate-900">Cruces del informe académico</h3>
        <label className="block text-sm font-medium">Selecciona un cruce
            <select value={id} onChange={e => setId(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3">{analyses.map(a => <option key={a.id} value={a.id}>{a.id}: {a.titulo}</option>)}</select>
        </label>
        <p className="text-sm text-slate-600">{item.regla}</p>
        <p className="text-sm">{item.origen} · N total {item.totalEncuesta} · Pares válidos {c.total} · Excluidos {c.excluidos}. El filtro de titulados no modifica empleadores. Corte de estos cruces: 5 años.</p>
        {!c.total ? <p>Sin pares válidos para este cruce.</p> : <>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-800" aria-label="Colores de las frecuencias esperadas">
                <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-4 w-4 rounded border border-sky-400 bg-sky-100" />Esperada de 5 o más</span>
                <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-4 w-4 rounded border border-amber-700 bg-amber-200" />Esperada menor de 5 · precaución</span>
                <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-4 w-4 rounded border border-rose-700 bg-rose-200" />Esperada menor de 1 · muy baja</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-300">
                <table className="w-full text-sm text-slate-900">
                    <caption className="bg-slate-50 px-4 py-3 text-left text-xs leading-relaxed text-slate-700">Cantidad observada en negrita; esperada (E) y porcentaje de fila debajo. Denominador: total válido de cada fila. El color indica la frecuencia esperada.</caption>
                    <thead className="bg-umss-azul text-white"><tr>
                        <th scope="col" className="px-4 py-3 text-left">Categoría</th>
                        {c.columnas.map(col => <th scope="col" className="border-l border-white/25 px-4 py-3 text-center" key={col}>{col}</th>)}
                        <th scope="col" className="border-l border-white/25 px-4 py-3 text-center">Total</th>
                    </tr></thead>
                    <tbody>{c.filas.map((row, i) => <tr key={row} className="border-t border-slate-300">
                        <th scope="row" className="bg-slate-100 px-4 py-4 text-left font-semibold text-slate-900">{row}</th>
                        {c.columnas.map((col, j) => {
                            const expected = c.esperadas[i][j];
                            const shade = expected < 1 ? 'bg-rose-200 text-rose-950 ring-2 ring-inset ring-rose-700' : expected < 5 ? 'bg-amber-200 text-amber-950 ring-2 ring-inset ring-amber-700' : i % 2 ? 'bg-sky-100 text-sky-950' : 'bg-sky-50 text-sky-950';
                            return <td key={col} className={`border-l border-slate-300 px-4 py-4 text-center tabular-nums ${shade}`}>
                                <strong className="text-lg">{c.matriz[i][j]}</strong>
                                <span className="mt-1 block text-xs font-medium">E={number(expected)} · {percentLabel(c.matriz[i][j] / c.totalesFila[i] * 100)}</span>
                                {expected < 5 && <span className={`mt-2 inline-block rounded-md px-2 py-1 text-xs font-semibold text-white ${expected < 1 ? 'bg-rose-800' : 'bg-amber-800'}`}>{expected < 1 ? 'Esperada < 1' : 'Esperada < 5'}</span>}
                            </td>;
                        })}
                        <td className="border-l border-slate-300 bg-slate-100 px-4 py-4 text-center font-semibold tabular-nums">{c.totalesFila[i]}</td>
                    </tr>)}</tbody>
                    <tfoot className="border-t-2 border-umss-azul bg-umss-azul text-white"><tr>
                        <th scope="row" className="px-4 py-3 text-left">Total</th>
                        {c.totalesColumna.map((n, j) => <td key={j} className="border-l border-white/25 px-4 py-3 text-center font-semibold tabular-nums">{n}</td>)}
                        <td className="border-l border-white/25 px-4 py-3 text-center font-bold tabular-nums">{c.total}</td>
                    </tr></tfoot>
                </table>
            </div>
        </>}
        <p className="text-sm">χ² de Pearson sin Yates: {number(c.chi2)} · gl: {c.gradosLibertad} · V de Cramér: {number(c.vCramer)}.</p>
        <p className="text-sm">Mínima esperada: {number(c.minimaEsperada)} · Celdas con esperada &lt; 5: {c.celdasMenor5} · Estado de Pearson: {c.estado}.</p>
        <p className="text-sm">p de Pearson válido: {number(c.pValor)} · Fisher bilateral (solo 2×2): {number(c.fisherP)}.</p>
        <p className={`rounded-lg border-l-4 p-4 text-sm leading-relaxed ${p === null ? 'border-amber-700 bg-amber-100 text-amber-950' : 'border-umss-azul bg-blue-50 text-slate-900'}`}>{p === null ? 'Sin inferencia válida con los métodos disponibles. Se conserva la descripción.' : `${useFisher ? 'Fisher bilateral' : 'Pearson'}: p = ${number(p)}. Con α = ${c.alfa}, ${p < c.alfa ? 'hay evidencia exploratoria de asociación' : 'no hay evidencia suficiente de asociación'}.`} No demuestra causalidad ni representatividad; no rechazar H₀ no demuestra independencia.</p>
    </article>;
}
