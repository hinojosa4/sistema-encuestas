import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AnalysisReport } from '@/lib/reports';

type ReportTable = AnalysisReport['tablas'][number];

export function ReportDownloadCards({
    report,
    current,
    disabled,
    selectedTable,
    onTableChange,
    onExport,
}: {
    report?: AnalysisReport;
    current?: ReportTable;
    disabled: boolean;
    selectedTable: string;
    onTableChange: (value: string) => void;
    onExport: (format: 'xlsx' | 'csv' | 'pdf') => void;
}) {
    return <div className="grid items-start gap-4 lg:grid-cols-3">
        <DownloadCard
            icon={<FileText className="h-5 w-5 text-umss-azul" />}
            title="Resultados estadísticos (PDF)"
            description="Tablas, comparaciones, gráficos y diagramas de radar organizados por secciones para su análisis y presentación."
            button="Descargar resultados PDF"
            disabled={disabled}
            tone="blue"
            onClick={() => onExport('pdf')}
        />
        <DownloadCard
            icon={<FileSpreadsheet className="h-5 w-5 text-teal-700" />}
            title="Libro de tablas y métricas"
            description="Libro Excel (.xlsx) con tablas de comparación, porcentajes, resúmenes y una hoja de referencia."
            button="Descargar tablas en Excel"
            disabled={disabled}
            tone="teal"
            onClick={() => onExport('xlsx')}
        />
        <article className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <FileText className="h-5 w-5 text-slate-600" />
                    <h4>Descargar una tabla</h4>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">Elige una tabla específica para revisarla o incorporarla al análisis del equipo.</p>
                <label className="mt-3 block text-xs font-semibold text-slate-700">
                    Tabla disponible
                    <select disabled={!report} value={selectedTable} onChange={event => onTableChange(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-xs">
                        {report?.tablas.map(table => <option key={table.nombre} value={table.nombre}>{table.nombre.replace(/^HU[1-5]_/, '').replaceAll('_', ' ')}</option>)}
                    </select>
                </label>
            </div>
            <button disabled={disabled || !current} type="button" onClick={() => onExport('csv')} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-400 px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:text-sm">
                <Download className="h-4 w-4 text-slate-600" /> Descargar tabla (CSV)
            </button>
        </article>
    </div>;
}

function DownloadCard({ icon, title, description, button, disabled, tone, onClick }: {
    icon: ReactNode;
    title: string;
    description: string;
    button: string;
    disabled: boolean;
    tone: 'blue' | 'teal';
    onClick: () => void;
}) {
    const buttonClass = tone === 'blue' ? 'bg-umss-azul hover:bg-blue-900' : 'bg-teal-800 hover:bg-teal-900';
    return <article className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">{icon}<h4>{title}</h4></div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{description}</p>
        </div>
        <button disabled={disabled} type="button" onClick={onClick} className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold text-white shadow transition-colors disabled:opacity-50 sm:text-sm ${buttonClass}`}>
            <Download className="h-4 w-4" /> {button}
        </button>
    </article>;
}
