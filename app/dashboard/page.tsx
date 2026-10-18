// app/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    calcularEstadisticasUnivariadas,
    calcularDistribucionFrecuencias,
    calcularChiCuadrada,
} from '@/lib/statistics';
import * as XLSX from 'xlsx';
import {
    BarChart3, Download, GraduationCap, RefreshCw,
    Award, GitCompare, AlertCircle, Trash2
} from 'lucide-react';

import { MetricCards } from '@/components/dashboard/MetricCards';
import { TabTitulados } from '@/components/dashboard/TabTitulados';
import { TabEmpleadores } from '@/components/dashboard/TabEmpleadores';
import { TabChiCuadrada } from '@/components/dashboard/TabChiCuadrada';

export default function DashboardPage() {
    const [titulados, setTitulados] = useState<any[]>([]);
    const [empleadores, setEmpleadores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'titulados' | 'empleadores' | 'estadistica'>('titulados');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: tData } = await supabase.from('encuesta_titulados').select('*');
            const { data: eData } = await supabase.from('encuesta_empleadores').select('*');

            setTitulados(tData || []);
            setEmpleadores(eData || []);
        } catch (error) {
            console.error('Error al sincronizar datos institucionales:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // HU 1: Estadísticos descriptivos
    const statsAntiguedad = calcularEstadisticasUnivariadas(
        titulados.map((t) => Number(t.anios_vida_profesional || 0))
    );
    const statsDesempleo = calcularEstadisticasUnivariadas(
        titulados.map((t) => Number(t.tiempo_desempleado || 0))
    );

    // HU 2: Áreas de demanda tecnológica
    const areasInteres = calcularDistribucionFrecuencias(
        titulados
            .map((t) => t.area_interes_posgrado || (t.nivel_posgrado_cursado ? 'Posgrado Cursado' : ''))
            .filter(Boolean)
    );

    // HU 3: Prueba Chi-cuadrada (Posgrado vs Financiamiento)
    const chiData = calcularChiCuadrada(
        titulados
            .filter(
                (t) =>
                    (t.nivel_posgrado_cursado || t.interes_futuro_posgrado) &&
                    (t.financiamiento_posgrado_cursado || t.financiamiento_posgrado)
            )
            .map((t) => ({
                varX: t.nivel_posgrado_cursado || (t.interes_futuro_posgrado === 'SI' ? 'Interés Futuro' : 'Sin Posgrado'),
                varY: t.financiamiento_posgrado_cursado || t.financiamiento_posgrado || 'Recursos Propios',
            }))
    );

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
        const wsTitulados = XLSX.utils.json_to_sheet(titulados);
        XLSX.utils.book_append_sheet(wb, wsTitulados, 'Titulados');
        const wsEmpleadores = XLSX.utils.json_to_sheet(empleadores);
        XLSX.utils.book_append_sheet(wb, wsEmpleadores, 'Empleadores');
        XLSX.writeFile(wb, 'Estudio_Mercado_ARCUSUR_UMSS.xlsx');
    };

    // Función administrativa para limpiar datos de prueba
    const handleResetData = async () => {
        setDeleting(true);
        try {
            await supabase.from('encuesta_titulados').delete().neq('id', 0);
            await supabase.from('encuesta_empleadores').delete().neq('id', 0);
            setShowDeleteModal(false);
            await fetchData();
        } catch (err) {
            console.error('Error al reiniciar los datos:', err);
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
                        <span>Exportar Datos Limpios (.xlsx)</span>
                    </button>
                </div>
            </div>

            {/* Alerta formal si no hay datos */}
            {titulados.length === 0 && empleadores.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 mb-8 flex items-start gap-3 text-amber-800 text-xs sm:text-sm">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">No se registran datos en el repositorio.</p>
                        <p className="mt-0.5 text-slate-600">
                            Ingrese a la sección <strong>"Cargar Datos"</strong> para importar los registros oficiales (.xlsx o .csv) y generar los indicadores analíticos.
                        </p>
                    </div>
                </div>
            )}

            {/* Tarjetas Superiores */}
            <MetricCards
                statsAntiguedad={statsAntiguedad}
                statsDesempleo={statsDesempleo}
                totalTitulados={titulados.length}
                totalEmpleadores={empleadores.length}
            />

            {/* Navegación por Pestañas Responsiva */}
            <div className="flex border-b border-slate-200 mb-6 overflow-x-auto whitespace-nowrap custom-scrollbar">
                <button
                    onClick={() => setActiveTab('titulados')}
                    className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${activeTab === 'titulados'
                        ? 'border-umss-azul text-umss-azul bg-blue-50/50'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <GraduationCap className="h-4 w-4" />
                    <span>1. Titulados y Formación (HU 1 & HU 2)</span>
                </button>

                <button
                    onClick={() => setActiveTab('empleadores')}
                    className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${activeTab === 'empleadores'
                        ? 'border-umss-azul text-umss-azul bg-blue-50/50'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Award className="h-4 w-4" />
                    <span>2. Empleadores y Competencias (HU 4)</span>
                </button>

                <button
                    onClick={() => setActiveTab('estadistica')}
                    className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${activeTab === 'estadistica'
                        ? 'border-umss-azul text-umss-azul bg-blue-50/50'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <GitCompare className="h-4 w-4" />
                    <span>3. Prueba Chi-Cuadrada e Independencia (HU 3)</span>
                </button>
            </div>

            {/* Vistas según pestaña activa */}
            {activeTab === 'titulados' && <TabTitulados areasInteres={areasInteres} titulados={titulados} />}
            {activeTab === 'empleadores' && (
                <TabEmpleadores
                    radarCompetencias={radarCompetencias}
                    radarVinculacion={radarVinculacion}
                    totalEmpleadores={empleadores.length}
                />
            )}
            {activeTab === 'estadistica' && <TabChiCuadrada chiData={chiData} />}

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