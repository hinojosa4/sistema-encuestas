import Link from 'next/link';
import { Upload } from 'lucide-react';
import type { AnalysisSection } from './AnalysisNavigation';

const titles: Record<AnalysisSection, string> = {
    titulados: 'Empleabilidad',
    formacion: 'Formación continua',
    estadistica: 'Financiamiento',
    empleadores: 'Formación y competencias',
    reportes: 'Reportes',
};

export function EmptyAnalysis({ section }: { section: AnalysisSection }) {
    return <section aria-labelledby="empty-analysis-title" className="flex flex-col items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <h2 id="empty-analysis-title" className="text-base font-semibold text-slate-900">{titles[section]}</h2>
            <p className="mt-1 text-sm text-slate-500">{section === 'empleadores' || section === 'reportes'
                ? 'Carga respuestas para consultar los resultados.'
                : 'Carga respuestas de titulados para consultar los resultados.'}</p>
        </div>
        <Link href="/upload" className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003770]">
            <Upload size={16} aria-hidden="true" />Cargar datos
        </Link>
    </section>;
}
