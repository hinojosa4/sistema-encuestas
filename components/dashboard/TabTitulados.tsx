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
        <header><p className="text-xs font-semibold uppercase tracking-widest text-umss-azul">HU2 · Formación continua</p><h2 id="hu2-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-900">¿En qué quieren especializarse?</h2><p className="mt-2 text-sm text-slate-500">Preferencias temáticas para orientar el estudio de nuevas ofertas académicas.</p></header>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Indicator label="Interés en estudiar un posgrado" value={s.interesados + s.sinInteres ? percentLabel(s.interesados / (s.interesados + s.sinInteres) * 100) : '—'} detail={<>{s.interesados} de {s.interesados + s.sinInteres} respuestas Sí/No válidas · {s.interesNoUtilizable} sin respuesta utilizable.</>} />
            <Indicator label="Interesados con área declarada" value={concentration.total} detail={<>{s.sinArea} interesados sin área. Base de los porcentajes temáticos.</>} />
            <Indicator accent label="Área con más preferencias" value={leader ? percentLabel(leader.cantidad / concentration.total * 100) : '—'} detail={leader ? <>{leader.nombre} · {leader.cantidad} respuestas</> : 'No hay áreas declaradas.'} />
            <Indicator label="Concentración en las dos primeras áreas" value={concentration.total ? percentLabel(concentration.porcentaje) : '—'} detail={concentration.total ? `${concentration.superaUmbral ? 'Supera' : 'No supera'} el umbral orientativo del 70%.` : 'Se necesitan respuestas para calcularla.'} />
        </div>
        <p className="text-xs leading-relaxed text-slate-600">De {s.total} titulados, {s.interesados} declaran interés y {s.sinInteres} no tienen interés. Las áreas se analizan solo entre quienes respondieron Sí.{s.areasFueraRuta > 0 && ` Se conservan ${s.areasFueraRuta} respuestas con área fuera de esa ruta, excluidas de estas preferencias.`}</p>
        <div className="grid items-start gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2"><Distribution title="Áreas de interés futuro" description="De mayor a menor preferencia. Escala común de 0 a 100%; la tabla incluye el porcentaje acumulado." data={areas} cumulative /></div>
            <aside className="space-y-5">
                <article className="rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-wider text-umss-azul">Lectura para la decisión</p><h3 className="mt-3 font-semibold text-slate-900">{concentration.total ? 'Temas que conviene estudiar primero' : 'Pendiente de datos'}</h3>{concentration.total ? <><ol className="mt-3 space-y-2 text-sm text-slate-700">{areas.slice(0, 2).map((area, i) => <li key={area.nombre} className="flex items-baseline gap-2"><span className="font-bold text-umss-azul">{i + 1}.</span>{area.nombre}</li>)}</ol><p className="mt-4 text-xs leading-relaxed text-slate-600">En conjunto reúnen {percentLabel(concentration.porcentaje)} de las preferencias declaradas. Para abrir un programa también deben evaluarse costos, cupos y demanda efectiva.</p></> : <p className="mt-3 text-sm text-slate-600">Carga las respuestas oficiales para identificar las áreas prioritarias.</p>}</article>
                <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6"><h3 className="text-sm font-semibold text-amber-900">Falta conocer el nivel deseado</h3><p className="mt-2 text-sm leading-relaxed text-amber-900/80">El cuestionario entregado no pregunta si el titulado desea una Maestría, Especialidad o Doctorado. Ese dato debe incorporarse en una próxima encuesta para completar HU2.</p></article>
            </aside>
        </div>
        <div className="border-t border-slate-200 pt-6"><div className="mb-4"><p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Contexto de la muestra</p><h3 className="mt-2 text-lg font-semibold text-slate-900">Formación que ya han cursado</h3><p className="mt-1 text-sm text-slate-500">Antecedentes académicos: no representan el nivel que desean estudiar.</p></div><Distribution title="Nivel de posgrado cursado o en curso" description={`${levelsTotal} respuestas con un nivel reconocido. Esta base puede diferir de la de interés futuro.`} data={levels} tone="teal" /></div>
        <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600"><summary className="cursor-pointer font-medium text-slate-800">Cómo se calculan las preferencias</summary><p className="mt-3 leading-relaxed">Cada frecuencia relativa divide la cantidad de respuestas de un área entre el total con área declarada. El porcentaje acumulado sigue el orden de mayor a menor frecuencia. El umbral del 70% es orientativo y no demuestra por sí solo viabilidad técnica o financiera.</p></details>
    </section>;
}
