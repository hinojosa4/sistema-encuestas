export function DataCoverage() {
    return <details className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-700">Qué preguntas permiten responder estas encuestas</summary>
        <p className="mt-3 leading-relaxed">Los archivos entregados por el docente permiten analizar respuestas observadas. Una preferencia futura requiere una pregunta específica; no se deduce de los estudios previos.</p>
        <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[580px] text-left text-sm">
                <caption className="sr-only">Alcance de los instrumentos entregados y datos que faltan</caption>
                <thead className="border-b border-slate-200 text-slate-800"><tr><th scope="col" className="p-3">Tema</th><th scope="col" className="p-3">Podemos responder</th><th scope="col" className="p-3">Para completar la historia falta</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                    <tr><th scope="row" className="p-3 font-medium text-slate-800">HU1 · Empleabilidad</th><td className="p-3">¿Cuánta experiencia declaran? ¿Trabajan y en qué sector?</td><td className="p-3">Año de egreso para calcular antigüedad desde el egreso y comparar cohortes. La inserción por cohorte exige también definir un plazo y seguimiento.</td></tr>
                    <tr><th scope="row" className="p-3 font-medium text-slate-800">HU2 · Formación</th><td className="p-3">¿Desean estudiar un posgrado y en qué área? ¿Qué nivel ya cursaron?</td><td className="p-3">Nivel de posgrado deseado para cruzarlo con el área de interés.</td></tr>
                    <tr><th scope="row" className="p-3 font-medium text-slate-800">HU3 · Financiamiento</th><td className="p-3">¿Cómo financiaron sus posgrados? ¿Cómo se distribuyen las fuentes por nivel cursado?</td><td className="p-3">Fuente prevista para estudios futuros y nivel deseado. Para medir restricciones, preguntar también barreras económicas y monto disponible.</td></tr>
                </tbody>
            </table>
        </div>
        <p className="mt-4 text-xs leading-relaxed">Estos datos adicionales deben recogerse en un instrumento complementario. Abrir un programa requiere además costos, cupos y estimaciones de matrícula efectiva.</p>
    </details>;
}
