export function DataCoverage({ tieneEgreso = false }: { tieneEgreso?: boolean }) {
    return <details className="border-t border-slate-200 px-1 py-4 text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-700">Alcance de las encuestas</summary>
        <p className="mt-3 leading-relaxed">Los archivos entregados por el docente permiten analizar respuestas observadas. Una preferencia futura requiere una pregunta específica; no se deduce de los estudios previos.</p>
        <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[580px] text-left text-sm">
                <caption className="sr-only">Alcance de los instrumentos entregados y datos que faltan</caption>
                <thead className="border-b border-slate-200 text-slate-800"><tr><th scope="col" className="p-3">Tema</th><th scope="col" className="p-3">Podemos responder</th><th scope="col" className="p-3">Datos adicionales para ampliar el análisis</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                    <tr><th scope="row" className="p-3 font-medium text-slate-800">Empleabilidad</th><td className="p-3">¿Cuánta experiencia declaran? ¿Trabajan y en qué sector?{tieneEgreso && ' También se muestran años de egreso y ocupación por cohorte.'}</td><td className="p-3">{!tieneEgreso && 'El año de egreso permitiría calcular antigüedad desde el egreso y comparar cohortes. '}La inserción dentro de un plazo exige definir ese plazo y realizar seguimiento.</td></tr>
                    <tr><th scope="row" className="p-3 font-medium text-slate-800">Formación</th><td className="p-3">¿Desean estudiar un posgrado y en qué área? ¿Qué nivel ya cursaron?</td><td className="p-3">Nivel de posgrado deseado para cruzarlo con el área de interés.</td></tr>
                    <tr><th scope="row" className="p-3 font-medium text-slate-800">Financiamiento</th><td className="p-3">¿Cómo financiaron sus posgrados? ¿Cómo se distribuyen las fuentes por nivel cursado?</td><td className="p-3">Fuente prevista para estudios futuros y nivel deseado. Para medir restricciones, preguntar también barreras económicas y monto disponible.</td></tr>
                    <tr><th scope="row" className="p-3 font-medium text-slate-800">Competencias</th><td className="p-3">¿Cómo valoran los titulados su formación y qué mejoras proponen? ¿Qué perciben y solicitan los empleadores?</td><td className="p-3">Evaluación de suficiencia por competencia técnica y transversal frente al puesto. Para una brecha numérica, medir formación recibida y nivel requerido con una escala comparable.</td></tr>
                </tbody>
            </table>
        </div>
        <p className="mt-4 text-xs leading-relaxed">Estos datos adicionales deben recogerse en un instrumento complementario. Abrir un programa requiere además costos, cupos y estimaciones de matrícula efectiva.</p>
    </details>;
}
