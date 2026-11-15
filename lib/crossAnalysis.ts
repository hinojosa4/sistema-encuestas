import type { Row } from './importPipeline';
import { normalizarTexto } from './dataMappers';
import { normalizarAreaPosgrado, normalizarFinanciamiento, normalizarNivelPosgrado } from './postgraduate';
import { calcularChiCuadrada } from './statistics';

const yesNo = (value: unknown) => {
    const normalized = normalizarTexto(value);
    return normalized === 'si' ? 'Sí' : normalized === 'no' ? 'No' : '';
};
const experience = (row: Row) => {
    const value = row.anios_vida_profesional_normalizados;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return '';
    return value <= 5 ? 'Hasta 5 años' : 'Más de 5 años';
};
const gender = (row: Row) => {
    const normalized = normalizarTexto(row.genero);
    return normalized === 'hombre' ? 'Hombre' : normalized === 'mujer' ? 'Mujer' : '';
};

export function buildCrossAnalyses(graduates: Row[], employers: Row[]) {
    const funding = graduates.map(row => {
        const level = normalizarNivelPosgrado(row.nivel_posgrado_cursado);
        const source = normalizarFinanciamiento(row.financiamiento_posgrado_cursado);
        return {
            varX: normalizarTexto(row.ha_realizado_posgrado) === 'si' && level ? level === 'Diplomado' ? 'Diplomado' : 'Posgrado superior' : '',
            varY: source ? source === 'Recursos propios' ? source : 'Con beca' : '',
        };
    });
    const areaExperience = graduates.map(row => ({
        varX: normalizarTexto(row.interes_futuro_posgrado) === 'si' ? normalizarAreaPosgrado(row.area_interes_posgrado) : '',
        varY: experience(row),
    }));
    const groupedAreaExperience = areaExperience.map(pair => ({
        ...pair,
        varX: ['base de datos', 'robotica'].includes(normalizarTexto(pair.varX)) ? 'Otras áreas' : pair.varX,
    }));
    const employerType = employers.map(row => ({
        varX: ['publico', 'privado'].includes(normalizarTexto(row.tipo_organizacion)) ? normalizarTexto(row.tipo_organizacion) === 'publico' ? 'Público' : 'Privado' : '',
        varY: yesNo(row.ha_contratado_sistemas),
    }));

    return [
        { id: 'A', titulo: 'Nivel cursado × financiamiento (agrupado)', origen: 'Titulados', regla: 'Solo formación complementaria afirmativa; Diplomado frente a Posgrado superior. Beca total y parcial agrupadas; recursos propios separado.', chi: calcularChiCuadrada(funding), totalEncuesta: graduates.length },
        { id: 'B_original', titulo: 'Área de interés × experiencia (categorías originales)', origen: 'Titulados', regla: 'Solo interesados, área no vacía y experiencia numérica válida; hasta 5 frente a más de 5 años.', chi: calcularChiCuadrada(areaExperience), totalEncuesta: graduates.length },
        { id: 'B', titulo: 'Área de interés × experiencia (agrupado)', origen: 'Titulados', regla: 'Mismos pares que el cruce original; Base de Datos y Robótica agrupadas para estabilizar las frecuencias esperadas.', chi: calcularChiCuadrada(groupedAreaExperience), totalEncuesta: graduates.length },
        { id: 'C', titulo: 'Experiencia × formación complementaria', origen: 'Titulados', regla: 'Hasta 5 frente a más de 5 años. Solo experiencia válida y Sí/No reconocido.', chi: calcularChiCuadrada(graduates.map(row => ({ varX: experience(row), varY: yesNo(row.ha_realizado_posgrado) }))), totalEncuesta: graduates.length },
        { id: 'D', titulo: 'Tipo de organización × contratación', origen: 'Empleadores', regla: 'Público y Privado; contratación en los últimos 5 años Sí/No. Categorías diferentes o ausentes se excluyen.', chi: calcularChiCuadrada(employerType), totalEncuesta: employers.length },
        { id: 'E', titulo: 'Género × formación complementaria', origen: 'Titulados', regla: 'Género frente a formación complementaria afirmativa o negativa. Categorías ausentes o no reconocidas se excluyen.', chi: calcularChiCuadrada(graduates.map(row => ({ varX: gender(row), varY: yesNo(row.ha_realizado_posgrado) }))), totalEncuesta: graduates.length },
    ];
}
export type CrossAnalysis = ReturnType<typeof buildCrossAnalyses>[number];
