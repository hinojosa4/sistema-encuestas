'use client';
import { useState, type ReactNode } from 'react';
import { BarChart3, Table2 } from 'lucide-react';

export const numberLabel = (v: number) => v.toLocaleString('es-BO', { maximumFractionDigits: 1 });
export const percentLabel = (v: number | null) => v === null ? 'Sin datos' : `${numberLabel(v)}%`;

export function Indicator({ label, value, unit, detail }: {
    label: string; value: ReactNode; unit?: string; detail: ReactNode;
}) {
    const unavailable = value == null || value === '—' || value === 'Sin datos';
    return <article className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 sm:p-6">
        <h3 className="text-sm font-medium text-slate-600">{label}</h3>
        <p className={`mt-3 flex flex-wrap items-baseline gap-2 ${unavailable ? 'text-sm font-normal text-slate-500' : 'text-3xl font-bold tracking-tight tabular-nums'}`}>{unavailable ? 'Sin datos' : value}{unit && !unavailable && <span className="text-sm font-normal opacity-70">{unit}</span>}</p>
        <div className="mt-3 text-xs leading-relaxed text-slate-600">{detail}</div>
    </article>;
}

export function Distribution({ title, description, data, cumulative = false, tone = 'blue' }: {
    title: string; description: string; data: { nombre: string; cantidad: number }[];
    cumulative?: boolean; tone?: 'blue' | 'teal';
}) {
    const [table, setTable] = useState(false);
    const total = data.reduce((n, r) => n + r.cantidad, 0);
    const rows = data.map((r, index) => {
        const running = data.slice(0, index + 1).reduce((n, row) => n + row.cantidad, 0);
        return { ...r, pct: total ? r.cantidad / total * 100 : 0, accumulated: total ? running / total * 100 : 0 };
    });
    return <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1"><h3 className="font-semibold text-slate-900">{title}</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p></div>
            {total > 0 && <div className="inline-flex shrink-0 rounded-lg bg-slate-100 p-1" aria-label={`Vista de ${title}`}>
                {[false, true].map(t => <button key={String(t)} type="button" aria-pressed={table === t} onClick={() => setTable(t)} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${table === t ? 'bg-white text-umss-azul shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                    {t ? <Table2 size={14} aria-hidden="true" /> : <BarChart3 size={14} aria-hidden="true" />}{t ? 'Tabla' : 'Gráfico'}
                </button>)}
            </div>}
        </div>
        {total > 0 && <p className="mt-4 mb-5 text-xs font-medium text-slate-600">Base: {total} respuestas válidas</p>}
        {!total ? <p className="mt-3 text-sm text-slate-500">Sin respuestas válidas.</p> : table ? <div className="overflow-x-auto">
            <table className="w-full text-left text-sm"><caption className="sr-only">{title}. Frecuencias sobre {total} respuestas válidas.</caption>
                <thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th scope="col" className="pb-3 pr-3 font-medium">Categoría</th><th scope="col" className="pb-3 px-3 text-right font-medium">Cantidad</th><th scope="col" className="pb-3 pl-3 text-right font-medium">%</th>{cumulative && <th scope="col" className="pb-3 pl-3 text-right font-medium">% acumulado</th>}</tr></thead>
                <tbody className="divide-y divide-slate-100">{rows.map(r => <tr key={r.nombre}><th scope="row" className="py-3 pr-3 font-normal text-slate-700">{r.nombre}</th><td className="px-3 text-right tabular-nums">{r.cantidad}</td><td className="pl-3 text-right tabular-nums">{percentLabel(r.pct)}</td>{cumulative && <td className="pl-3 text-right tabular-nums">{percentLabel(r.accumulated)}</td>}</tr>)}</tbody>
                <tfoot className="border-t border-slate-200 font-semibold"><tr><th scope="row" className="pt-3">Total</th><td className="px-3 pt-3 text-right">{total}</td><td className="pl-3 pt-3 text-right">100%</td>{cumulative && <td className="pl-3 pt-3 text-right">100%</td>}</tr></tfoot>
            </table>
        </div> : <div className="space-y-5" role="list" aria-label={title}>{rows.map(r => <div key={r.nombre} role="listitem">
            <div className="mb-2 flex items-baseline justify-between gap-4 text-sm"><span className="leading-snug text-slate-700">{r.nombre}</span><span className="shrink-0 tabular-nums font-semibold text-slate-900">{percentLabel(r.pct)} <span className="ml-1 text-xs font-normal text-slate-500">({r.cantidad})</span></span></div>
            <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone === 'teal' ? 'bg-teal-600' : 'bg-umss-azul'}`} style={{ width: `${r.pct}%` }} /></div>
        </div>)}</div>}
    </article>;
}
