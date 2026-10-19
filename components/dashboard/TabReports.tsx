'use client';
import { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { safeSpreadsheetValue } from '@/lib/importPipeline';
import { REPORT_VERSION, tableToCsv, type AnalysisReport } from '@/lib/reports';
import { UserFacingError } from '@/lib/userMessages';
import type { GraduateScope } from '@/lib/competencies';
import type { AcademicMetadata } from '@/lib/academicReport';

function saveFile(content: string | Uint8Array<ArrayBuffer>, mime: string, filename: string) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function TabReports({ scope, corte, onScope, onCorte, onRawExport }: {
    scope: GraduateScope; corte: number; onScope: (v: GraduateScope) => void; onCorte: (v: number) => void; onRawExport: () => void;
}) {
    const [refresh, setRefresh] = useState(0);
    const [result, setResult] = useState<{ key: string; report?: AnalysisReport; error?: string }>({ key: '' });
    const [selectedTable, setSelectedTable] = useState('');
    const [exportError, setExportError] = useState('');
    const [exporting, setExporting] = useState(false);
    const [academicMetadata, setAcademicMetadata] = useState<AcademicMetadata>({ autores: '', docente: '', periodo: '' });
    const key = `${scope}:${corte}:${refresh}`;
    const loading = result.key !== key;
    const report = loading ? undefined : result.report;
    const current = report?.tablas.find(t => t.nombre === selectedTable) ?? report?.tablas[0];
    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            try {
                const response = await fetch(`/api/reports?scope=${scope}&corte=${corte}`, {
                    signal: controller.signal, cache: 'no-store', credentials: 'same-origin',
                });
                const data = await response.json();
                if (!response.ok) throw new UserFacingError(typeof data.error === 'string' ? data.error : 'No se pudo generar el reporte.');
                if (data.version !== REPORT_VERSION || typeof data.huella !== 'string' || !Array.isArray(data.tablas)) throw new UserFacingError('El generador devolvió un reporte incompatible. Actualiza la página y vuelve a intentar.');
                if (!controller.signal.aborted) setResult({ key, report: data });
            } catch (error) {
                if (!controller.signal.aborted) setResult({ key, error: error instanceof UserFacingError ? error.message : 'No se pudo conectar con el generador. Comprueba tu conexión y vuelve a intentar.' });
            }
        }
        void load();
        return () => controller.abort();
    }, [scope, corte, key]);

    async function exportFile(format: 'xlsx' | 'csv' | 'pdf') {
        if (!report || exporting) return;
        setExportError(''); setExporting(true);
        try {
            const name = `Informe_UMSS_${report.generadoUTC.slice(0,10)}_${report.huella.slice(0,12)}`;
            if (format === 'xlsx') {
                const XLSX = await import('xlsx');
                const book = XLSX.utils.book_new();
                const identification = [['Reporte SHA-256', report.huella], ['Generado UTC', report.generadoUTC], ['Versión', report.version], ['Población de competencias', report.parametros.scope], ['Corte de experiencia', report.parametros.corte]];
                XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(identification), 'Identificacion');
                for (const t of report.tablas) {
                    const sheet = XLSX.utils.aoa_to_sheet([t.columnas,...t.filas].map(row=>row.map(safeSpreadsheetValue)));
                    sheet['!cols'] = t.columnas.map((_,i)=>({wch:i===0?45:24}));
                    if (t.columnas.length) sheet['!autofilter'] = {ref: XLSX.utils.encode_range({s:{r:0,c:0},e:{r:t.filas.length,c:t.columnas.length-1}})};
                    XLSX.utils.book_append_sheet(book,sheet,t.nombre.replace(/^HU[1-5]_/, ''));
                }
                XLSX.writeFile(book,`${name}.xlsx`);
            } else if (format === 'csv' && current) {
                const t = { ...current, columnas: [...current.columnas,'reporte_sha256','generado_utc','version_reporte','poblacion_hu4','corte_hu1'], filas: current.filas.map(row=>[...row,report.huella,report.generadoUTC,report.version,report.parametros.scope,report.parametros.corte]) };
                saveFile(tableToCsv(t),'text/csv;charset=utf-8',`${name}_${current.nombre}.csv`);
            } else if (format === 'pdf') {
                const { academicReportToPdf } = await import('@/lib/academicPdf');
                const response = await fetch('/brand/escudo-umss.jpg');
                if (!response.ok) throw new Error('No se pudo cargar el escudo institucional.');
                const bytes = await academicReportToPdf(report, academicMetadata, new Uint8Array(await response.arrayBuffer()));
                saveFile(new Uint8Array(bytes),'application/pdf',`${name}.pdf`);
            }
        } catch { setExportError('No se pudo preparar la descarga. Vuelve a intentar; el reporte generado sigue disponible.'); }
        finally { setExporting(false); }
    }
    const disabled = !report || exporting;
    return <section className="space-y-6" aria-labelledby="hu5-title">
        <header><p className="text-xs font-semibold uppercase tracking-widest text-umss-azul">Reportes</p><h2 id="hu5-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Informe académico de Análisis de Mercado</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">Documento PDF con introducción, metodología, resultados, diagnóstico, conclusiones y referencias. Excel y CSV conservan el detalle tabular de la misma generación.</p></header>
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-800">Población para formación y competencias<select disabled={exporting} value={scope} onChange={e=>onScope(e.target.value as GraduateScope)} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3"><option value="experiencia">Con experiencia laboral declarada</option><option value="todos">Todos los titulados · contexto general</option></select></label>
            <label className="text-sm font-medium text-slate-800">Corte exploratorio de experiencia<select disabled={exporting} value={corte} onChange={e=>onCorte(Number(e.target.value))} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3">{Array.from({length:31},(_,i)=><option key={i} value={i}>{i} años</option>)}</select></label>
            <p className="text-xs leading-relaxed text-slate-600 sm:col-span-2">Los filtros se comparten con Empleabilidad y Formación y competencias. Las otras bases dependen de las respuestas válidas de cada pregunta. Evita modificar o importar datos mientras se genera el reporte.</p>
        </div>
        {loading && <p role="status" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-5 text-sm"><RefreshCw className="h-4 w-4 animate-spin" />Leyendo datos y generando reporte…</p>}
        {!loading && result.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{result.error}</p>}
        {report && <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-900">Generación disponible</h3><p className="mt-2 text-sm text-slate-700">{report.titulados} respuestas de titulados · {report.empleadores} de empleadores · {report.tablas.length} tablas</p><p className="mt-2 text-sm text-slate-600">{new Date(report.generadoUTC).toLocaleString('es-BO',{timeZone:'America/La_Paz'})} · America/La_Paz · versión {report.version}</p>
            {report.titulados === 0 && report.empleadores === 0 && <p className="mt-3 text-sm text-amber-900">No hay respuestas visibles para esta sesión. El reporte estará vacío; verifica las cargas y permisos antes de usarlo como evidencia.</p>}
            <details className="mt-4 text-xs text-slate-600"><summary className="cursor-pointer font-medium">Identificador y trazabilidad</summary><p className="mt-2 break-all font-mono">SHA-256: {report.huella}</p><p className="mt-2 leading-relaxed">La huella identifica el contenido generado; no es una firma institucional. La hoja Procedencia conserva los archivos y versiones registrados. Los datos históricos sin procedencia quedan identificados como tales. Una nueva generación puede reflejar cambios posteriores.</p></details>
        </article>}
        <fieldset className="rounded-2xl border border-slate-200 bg-white p-5"><legend className="px-2 font-semibold text-slate-900">Portada del informe académico</legend><p className="text-xs leading-relaxed text-slate-600">Datos opcionales para la portada. Si quedan vacíos, el PDF los identifica como pendientes; no se atribuye autoría al docente ni al comité.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-800 sm:col-span-2">Autor o integrantes<input value={academicMetadata.autores} maxLength={240} onChange={e=>setAcademicMetadata(v=>({...v,autores:e.target.value}))} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" placeholder="Nombres del equipo" /></label>
            <label className="text-sm font-medium text-slate-800">Docente<input value={academicMetadata.docente} maxLength={120} onChange={e=>setAcademicMetadata(v=>({...v,docente:e.target.value}))} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" /></label>
            <label className="text-sm font-medium text-slate-800">Gestión o periodo<input value={academicMetadata.periodo} maxLength={80} onChange={e=>setAcademicMetadata(v=>({...v,periodo:e.target.value}))} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" /></label>
        </div></fieldset>
        <div className="grid items-start gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-semibold text-slate-900">Informe académico PDF</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">Portada UMSS, contenido, análisis narrativo, tablas, figuras, conclusiones, referencias y estado del producto final. Las figuras son estáticas; la interacción permanece en el dashboard.</p><button disabled={disabled} onClick={()=>void exportFile('pdf')} className="mt-5 rounded-lg bg-umss-azul px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Descargar informe PDF</button></article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-semibold text-slate-900">Excel de análisis</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">Todas las tablas, tres matrices de doble entrada, estadísticos y procedencia. Sin respuestas individuales ni contactos.</p><button disabled={disabled} onClick={()=>void exportFile('xlsx')} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Download size={16} />Descargar Excel</button></article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-semibold text-slate-900">CSV de una tabla</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">UTF-8, columnas consistentes y trazabilidad por fila. Las celdas sin dato quedan vacías.</p><label className="mt-4 block text-xs font-medium text-slate-700">Tabla<select disabled={!report} value={current?.nombre ?? ''} onChange={e=>setSelectedTable(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-2">{report?.tablas.map(t=><option key={t.nombre} value={t.nombre}>{t.nombre.replace(/^HU[1-5]_/, '').replaceAll('_', ' ')}</option>)}</select></label><button disabled={disabled || !current} onClick={()=>void exportFile('csv')} className="mt-4 rounded-lg border border-slate-400 px-4 py-3 text-sm font-semibold text-slate-800 disabled:opacity-50">Descargar CSV</button></article>
        </div>
        <details className="rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600"><summary className="cursor-pointer font-semibold text-slate-800">Alcance del informe y de los filtros</summary><p className="mt-3">El informe resume respuestas observadas. Los filtros permiten comparar grupos; no predicen matrícula ni empleo. La captura directa de encuestas y un modelo para experimentar con escenarios requieren desarrollo adicional.</p></details>
        {exporting && <p role="status" className="text-sm text-slate-600">Preparando descarga…</p>}
        {exportError && <p role="alert" className="text-sm text-red-800">{exportError}</p>}
        <button onClick={()=>setRefresh(v=>v+1)} disabled={loading || exporting} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium disabled:opacity-50"><RefreshCw size={16} />Generar nuevamente desde la base</button>
        <details className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600"><summary className="cursor-pointer font-semibold text-slate-800">Exportación de respuestas de la vista actual</summary><p className="mt-3 leading-relaxed">Conserva el Excel anterior con respuestas individuales y análisis calculados en el navegador. Puede incluir columnas de contacto. Para compartir resultados agregados usa las descargas de arriba. Esta descarga corresponde a la lectura del dashboard, que puede ser anterior a la generación del servidor.</p><button onClick={onRawExport} className="mt-4 rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800">Descargar respuestas y análisis de la vista</button></details>
    </section>;
}
