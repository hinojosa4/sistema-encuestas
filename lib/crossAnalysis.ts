import type { Row } from './importPipeline';
import { normalizarTexto } from './dataMappers';
import { normalizarAreaPosgrado, normalizarFinanciamiento, normalizarNivelPosgrado } from './postgraduate';
import { calcularChiCuadrada } from './statistics';

const yesNo = (v: unknown) => ['si', 'no'].includes(normalizarTexto(v)) ? normalizarTexto(v) === 'si' ? 'Sí' : 'No' : '';
const experience = (r: Row) => typeof r.anios_vida_profesional_normalizados === 'number' && Number.isFinite(r.anios_vida_profesional_normalizados) && r.anios_vida_profesional_normalizados >= 0 ? r.anios_vida_profesional_normalizados <= 5 ? 'Hasta 5 años' : 'Más de 5 años' : '';
export function buildCrossAnalyses(g: Row[], e: Row[]) {
    const a = g.map(r => {
        const level = normalizarNivelPosgrado(r.nivel_posgrado_cursado), funding = normalizarFinanciamiento(r.financiamiento_posgrado_cursado);
        return { varX: normalizarTexto(r.ha_realizado_posgrado) === 'si' && level ? level === 'Diplomado' ? 'Diplomado' : 'Posgrado' : '', varY: funding ? funding === 'Recursos propios' ? funding : 'Con beca' : '' };
    });
    const b = g.map(r => ({ varX: normalizarTexto(r.interes_futuro_posgrado) === 'si' ? normalizarAreaPosgrado(r.area_interes_posgrado) : '', varY: experience(r) }));
    const groupedB = b.map(r => ({ ...r, varX: ['base de datos', 'robotica'].includes(normalizarTexto(r.varX)) ? 'Otras (Base de Datos y Robótica)' : r.varX }));
    return [
        { id: 'A', titulo: 'Nivel cursado × financiamiento (agrupado)', origen: 'Titulados', regla: 'Solo formación complementaria afirmativa; Diplomado frente a Especialidad/Maestría/Doctorado/Posdoctorado. Beca total y parcial agrupadas; recursos propios separado.', chi: calcularChiCuadrada(a), totalEncuesta: g.length },
        { id: 'B_original', titulo: 'Área de interés × experiencia (categorías originales)', origen: 'Titulados', regla: 'Solo interesados, área no vacía y experiencia numérica válida; hasta 5 frente a más de 5 años.', chi: calcularChiCuadrada(b), totalEncuesta: g.length },
        { id: 'B', titulo: 'Área de interés × experiencia (agrupado)', origen: 'Titulados', regla: 'Mismos pares que B original; Base de Datos y Robótica agrupadas en Otras, según tabla 32 del PDF.', chi: calcularChiCuadrada(groupedB), totalEncuesta: g.length },
        { id: 'C', titulo: 'Experiencia × formación complementaria', origen: 'Titulados', regla: 'Hasta 5 frente a más de 5 años. Solo experiencia válida y Sí/No reconocido.', chi: calcularChiCuadrada(g.map(r => ({ varX: experience(r), varY: yesNo(r.ha_realizado_posgrado) }))), totalEncuesta: g.length },
        { id: 'D', titulo: 'Tipo de organización × contratación', origen: 'Empleadores', regla: 'Público y Privado; contratación en últimos 5 años Sí/No. Categorías diferentes o ausentes se excluyen.', chi: calcularChiCuadrada(e.map(r => ({ varX: ['publico', 'privado'].includes(normalizarTexto(r.tipo_organizacion)) ? normalizarTexto(r.tipo_organizacion) === 'publico' ? 'Público' : 'Privado' : '', varY: yesNo(r.ha_contratado_sistemas) }))), totalEncuesta: e.length },
    ];
}
export type CrossAnalysis = ReturnType<typeof buildCrossAnalyses>[number];
