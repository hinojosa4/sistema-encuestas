import { normalizarTexto } from './dataMappers';
import type { Row } from './importPipeline';
import { calcularChiCuadrada, calcularConcentracion, calcularDistribucionFrecuencias } from './statistics';

// Catálogos explícitos: no adivinar un nivel o una fuente a partir de texto parcial.
const levels = ['Diplomado', 'Especialidad', 'Maestría', 'Doctorado', 'Posdoctorado'];
export function normalizarNivelPosgrado(value: unknown): string | null {
    const key = normalizarTexto(value).replace(/^(post doctorado|pos doctorado|postdoctorado)$/, 'posdoctorado');
    return levels.find(label => normalizarTexto(label) === key) ?? null;
}

const financing = new Map([
    ['financiado con recursos propios', 'Recursos propios'],
    ['recursos propios', 'Recursos propios'],
    ['total financiamiento por medio de una beca', 'Beca total'],
    ['beca total', 'Beca total'],
    ['financiado parcialmente por medio de una beca', 'Beca parcial'],
    ['beca parcial', 'Beca parcial'],
]);
export const normalizarFinanciamiento = (value: unknown) => financing.get(normalizarTexto(value)) ?? null;
const yes = (value: unknown) => normalizarTexto(value) === 'si';
const sortedFrequency = (values: string[]) => calcularDistribucionFrecuencias(values).sort((a, b) => b.cantidad - a.cantidad);
const thematicAreas = ['IA', 'Ingeniería de Software', 'Redes de Datos y Seguridad', 'Base de Datos', 'Robótica'];
const areaLabel = (value: unknown) => {
    const original = String(value ?? '').trim().replace(/\s+/g, ' ');
    return thematicAreas.find(label => normalizarTexto(label) === normalizarTexto(original)) ?? original;
};

export function resumirFormacion(rows: Row[]) {
    const interested = rows.filter(r => yes(r.interes_futuro_posgrado));
    const areas = sortedFrequency(interested.map(r => areaLabel(r.area_interes_posgrado)).filter(Boolean));
    const levelsDone = rows.filter(r => yes(r.ha_realizado_posgrado))
        .map(r => normalizarNivelPosgrado(r.nivel_posgrado_cursado)).filter((v): v is string => v !== null);
    const sinInteres = rows.filter(r => normalizarTexto(r.interes_futuro_posgrado) === 'no').length;
    const conArea = areas.reduce((n, r) => n + r.cantidad, 0);
    return {
        total: rows.length, interesados: interested.length, sinInteres,
        interesNoUtilizable: rows.length - interested.length - sinInteres,
        areas, niveles: sortedFrequency(levelsDone), concentracion: calcularConcentracion(areas),
        sinArea: interested.length - conArea,
        areasFueraRuta: rows.filter(r => !yes(r.interes_futuro_posgrado) && String(r.area_interes_posgrado ?? '').trim()).length,
    };
}
export type FormationSummary = ReturnType<typeof resumirFormacion>;

export function resumirFinanciamiento(rows: Row[]) {
    const pares: { varX: string; varY: string }[] = [];
    const fuentes: string[] = [];
    const exclusiones = { sinPosgrado: 0, rutaNoConfirmada: 0, incompletas: 0, noReconocidas: 0 };
    for (const row of rows) {
        const route = normalizarTexto(row.ha_realizado_posgrado);
        if (route === 'no') { exclusiones.sinPosgrado++; continue; }
        if (route !== 'si') { exclusiones.rutaNoConfirmada++; continue; }
        const nivel = normalizarNivelPosgrado(row.nivel_posgrado_cursado);
        const fuente = normalizarFinanciamiento(row.financiamiento_posgrado_cursado);
        if (fuente) fuentes.push(fuente);
        if (!String(row.nivel_posgrado_cursado ?? '').trim() || !String(row.financiamiento_posgrado_cursado ?? '').trim()) {
            exclusiones.incompletas++; continue;
        }
        if (!nivel || !fuente) { exclusiones.noReconocidas++; continue; }
        pares.push({ varX: nivel, varY: fuente });
    }
    pares.sort((a, b) => levels.indexOf(a.varX) - levels.indexOf(b.varX) || a.varY.localeCompare(b.varY, 'es'));
    const distribucion = sortedFrequency(fuentes);
    const conBeca = fuentes.filter(f => f === 'Beca total' || f === 'Beca parcial').length;
    return {
        total: rows.length, fuentesValidas: fuentes.length, distribucion,
        conBeca, porcentajeBeca: fuentes.length ? conBeca / fuentes.length * 100 : null,
        chi: calcularChiCuadrada(pares), exclusiones,
        excluidosCruce: rows.length - pares.length,
    };
}
export type FinancingSummary = ReturnType<typeof resumirFinanciamiento>;

export function filasCruceFinanciamiento(summary: FinancingSummary) {
    const c = summary.chi;
    return c.filas.flatMap((nivel, i) => c.columnas.map((fuente, j) => ({
        nivel_cursado: nivel, financiamiento_utilizado: fuente, cantidad: c.matriz[i][j],
        porcentaje_del_nivel: c.matriz[i][j] / c.totalesFila[i] * 100,
        frecuencia_esperada: c.esperadas[i][j], total_nivel: c.totalesFila[i],
        base_cruce: c.total,
    })));
}
