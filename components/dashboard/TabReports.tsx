'use client';
import { useEffect, useState } from 'react';
import { Download, RefreshCw, FileSpreadsheet, FileText, Database, Layers, CheckCircle2 } from 'lucide-react';
import { tableToCsv, type AnalysisReport } from '@/lib/reports';
import { UserFacingError } from '@/lib/userMessages';
import { type Row } from '@/lib/importPipeline';
import { createCleanDatasetWorkbook, cleanRowsToCsv, triggerDownload } from '@/lib/cleanDatasetExport';
import { cargarReporteEstadistico } from '@/lib/reportes/cargarReporte';
import { ReportDownloadCards } from './ReportDownloadCards';

function saveFile(content: string | Uint8Array<ArrayBuffer>, mime: string, filename: string) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function TabReports({
    titulados = [],
    empleadores = [],
}: {
    titulados?: Row[];
    empleadores?: Row[];
}) {
    const scope = 'todos' as const;
    const corte = 5;
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
                const reporte = await cargarReporteEstadistico(scope, corte, controller.signal);
                if (!controller.signal.aborted) setResult({ key, report: reporte });
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
                XLSX.writeFile(wb, `Datos_Encuestas_Depurados_UMSS_${today}.xlsx`);
                setCleanExportFeedback('Datos depurados descargados en formato Excel (.xlsx).');
            } else if (format === 'csv-titulados') {
                const csv = cleanRowsToCsv(titulados);
                triggerDownload(csv, 'text/csv;charset=utf-8', `titulados_datos_limpios_${today}.csv`);
                setCleanExportFeedback('Archivo CSV de titulados descargado correctamente.');
            } else if (format === 'csv-empleadores') {
                const csv = cleanRowsToCsv(empleadores);
                triggerDownload(csv, 'text/csv;charset=utf-8', `empleadores_datos_limpios_${today}.csv`);
                setCleanExportFeedback('Archivo CSV de empleadores descargado correctamente.');
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
            const name = `Resultados_Estadisticos_UMSS_${report.generadoUTC.slice(0, 10)}_${report.huella.slice(0, 12)}`;
            if (format === 'xlsx') {
                const XLSX = await import('xlsx');
                const { reportToWorkbook } = await import('@/lib/excelExport');
                const book = reportToWorkbook(report);
                XLSX.writeFile(book, `${name}.xlsx`);
            } else if (format === 'csv' && current) {
                    const t = {
                    ...current,
                    columnas: [...current.columnas, 'reporte_sha256', 'version_datos_sha256', 'generado_utc', 'version_reporte', 'poblacion_hu4'],
                    filas: current.filas.map(row => [...row, report.huella, report.datosVersion ?? null, report.generadoUTC, report.version, report.parametros.scope]),
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
                <h2 id="hu5-title" className="text-2xl font-bold tracking-tight text-slate-900">
                    Descargas y resultados
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Consulta y descarga las respuestas organizadas, las tablas y los gráficos generados a partir de las encuestas.
                </p>
            </header>

            {/* SECCIÓN 1: EXPORTACIÓN DE DATOS LIMPIOS (DATA WRANGLING) */}
            <div className="rounded-2xl border-2 border-emerald-600/30 bg-emerald-50/40 p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-3">
                    <div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <Database className="h-3.5 w-3.5" /> Datos organizados
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 mt-1">1. Descargar respuestas depuradas</h3>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                        {titulados.length} titulados depurados · {empleadores.length} empleadores depurados
                    </span>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Respuestas procesadas y ordenadas para revisar, compartir o continuar el análisis. Se excluyen identificadores internos y datos de contacto.
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
                                <h4>Todos los datos en Excel</h4>
                            </div>
                            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                                Libro Excel (.xlsx) con una hoja de titulados, otra de empleadores, una hoja de referencia y una <strong>guía de datos</strong> que explica cada campo y transformación.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void handleCleanExport('excel')}
                            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            <span>Descargar datos en Excel</span>
                        </button>
                    </article>

                    {/* Card CSV Titulados */}
                    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <h4>Respuestas de titulados</h4>
                            </div>
                            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                                Respuestas de titulados en un archivo CSV sencillo. Para conocer el significado de cada campo, descarga también el libro Excel con la guía de datos.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void handleCleanExport('csv-titulados')}
                            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 hover:bg-slate-50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 transition-colors"
                        >
                            <Download className="h-4 w-4 text-slate-600" />
                            <span>Descargar titulados (CSV)</span>
                        </button>
                    </article>

                    {/* Card CSV Empleadores */}
                    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                                <FileText className="h-5 w-5 text-indigo-600" />
                                <h4>Respuestas de empleadores</h4>
                            </div>
                            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                                Respuestas de empleadores en un archivo CSV sencillo. Para conocer el significado de cada campo, descarga también el libro Excel con la guía de datos.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void handleCleanExport('csv-empleadores')}
                            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 hover:bg-slate-50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 transition-colors"
                        >
                            <Download className="h-4 w-4 text-slate-600" />
                            <span>Descargar empleadores (CSV)</span>
                        </button>
                    </article>
                </div>
            </div>

            {/* SECCIÓN 2: REPORTES ANALÍTICOS Y MATRICES DE FRECUENCIA CRUZADA */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-6">
                <div className="border-b border-slate-200 pb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-umss-azul/10 text-umss-azul">
                        <Layers className="h-3.5 w-3.5" /> Tablas y gráficos
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">2. Resultados para el análisis de mercado</h3>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600">
                        Consulta las tablas, comparaciones y gráficos generados a partir de las encuestas importadas.
                    </p>
                </div>

                {loading && (
                    <p role="status" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                        <RefreshCw className="h-4 w-4 animate-spin text-umss-azul" />
                        Preparando tablas y gráficos...
                    </p>
                )}

                {!loading && result.error && (
                    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        {result.error}
                    </p>
                )}

                {report && (
                    <article className="hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <h4 className="font-bold text-sm text-slate-900">Estado de la Generación Estadística</h4>
                            <span className="text-xs text-slate-500 font-mono">
                                Huella SHA-256: {report.huella.slice(0, 16)}...
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-700">
                            {report.titulados} titulados procesados · {report.empleadores} empleadores · {report.tablas.length} tablas de frecuencia generadas en backend · Versión {report.version}
                        </p>
                        <div className="mt-2 text-xs text-slate-600">
                            <p className="font-medium text-slate-700">Identificación de la generación</p>
                            <p className="mt-1.5 break-all font-mono text-[11px] bg-white p-2 rounded border border-slate-200">
                                Reporte SHA-256: {report.huella}<br />
                                Datos SHA-256: {report.datosVersion ?? 'Sin huella registrada'}
                            </p>
                        </div>
                    </article>
                )}

                <ReportDownloadCards report={report} current={current} disabled={disabled} selectedTable={current?.nombre ?? ''} onTableChange={setSelectedTable} onExport={format => void exportFile(format)} />

                {exporting && <p role="status" className="text-xs sm:text-sm text-slate-600 animate-pulse">Preparando archivo de descarga...</p>}
                {exportError && <p role="alert" className="text-xs sm:text-sm text-red-800 font-medium">{exportError}</p>}

                <div className="pt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200">
                    <button
                        onClick={() => setRefresh(v => v + 1)}
                        disabled={loading || exporting}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw size={14} />
                        <span>Regenerar análisis desde la base de datos</span>
                    </button>

                </div>
            </div>
        </section>
    );
}
