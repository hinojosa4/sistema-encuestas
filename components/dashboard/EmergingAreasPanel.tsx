'use client';
import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { emergingRules, originalEmerging, summarizeEmerging } from '@/lib/emergingAreas';
import type { Row } from '@/lib/importPipeline';
import { safeSpreadsheetValue } from '@/lib/importPipeline';
import { tableToCsv } from '@/lib/reports';
import { databaseMessage } from '@/lib/surveyRepository';
import { percentLabel } from './AnalyticsUI';

export function EmergingAreasPanel({ rows, onChange }: { rows: Row[]; onChange: (rows: Row[]) => void }) {
    const summary = useMemo(() => summarizeEmerging(rows), [rows]);
    const [selected, setSelected] = useState('');
    const [labels, setLabels] = useState<string[]>([]);
    const [note, setNote] = useState('');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const exportRows = () => summary.respuestas.map(r => [r.referencia, String(r.fila), r.archivo, r.archivoSha256, r.hoja, r.original, r.etiquetas.join('; '), r.estado, r.metodo, r.requiereRevision ? 'Sí' : 'No', r.nota, r.revisadoUTC, r.revisadoPor]);
    async function download(format: 'csv' | 'xlsx') {
        setMessage('');
        try {
            const columnas = ['referencia', 'fila_origen', 'archivo', 'archivo_sha256', 'hoja', 'respuesta_original', 'etiquetas', 'estado', 'metodo', 'requiere_revision', 'nota', 'revisado_utc', 'revisado_por'];
            if (format === 'xlsx') {
                const X = await import('xlsx');
                const b = X.utils.book_new();
                X.utils.book_append_sheet(b, X.utils.aoa_to_sheet([columnas, ...exportRows()].map(r => r.map(v => v == null ? null : safeSpreadsheetValue(v)))), 'Clasificacion');
                X.utils.book_append_sheet(b, X.utils.json_to_sheet(summary.categorias), 'Resumen');
                X.utils.book_append_sheet(b, X.utils.json_to_sheet([{ total: summary.total, clasificables: summary.clasificables, sinRespuesta: summary.sinRespuesta, sinClasificar: summary.sinClasificar, version: summary.version }]), 'Metodologia');
                X.writeFile(b, 'Clasificacion_areas_emergentes_privada.xlsx');
            } else {
                const csv = tableToCsv({ nombre: 'Clasificacion', descripcion: '', columnas, filas: exportRows() });
                const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
                const a = document.createElement('a'); a.href = url; a.download = 'Clasificacion_areas_emergentes_privada.csv'; a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
        } catch { setMessage('No se pudo generar la clasificación descargable. Inténtalo nuevamente.'); }
    }
    async function save() {
        const row = rows.find(r => String(r.id) === selected);
        if (!row || saving || !note.trim()) return;
        setSaving(true); setMessage('');
        try {
            const { data, error } = await supabase.rpc('revisar_areas_empleador', { p_id: row.id, p_original: originalEmerging(row), p_etiquetas: labels, p_nota: note.trim() });
            if (error) throw error;
            onChange(rows.map(r => r.id === row.id ? { ...r, clasificacion_areas: data } : r));
            setMessage('Revisión guardada con fecha y autoría.');
        } catch (error) { setMessage(databaseMessage(error)); }
        finally { setSaving(false); }
    }
    return <article className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="text-xl font-semibold text-slate-900">Áreas y tecnologías emergentes</h3>
        <p className="text-sm text-slate-600">Pregunta abierta 10 (columna L en el archivo entregado). Cada respuesta puede mencionar varias áreas; cada tema cuenta una vez por respuesta. Los porcentajes pueden sumar más de 100%.</p>
        <p className="text-sm">N total: {summary.total} · Clasificables: {summary.clasificables} · Sin respuesta: {summary.sinRespuesta} · Sin clasificar: {summary.sinClasificar} (incluye {summary.noSabe} No sabe y {summary.noInterpretable} no interpretables) · Requieren revisión: {summary.requierenRevision}.</p>
        <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="text-left text-xs text-slate-500">Porcentaje sobre {summary.total} encuestados o {summary.clasificables} clasificables. Versión: {summary.version}.</caption><thead><tr><th className="p-2 text-left">Área</th><th>Menciones</th><th>% total</th><th>% clasificables</th></tr></thead><tbody>{summary.categorias.map(c => <tr key={c.id} className="border-t border-slate-100"><th className="p-3 text-left font-normal">{c.nombre}<span className="mt-1 block h-2 rounded bg-blue-100"><span className="block h-2 rounded bg-umss-azul" style={{ width: `${c.porcentajeTotal ?? 0}%` }} /></span></th><td className="p-2 text-center">{c.cantidad}</td><td className="p-2 text-center">{percentLabel(c.porcentajeTotal)}</td><td className="p-2 text-center">{percentLabel(c.porcentajeClasificables)}</td></tr>)}</tbody></table></div>
        <details className="border-t border-slate-200 pt-4"><summary className="cursor-pointer font-medium">Revisión de respuestas originales · administración</summary>
            <p className="mt-3 text-xs text-slate-600">Los textos y descargas individuales son de uso administrativo. Los informes generales contienen solo agregados.</p>
            <div className="my-4 flex gap-3"><button onClick={() => void download('csv')} className="rounded border px-3 py-2 text-sm">Exportar clasificación CSV</button><button onClick={() => void download('xlsx')} className="rounded border px-3 py-2 text-sm">Exportar clasificación Excel</button></div>
            <label className="block text-sm">Respuesta<select className="mt-2 w-full rounded border p-2" value={selected} onChange={e => { const r = summary.respuestas.find(r => r.referencia === e.target.value); setSelected(e.target.value); setLabels(r?.etiquetas ?? []); setNote(r?.nota ?? ''); }}><option value="">Selecciona una respuesta</option>{summary.respuestas.map(r => <option key={r.referencia} value={r.referencia}>Fila {String(r.fila)} · {r.estado}{r.requiereRevision ? ' · revisar' : ''}</option>)}</select></label>
            {selected && <div className="mt-4 space-y-4"><p className="whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm">{summary.respuestas.find(r => r.referencia === selected)?.original || '(Vacía)'}</p><fieldset className="grid gap-2 text-sm sm:grid-cols-2"><legend className="mb-2 font-medium">Etiquetas (cero, una o varias)</legend>{emergingRules.map(rule => <label key={rule.id} className="flex gap-2"><input type="checkbox" checked={labels.includes(rule.id)} onChange={e => setLabels(e.target.checked ? [...labels, rule.id] : labels.filter(id => id !== rule.id))} />{rule.nombre}</label>)}</fieldset><label className="block text-sm">Motivo de la revisión<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} className="mt-2 block w-full rounded border p-2" /></label><button disabled={saving || !note.trim() || !rows.some(r => String(r.id) === selected)} onClick={() => void save()} className="rounded bg-umss-azul px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar revisión'}</button></div>}
        </details>
        {message && <p role="status" className="text-sm">{message}</p>}
    </article>;
}
