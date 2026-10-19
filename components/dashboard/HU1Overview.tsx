'use client';
import type { EmployabilitySummary } from '@/lib/employability';
import { employmentIntervals } from '@/lib/importPipeline';
import { Distribution, Indicator, numberLabel, percentLabel } from './AnalyticsUI';

export function HU1Overview({ summary: s, limite, onLimite }: {
    summary: EmployabilitySummary; limite: number; onLimite: (value: number) => void;
}) {
    const plazos = [...s.plazos].sort((a, b) => employmentIntervals.indexOf(a.nombre) - employmentIntervals.indexOf(b.nombre));
    return <section className="space-y-6" aria-labelledby="hu1-title">
        <header><p className="text-xs font-semibold uppercase tracking-widest text-umss-azul">Perfil profesional</p><h2 id="hu1-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Experiencia y empleabilidad</h2><p className="mt-2 text-sm text-slate-500">Cuánta experiencia declara la muestra y cómo participa en el mercado laboral.</p></header>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Indicator label="Media de experiencia profesional" value={s.experiencia.total ? numberLabel(s.experiencia.media) : '—'} unit="años" detail={<>{s.experiencia.total} respuestas válidas · {s.experienciaExcluidos} excluidas</>} />
            <Indicator label="Mediana de experiencia" value={s.experiencia.total ? numberLabel(s.experiencia.mediana) : '—'} unit="años" detail={<>Desviación estándar muestral: {s.experiencia.total > 1 ? `${numberLabel(s.experiencia.desviacionEstandar)} años` : 'requiere al menos 2 respuestas'}</>} />
            <Indicator label="Ocupación actual" value={percentLabel(s.ocupacion.porcentaje)} detail={<>{s.ocupacion.cantidad} de {s.ocupacion.validos} trabajan en organización o emprendimiento · {s.ocupacion.excluidos} excluidas</>} />
            <Indicator label="Primer empleo temprano" value={percentLabel(s.insercion.porcentaje)} detail={<>{s.insercion.cantidad} de {s.insercion.validos}: antes de titularse o hasta 4 meses · {s.insercion.excluidos} sin plazo utilizable</>} />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
            <Distribution title="Situación laboral actual" description="Estados laborales reconocidos, de mayor a menor frecuencia." data={[...s.situaciones].sort((a, b) => b.cantidad - a.cantidad)} />
            <Distribution title="Tiempo hasta el primer empleo" description="Plazos en orden temporal hasta el primer empleo relacionado con la carrera." data={plazos} tone="teal" />
            <Distribution title="Experiencia profesional" description="Grupos fijos para comparar la composición de la muestra." data={s.experienciaGrupos} />
            <Distribution title="Sector de desempeño" description="Solo quienes trabajan en una organización y declaran un sector válido." data={[...s.sectores].sort((a, b) => b.cantidad - a.cantidad)} tone="teal" />
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-2">
                <h3 className="font-semibold text-slate-900">Explorar la experiencia de la muestra</h3><p className="mt-1 text-xs text-slate-500">Ajusta el corte para comparar dos grupos. No determina cargos ni jerarquías.</p>
                <label htmlFor="experience-cut" className="mt-5 flex items-center justify-between gap-3 text-sm text-slate-700">Umbral de experiencia <span className="rounded-lg bg-blue-50 px-3 py-1 font-semibold text-umss-azul">{limite} años</span></label>
                <input id="experience-cut" aria-valuetext={`${limite} años`} type="range" min="0" max="30" step="1" value={limite} onChange={e => onLimite(Number(e.target.value))} className="my-4 w-full accent-[#003770]" />
                <div aria-live="polite" className="grid grid-cols-2 gap-4 text-sm"><div className="rounded-xl bg-slate-50 p-4"><p className="text-slate-500">Hasta {limite} años</p><p className="mt-1 font-semibold text-slate-900">{s.segmentacion.juniorCount} personas <span className="font-normal text-slate-500">{s.experiencia.total ? percentLabel(s.segmentacion.juniorPct) : 'Sin datos'}</span></p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-slate-500">Más de {limite} años</p><p className="mt-1 font-semibold text-slate-900">{s.segmentacion.consolidadoCount} personas <span className="font-normal text-slate-500">{s.experiencia.total ? percentLabel(s.segmentacion.consolidadoPct) : 'Sin datos'}</span></p></div></div>
                <p className="mt-3 text-xs text-slate-500">Base: {s.experiencia.total} respuestas con experiencia válida.</p>
            </article>
            <Indicator label="Media del tiempo sin empleo declarado" value={s.desempleo.total ? numberLabel(s.desempleo.media) : '—'} unit="meses" detail={<>Mediana: {s.desempleo.total ? `${numberLabel(s.desempleo.mediana)} meses` : 'sin datos'}<br />{s.desempleo.total} respuestas con unidad conocida · {s.desempleoExcluidos} excluidas. No representa necesariamente el desempleo actual.</>} />
        </div>
        {s.cohortes.length > 0 && <section className="space-y-5" aria-labelledby="graduation-title">
            <div><h3 id="graduation-title" className="text-lg font-semibold text-slate-900">Perfil por año de egreso</h3><p className="mt-1 text-sm text-slate-600">Referencia: {s.egreso.anioReferencia}. Diferencia entre años calendario; no mide la fecha exacta de titulación.</p></div>
            <div className="grid gap-4 sm:grid-cols-3">
                <Indicator label="Tiempo medio desde el egreso" value={numberLabel(s.egreso.estadisticas.media)} unit="años" detail={`${s.egreso.estadisticas.total} años de egreso válidos · ${s.egreso.excluidos} respuestas excluidas`} />
                <Indicator label="Mediana desde el egreso" value={numberLabel(s.egreso.estadisticas.mediana)} unit="años" detail="Se calcula a partir del año declarado, independientemente de la experiencia laboral." />
                <Indicator label="Dispersión desde el egreso" value={s.egreso.estadisticas.total>1?numberLabel(s.egreso.estadisticas.desviacionEstandar):'—'} unit="años" detail="Desviación estándar muestral; requiere al menos dos respuestas." />
            </div>
            <Distribution title="Año de egreso declarado" description="Solo años explícitos y válidos; no se infieren a partir de la experiencia." data={[...s.cohortes].sort((a, b) => Number(a.nombre) - Number(b.nombre))} />
            <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h3 className="font-semibold text-slate-900">Ocupación actual por cohorte de egreso</h3><p className="mt-2 text-xs leading-relaxed text-slate-600">Compara a quienes respondieron; no mide inserción dentro de un plazo ni seguimiento longitudinal. Las cohortes pequeñas requieren cautela.</p><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Ocupación por año de egreso con bases y exclusiones</caption><thead className="border-b border-slate-200 text-slate-600"><tr>{['Egreso','Ocupados','Estado válido','Sin estado válido','Ocupación'].map(h=><th key={h} scope="col" className="p-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{s.ocupacionPorCohorte.map(r=><tr key={r.anio}><th scope="row" className="p-3 font-medium">{r.anio}</th><td className="p-3">{r.ocupados}</td><td className="p-3">{r.base}</td><td className="p-3">{r.excluidos}</td><td className="p-3 font-semibold">{percentLabel(r.porcentaje)}</td></tr>)}</tbody></table></div></article>
        </section>}
        <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600"><summary className="cursor-pointer font-medium text-slate-800">Metodología y disponibilidad de los datos</summary><div className="mt-3 space-y-2 leading-relaxed">{!s.cohortes.length && <p><strong>Año de egreso:</strong> las {s.egreso.excluidos} respuestas no aportan un año válido. Se muestra experiencia profesional; al incorporar años explícitos válidos aparecerán los indicadores de antigüedad y ocupación por cohorte.</p>}<p>Las bases cambian según las respuestas válidas de cada pregunta. Los datos ausentes o ambiguos se excluyen; el valor cero sí se conserva.</p><p>La ocupación es una proporción de la muestra. El primer empleo temprano incluye las categorías «Ya trabajaba antes de titularse», «Menos de 1 mes» y «Entre 1–4 meses».</p><p>La media resume el promedio; la mediana ubica el centro de la muestra y la desviación estándar describe su dispersión.</p></div></details>
    </section>;
}
