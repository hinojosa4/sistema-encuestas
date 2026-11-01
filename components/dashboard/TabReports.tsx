'use client';
import { useEffect, useState } from 'react';
import { Download, RefreshCw, FileSpreadsheet, FileText, Database, Layers, CheckCircle2 } from 'lucide-react';
import { REPORT_VERSION, tableToCsv, type AnalysisReport } from '@/lib/reports';
import { UserFacingError } from '@/lib/userMessages';
import type { GraduateScope } from '@/lib/competencies';
import { type Row } from '@/lib/importPipeline';
import { createCleanDatasetWorkbook, cleanRowsToCsv, triggerDownload } from '@/lib/cleanDatasetExport';

function saveFile(content: string | Uint8Array<ArrayBuffer>, mime: string, filename: string) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function TabReports({
    scope,
    corte,
    onScope,
    onCorte,
    titulados = [],
    empleadores = [],
    onRawExport,
}: {
    scope: GraduateScope;
    corte: number;
    onScope: (v: GraduateScope) => void;
    onCorte: (v: number) => void;
    titulados?: Row[];
    empleadores?: Row[];
    onRawExport: () => void;
}) {
    const [refresh, setRefresh] = useState(0);
    const [result, setResult] = useState<{ key: string; report?: AnalysisReport; error?: string }>({ key: '' });
    const [selectedTable, setSelectedTable] = useState('');
    const [exportError, setExportError] = useState('');
    const [exporting, setExporting] = useState(false);
    const [cleanExportFeedback, setCleanExportFeedback] = useState<string>('');

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
                if (data.version !== REPORT_VERSION || typeof data.huella !== 'string' || !Array.isArray(data.tablas)) {
                    throw new UserFacingError('El generador devolvió un reporte incompatible. Actualiza la página y vuelve a intentar.');
                }
                if (!controller.signal.aborted) setResult({ key, report: data });
            } catch (error) {
                if (!controller.signal.aborted) setResult({ key, error: error instanceof UserFacingError ? error.message : 'No se pudo conectar con el generador. Comprueba tu conexión y vuelve a intentar.' });
            }
        }
        void load();
        return () => controller.abort();
    }, [scope, corte, key]);

    async function handleCleanExport(format: 'excel' | 'csv-titulados' | 'csv-empleadores') {
        setExportError('');
        try {
            const today = new Date().toISOString().slice(0, 10);
            if (format === 'excel') {
                const XLSX = await import('xlsx');
                const wb = createCleanDatasetWorkbook(titulados, empleadores);
                XLSX.writeFile(wb, `Dataset_Limpio_UMSS_ARCUSUR_${today}.xlsx`);
                setCleanExportFeedback('Dataset limpio descargado en formato Excel (.xlsx) con 148 titulados y 80 empleadores.');
            } else if (format === 'csv-titulados') {
                const csv = cleanRowsToCsv(titulados);
                triggerDownload(csv, 'text/csv;charset=utf-8', `titulados_datos_limpios_${today}.csv`);
                setCleanExportFeedback('Archivo plano CSV de Titulados descargado (UTF-8 con BOM).');
            } else if (format === 'csv-empleadores') {
                const csv = cleanRowsToCsv(empleadores);
                triggerDownload(csv, 'text/csv;charset=utf-8', `empleadores_datos_limpios_${today}.csv`);
                setCleanExportFeedback('Archivo plano CSV de Empleadores descargado (UTF-8 con BOM).');
            }
            setTimeout(() => setCleanExportFeedback(''), 4500);
        } catch {
            setExportError('No se pudo generar la descarga de datos limpios. Vuelve a intentar.');
        }
    }

    async function exportFile(format: 'xlsx' | 'csv' | 'pdf') {
        if (!report || exporting) return;
        setExportError(''); setExporting(true);
        try {
            const name = `Informe_UMSS_${report.generadoUTC.slice(0, 10)}_${report.huella.slice(0, 12)}`;
            if (format === 'xlsx') {
                const XLSX = await import('xlsx');
                const { reportToWorkbook } = await import('@/lib/excelExport');
                const book = reportToWorkbook(report);
                XLSX.writeFile(book, `${name}.xlsx`);
            } else if (format === 'csv' && current) {
                const t = {
                    ...current,
                    columnas: [...current.columnas, 'reporte_sha256', 'version_datos_sha256', 'generado_utc', 'version_reporte', 'poblacion_hu4', 'corte_hu1'],
                    filas: current.filas.map(row => [...row, report.huella, report.datosVersion ?? null, report.generadoUTC, report.version, report.parametros.scope, report.parametros.corte]),
                };
                saveFile(tableToCsv(t), 'text/csv;charset=utf-8', `${name}_${current.nombre}.csv`);
            } else if (format === 'pdf') {
                const { academicReportToPdf } = await import('@/lib/academicPdf');
                const response = await fetch('/brand/escudo-umss.jpg');
                if (!response.ok) throw new Error('No se pudo cargar el escudo institucional.');
                const bytes = await academicReportToPdf(report, new Uint8Array(await response.arrayBuffer()));
                saveFile(new Uint8Array(bytes), 'application/pdf', `${name}.pdf`);
            }
        } catch {
            setExportError('No se pudo preparar la descarga. Vuelve a intentar; el reporte generado sigue disponible.');
        } finally {
            setExporting(false);
        }
    }

    const disabled = !report || exporting;

    return (
        <section className="space-y-8" aria-labelledby="hu5-title">
            <header className="border-b border-slate-200 pb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-umss-azul">Historia de Usuario 5 · Sistema de Exportación</p>
                <h2 id="hu5-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                    Exportación de Datos Limpios y Reportes Analíticos
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Cumplimiento formal de HU5: sintetiza la fase de <strong>Data Wrangling</strong> mediante la exportación de datasets limpios (CSV/Excel) y automatiza la generación de <strong>matrices de frecuencia cruzada</strong>, estadísticos de acreditación e informes académicos.
                </p>
            </header>

            {/* SECCIÓN 1: EXPORTACIÓN DE DATOS LIMPIOS (DATA WRANGLING) */}
            <div className="rounded-2xl border-2 border-emerald-600/30 bg-emerald-50/40 p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-3">
                    <div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <Database className="h-3.5 w-3.5" /> Data Wrangling · Datos Limpios
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 mt-1">1. Exportación de Datasets Tabulares Limpios</h3>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                        {titulados.length} titulados depurados · {empleadores.length} empleadores depurados
                    </span>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Respuestas individuales procesadas y normalizadas. Se han eliminado columnas técnicas de Microsoft Forms (marcas temporales irrelevantes, IDs internos) y se protegen datos de contacto. Listos para SPSS, R, Python (Pandas) o Stata.
                </p>

                {cleanExportFeedback && (
                    <div className="mt-3 flex items-center gap-2 p-3 bg-emerald-100 text-emerald-900 text-xs sm:text-sm font-medium rounded-lg">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                        <span>{cleanExportFeedback}</span>
                    </div>
                )}

                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Card Excel Limpio */}
                    <article className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                                <FileSpreadsheet className="h-5 w-5 text-emerald-700" />
                                <h4>Dataset Limpio Completo</h4>
                            </div>
                            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                                Libro Excel (.xlsx) con dos hojas: <strong>Titulados_Limpios</strong> (148 filas) y <strong>Empleadores_Limpios</strong> (80 filas), con tipos normalizados y hoja de metadatos.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void handleCleanExport('excel')}
                            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            <span>Descargar Dataset Excel (.xlsx)</span>
                        </button>
                    </article>

                    {/* Card CSV Titulados */}
                    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <h4>Titulados Depurados (CSV)</h4>
                            </div>
                            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                                148 registros limpios en formato tabular plano (.csv con UTF-8 BOM). Compatible con R, Python, SPSS y Excel sin caracteres corruptos.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void handleCleanExport('csv-titulados')}
                            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 hover:bg-slate-50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 transition-colors"
                        >
                            <Download className="h-4 w-4 text-slate-600" />
                            <span>Descargar Titulados CSV</span>
                        </button>
                    </article>

                    {/* Card CSV Empleadores */}
                    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                                <FileText className="h-5 w-5 text-indigo-600" />
                                <h4>Empleadores Depurados (CSV)</h4>
                            </div>
                            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                                80 organizaciones e instituciones en CSV (UTF-8 BOM), con demandas curriculares, competencias y tecnologías requeridas normalizadas.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void handleCleanExport('csv-empleadores')}
                            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 hover:bg-slate-50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 transition-colors"
                        >
                            <Download className="h-4 w-4 text-slate-600" />
                            <span>Descargar Empleadores CSV</span>
                        </button>
                    </article>
                </div>
            </div>

            {/* SECCIÓN 2: REPORTES ANALÍTICOS Y MATRICES DE FRECUENCIA CRUZADA */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-6">
                <div className="border-b border-slate-200 pb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-umss-azul/10 text-umss-azul">
                        <Layers className="h-3.5 w-3.5" /> Síntesis Estadística · Acreditación ARCUSUR
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">2. Reportes Analíticos y Matrices de Frecuencia Cruzada</h3>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600">
                        Cálculo computacional automatizado en el backend. Incluye las 31 tablas de frecuencias, contrastes Chi-Cuadrada de Pearson, diagramas de radar y trazabilidad criptográfica SHA-256.
                    </p>
                </div>

                {/* Filtros de la generación analítica */}
                <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                    <label className="text-xs sm:text-sm font-semibold text-slate-800">
                        Población para formación y competencias (HU4)
                        <select
                            disabled={exporting}
                            value={scope}
                            onChange={e => onScope(e.target.value as GraduateScope)}
                            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs sm:text-sm"
                        >
                            <option value="experiencia">Con experiencia laboral declarada (Criterio ARCUSUR)</option>
                            <option value="todos">Todos los titulados · contexto general</option>
                        </select>
                    </label>
                    <label className="text-xs sm:text-sm font-semibold text-slate-800">
                        Corte exploratorio de experiencia (HU1)
                        <select
                            disabled={exporting}
                            value={corte}
                            onChange={e => onCorte(Number(e.target.value))}
                            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs sm:text-sm"
                        >
                            {Array.from({ length: 31 }, (_, i) => <option key={i} value={i}>{i} años de vida profesional</option>)}
                        </select>
                    </label>
                </div>

                {loading && (
                    <p role="status" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                        <RefreshCw className="h-4 w-4 animate-spin text-umss-azul" />
                        Sincronizando con el backend y generando matrices cruzadas...
                    </p>
                )}

                {!loading && result.error && (
                    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        {result.error}
                    </p>
                )}

                {report && (
                    <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <h4 className="font-bold text-sm text-slate-900">Estado de la Generación Estadística</h4>
                            <span className="text-xs text-slate-500 font-mono">
                                Huella SHA-256: {report.huella.slice(0, 16)}...
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-700">
                            {report.titulados} titulados procesados · {report.empleadores} empleadores · {report.tablas.length} tablas de frecuencia generadas en backend · Versión {report.version}
                        </p>
                        <details className="mt-2 text-xs text-slate-600">
                            <summary className="cursor-pointer font-medium hover:text-umss-azul">Ver trazabilidad criptográfica completa</summary>
                            <p className="mt-1.5 break-all font-mono text-[11px] bg-white p-2 rounded border border-slate-200">
                                Reporte SHA-256: {report.huella}<br />
                                Datos SHA-256: {report.datosVersion ?? 'Sin huella registrada'}
                            </p>
                        </details>
                    </article>
                )}

                {/* Grid de Reportes Analíticos */}
                <div className="grid items-start gap-4 lg:grid-cols-3">
                    {/* Card PDF Académico */}
                    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
                        <div>
                            <div className="flex items-center gap-2 text-umss-azul font-bold text-sm">
                                <FileText className="h-5 w-5 text-umss-azul" />
                                <h4>Informe Académico PDF</h4>
                            </div>
                            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                                Documento formal con portada oficial UMSS, narrativa interpretativa, matrices cruzadas, figuras estáticas, diagnósticos curriculares y referencias según la guía de autoevaluación.
                            </p>
                        </div>
                        <button
                            disabled={disabled}
                            type="button"
                            onClick={() => void exportFile('pdf')}
                            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-umss-azul hover:bg-blue-900 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow disabled:opacity-50 transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            <span>Descargar Informe PDF</span>
                        </button>
                    </article>

                    {/* Card Excel de Matrices Estadísticas */}
                    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
                        <div>
                            <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
                                <FileSpreadsheet className="h-5 w-5 text-teal-700" />
                                <h4>Libro de Matrices y Métricas</h4>
                            </div>
                            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                                Libro Excel (.xlsx) con <strong>31 hojas estadísticas agregadas</strong>: matrices observadas, esperadas y porcentajes de Chi-cuadrada (4×3 y 2×2), estadísticos descriptivos y trazabilidad (hoja Identificación).
                            </p>
                        </div>
                        <button
                            disabled={disabled}
                            type="button"
                            onClick={() => void exportFile('xlsx')}
                            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-teal-800 hover:bg-teal-900 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow disabled:opacity-50 transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            <span>Descargar Matrices Excel (.xlsx)</span>
                        </button>
                    </article>

                    {/* Card CSV de Tabla Específica */}
                    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
                        <div>
                            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                                <FileText className="h-5 w-5 text-slate-600" />
                                <h4>CSV de Tabla Individual</h4>
                            </div>
                            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                                Exporta individualmente cualquiera de las 31 tablas analíticas calculadas por el backend en formato CSV UTF-8 con huella SHA-256 por fila.
                            </p>
                            <label className="mt-3 block text-xs font-semibold text-slate-700">
                                Seleccionar tabla del reporte:
                                <select
                                    disabled={!report}
                                    value={current?.nombre ?? ''}
                                    onChange={e => setSelectedTable(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                                >
                                    {report?.tablas.map(t => (
                                        <option key={t.nombre} value={t.nombre}>
                                            {t.nombre.replace(/^HU[1-5]_/, '').replaceAll('_', ' ')}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <button
                            disabled={disabled || !current}
                            type="button"
                            onClick={() => void exportFile('csv')}
                            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-400 hover:bg-slate-50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 disabled:opacity-50 transition-colors"
                        >
                            <Download className="h-4 w-4 text-slate-600" />
                            <span>Descargar CSV de la Tabla</span>
                        </button>
                    </article>
                </div>

                {exporting && <p role="status" className="text-xs sm:text-sm text-slate-600 animate-pulse">Preparando archivo de descarga...</p>}
                {exportError && <p role="alert" className="text-xs sm:text-sm text-red-800 font-medium">{exportError}</p>}

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
                    <button
                        onClick={() => setRefresh(v => v + 1)}
                        disabled={loading || exporting}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw size={14} />
                        <span>Regenerar análisis desde la base de datos</span>
                    </button>

                    <details className="text-xs text-slate-600">
                        <summary className="cursor-pointer font-medium hover:text-slate-900">
                            Exportación de vista actual del navegador (legado)
                        </summary>
                        <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="leading-relaxed">
                                Descarga el libro Excel con los cálculos calculados localmente en la memoria del navegador.
                            </p>
                            <button
                                onClick={onRawExport}
                                className="mt-2 inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                            >
                                <Download size={13} />
                                <span>Descargar análisis de la vista</span>
                            </button>
                        </div>
                    </details>
                </div>
            </div>
        </section>
    );
}
