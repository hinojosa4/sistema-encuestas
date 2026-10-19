'use client';
import type { FormationSummary } from '@/lib/postgraduate';
import { Distribution, Indicator, percentLabel } from './AnalyticsUI';

export function TabTitulados({ summary: s }: { summary: FormationSummary }) {
    const areas = s.areas;
    const levels = s.niveles;
    const concentration = s.concentracion;
    const leader = areas[0];
    const levelsTotal = levels.reduce((n, row) => n + row.cantidad, 0);
    return <section className="space-y-6" aria-labelledby="hu2-title">
        <header><p className="text-xs font-semibold uppercase tracking-widest text-umss-azul">Formación continua</p><h2 id="hu2-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-900">¿En qué quieren especializarse?</h2><p className="mt-2 text-sm text-slate-500">Preferencias temáticas para orientar el estudio de nuevas ofertas académicas.</p></header>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Indicator label="Interés en estudiar un posgrado" value={s.interesados + s.sinInteres ? percentLabel(s.interesados / (s.interesados + s.sinInteres) * 100) : '—'} detail={<>{s.interesados} de {s.interesados + s.sinInteres} respuestas Sí/No válidas · {s.interesNoUtilizable} sin respuesta utilizable.</>} />
            <Indicator label="Interesados con área declarada" value={concentration.total} detail={<>{s.sinArea} interesados sin área. Base de los porcentajes temáticos.</>} />
            <Indicator label="Área con más preferencias" value={leader ? percentLabel(leader.cantidad / concentration.total * 100) : '—'} detail={leader ? <>{leader.nombre} · {leader.cantidad} respuestas</> : 'No hay áreas declaradas.'} />
            <Indicator label="Concentración en las dos primeras áreas" value={concentration.total ? percentLabel(concentration.porcentaje) : '—'} detail={concentration.total ? `${concentration.superaUmbral ? 'Supera' : 'No supera'} el umbral orientativo del 70%.` : 'Se necesitan respuestas para calcularla.'} />
        </div>
        <p className="text-sm leading-relaxed text-slate-600">Interés en posgrado: <strong className="text-slate-800">{s.interesados} sí</strong> · {s.sinInteres} no{s.interesNoUtilizable > 0 && ` · ${s.interesNoUtilizable} sin respuesta válida`}. Las preferencias por área se calculan sobre {concentration.total} personas interesadas con área declarada.{s.areasFueraRuta > 0 && ` Se excluyen ${s.areasFueraRuta} áreas declaradas fuera de esa condición.`}</p>
        <div className="grid items-start gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2"><Distribution title="Áreas de interés futuro" description="De mayor a menor preferencia. Escala común de 0 a 100%; la tabla incluye el porcentaje acumulado." data={areas} cumulative /></div>
            <aside className="space-y-5">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-wider text-umss-azul">Lectura para la decisión</p><h3 className="mt-3 font-semibold text-slate-900">{concentration.total ? 'Temas que conviene estudiar primero' : 'Pendiente de datos'}</h3>{concentration.total ? <><ol className="mt-3 space-y-2 text-sm text-slate-700">{areas.slice(0, 2).map((area, i) => <li key={area.nombre} className="flex items-baseline gap-2"><span className="font-bold text-umss-azul">{i + 1}.</span>{area.nombre}</li>)}</ol><p className="mt-4 text-xs leading-relaxed text-slate-600">En conjunto reúnen {percentLabel(concentration.porcentaje)} de las preferencias declaradas. Para abrir un programa también deben evaluarse costos, cupos y demanda efectiva.</p></> : <p className="mt-3 text-sm text-slate-600">Carga las respuestas oficiales para identificar las áreas prioritarias.</p>}</article>
                <details className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><summary className="cursor-pointer text-sm font-semibold text-slate-800">¿Se conoce qué nivel desean estudiar?</summary><p className="mt-3 text-sm leading-relaxed text-slate-600">La encuesta disponible recoge áreas de interés, pero no el nivel de posgrado deseado. Por eso esta vista no presenta una distribución de preferencias entre Maestría, Especialidad y Doctorado. La formación ya cursada se muestra aparte como antecedente.</p></details>
            </aside>
        </div>
        <div className="border-t border-slate-200 pt-6"><div className="mb-4"><p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Contexto de la muestra</p><h3 className="mt-2 text-lg font-semibold text-slate-900">Formación que ya han cursado</h3><p className="mt-1 text-sm text-slate-500">Antecedentes académicos: no representan el nivel que desean estudiar.</p></div><Distribution title="Nivel de posgrado cursado o en curso" description={`${levelsTotal} respuestas con un nivel reconocido. Esta base puede diferir de la de interés futuro.`} data={levels} tone="teal" /></div>
        <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600"><summary className="cursor-pointer font-medium text-slate-800">Cómo se calculan las preferencias</summary><p className="mt-3 leading-relaxed">Cada frecuencia relativa divide la cantidad de respuestas de un área entre el total con área declarada. El porcentaje acumulado sigue el orden de mayor a menor frecuencia. El umbral del 70% es orientativo y no demuestra por sí solo viabilidad técnica o financiera.</p></details>
    </section>;
}
