// app/dashboard/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { resumirFormacion, resumirFinanciamiento, filasCruceFinanciamiento } from '@/lib/postgraduate';
import * as XLSX from 'xlsx';
import {
    BarChart3, Download, RefreshCw
} from 'lucide-react';

import { TabTitulados } from '@/components/dashboard/TabTitulados';
import { TabEmpleadores } from '@/components/dashboard/TabEmpleadores';
import { TabChiCuadrada } from '@/components/dashboard/TabChiCuadrada';
import { TabReports } from '@/components/dashboard/TabReports';
import { HU1Overview } from '@/components/dashboard/HU1Overview';
import { AnalysisNavigation, type AnalysisSection } from '@/components/dashboard/AnalysisNavigation';
import { DataCoverage } from '@/components/dashboard/DataCoverage';
import { EmptyAnalysis } from '@/components/dashboard/EmptyAnalysis';
import { resumirEmpleabilidad } from '@/lib/employability';
import { resumirCompetencias, exportCompetencies, type GraduateScope } from '@/lib/competencies';
import { normalizeStored, safeSpreadsheetValue, type Row } from '@/lib/importPipeline';
import { readAllRows, databaseMessage } from '@/lib/surveyRepository';

async function loadSurveys() {
    const [t, e] = await Promise.all([readAllRows(supabase, 'encuesta_titulados'), readAllRows(supabase, 'encuesta_empleadores')]);
    return [t.map(r => normalizeStored(r, 'encuesta_titulados')), e.map(r => normalizeStored(r, 'encuesta_empleadores'))] as const;
}

export default function DashboardScreen() {
    const [titulados, setTitulados] = useState<Row[]>([]);
    const [empleadores, setEmpleadores] = useState<Row[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [limiteExperiencia, setLimiteExperiencia] = useState(3);
    const [competencyScope, setCompetencyScope] = useState<GraduateScope>('experiencia');
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

    const formacion = resumirFormacion(titulados);
    const financiamiento = resumirFinanciamiento(titulados);

    const competencias = useMemo(() => resumirCompetencias(titulados, empleadores, competencyScope), [titulados, empleadores, competencyScope]);
    const sectionHasData = titulados.length > 0 ||
        ((activeTab === 'empleadores' || activeTab === 'reportes') && empleadores.length > 0);

    // HU 5: Exportación a Excel
    const exportarAExcel = () => {
        const wb = XLSX.utils.book_new();
        const exportRows = (rows: Row[]) => rows.map(r => Object.fromEntries(Object.entries(r)
            .filter(([k]) => k !== 'raw_data').map(([k, v]) => [k, safeSpreadsheetValue(v)])));
        const wsTitulados = XLSX.utils.json_to_sheet(exportRows(titulados));
        XLSX.utils.book_append_sheet(wb, wsTitulados, 'Titulados');
        const wsEmpleadores = XLSX.utils.json_to_sheet(exportRows(empleadores));
        XLSX.utils.book_append_sheet(wb, wsEmpleadores, 'Empleadores');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hu1.plazos), 'Plazos');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hu1.situaciones), 'Ocupacion');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hu1.experienciaGrupos), 'Experiencia');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows(formacion.areas)), 'Areas');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(formacion.niveles), 'Niveles_Cursados');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(financiamiento.distribucion), 'Fuentes');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasCruceFinanciamiento(financiamiento)), 'Cruce');
        const chi = financiamiento.chi;
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
            { indicador: 'Alcance', valor: 'Nivel cursado y financiamiento utilizado; no intenciones futuras.' },
            { indicador: 'Base total de titulados', valor: titulados.length },
            { indicador: 'interesados en posgrado', valor: formacion.interesados },
            { indicador: 'interesados sin area', valor: formacion.sinArea },
            { indicador: 'concentracion top 2 (%)', valor: formacion.concentracion.total ? formacion.concentracion.porcentaje : null },
            { indicador: 'base de fuentes', valor: financiamiento.fuentesValidas },
            { indicador: 'base del cruce', valor: chi.total },
            { indicador: 'sin posgrado', valor: financiamiento.exclusiones.sinPosgrado },
            { indicador: 'ruta no confirmada', valor: financiamiento.exclusiones.rutaNoConfirmada },
            { indicador: 'pares incompletos', valor: financiamiento.exclusiones.incompletas },
            { indicador: 'categorias no reconocidas', valor: financiamiento.exclusiones.noReconocidas },
            { indicador: 'Estado del contraste', valor: chi.estado },
            { indicador: 'Chi-cuadrada de Pearson', valor: chi.chi2 },
            { indicador: 'Grados de libertad', valor: chi.gradosLibertad },
            { indicador: 'p-valor asintotico (vacio si no interpretable)', valor: chi.pValor },
            { indicador: 'Alfa', valor: chi.alfa },
            { indicador: 'Esperadas menores de 5', valor: chi.celdasMenor5 },
            { indicador: 'Minima esperada', valor: chi.minimaEsperada },
            { indicador: 'Datos faltantes en el instrumento', valor: 'Anio de egreso, nivel deseado y fuente prevista para futuros estudios.' },
            { indicador: 'Interpretacion', valor: chi.existeDependencia === null ? 'Sin conclusion inferencial; consultar estado y esperadas.' : chi.existeDependencia ? 'Evidencia de asociacion; no prueba causalidad.' : 'Sin evidencia suficiente de asociacion; no demuestra independencia.' },
        ]), 'Metodologia_Posgrados');
        const hu4 = exportCompetencies(competencias);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows(hu4.estadisticas)), 'Estadisticos');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows(hu4.categorias)), 'Categorias');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows(hu4.selecciones)), 'Mejoras');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows(hu4.temas)), 'Demanda');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows(hu4.metodologia)), 'Metodologia');
        XLSX.writeFile(wb, 'Estudio_Mercado_ARCUSUR_UMSS.xlsx');
    };

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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Encabezado sin redundancias */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200 mb-6 gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-umss-azul flex items-center gap-2">
                        <BarChart3 className="text-umss-rojo h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0" />
                        <span>Panel Analítico y Toma de Decisiones (ARCUSUR)</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Indicadores empíricos de empleabilidad, formación continua y pertinencia curricular.
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">


                    <button
                        onClick={() => setActiveTab('reportes')}
                        className="inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-4 py-2 rounded-lg text-xs sm:text-sm shadow transition-colors flex-1 sm:flex-initial"
                    >
                        <Download className="h-4 w-4" />
                        <span>Reportes y exportación</span>
                    </button>
                </div>
            </div>

            {errorMessage && <p role="alert" className="p-4 bg-red-50 text-red-800 rounded-lg mb-4">{errorMessage}</p>}

            <p className="mb-5 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5"><strong className="text-slate-800">{titulados.length}</strong> respuestas de titulados</span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5"><strong className="text-slate-800">{empleadores.length}</strong> respuestas de empleadores</span>
            </p>

            {/* Navegación por Pestañas Responsiva */}
            <AnalysisNavigation active={activeTab} onChange={setActiveTab} />

            {/* Vistas según pestaña activa */}
            {!errorMessage && !sectionHasData && <EmptyAnalysis section={activeTab} />}
            {!errorMessage && sectionHasData && <>
            {activeTab === 'titulados' && (
                <HU1Overview summary={hu1} limite={limiteExperiencia} onLimite={setLimiteExperiencia} />
            )}
            {activeTab === 'formacion' && (
                <TabTitulados summary={formacion} />
            )}
            {activeTab === 'empleadores' && (
                <TabEmpleadores summary={competencias} onScope={setCompetencyScope} />
            )}
            {activeTab === 'estadistica' && <TabChiCuadrada summary={financiamiento} />}
            {activeTab === 'reportes' && <TabReports scope={competencyScope} corte={limiteExperiencia} onScope={setCompetencyScope} onCorte={setLimiteExperiencia} onRawExport={exportarAExcel} />}
            <div className="mt-6"><DataCoverage tieneEgreso={hu1.cohortes.length > 0} /></div>
            </>}

        </div>
    );
}
