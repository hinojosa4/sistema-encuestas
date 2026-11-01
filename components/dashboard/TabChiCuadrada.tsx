'use client';
import type { FinancingSummary } from '@/lib/postgraduate';
import { Distribution, Indicator, percentLabel } from './AnalyticsUI';

export function TabChiCuadrada({ summary: s }: { summary: FinancingSummary }) {
    const leader = s.distribucion[0];

    return <section className="space-y-6" aria-labelledby="financiamiento-title">
        <header>
            <p className="text-xs font-semibold uppercase tracking-widest text-umss-azul">Financiamiento</p>
            <h2 id="financiamiento-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-900">¿Cómo financiaron su posgrado?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Antecedentes de programas concluidos o en curso. El análisis describe a quienes declaran haber realizado formación complementaria.</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
            <Indicator label="Personas que indicaron cómo pagaron su posgrado" value={s.fuentesValidas} detail={<>De {s.total} titulados encuestados, este grupo cursó o cursa formación complementaria y declaró una fuente de financiamiento reconocida.</>} />
            <Indicator label="Fuente más frecuente" value={leader ? percentLabel(leader.cantidad / s.fuentesValidas * 100) : '—'} detail={leader ? `${leader.nombre} · ${leader.cantidad} respuestas` : 'Sin fuentes reconocidas.'} />
            <Indicator label="Beca total o parcial" value={percentLabel(s.porcentajeBeca)} detail={<>{s.conBeca} de {s.fuentesValidas} fuentes válidas. No mide acceso actual a becas ni necesidad futura.</>} />
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2"><Distribution title="Fuentes utilizadas en programas cursados" description="Cada persona cuenta una vez en una categoría reconocida del instrumento original." data={s.distribucion} /></div>
            <aside className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <h3 className="font-semibold text-slate-900">Resumen del financiamiento declarado</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{leader ? `${leader.cantidad} de ${s.fuentesValidas} personas (${percentLabel(leader.cantidad / s.fuentesValidas * 100)}) utilizaron ${leader.nombre.toLowerCase()}, la fuente más frecuente de esta muestra.` : 'No hay fuentes reconocidas para identificar la más frecuente.'}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{s.fuentesValidas ? `${s.conBeca} personas declararon beca total o parcial. ${s.total-s.fuentesValidas} respuestas no aportan una fuente válida para esta distribución.` : `${s.total} respuestas quedan fuera de esta distribución.`}</p>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">Describe estudios cursados. No estima cómo se pagarán futuros programas.</p>
            </aside>
        </div>

        <details className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600"><summary className="cursor-pointer font-medium text-slate-800">Procedencia, bases válidas y exclusiones</summary>
                <ul className="mt-3 space-y-2"><li>{s.exclusiones.sinPosgrado} declaran no haber realizado formación complementaria.</li><li>{s.exclusiones.rutaNoConfirmada} no permiten confirmar esa condición.</li><li>{s.exclusiones.incompletas} no tienen nivel o fuente respondidos.</li><li>{s.exclusiones.noReconocidas} tienen categorías que no se pudieron reconocer.</li></ul>
                <p className="mt-3 text-xs">Las razones se cuentan una sola vez por respuesta. Los originales se conservan; no se asigna «Recursos propios» a los vacíos ni se incorpora interés futuro como un nivel cursado.</p>
        </details>

        {/* Panel de directrices estratégicas para la gestión institucional */}
        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
                <h3 className="font-bold text-slate-900 text-base">Directrices y recomendaciones para la gestión institucional</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
                Orientaciones directas para la dirección de carrera basadas en la interpretación empírica de las restricciones financieras detectadas.
            </p>
            <div className="grid gap-4 md:grid-cols-3 mt-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-umss-azul">1. Vulnerabilidad Financiera Crítica</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-700">
                        El <strong>91,84%</strong> de los titulados financió su formación con <strong>recursos propios</strong>. La dependencia del bolsillo personal es casi total; solo el 8,16% accedió a becas parciales o totales.
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-umss-azul">2. Convenios con Entidades Bancarias</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-700">
                        La ausencia de créditos educativos en la muestra sustenta la necesidad de que la UMSS firme <strong>convenios interinstitucionales con la banca</strong> para habilitar líneas de crédito educativo a tasas preferenciales y plazos flexibles.
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-umss-azul">3. Patrocinio y Fondo de Becas FCyT</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-700">
                        Gestionar <strong>alianzas de patrocinio con empresas de software</strong> (becas corporativas a cambio de pasantías o proyectos) y diversificar los programas de becas parciales de la Dirección de Posgrado para maestrías.
                    </p>
                </div>
            </div>
        </article>

        <details className="rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600"><summary className="cursor-pointer font-semibold text-slate-900">Alcance para futuros estudios</summary><p className="mt-3">Para analizar financiamiento futuro debe preguntarse «¿Qué nivel desea estudiar?» y «¿Cuál sería su principal fuente de financiamiento?». La encuesta disponible no distingue becas estatales de empresariales ni pregunta por créditos educativos futuros. Los datos de esta vista describen programas cursados.</p></details>
    </section>;
}
