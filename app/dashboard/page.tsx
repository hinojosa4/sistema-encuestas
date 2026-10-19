// app/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { resumirFormacion, resumirFinanciamiento, filasCruceFinanciamiento } from '@/lib/postgraduate';
import * as XLSX from 'xlsx';
import {
    BarChart3, Download, GraduationCap, RefreshCw,
    Award, GitCompare, AlertCircle, Trash2
} from 'lucide-react';

import { TabTitulados } from '@/components/dashboard/TabTitulados';
import { TabEmpleadores } from '@/components/dashboard/TabEmpleadores';
import { TabChiCuadrada } from '@/components/dashboard/TabChiCuadrada';
import { HU1Overview } from '@/components/dashboard/HU1Overview';
import { DataCoverage } from '@/components/dashboard/DataCoverage';
import { resumirEmpleabilidad } from '@/lib/employability';
import { normalizeStored, safeSpreadsheetValue, type Row } from '@/lib/importPipeline';
import { readAllRows, databaseMessage } from '@/lib/surveyRepository';

async function loadSurveys() {
    const [t, e] = await Promise.all([readAllRows(supabase, 'encuesta_titulados'), readAllRows(supabase, 'encuesta_empleadores')]);
    return [t.map(r => normalizeStored(r, 'encuesta_titulados')), e.map(r => normalizeStored(r, 'encuesta_empleadores'))] as const;
}

export default function DashboardPage() {
    const [titulados, setTitulados] = useState<Row[]>([]);
    const [empleadores, setEmpleadores] = useState<Row[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [limiteExperiencia, setLimiteExperiencia] = useState(3);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'titulados' | 'formacion' | 'empleadores' | 'estadistica'>('titulados');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tData, eData] = await loadSurveys();
            setTitulados(tData);
            setEmpleadores(eData);
            setErrorMessage('');
        } catch (error) {
            setErrorMessage(databaseMessage(error));
        } finally {
            setLoading(false);
        }
    };

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

    // HU 4: Radar de Competencias Profesionales (Cálculo dinámico basado en respuestas reales)
    const calcularPromedioCampo = (campo: string): number => {
        const valoresValidos = empleadores
            .map((e) => Number(e[campo]))
            .filter((v) => !isNaN(v) && v > 0);
        if (valoresValidos.length === 0) return 0;
        const suma = valoresValidos.reduce((acc, val) => acc + val, 0);
        return Number((suma / valoresValidos.length).toFixed(2));
    };

    const radarCompetencias = [
        {
            competencia: 'Confianza Formadora',
            puntaje: calcularPromedioCampo('confianza_carrera_formadora'),
        },
        {
            competencia: 'Competencias Demostradas',
            puntaje: calcularPromedioCampo('consistencia_titulo_competencias'),
        },
        {
            competencia: 'Coherencia Perfil-Labor',
            puntaje: calcularPromedioCampo('coherencia_perfil_desempeno'),
        },
        {
            competencia: 'Ética y Responsabilidad',
            puntaje: calcularPromedioCampo('valores_etica_responsabilidad'),
        },
        {
            competencia: 'Destrezas TI y Práctica',
            puntaje: calcularPromedioCampo('evidencia_competencias_laborales'),
        },
    ];

    // Radar de Vinculación y Alianzas (ARCUSUR)
    const radarVinculacion = [
        {
            criterio: 'Búsqueda Talento UMSS',
            valor: calcularPromedioCampo('busqueda_talento_umss'),
        },
        {
            criterio: 'Vínculos Oportunidades',
            valor: calcularPromedioCampo('vinculos_oportunidades_laborales'),
        },
        {
            criterio: 'Difusión y Pasantías',
            valor: calcularPromedioCampo('participacion_difusion_pasantias'),
        },
        {
            criterio: 'Consulta Plan Estudios',
            valor: calcularPromedioCampo('consulta_retroalimentacion_plan'),
        },
        {
            criterio: 'Autoevaluación Continua',
            valor: calcularPromedioCampo('consulta_procesos_autoevaluacion'),
        },
    ];

    // HU 5: Exportación a Excel
    const exportarAExcel = () => {
        const wb = XLSX.utils.book_new();
        const exportRows = (rows: Row[]) => rows.map(r => Object.fromEntries(Object.entries(r)
            .filter(([k]) => k !== 'raw_data').map(([k, v]) => [k, safeSpreadsheetValue(v)])));
        const wsTitulados = XLSX.utils.json_to_sheet(exportRows(titulados));
        XLSX.utils.book_append_sheet(wb, wsTitulados, 'Titulados');
        const wsEmpleadores = XLSX.utils.json_to_sheet(exportRows(empleadores));
        XLSX.utils.book_append_sheet(wb, wsEmpleadores, 'Empleadores');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hu1.plazos), 'HU1_Plazos');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hu1.situaciones), 'HU1_Ocupacion');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hu1.experienciaGrupos), 'HU1_Experiencia');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows(formacion.areas)), 'HU2_Areas');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(formacion.niveles), 'HU2_Niveles_Cursados');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(financiamiento.distribucion), 'HU3_Fuentes');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasCruceFinanciamiento(financiamiento)), 'HU3_Cruce');
        const chi = financiamiento.chi;
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
            { indicador: 'Alcance', valor: 'Nivel cursado y financiamiento utilizado; no intenciones futuras.' },
            { indicador: 'Base total de titulados', valor: titulados.length },
            { indicador: 'HU2: interesados en posgrado', valor: formacion.interesados },
            { indicador: 'HU2: interesados sin area', valor: formacion.sinArea },
            { indicador: 'HU2: concentracion top 2 (%)', valor: formacion.concentracion.total ? formacion.concentracion.porcentaje : null },
            { indicador: 'HU3: base de fuentes', valor: financiamiento.fuentesValidas },
            { indicador: 'HU3: base del cruce', valor: chi.total },
            { indicador: 'HU3: sin posgrado', valor: financiamiento.exclusiones.sinPosgrado },
            { indicador: 'HU3: ruta no confirmada', valor: financiamiento.exclusiones.rutaNoConfirmada },
            { indicador: 'HU3: pares incompletos', valor: financiamiento.exclusiones.incompletas },
            { indicador: 'HU3: categorias no reconocidas', valor: financiamiento.exclusiones.noReconocidas },
            { indicador: 'Estado del contraste', valor: chi.estado },
            { indicador: 'Chi-cuadrada de Pearson', valor: chi.chi2 },
            { indicador: 'Grados de libertad', valor: chi.gradosLibertad },
            { indicador: 'p-valor asintotico (vacio si no interpretable)', valor: chi.pValor },
            { indicador: 'Alfa', valor: 0.05 },
            { indicador: 'Esperadas menores de 5', valor: chi.celdasMenor5 },
            { indicador: 'Minima esperada', valor: chi.minimaEsperada },
            { indicador: 'Datos faltantes en el instrumento', valor: 'Anio de egreso, nivel deseado y fuente prevista para futuros estudios.' },
            { indicador: 'Interpretacion', valor: chi.existeDependencia === null ? 'Sin conclusion inferencial; consultar estado y esperadas.' : chi.existeDependencia ? 'Evidencia de asociacion; no prueba causalidad.' : 'Sin evidencia suficiente de asociacion; no demuestra independencia.' },
        ]), 'Metodologia_HU2_HU3');
        XLSX.writeFile(wb, 'Estudio_Mercado_ARCUSUR_UMSS.xlsx');
    };

    // Función administrativa para limpiar datos de prueba
    const handleResetData = async () => {
        setDeleting(true);
        try {
            const tResult = await supabase.from('encuesta_titulados').delete().not('id', 'is', null);
            if (tResult.error) throw tResult.error;
            const eResult = await supabase.from('encuesta_empleadores').delete().not('id', 'is', null);
            if (eResult.error) throw eResult.error;
            setShowDeleteModal(false);
            await fetchData();
        } catch (err) {
            setErrorMessage(databaseMessage(err));
        } finally {
            setDeleting(false);
        }
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
                    {(titulados.length > 0 || empleadores.length > 0) && (
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-red-50 text-red-700 border border-red-200 font-medium px-3.5 py-2 rounded-lg text-xs sm:text-sm transition-colors shadow-sm"
                            title="Restablecer datos de la base de datos"
                        >
                            <Trash2 className="h-4 w-4" />
                            <span>Limpiar Datos</span>
                        </button>
                    )}

                    <button
                        onClick={exportarAExcel}
                        className="inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-4 py-2 rounded-lg text-xs sm:text-sm shadow transition-colors flex-1 sm:flex-initial"
                    >
                        <Download className="h-4 w-4" />
                        <span>Exportar datos y análisis (.xlsx)</span>
                    </button>
                </div>
            </div>

            {errorMessage && <p role="alert" className="p-4 bg-red-50 text-red-800 rounded-lg mb-4">{errorMessage}</p>}
            {/* Alerta formal si no hay datos */}
            {!errorMessage && titulados.length === 0 && empleadores.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 mb-8 flex items-start gap-3 text-amber-800 text-xs sm:text-sm">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">No se registran datos en el repositorio.</p>
                        <p className="mt-0.5 text-slate-600">
                            Ingrese a la sección <strong>Cargar Datos</strong> para importar los registros oficiales (.xlsx o .csv) y generar los indicadores analíticos.
                        </p>
                    </div>
                </div>
            )}

            <p className="mb-5 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5"><strong className="text-slate-800">{titulados.length}</strong> respuestas de titulados</span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5"><strong className="text-slate-800">{empleadores.length}</strong> respuestas de empleadores</span>
            </p>

            {/* Navegación por Pestañas Responsiva */}
            <nav aria-label="Secciones del análisis" className="flex border-b border-slate-200 mb-6 overflow-x-auto whitespace-nowrap custom-scrollbar">
                <button
                    onClick={() => setActiveTab('titulados')}
                    aria-current={activeTab === 'titulados' ? 'page' : undefined}
                    className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${activeTab === 'titulados'
                        ? 'border-umss-azul text-umss-azul bg-blue-50/50'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <GraduationCap className="h-4 w-4" />
                    <span>HU1 · Empleabilidad</span>
                </button>

                <button onClick={() => setActiveTab('formacion')} aria-current={activeTab === 'formacion' ? 'page' : undefined}
                    className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${activeTab === 'formacion' ? 'border-umss-azul text-umss-azul bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <GraduationCap className="h-4 w-4" /><span>HU2 · Formación continua</span>
                </button>

                <button
                    onClick={() => setActiveTab('estadistica')}
                    aria-current={activeTab === 'estadistica' ? 'page' : undefined}
                    className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${activeTab === 'estadistica'
                        ? 'border-umss-azul text-umss-azul bg-blue-50/50'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <GitCompare className="h-4 w-4" />
                    <span>HU3 · Financiamiento</span>
                </button>

                <button
                    onClick={() => setActiveTab('empleadores')}
                    aria-current={activeTab === 'empleadores' ? 'page' : undefined}
                    className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${activeTab === 'empleadores'
                        ? 'border-umss-azul text-umss-azul bg-blue-50/50'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Award className="h-4 w-4" />
                    <span>HU4 · Empleadores</span>
                </button>
            </nav>

            {/* Vistas según pestaña activa */}
            {activeTab === 'titulados' && (
                <HU1Overview summary={hu1} limite={limiteExperiencia} onLimite={setLimiteExperiencia} />
            )}
            {activeTab === 'formacion' && (
                <TabTitulados summary={formacion} />
            )}
            {activeTab === 'empleadores' && (
                <TabEmpleadores
                    radarCompetencias={radarCompetencias}
                    radarVinculacion={radarVinculacion}
                    totalEmpleadores={empleadores.length}
                />
            )}
            {activeTab === 'estadistica' && <TabChiCuadrada summary={financiamiento} />}
            <div className="mt-6"><DataCoverage /></div>

            {/* Modal de confirmación para Limpiar Datos */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
                            ¿Desea restablecer el repositorio de datos?
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
                            Esta acción eliminará todos los registros actuales de Titulados y Empleadores.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                disabled={deleting}
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={deleting}
                                onClick={handleResetData}
                                className="px-4 py-2 text-xs sm:text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg shadow transition-colors flex items-center gap-1.5"
                            >
                                {deleting ? (
                                    <>
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                        <span>Eliminando...</span>
                                    </>
                                ) : (
                                    <span>Sí, restablecer</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
