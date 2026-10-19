'use client';

import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabaseClient';
import { inspectRows, MAX_ROWS, sha256, safeSpreadsheetValue, type Row, type SurveyType } from '@/lib/importPipeline';
import { readCsv, readSheet } from '@/lib/readSurveyFile';
import { databaseMessage, savePreparedRows } from '@/lib/surveyRepository';
import { validarArchivo } from '@/lib/fileValidation';
import { TableSelector } from '@/components/upload/TableSelector';
import { DropZone } from '@/components/upload/DropZone';
import { DataPreviewTable } from '@/components/upload/DataPreviewTable';
import { UserFacingError, fileErrorMessage } from '@/lib/userMessages';
import { fieldLabel } from '@/lib/surveyFields';

export default function UploadScreen() {
    const [target, setTarget] = useState<SurveyType>('encuesta_titulados');
    const [rows, setRows] = useState<Row[]>([]);
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [sheetName, setSheetName] = useState('');
    const [source, setSource] = useState({ name: '', hash: '' });
    const [loading, setLoading] = useState(false);
    const [originalView, setOriginalView] = useState(false);
    const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
    const generation = useRef(0);
    const result = useMemo(() => inspectRows(rows, target), [rows, target]);
    const hasWarnings = result.issues.length > 0 || result.unknownHeaders.length > 0;
    const canSave = result.rows.length > 0 && result.errors.length === 0;
    const reset = () => { generation.current++; setRows([]); setWorkbook(null); setSource({ name: '', hash: '' }); setSheetName(''); setMessage(null); };

    const openFile = async (file: File) => {
        reset();
        const request = generation.current;
        const validation = validarArchivo(file);
        if (!validation.isValid) { setMessage({ error: true, text: validation.errorMessage! }); return; }
        setLoading(true);
        try {
            const bytes = await file.arrayBuffer();
            const hash = await sha256(bytes);
            if (request !== generation.current) return;
            if (file.name.toLowerCase().endsWith('.csv')) {
                setRows(readCsv(bytes)); setSheetName('CSV');
            } else {
                const book = XLSX.read(bytes, { type: 'array', sheetRows: MAX_ROWS + 2 });
                const name = book.SheetNames[0];
                if (!name) throw new UserFacingError('El archivo no contiene hojas. Selecciona otro archivo de respuestas.');
                const data = readSheet(book, name);
                setWorkbook(book); setSheetName(name); setRows(data);
            }
            setSource({ name: file.name, hash });
        } catch (error) {
            setRows([]); setWorkbook(null); setSource({ name: '', hash: '' });
            setMessage({ error: true, text: fileErrorMessage(error) });
        } finally { if (request === generation.current) setLoading(false); }
    };

    const save = async () => {
        if (!canSave || loading) return;
        setLoading(true); setMessage(null);
        try {
            const payload = result.rows.map(row => ({ ...row,
                archivo_sha256: source.hash,
                archivo_nombre: source.name, hoja_origen: sheetName, version_instrumento: null,
                instrumento_origen: target === 'encuesta_titulados' ? 'umss-titulados-microsoft-forms' : 'umss-empleadores-google-forms',
            }));
            // Una sola solicitud: toda la insercion se confirma o revierte. Nunca borrar antes.
            const { inserted: count } = await savePreparedRows(supabase, target, payload);
            setMessage({ error: false, text: count == null ? 'La carga se completó y los registros anteriores se conservaron.' :
                `${count} respuestas nuevas guardadas; ${payload.length - count} ya existentes omitidas. Los registros anteriores se conservaron.` });
            setRows([]);
        } catch (error) { setMessage({ error: true, text: databaseMessage(error) }); }
        finally { setLoading(false); }
    };
    const downloadIssues = () => {
        const report = result.issues.map(i => Object.fromEntries(Object.entries({ ...i, campo: fieldLabel(i.campo) }).map(([k, v]) => [k, safeSpreadsheetValue(v)])));
        const blob = new Blob(['\ufeff', Papa.unparse(report)], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url; link.download = 'observaciones_carga.csv'; link.click(); URL.revokeObjectURL(url);
    };
    const preview = originalView ? rows : result.rows;
    const previewHeaders = originalView ? Object.keys(rows[0] ?? {}) : Object.keys(result.rows[0] ?? {}).filter(k => !['raw_data', 'respuestas_originales', 'calidad_datos', 'codigos_ordinales', 'selecciones_multiples', 'version_mapeo'].includes(k));

    return <div className="max-w-6xl mx-auto py-8 px-4"><div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 space-y-5">
        <div><h1 className="text-2xl font-bold text-umss-azul">Cargar y revisar respuestas</h1>
            <p className="text-sm text-slate-600 mt-2">Selecciona el instrumento y el archivo. El sistema limpia y transforma las respuestas automáticamente; revisa el resumen antes de guardarlas.</p></div>
        <TableSelector targetTable={target} setTargetTable={t => { reset(); setTarget(t); }} disabled={loading} />
        <DropZone fileName={source.name} disabled={loading} onFileDrop={openFile} onFileSelected={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void openFile(file); }} />
        {workbook && <label className="block text-sm font-medium">Hoja del libro
            <select disabled={loading} value={sheetName} onChange={e => {
                setSheetName(e.target.value); setMessage(null);
                try { setRows(readSheet(workbook, e.target.value)); } catch (err) { setRows([]); setMessage({ error: true, text: fileErrorMessage(err) }); }
            }} className="block border border-slate-300 rounded-lg p-2 mt-1 w-full">{workbook.SheetNames.map(n => <option key={n}>{n}</option>)}</select></label>}
        {loading && <p role="status" className="text-sm text-umss-azul">Procesando la carga…</p>}
        {message && <p role={message.error ? 'alert' : 'status'} className={`p-4 rounded-lg text-sm ${message.error ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{message.text}</p>}
        {source.name && <>
            <p className="text-sm text-slate-600">Preparación automática: se conservan los originales y las respuestas iguales de distintos envíos. Los valores ambiguos quedan fuera de los indicadores.</p>
            <p className="text-sm bg-slate-50 rounded-lg p-3">{rows.length} filas leídas · {result.rows.length} respuestas preparadas{result.emptyRows > 0 && ` · ${result.emptyRows} filas vacías omitidas`}{result.duplicates > 0 && ` · ${result.duplicates} repeticiones del mismo identificador omitidas`}</p>
            {rows.length > 0 && <p className="text-sm text-slate-600">Preguntas reconocidas: {result.recognizedFields} de {result.expectedFields}. Las columnas auxiliares de puntuación y comentarios no se cuentan como preguntas.</p>}
            {result.errors.map(e => <p role="alert" key={e} className="text-red-700 text-sm">{e}</p>)}
            {hasWarnings && <details className="rounded-lg border border-slate-200 p-3 text-sm text-slate-600"><summary className="cursor-pointer font-medium text-slate-700">Detalles de preparación · opcional</summary><p className="mt-3 text-xs">Puedes guardar sin revisar este detalle. Los originales se conservan; no se inventan valores faltantes.</p>
            {result.unknownHeaders.length > 0 && <div className="mt-3 text-sm">Columnas adicionales conservadas ({result.unknownHeaders.length}):
                <ul className="list-disc pl-5">{result.unknownHeaders.map(h => <li key={h}>{h}</li>)}</ul></div>}
            {result.issues.length > 0 && <div className="mt-3 text-sm"><div className="flex flex-wrap justify-between gap-3"><p>{result.issues.length} notas sobre valores o rutas del cuestionario.</p><button disabled={loading} onClick={downloadIssues} className="text-umss-azul underline shrink-0">Descargar detalle</button></div>
                <div className="overflow-auto max-h-56 mt-2"><table className="w-full text-xs text-left"><thead><tr><th>Fila</th><th>Pregunta</th><th>Observación</th></tr></thead><tbody>{result.issues.slice(0, 100).map((i, n) => <tr key={n}><td className="p-1">{i.fila}</td><td className="p-1">{fieldLabel(i.campo)}</td><td className="p-1">{i.mensaje}</td></tr>)}</tbody></table></div>
                {result.issues.length > 100 && <p>Se muestran 100; el archivo descargado contiene todas.</p>}</div>}
            </details>}
            <button disabled={loading} onClick={() => setOriginalView(!originalView)} className="text-sm text-umss-azul underline">{originalView ? 'Ver datos transformados' : 'Comparar con datos originales'}</button>
            <DataPreviewTable headers={previewHeaders} dataPreview={preview} loading={loading} canSave={canSave} onConfirm={save} />
        </>}
    </div></div>;
}
