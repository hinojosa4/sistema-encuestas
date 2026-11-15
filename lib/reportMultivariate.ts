import { normalizarTexto } from './dataMappers';
import { normalizeEmployerSize, type Row } from './importPipeline';
import { normalizarAreaPosgrado, normalizarFinanciamiento, normalizarNivelPosgrado } from './postgraduate';

export type ReportProfileCell = {
    row: string;
    column: string;
    count: number;
    percentOfRow: number;
    average: number | null;
};

export type ReportProfile = {
    id: string;
    title: string;
    description: string;
    rowLabel: string;
    columnLabel: string;
    metricLabel: string;
    metricType: 'average' | 'rate';
    rows: string[];
    columns: string[];
    cells: ReportProfileCell[];
    total: number;
    excluded: number;
    note: string;
};

const experience = (row: Row) => {
    const value = row.anios_vida_profesional_normalizados;
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
};

const yesNo = (value: unknown) => {
    const normalized = normalizarTexto(value);
    if (normalized === 'si') return 1;
    if (normalized === 'no') return 0;
    return null;
};

const gender = (value: unknown) => {
    const normalized = normalizarTexto(value);
    if (normalized === 'hombre') return 'Hombre';
    if (normalized === 'mujer') return 'Mujer';
    return null;
};

const organizationType = (value: unknown) => {
    const normalized = normalizarTexto(value);
    if (normalized.includes('public')) return 'Público';
    if (normalized.includes('privad')) return 'Privado';
    return null;
};

function profileFromRows(
    rows: Row[],
    config: Omit<ReportProfile, 'rows' | 'columns' | 'cells' | 'total' | 'excluded'> & {
        pair: (row: Row) => { row: string; column: string; metric: number } | null;
    },
): ReportProfile {
    const values = rows.map(config.pair);
    const valid = values.filter((item): item is { row: string; column: string; metric: number } => Boolean(item));
    const rowLabels = [...new Set(valid.map(item => item.row))];
    const columnLabels = [...new Set(valid.map(item => item.column))];
    const cells = rowLabels.flatMap(row => columnLabels.map(column => {
        const group = valid.filter(item => item.row === row && item.column === column);
        const rowTotal = valid.filter(item => item.row === row).length;
        const metricValues = group.map(item => item.metric);
        return {
            row,
            column,
            count: group.length,
            percentOfRow: rowTotal ? group.length / rowTotal * 100 : 0,
            average: metricValues.length ? metricValues.reduce((sum, value) => sum + value, 0) / metricValues.length : null,
        };
    }));
    return {
        ...config,
        rows: rowLabels,
        columns: columnLabels,
        cells,
        total: valid.length,
        excluded: rows.length - valid.length,
    };
}

export function buildFormationReportProfiles(rows: Row[]): ReportProfile[] {
    return [
        profileFromRows(rows, {
            id: 'area-financiamiento-experiencia',
            title: 'Área, financiamiento y experiencia',
            description: 'Relaciona el área de interés con el financiamiento histórico del posgrado cursado y resume los años de vida profesional.',
            rowLabel: 'Área de interés',
            columnLabel: 'Financiamiento histórico',
            metricLabel: 'Experiencia media',
            metricType: 'average',
            note: 'El financiamiento corresponde a estudios ya cursados; no representa una beca futura.',
            pair: row => {
                const area = normalizarAreaPosgrado(row.area_interes_posgrado);
                const funding = normalizarFinanciamiento(row.financiamiento_posgrado_cursado);
                const years = experience(row);
                return area && funding && years !== null ? { row: area, column: funding, metric: years } : null;
            },
        }),
        profileFromRows(rows, {
            id: 'genero-nivel-experiencia',
            title: 'Género, nivel cursado y experiencia',
            description: 'Describe el nivel de posgrado cursado o en curso dentro de cada grupo de género y muestra la experiencia media.',
            rowLabel: 'Género',
            columnLabel: 'Nivel cursado o en curso',
            metricLabel: 'Experiencia media',
            metricType: 'average',
            note: 'Este perfil describe formación realizada o en curso; no mide el nivel de posgrado deseado.',
            pair: row => {
                const rowLabel = gender(row.genero);
                const level = normalizarNivelPosgrado(row.nivel_posgrado_cursado);
                const years = experience(row);
                return rowLabel && normalizarTexto(row.ha_realizado_posgrado) === 'si' && level && years !== null
                    ? { row: rowLabel, column: level, metric: years } : null;
            },
        }),
    ];
}

export function buildEmployerReportProfiles(rows: Row[]): ReportProfile[] {
    return [profileFromRows(rows, {
        id: 'tipo-tamano-contratacion',
        title: 'Tipo, tamaño y contratación',
        description: 'Relaciona el tipo y tamaño de la organización con la proporción que declaró contratar ingenieros en los últimos cinco años.',
        rowLabel: 'Tipo de organización',
        columnLabel: 'Tamaño de organización',
        metricLabel: 'Contratación afirmativa',
        metricType: 'rate',
        note: 'La proporción representa respuestas afirmativas de contratación, no el número de ingenieros contratados.',
        pair: row => {
            const type = organizationType(row.tipo_organizacion);
            const size = normalizeEmployerSize(row.tamano_organizacion);
            const hired = yesNo(row.ha_contratado_sistemas);
            return type && size && size !== 'NO CLASIFICABLE' && hired !== null
                ? { row: type, column: size, metric: hired } : null;
        },
    })];
}
