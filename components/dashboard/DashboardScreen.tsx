// app/dashboard/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { resumirFormacion, resumirFinanciamiento } from '@/lib/postgraduate';
import {
    BarChart3, RefreshCw, GraduationCap, Building2
} from 'lucide-react';

import { TabTitulados } from '@/components/dashboard/TabTitulados';
import { TabEmpleadores } from '@/components/dashboard/TabEmpleadores';
import { TabChiCuadrada } from '@/components/dashboard/TabChiCuadrada';
import { TabReports } from '@/components/dashboard/TabReports';
import { TabProfiles } from '@/components/dashboard/TabProfiles';
import { HU1Overview } from '@/components/dashboard/HU1Overview';
import { AnalysisNavigation, type AnalysisSection } from '@/components/dashboard/AnalysisNavigation';
import { EmptyAnalysis } from '@/components/dashboard/EmptyAnalysis';
import { resumirEmpleabilidad } from '@/lib/employability';
import { resumirCompetencias, type GraduateScope } from '@/lib/competencies';
import { normalizeStored, type Row } from '@/lib/importPipeline';
import { readAllRows, databaseMessage } from '@/lib/surveyRepository';
import { buildCrossAnalyses } from '@/lib/crossAnalysis';
import { buildEmployabilityProfiles, buildEmployabilityRelations } from '@/lib/employabilityAnalysis';
import { buildFormationRelations } from '@/lib/formationAnalysis';
import { buildEmployerReportProfiles, buildFormationReportProfiles } from '@/lib/reportMultivariate';
import { CrossAnalyses } from './CrossAnalyses';
import { EmergingAreasPanel } from './EmergingAreasPanel';
import { QuickExportMenu } from './QuickExportMenu';

async function loadSurveys() {
    const [t, e] = await Promise.all([readAllRows(supabase, 'encuesta_titulados'), readAllRows(supabase, 'encuesta_empleadores')]);
    return [t.map(r => normalizeStored(r, 'encuesta_titulados')), e.map(r => normalizeStored(r, 'encuesta_empleadores'))] as const;
}

export default function DashboardScreen() {
    const [titulados, setTitulados] = useState<Row[]>([]);
    const [empleadores, setEmpleadores] = useState<Row[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [limiteExperiencia, setLimiteExperiencia] = useState(5);
    const [competencyScope, setCompetencyScope] = useState<GraduateScope>('todos');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<AnalysisSection>('titulados');

    useEffect(() => {
        let active = true;
        loadSurveys().then(([t, e]) => { if (active) { setTitulados(t); setEmpleadores(e); } })
            .catch(error => { if (active) setErrorMessage(databaseMessage(error)); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const hu1 = resumirEmpleabilidad(titulados, limiteExperiencia);
    const employabilityRelations = useMemo(() => buildEmployabilityRelations(titulados, limiteExperiencia), [titulados, limiteExperiencia]);
    const employabilityProfiles = useMemo(() => buildEmployabilityProfiles(titulados), [titulados]);

    const formacion = resumirFormacion(titulados);
    const formationRelations = useMemo(() => buildFormationRelations(titulados), [titulados]);
    const formationReportProfiles = useMemo(() => buildFormationReportProfiles(titulados), [titulados]);
    const employerReportProfiles = useMemo(() => buildEmployerReportProfiles(empleadores), [empleadores]);
    const financiamiento = resumirFinanciamiento(titulados);

    const competencias = useMemo(() => resumirCompetencias(titulados, empleadores, competencyScope), [titulados, empleadores, competencyScope]);
    const sectionHasData = titulados.length > 0 ||
        ((activeTab === 'empleadores' || activeTab === 'reportes' || activeTab === 'perfiles') && empleadores.length > 0);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
                <RefreshCw className="h-8 w-8 animate-spin text-umss-azul mb-3" />
                <p className="text-slate-600 text-sm font-medium text-center">
                    Sincronizando indicadores y procesando métricas analíticas...
                </p>
            </div>
        );
    }

    return (
        <div className="dashboard-content max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Encabezado con menú de exportación directa */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200 mb-6 gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-umss-azul flex items-center gap-2">
                        <BarChart3 className="text-umss-rojo h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0" />
                        <span>Resumen de resultados</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Información sobre empleo, formación y necesidades del mercado laboral.
                    </p>
                </div>

                <QuickExportMenu
                    titulados={titulados}
                    empleadores={empleadores}
                    onOpenReports={() => setActiveTab('reportes')}
                />

            </div>

            {errorMessage && <p role="alert" className="p-4 bg-red-50 text-red-800 rounded-lg mb-4">{errorMessage}</p>}

            {!errorMessage && <dl aria-label="Respuestas registradas" className="mb-6 grid grid-cols-2 gap-3 sm:gap-4">
                {[
                    { label: 'Respuestas de titulados', count: titulados.length, Icon: GraduationCap },
                    { label: 'Respuestas de empleadores', count: empleadores.length, Icon: Building2 },
                ].map(({ label, count, Icon }) => <div key={label} className="flex min-w-0 items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:px-5 sm:py-4">
                    <span aria-hidden="true" className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-umss-azul sm:inline-flex"><Icon className="h-6 w-6" /></span>
                    <div className="flex min-w-0 flex-col-reverse gap-1">
                        <dt className="text-sm font-medium leading-snug text-slate-600">{label}</dt>
                        <dd className="text-2xl font-bold leading-none tracking-tight text-slate-900 tabular-nums sm:text-3xl">{count.toLocaleString('es-BO')}</dd>
                    </div>
                </div>)}
            </dl>}

            {/* Navegación por Pestañas Responsiva */}
            <AnalysisNavigation active={activeTab} onChange={setActiveTab} />

            {/* Vistas según pestaña activa */}
            {!errorMessage && !sectionHasData && <EmptyAnalysis section={activeTab} />}
            {!errorMessage && sectionHasData && <>
                {activeTab === 'titulados' && (
                    <HU1Overview summary={hu1} limite={limiteExperiencia} onLimite={setLimiteExperiencia}
                        relations={employabilityRelations} profiles={employabilityProfiles} />
                )}
                {activeTab === 'formacion' && (
                    <TabTitulados summary={formacion} relations={formationRelations} reportProfiles={formationReportProfiles} />
                )}
                {activeTab === 'empleadores' && (
                    <><TabEmpleadores summary={competencias} onScope={setCompetencyScope} empleadores={empleadores} reportProfiles={employerReportProfiles} /><div className="mt-6"><EmergingAreasPanel rows={empleadores} onChange={setEmpleadores} /></div></>
                )}
                {activeTab === 'perfiles' && (
                    <TabProfiles
                        formationProfiles={formationReportProfiles}
                        employabilityProfiles={employabilityProfiles}
                        employerProfiles={employerReportProfiles}
                    />
                )}
                {activeTab === 'estadistica' && (
                    <div className="space-y-8">
                        <TabChiCuadrada summary={financiamiento} />
                        <section className="space-y-4 border-t border-slate-200 pt-8" aria-labelledby="estadistica-centralizada-title">
                            <header className="rounded-2xl border border-umss-azul/15 bg-blue-50/50 p-5 sm:p-6">
                                <div className="flex items-start gap-3">
                                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-umss-azul" aria-hidden="true" />
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Comparación de respuestas</p>
                                        <h3 id="estadistica-centralizada-title" className="mt-1 text-xl font-bold tracking-tight text-slate-900">Comparaciones entre respuestas</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                            Selecciona una comparación para consultar cómo se relacionan dos respuestas. Las tablas muestran únicamente los datos disponibles y válidos.
                                        </p>
                                    </div>
                                </div>
                            </header>
                            <CrossAnalyses analyses={buildCrossAnalyses(titulados, empleadores)} />
                        </section>
                    </div>
                )}
                {activeTab === 'reportes' && (
                    <TabReports
                        titulados={titulados}
                        empleadores={empleadores}
                    />
                )}
            </>}

        </div>
    );
}
