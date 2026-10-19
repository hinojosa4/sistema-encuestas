'use client';
import { useState } from 'react';
import type { FinancingSummary } from '@/lib/postgraduate';
import { Distribution, Indicator, percentLabel } from './AnalyticsUI';

type MatrixView = 'cantidad' | 'porcentaje' | 'esperada';
export function TabChiCuadrada({ summary: s }: { summary: FinancingSummary }) {
    const [view, setView] = useState<MatrixView>('cantidad');
    const [selected, setSelected] = useState<[number, number] | null>(null);
    const c = s.chi;
    const leader = s.distribucion[0];
    const computable = c.estado === 'calculada';
    const title = computable
        ? c.existeDependencia ? 'Se encontró evidencia de asociación' : 'No se encontró evidencia suficiente de asociación'
        : c.estado === 'frecuencias_bajas' ? 'Hay pocas respuestas en varias combinaciones para concluir si existe asociación'
            : c.estado === 'error_numerico' ? 'No se pudo obtener un p-valor válido' : 'Faltan categorías para contrastar asociación';
    const pLabel = c.pValor === null
        ? c.estado === 'frecuencias_bajas' ? 'No interpretable con esta aproximación' : c.estado === 'error_numerico' ? 'No se pudo calcular' : 'Faltan categorías para calcularlo'
        : c.pValor < 0.0001 ? '< 0,0001' : c.pValor.toLocaleString('es-BO', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    const modes: { value: MatrixView; label: string }[] = [
        { value: 'cantidad', label: 'Cantidad de personas' }, { value: 'porcentaje', label: 'Porcentaje dentro del nivel' }, { value: 'esperada', label: 'Valores esperados para χ²' },
    ];
    const scale = [
        { color: 'bg-slate-100', label: '0%' },
        { color: 'bg-emerald-100', label: 'Más de 0 y menos de 10%' },
        { color: 'bg-emerald-200', label: '10 a menos de 30%' },
        { color: 'bg-emerald-400', label: '30 a menos de 70%' },
        { color: 'bg-emerald-800', label: '70 a 100%' },
    ];
    const example = c.total ? selected ?? [0, 0] : null;
    return <section className="space-y-6" aria-labelledby="hu3-title">
        <header>
            <p className="text-xs font-semibold uppercase tracking-widest text-umss-azul">HU3 · Financiamiento</p>
            <h2 id="hu3-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-900">¿Cómo financiaron su posgrado?</h2>
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
                <h3 className="font-semibold text-slate-900">Qué aporta a la decisión</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{leader ? `La fuente más declarada es ${leader.nombre.toLowerCase()}. Este antecedente orienta preguntas sobre apoyos y convenios para próximos programas.` : 'Se necesitan respuestas con una fuente reconocida para identificar patrones de financiamiento.'}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">La encuesta no distingue becas estatales de empresariales, ni pregunta por créditos educativos futuros. Esas alternativas no se pueden cuantificar con estos datos.</p>
            </aside>
        </div>

        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div><h3 className="font-semibold text-slate-900">Nivel cursado × financiamiento utilizado</h3><p id="matrix-help" className="mt-2 text-sm leading-relaxed text-slate-600">Se cruzan {c.total} personas con nivel y financiamiento reconocidos. {s.excluidosCruce} respuestas no entran en esta tabla.</p></div>
                <label className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">Ver tabla como
                    <select value={view} onChange={e => setView(e.target.value as MatrixView)} aria-describedby={c.total ? 'matrix-help matrix-view-help' : 'matrix-help'} className="max-w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-700">
                        {modes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </label>
            </div>
            {!c.total ? <p className="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No hay pares válidos de nivel cursado y financiamiento. Las distribuciones disponibles se conservan arriba.</p> : <>
                <div id="matrix-view-help" aria-live="polite" className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                    <p><strong>{view === 'esperada' ? 'Valores esperados para χ²:' : view === 'porcentaje' ? 'Porcentaje dentro del nivel:' : 'Cantidad de personas:'}</strong> {view === 'esperada' ? 'muestra los valores teóricos si nivel y financiamiento no estuvieran asociados. Se calculan con los totales y se comparan con las respuestas reales para obtener χ². Pueden tener decimales: no son personas adicionales ni respuestas faltantes.' : view === 'porcentaje' ? 'muestra qué parte de cada nivel utilizó cada fuente. Cada fila suma 100% antes del redondeo; debajo aparece la cantidad real.' : 'muestra cuántas personas están en cada combinación. Lee el nivel a la izquierda y la fuente de financiamiento arriba.'}</p>
                    <p className="mt-2">Selecciona una celda para leer ese cruce. Los totales del borde siempre representan cantidades de personas.</p>
                </div>
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-300" tabIndex={0} role="region" aria-label="Tabla cruzada de financiamiento">
                    <table className="w-full min-w-[520px] text-sm">
                        <caption className="sr-only">{modes.find(m => m.value === view)?.label}: nivel cursado por financiamiento utilizado. Base: {c.total}.</caption>
                        <thead className="bg-slate-800 text-sm text-white"><tr><th scope="col" className="px-4 py-3 text-left">Nivel cursado ↓ / Fuente →</th>{c.columnas.map((col, j) => <th scope="col" key={col} className={`border-l border-slate-600 px-4 py-3 text-center ${selected?.[1] === j ? 'bg-teal-800 underline underline-offset-4' : ''}`}>{col}</th>)}<th scope="col" className="border-l border-slate-600 px-4 py-3 text-right">Total de personas</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{c.filas.map((fila, i) => <tr key={fila}>
                            <th scope="row" className={`px-4 py-4 text-left font-semibold ${selected?.[0] === i ? 'bg-teal-800 text-white' : 'bg-slate-100 text-slate-900'}`}>{fila}</th>
                            {c.columnas.map((col, j) => {
                                const obs = c.matriz[i][j], expected = c.esperadas[i][j], ratio = obs / c.totalesFila[i];
                                const shade = ratio >= 0.7 ? 'bg-emerald-800 text-white' : ratio >= 0.3 ? 'bg-emerald-400 text-emerald-950' : ratio >= 0.1 ? 'bg-emerald-200 text-emerald-950' : ratio > 0 ? 'bg-emerald-100 text-emerald-950' : 'bg-slate-100 text-slate-600';
                                const isSelected = selected?.[0] === i && selected?.[1] === j;
                                return <td key={col} className={`border-l border-white p-0 text-center tabular-nums ${view === 'esperada' ? expected < 1 ? 'bg-orange-300 text-orange-950' : expected < 5 ? 'bg-amber-200 text-amber-950' : 'bg-slate-100 text-slate-900' : shade}`}>
                                    <button type="button" onClick={() => setSelected([i, j])} aria-pressed={isSelected} aria-label={`${fila}, ${col}: ${view === 'esperada' ? `${expected.toFixed(2)} esperadas` : `${obs} personas, ${percentLabel(ratio * 100)} del nivel`}`} className={`min-h-16 w-full px-4 py-4 font-semibold transition-shadow hover:ring-2 hover:ring-inset hover:ring-slate-700 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-slate-950 ${isSelected ? 'ring-4 ring-inset ring-slate-950' : ''}`}>
                                    {view === 'esperada' ? expected.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : view === 'porcentaje' ? <>{percentLabel(ratio * 100)}<span className="mt-1 block text-xs">{obs} respuestas</span></> : obs}
                                    </button>
                                </td>;
                            })}<td className="px-4 py-4 text-right font-semibold tabular-nums">{c.totalesFila[i]}</td>
                        </tr>)}</tbody>
                        <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold"><tr><th scope="row" className="px-4 py-3 text-left">Total (n)</th>{c.totalesColumna.map((v, j) => <td key={c.columnas[j]} className="px-4 py-3 text-center tabular-nums">{v}</td>)}<td className="px-4 py-3 text-right tabular-nums">{c.total}</td></tr></tfoot>
                    </table>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-700" aria-label="Leyenda de colores">
                    <span className="font-semibold">{view === 'esperada' ? 'Comprobación para χ²:' : 'Proporción de personas dentro de cada nivel:'}</span>
                    {(view === 'esperada' ? [{ color: 'bg-orange-300', label: 'Menor de 1' }, { color: 'bg-amber-200', label: 'De 1 a menos de 5' }, { color: 'bg-slate-100', label: '5 o más' }] : scale).map(item => <span key={item.label} className="inline-flex items-center gap-2"><span aria-hidden="true" className={`h-4 w-4 rounded-sm border border-slate-300 ${item.color}`} />{item.label}</span>)}
                </div>
                {example && <p aria-live="polite" className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm leading-relaxed text-teal-950"><strong>{selected ? 'Cruce seleccionado' : 'Ejemplo de lectura'} · {c.filas[example[0]]} × {c.columnas[example[1]]}:</strong> {c.matriz[example[0]][example[1]]} de {c.totalesFila[example[0]]} personas de ese nivel usaron esta fuente ({percentLabel(c.matriz[example[0]][example[1]] / c.totalesFila[example[0]] * 100)}). Para calcular χ², el valor esperado bajo independencia es {c.esperadas[example[0]][example[1]].toLocaleString('es-BO', { maximumFractionDigits: 2 })}.</p>}
            </>}
            <details className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600"><summary className="cursor-pointer font-medium text-slate-800">Por qué cambia la base del cruce</summary>
                <ul className="mt-3 space-y-2"><li>{s.exclusiones.sinPosgrado} declaran no haber realizado formación complementaria.</li><li>{s.exclusiones.rutaNoConfirmada} no permiten confirmar esa condición.</li><li>{s.exclusiones.incompletas} no tienen nivel o fuente respondidos.</li><li>{s.exclusiones.noReconocidas} tienen categorías que no se pudieron reconocer.</li></ul>
                <p className="mt-3 text-xs">Las razones se cuentan una sola vez por respuesta. Los originales se conservan; no se asigna «Recursos propios» a los vacíos ni se incorpora interés futuro como un nivel cursado.</p>
            </details>
        </article>

        <article className={`rounded-2xl border p-5 sm:p-6 ${computable ? 'border-blue-100 bg-blue-50' : 'border-amber-200 bg-amber-50'}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Contraste exploratorio · Chi-cuadrada de Pearson</p>
            <h3 className="mt-2 font-semibold text-slate-900">{title}</h3>
            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white/80 p-4"><dt className="text-xs text-slate-600">Estadístico χ²</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{c.chi2 === null ? '—' : c.chi2.toLocaleString('es-BO', { maximumFractionDigits: 3 })}</dd></div>
                <div className="rounded-xl bg-white/80 p-4"><dt className="text-xs text-slate-600">Grados de libertad</dt><dd className="mt-1 text-lg font-semibold">{c.gradosLibertad || '—'}</dd></div>
                <div className="rounded-xl bg-white/80 p-4"><dt className="text-xs text-slate-600">p-valor aproximado · α = 0,05</dt><dd className="mt-1 text-base font-semibold tabular-nums">{pLabel}</dd></div>
            </dl>
            <p className="mt-4 text-sm leading-relaxed text-slate-700">{computable ? 'El contraste explora asociación entre nivel cursado y fuente utilizada. No prueba causalidad, no demuestra independencia cuando no se rechaza la hipótesis y no predice cómo financiarán estudios futuros.' : c.estado === 'frecuencias_bajas' ? `El p-valor sirve para evaluar si hay evidencia de asociación. Aquí, ${c.celdasMenor5} de ${c.filas.length * c.columnas.length} combinaciones tienen un valor esperado menor de 5 (mínimo: ${c.minimaEsperada!.toLocaleString('es-BO', { maximumFractionDigits: 2 })}). Por eso la aproximación usual de chi-cuadrada no es fiable y se omite ese p-valor. No es un error de carga: las cantidades y los porcentajes sí se pueden analizar. Para concluir sobre asociación hace falta un método exacto o de permutación, aún no implementado.` : c.estado === 'error_numerico' ? 'La tabla sigue disponible. No se reemplaza un fallo de cálculo por p = 1 ni por una conclusión de independencia.' : 'Se requieren al menos dos niveles y dos fuentes con pares válidos. La tabla y las frecuencias siguen siendo útiles como descripción.'}</p>
            <details className="mt-4 text-xs leading-relaxed text-slate-600"><summary className="cursor-pointer font-medium text-slate-800">Supuestos y alcance del contraste</summary>
                <p className="mt-3">H₀: nivel cursado y financiamiento utilizado no están asociados. Pearson sin corrección de Yates. Se exige ninguna esperada menor de 1 y al menos 80% de esperadas de 5 o más; para una tabla 2 × 2, todas deben ser de 5 o más. No se agrupan niveles distintos para forzar estos criterios.</p>
                <p className="mt-2">Se asume una respuesta independiente por persona. Omitir duplicados exactos no garantiza esa independencia ni una muestra representativa de todos los titulados. Los resultados se limitan a quienes respondieron.</p>
                <a className="mt-2 inline-block underline underline-offset-2" href="https://itl.nist.gov/div898/software/dataplot/refman1/auxillar/chistest.htm" target="_blank" rel="noreferrer">Referencia metodológica: NIST · Prueba de independencia</a>
            </details>
        </article>
        <aside className="rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600"><h3 className="font-semibold text-slate-900">Para responder sobre futuros estudios</h3><p className="mt-2">HU3 requiere preguntar «¿Qué nivel desea estudiar?» y «¿Cuál sería su principal fuente de financiamiento?». Los datos disponibles describen estudios cursados; conservar esta diferencia evita atribuir intenciones que no se recogieron.</p></aside>
    </section>;
}
