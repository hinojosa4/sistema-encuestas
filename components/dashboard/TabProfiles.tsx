'use client';

import type { MultivariateProfile } from '@/lib/employabilityAnalysis';
import type { ReportProfile } from '@/lib/reportMultivariate';
import { ReportMultivariateProfiles } from './ReportMultivariateProfiles';

function toReportProfile(profile: MultivariateProfile): ReportProfile {
    const rowTotals = new Map<string, number>();
    profile.cells.forEach(cell => rowTotals.set(cell.row, (rowTotals.get(cell.row) ?? 0) + cell.count));

    return {
        id: profile.id,
        title: profile.title,
        description: profile.description,
        rowLabel: profile.rowLabel,
        columnLabel: profile.columnLabel,
        metricLabel: 'Experiencia media',
        metricType: 'average',
        rows: [...new Set(profile.cells.map(cell => cell.row))],
        columns: [...new Set(profile.cells.map(cell => cell.column))],
        cells: profile.cells.map(cell => ({
            row: cell.row,
            column: cell.column,
            count: cell.count,
            percentOfRow: rowTotals.get(cell.row) ? cell.count / (rowTotals.get(cell.row) ?? 1) * 100 : 0,
            average: cell.averageExperience,
        })),
        total: profile.total,
        excluded: profile.excluded,
        note: 'La experiencia media ayuda a comparar grupos dentro de la encuesta. Es un resumen descriptivo de las respuestas disponibles.',
    };
}

type TabProfilesProps = {
    formationProfiles: ReportProfile[];
    employabilityProfiles: MultivariateProfile[];
    employerProfiles: ReportProfile[];
};

export function TabProfiles({ formationProfiles, employabilityProfiles, employerProfiles }: TabProfilesProps) {
    const employabilityReportProfiles = employabilityProfiles.map(toReportProfile);

    return <section className="space-y-8" aria-labelledby="explora-perfiles-title">
        <header className="rounded-2xl border border-umss-azul/15 bg-blue-50/50 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Vista comparativa</p>
            <h2 id="explora-perfiles-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Explora perfiles</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">Consulta combinaciones de respuestas para reconocer patrones de formacion, trayectoria laboral y demanda de las organizaciones.</p>
        </header>

        <ReportMultivariateProfiles profiles={employabilityReportProfiles} title="Trayectoria laboral" />
        <ReportMultivariateProfiles profiles={formationProfiles} title="Formacion continua" />
        <ReportMultivariateProfiles profiles={employerProfiles} title="Demanda laboral" />
    </section>;
}
