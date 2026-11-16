import { normalizarTexto } from './dataMappers';
import type { Row } from './importPipeline';
import { normalizarAreaPosgrado, normalizarNivelPosgrado } from './postgraduate';
import { calcularChiCuadrada, type ChiSquareResult } from './statistics';

export type FormationRelationCell = {
    row: string;
    column: string;
    count: number;
    percentOfRow: number;
    expected: number;
};

export type FormationRelation = {
    id: string;
    title: string;
    question: string;
    rowLabel: string;
    columnLabel: string;
    rows: string[];
    columns: string[];
    cells: FormationRelationCell[];
    chi: ChiSquareResult;
    originalChi: ChiSquareResult;
    total: number;
    excluded: number;
    groupingNote: string | null;
};

const isYes = (value: unknown) => normalizarTexto(value) === 'si';
const experience = (row: Row) => {
    const years = row.anios_vida_profesional_normalizados;
    if (typeof years !== 'number' || !Number.isFinite(years) || years < 0) return null;
    return years <= 5 ? 'Hasta 5 años' : 'Más de 5 años';
};

const cleanCategory = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ');

function makeRelation(
    rows: Row[],
    config: {
        id: string;
        title: string;
        question: string;
        rowLabel: string;
        columnLabel: string;
        pair: (row: Row) => { varX: string; varY: string } | null;
        rareRowMinimum?: number;
        rareColumnMinimum?: number;
        rareRowLabel?: string;
        rareColumnLabel?: string;
    },
): FormationRelation {
    const pairs = rows.map(config.pair);
    const validPairs = pairs.filter((pair): pair is { varX: string; varY: string } => Boolean(pair?.varX && pair.varY));
    const rowCounts = new Map<string, number>();
    const columnCounts = new Map<string, number>();
    validPairs.forEach(pair => {
        rowCounts.set(pair.varX, (rowCounts.get(pair.varX) ?? 0) + 1);
        columnCounts.set(pair.varY, (columnCounts.get(pair.varY) ?? 0) + 1);
    });
    // Si no hay umbral, se conserva la dimensión completa del cruce.
    const rareRows = new Set([...rowCounts].filter(([, count]) => config.rareRowMinimum !== undefined && count < config.rareRowMinimum).map(([label]) => label));
    const rareColumns = new Set([...columnCounts].filter(([, count]) => config.rareColumnMinimum !== undefined && count < config.rareColumnMinimum).map(([label]) => label));
    const groupedPairs = validPairs.map(pair => ({
        varX: rareRows.has(pair.varX) ? config.rareRowLabel ?? 'Otras categorías' : pair.varX,
        varY: rareColumns.has(pair.varY) ? config.rareColumnLabel ?? 'Otras categorías' : pair.varY,
    }));
    const originalChi = calcularChiCuadrada(validPairs);
    const chi = calcularChiCuadrada(groupedPairs);
    const rowTotals = new Map<string, number>();
    groupedPairs.forEach(pair => rowTotals.set(pair.varX, (rowTotals.get(pair.varX) ?? 0) + 1));
    const cells = chi.filas.flatMap((row, i) => chi.columnas.map((column, j) => ({
        row,
        column,
        count: chi.matriz[i][j],
        percentOfRow: rowTotals.get(row) ? chi.matriz[i][j] / rowTotals.get(row)! * 100 : 0,
        expected: chi.esperadas[i][j],
    })));

    return {
        ...config,
        rows: chi.filas,
        columns: chi.columnas,
        cells,
        chi,
        originalChi,
        total: validPairs.length,
        excluded: rows.length - validPairs.length,
        groupingNote: rareRows.size || rareColumns.size
            ? `Para estabilizar el contraste se agruparon ${rareRows.size ? `${rareRows.size} categoría${rareRows.size === 1 ? '' : 's'} de ${config.rowLabel.toLowerCase()}` : ''}${rareRows.size && rareColumns.size ? ' y ' : ''}${rareColumns.size ? `${rareColumns.size} categoría${rareColumns.size === 1 ? '' : 's'} de ${config.columnLabel.toLowerCase()}` : ''} con pocos casos.`
            : null,
    };
}

export function buildFormationRelations(rows: Row[]): FormationRelation[] {
    const interested = (row: Row) => isYes(row.interes_futuro_posgrado);

    return [
        makeRelation(rows, {
            id: 'area-experiencia',
            title: 'Área de interés × experiencia',
            question: '¿Las áreas de interés se concentran de forma distinta según la experiencia profesional?',
            rowLabel: 'Área de interés',
            columnLabel: 'Experiencia profesional',
            rareRowMinimum: 15,
            rareRowLabel: 'Otras áreas',
            pair: row => {
                if (!interested(row)) return null;
                const area = cleanCategory(normalizarAreaPosgrado(row.area_interes_posgrado));
                const years = experience(row);
                return area && years ? { varX: area, varY: years } : null;
            },
        }),
        makeRelation(rows, {
            id: 'area-nivel-cursado',
            title: 'Área de interés × nivel cursado',
            question: '¿Las áreas de interés varían entre quienes ya cursaron o están cursando distintos niveles de posgrado?',
            rowLabel: 'Área de interés',
            columnLabel: 'Nivel cursado o en curso',
            rareRowMinimum: 15,
            rareColumnMinimum: 10,
            rareRowLabel: 'Otras áreas',
            rareColumnLabel: 'Otros niveles',
            pair: row => {
                if (!interested(row) || !isYes(row.ha_realizado_posgrado)) return null;
                const area = cleanCategory(normalizarAreaPosgrado(row.area_interes_posgrado));
                const level = normalizarNivelPosgrado(row.nivel_posgrado_cursado);
                return area && level ? { varX: area, varY: level } : null;
            },
        }),
        makeRelation(rows, {
            id: 'area-institucion-preferida',
            title: 'Área de interés × institución preferida',
            question: '¿La institución que se prefiere para estudiar cambia según el área temática elegida?',
            rowLabel: 'Área de interés',
            columnLabel: 'Institución preferida',
            rareRowMinimum: 15,
            rareColumnMinimum: 10,
            rareRowLabel: 'Otras áreas',
            rareColumnLabel: 'Otras instituciones',
            pair: row => {
                if (!interested(row)) return null;
                const area = cleanCategory(normalizarAreaPosgrado(row.area_interes_posgrado));
                const institution = cleanCategory(row.institucion_optaria_posgrado);
                return area && institution ? { varX: area, varY: institution } : null;
            },
        }),
    ];
}

