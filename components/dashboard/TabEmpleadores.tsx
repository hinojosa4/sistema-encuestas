'use client';
import { useState } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import type { CompetencySummary, GraduateScope, MultipleSummary, RatingSummary } from '@/lib/competencies';
import { themeRules } from '@/lib/competencies';
import { Distribution, Indicator, percentLabel } from './AnalyticsUI';

const scoreLabel = (value: number | null) => value === null ? '—' : value.toLocaleString('es-BO', { maximumFractionDigits: 2 });

function RatingPanel({ items, title }: { items: RatingSummary[]; title: string }) {
    const [field, setField] = useState(items[0]?.campo ?? '');
    const selected = items.find(r => r.campo === field) ?? items[0];
    if (!selected) return null;
    return <div className="space-y-5">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h3 className="font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Escala original de acuerdo: 1–{selected.maximo}. Las cifras resumen respuestas ordinales; no representan dominio de una habilidad. Cada pregunta tiene su propia base válida.</p>
            <div className="mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label={title}>
                <table className="w-full min-w-[650px] text-left text-sm">
                    <caption className="sr-only">{title}. Media, mediana, desviación estándar muestral y desacuerdo por pregunta.</caption>
                    <thead className="border-b border-slate-200 text-xs text-slate-600"><tr><th scope="col" className="p-3">Pregunta</th><th scope="col" className="p-3 text-right">Válidas</th><th scope="col" className="p-3 text-right">Media</th><th scope="col" className="p-3 text-right">Mediana</th><th scope="col" className="p-3 text-right">Desv. muestral</th><th scope="col" className="p-3 text-right">Desacuerdo</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{items.map(r => <tr key={r.campo} className={r.campo === selected.campo ? 'bg-teal-50' : ''}>
                        <th scope="row" className="p-3 font-medium text-slate-800">{r.titulo}</th><td className="p-3 text-right tabular-nums">{r.validas}</td><td className="p-3 text-right tabular-nums">{scoreLabel(r.media)}</td><td className="p-3 text-right tabular-nums">{scoreLabel(r.mediana)}</td><td className="p-3 text-right tabular-nums">{scoreLabel(r.desviacion)}</td><td className="p-3 text-right tabular-nums">{percentLabel(r.porcentajeDesacuerdo)}</td>
                    </tr>)}</tbody>
                </table>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-600">Desacuerdo: {selected.fuente === 'Titulados' ? '«En desacuerdo» y «Totalmente en desacuerdo»' : '«Totalmente en desacuerdo»; «Parcialmente de acuerdo» conserva su categoría propia'}. No se calcula desviación con menos de dos respuestas. Un valor bajo no cuantifica por sí solo una brecha formativa.</p>
            <label className="mt-5 block text-sm font-medium text-slate-800">Ver las respuestas de una pregunta
                <select value={selected.campo} onChange={e => setField(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus-visible:outline-2 focus-visible:outline-teal-700">{items.map(r => <option key={r.campo} value={r.campo}>{r.titulo}</option>)}</select>
            </label>
        </article>
        <div className="grid items-start gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2"><Distribution title={selected.titulo} description={`Categorías originales en orden de acuerdo; ${selected.validas} de ${selected.base} respuestas de esta población son utilizables.`} data={selected.categorias} tone="teal" /></div>
            <aside aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
                <h4 className="font-semibold text-slate-900">Base y respuestas excluidas</h4>
                <dl className="mt-4 space-y-3">{[
                    ['Respuestas válidas', selected.validas], ['Sin respuesta', selected.sinRespuesta], ['No sabe', selected.noSabe],
                    ['No aplica', selected.noAplica], ['Valor no interpretable', selected.invalida], ['Ruta no confirmada', selected.rutaDesconocida],
                ].map(([name, value]) => <div key={name} className="flex justify-between gap-3"><dt>{name}</dt><dd className="font-semibold tabular-nums text-slate-900">{value}</dd></div>)}</dl>
                <p className="mt-5 text-xs leading-relaxed">«No sabe», vacíos y valores sin escala original identificable no reciben puntaje cero. La pertinencia del trabajo actual se analiza solo para quienes trabajan en una organización.</p>
            </aside>
        </div>
    </div>;
}

function MultiplePanel({ items, thematic = false }: { items: MultipleSummary[]; thematic?: boolean }) {
    const [field, setField] = useState(items[0]?.campo ?? '');
    const [table, setTable] = useState(false);
    const selected = items.find(r => r.campo === field) ?? items[0];
    if (!selected) return null;
    return <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h3 className="font-semibold text-slate-900">{thematic ? 'Necesidades mencionadas por empleadores' : 'Prioridades curriculares señaladas por titulados'}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{thematic ? 'Conteo orientativo por palabras clave. Una mención expresa una necesidad, no una insuficiencia demostrada de los titulados.' : 'Cada opción cuenta una vez por persona. Las selecciones históricas se conservan sin exigir un número fijo de opciones.'}</p></div>
            <button type="button" aria-pressed={table} onClick={() => setTable(!table)} className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700">{table ? 'Ver gráfico' : 'Ver tabla'}</button>
        </div>
        <label className="mt-5 block text-sm font-medium text-slate-800">Pregunta a analizar
            <select value={selected.campo} onChange={e => setField(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus-visible:outline-2 focus-visible:outline-teal-700">{items.map(r => <option key={r.campo} value={r.campo}>{r.titulo}</option>)}</select>
        </label>
        <p aria-live="polite" className="mt-4 text-sm leading-relaxed text-slate-600">Base: <strong>{selected.respondieron} personas respondieron esta pregunta</strong> · {selected.sinRespuesta} sin respuesta · {selected.noAplica} fuera de ruta.{thematic && ` ${selected.sinClasificar} respuestas no coincidieron con el catálogo.`} Los porcentajes pueden sumar más de 100% porque una persona puede {thematic ? 'mencionar varios temas' : 'elegir varias opciones'}.</p>
        {!selected.opciones.length ? <p className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">{selected.respondieron ? 'Hay respuestas, pero no hay coincidencias con el catálogo de temas. No se les asigna un tema por suposición.' : 'No hay respuestas para esta pregunta en la población seleccionada.'}</p> : table ? <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm"><caption className="sr-only">{selected.titulo}. Porcentajes sobre {selected.respondieron} personas.</caption><thead className="border-b border-slate-200 text-xs text-slate-600"><tr><th scope="col" className="py-3 pr-3">{thematic ? 'Tema mencionado' : 'Opción'}</th><th scope="col" className="p-3 text-right">Personas</th><th scope="col" className="py-3 pl-3 text-right">% de personas</th></tr></thead><tbody className="divide-y divide-slate-100">{selected.opciones.map(r => <tr key={r.nombre}><th scope="row" className="py-3 pr-3 font-normal text-slate-800">{r.nombre}</th><td className="p-3 text-right tabular-nums">{r.cantidad}</td><td className="py-3 pl-3 text-right tabular-nums">{percentLabel(r.porcentaje)}</td></tr>)}</tbody></table>
        </div> : <div className="mt-6 space-y-5" role="list" aria-label={selected.titulo}>{selected.opciones.map(r => <div key={r.nombre} role="listitem"><div className="mb-2 flex items-baseline justify-between gap-4 text-sm"><span className="text-slate-800">{r.nombre}</span><span className="shrink-0 font-semibold tabular-nums">{percentLabel(r.porcentaje)} <span className="font-normal text-slate-500">({r.cantidad})</span></span></div><div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-700" style={{ width: `${r.porcentaje}%` }} /></div></div>)}</div>}
        {thematic && <details className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-600"><summary className="cursor-pointer font-medium text-slate-800">Cómo se clasifican las menciones</summary><p className="mt-3 leading-relaxed">Se buscan términos explícitos, sin distinguir mayúsculas ni acentos. Una respuesta cuenta una vez por tema aunque repita términos. Es una clasificación preliminar: puede omitir sinónimos o interpretar una mención negada como coincidencia; requiere revisión humana antes de sustentar cambios curriculares. No se muestran textos individuales ni se enlazan respuestas de personas y empresas.</p><ul className="mt-3 space-y-2 text-xs">{themeRules.map(rule => <li key={rule.nombre}><strong>{rule.nombre}:</strong> {rule.pattern.source.replace(/\\b/g, '').replace(/[()]/g, '').replace(/\|/g, ', ')}</li>)}</ul></details>}
    </article>;
}

function EmployerRadar({ items, title, fields }: { items: RatingSummary[]; title: string; fields: { campo: string; label: string }[] }) {
    const data = fields.map(f => ({ etiqueta: f.label, media: items.find(r => r.campo === f.campo)?.media ?? null }));
    if (data.some(r => r.media === null)) return <p className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-600">{title}: faltan valoraciones válidas en uno o más ejes. Consulta las tablas; no se dibujan ausencias como cero.</p>;
    return <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4"><h4 className="text-sm font-semibold text-slate-900">{title}</h4><p className="mt-2 text-xs text-slate-600">Media de acuerdo 1–3; cada eje conserva su propia base. La forma no representa una brecha.</p><div className="mt-4 h-80"><ResponsiveContainer width="100%" height="100%"><RadarChart data={data} outerRadius="60%"><PolarGrid /><PolarAngleAxis dataKey="etiqueta" fontSize={10} /><PolarRadiusAxis domain={[0, 3]} ticks={[1, 2, 3]} fontSize={10} /><Radar name="Media original (1–3)" dataKey="media" stroke="#0f766e" fill="#0f766e" fillOpacity={0.2} /><Tooltip formatter={value => scoreLabel(typeof value === 'number' ? value : null)} /></RadarChart></ResponsiveContainer></div></article>;
}

export function TabEmpleadores({ summary: s, onScope }: { summary: CompetencySummary; onScope: (scope: GraduateScope) => void }) {
    const [section, setSection] = useState<'titulados' | 'mejoras' | 'empleadores'>('titulados');
    const sections = [{ id: 'titulados', label: 'Formación y trabajo' }, { id: 'mejoras', label: 'Mejoras curriculares' }, { id: 'empleadores', label: 'Perspectiva de empleadores' }] as const;
    const satisfaction = s.titulados[0];
    return <section className="space-y-6" aria-labelledby="hu4-title">
        <header><p className="text-xs font-semibold uppercase tracking-widest text-umss-azul">Formación y competencias</p><h2 id="hu4-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-900">¿Qué formación aporta y qué conviene mejorar?</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">Diagnóstico de percepciones de titulados y empleadores. Las dos perspectivas se presentan por separado y conservan sus escalas originales.</p></header>
        <div className="grid gap-4 sm:grid-cols-3">
            <Indicator label="Titulados en este análisis" value={s.tituladosAnalizados} detail={<>De {s.totalTitulados} respuestas; {s.conExperiencia} declaran experiencia laboral.</>} />
            <Indicator label="Satisfacción con la formación" value={scoreLabel(satisfaction.media)} unit="de 4" detail={<>{satisfaction.validas} respuestas válidas. Desviación muestral: {scoreLabel(satisfaction.desviacion)}. Es un índice de acuerdo.</>} />
            <Indicator label="Respuestas de empleadores" value={s.totalEmpleadores} detail="Perspectiva independiente; no cambia con el filtro de titulados." />
        </div>
        <label className="block rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800">Población para formación y mejoras curriculares
            <select value={s.scope} onChange={e => onScope(e.target.value as GraduateScope)} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3 text-sm sm:max-w-md focus-visible:outline-2 focus-visible:outline-teal-700"><option value="experiencia">Con experiencia laboral declarada</option><option value="todos">Todos los titulados · contexto general</option></select>
            <span className="mt-2 block text-xs font-normal leading-relaxed text-slate-600">Experiencia declarada: trabaja en una organización, emprende, afirma haber trabajado antes o declara años de experiencia profesional mayores a cero. No equivale a una categoría de cargo.</span>
        </label>
        <nav className="flex flex-wrap gap-2" aria-label="Perspectivas de formaci?n y competencias">{sections.map(item => <button key={item.id} type="button" aria-pressed={section === item.id} onClick={() => setSection(item.id)} className={`rounded-lg border px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${section === item.id ? 'border-teal-800 bg-teal-800 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{item.label}</button>)}</nav>
        {section === 'titulados' && <RatingPanel items={s.titulados} title="Valoración de la formación desde los titulados" />}
        {section === 'mejoras' && <MultiplePanel items={s.mejoras} />}
        {section === 'empleadores' && <div className="space-y-6">
            <RatingPanel items={s.perfilEmpleadores} title="Percepción del perfil y desempeño profesional" />
            <MultiplePanel items={s.demanda} thematic />
            <details className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-semibold text-slate-900">Vinculación institucional y alianzas</summary><div className="mt-5"><RatingPanel items={s.vinculacion} title="Relación con empleadores: contexto institucional" /></div></details>
            <details className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-semibold text-slate-900">Radares complementarios de percepción</summary><div className="mt-5 grid gap-5 xl:grid-cols-2">
                <EmployerRadar items={s.perfilEmpleadores} title="Perfil y competencias laborales generales" fields={[{campo:'confianza_carrera_formadora',label:'Confianza'},{campo:'consistencia_titulo_competencias',label:'Título y competencias'},{campo:'coherencia_perfil_desempeno',label:'Perfil y desempeño'},{campo:'evidencia_competencias_laborales',label:'Competencias laborales'},{campo:'valores_etica_responsabilidad',label:'Ética'}]} />
                <EmployerRadar items={s.vinculacion} title="Vinculación institucional" fields={[{campo:'busqueda_talento_umss',label:'Búsqueda de talento'},{campo:'vinculos_oportunidades_laborales',label:'Oportunidades'},{campo:'participacion_difusion_pasantias',label:'Difusión y pasantías'},{campo:'consulta_retroalimentacion_plan',label:'Plan de estudios'},{campo:'consulta_procesos_autoevaluacion',label:'Autoevaluación'}]} />
            </div></details>
        </div>}
        <details className="rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600"><summary className="cursor-pointer font-semibold text-slate-800">Alcance de la evaluación de competencias</summary><p className="mt-3">Los resultados describen satisfacción, concordancia y propuestas de mejora. No miden por separado la suficiencia de cada competencia técnica o transversal frente al puesto. Para obtener una brecha numérica se necesitan niveles de formación recibida y exigencia del puesto en una escala comparable; no se restan opiniones de muestras distintas.</p></details>
        <details className="rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600"><summary className="cursor-pointer font-semibold text-slate-800">Cómo interpretar las escalas y los resultados</summary><p className="mt-3">Titulados: cuatro categorías de acuerdo (1–4). Empleadores: tres categorías (1–3) y «No sabe» sin puntaje. No se transforman a cinco categorías para esta vista ni se comparan directamente sus medias. Se muestran frecuencias y medianas junto con medias y desviaciones descriptivas de los códigos; estas últimas no suponen distancias psicológicas demostradas entre categorías.</p><p className="mt-3">Los resultados se limitan a las respuestas disponibles y a la población elegida. Una asignatura señalada como menos útil no es automáticamente prescindible; requiere revisión curricular y del contexto laboral. «Otra asignatura» libre se conserva en los datos originales y no se clasifica automáticamente.</p></details>
    </section>;
}
