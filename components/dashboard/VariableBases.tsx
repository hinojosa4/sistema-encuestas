'use client';
import { dataDictionary, variableCoverage } from '@/lib/dataDictionary';
import type { Row } from '@/lib/importPipeline';

export function VariableBases({ graduates, employers }: { graduates: Row[]; employers: Row[] }) {
    const sourceInfo = (rows: Row[]) => {
        const hashes = [...new Set(rows.map(r => String(r.archivo_sha256 ?? '')).filter(Boolean))];
        const dates = rows.map(r => String(r.created_at ?? '')).filter(v => Number.isFinite(Date.parse(v))).sort();
        return `${hashes.length ? hashes.map(h => h.slice(0,12)).join(', ') : 'Sin huella de archivo registrada'} · Última carga: ${dates.length ? new Date(dates.at(-1)!).toLocaleString('es-BO', { timeZone: 'America/La_Paz' }) : 'Sin fecha registrada'}`;
    };
    return <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <summary className="cursor-pointer font-medium text-slate-800">Procedencia, bases válidas y exclusiones por pregunta</summary>
        <p className="mt-3">Titulados: {graduates.length} respuestas · {sourceInfo(graduates)}</p>
        <p className="mt-2">Empleadores: {employers.length} respuestas · {sourceInfo(employers)}</p>
        <p className="mt-3">Contexto general de cada instrumento, con rutas por pregunta. La vista de competencias indica su propio filtro de titulados. Los empleadores siempre se analizan por separado. Cada porcentaje usa la base válida de la pregunta; en selección múltiple cuenta personas, no menciones.</p>
        <div className="mt-4 max-h-96 overflow-auto"><table className="w-full text-xs"><thead><tr>{['Pregunta','Encuesta','N total','Aplicable','Válidas / denominador','Sin respuesta','No aplica','No sabe','No interpretable','Ruta sin confirmar'].map(h => <th key={h} className="p-2 text-left">{h}</th>)}</tr></thead><tbody>{dataDictionary.map(v => {
            const b = variableCoverage(v.encuesta === 'encuesta_titulados' ? graduates : employers, v.id);
            return <tr key={`${v.encuesta}:${v.id}`} className="border-t border-slate-100"><th className="p-2 text-left font-normal">{v.nombre}</th><td className="p-2">{v.encuesta === 'encuesta_titulados' ? 'Titulados' : 'Empleadores'}</td>{[b.total,b.aplicable,b.validas,b.sinRespuesta,b.noAplica,b.noSabe,b.noInterpretable,b.rutaNoConfirmada].map((n,i) => <td className="p-2 text-center" key={i}>{n}</td>)}</tr>;
        })}</tbody></table></div>
    </details>;
}
