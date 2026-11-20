'use client';

import { Award, Download, GitCompare, GraduationCap, Layers } from 'lucide-react';

const sections = [
    { id: 'titulados', label: 'Empleabilidad', icon: GraduationCap },
    { id: 'formacion', label: 'Formación continua', icon: GraduationCap },
    { id: 'estadistica', label: 'Financiamiento', icon: GitCompare },
    { id: 'perfiles', label: 'Explora perfiles', icon: Layers },
    { id: 'empleadores', label: 'Formación y competencias', icon: Award },
    { id: 'reportes', label: 'Reportes', icon: Download },
] as const;

export type AnalysisSection = typeof sections[number]['id'];

export function AnalysisNavigation({ active, onChange }: { active: AnalysisSection; onChange: (section: AnalysisSection) => void }) {
    return <nav aria-label="Secciones del análisis" className="sticky top-2 z-20 mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-md backdrop-blur sm:grid-cols-3 lg:flex lg:flex-wrap">
        {sections.map(({ id, label, icon: Icon }) => <button
            key={id} type="button" aria-current={active === id ? 'page' : undefined}
            onClick={() => onChange(id)}
            className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center text-xs font-semibold transition-colors sm:px-3 sm:text-sm lg:flex-1 ${active === id
                ? 'border-umss-azul bg-umss-azul text-white shadow-sm'
                : 'border-transparent bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950'}`}
        >
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" /><span>{label}</span>
            {active === id && <span className="sr-only"> · Sección seleccionada</span>}
        </button>)}
    </nav>;
}
