import { calcularChiCuadrada, type ChiSquareResult } from './statistics';
import { normalizarTexto } from './dataMappers';
import { normalizarPlazo, normalizarSector, normalizarSituacion, type Row } from './importPipeline';

export type EmployabilityCell = {
    row: string;
    column: string;
    count: number;
    percentOfRow: number;
    averageExperience: number | null;
};

export type EmployabilityRelation = {
    id: string;
    title: string;
    question: string;
    rowLabel: string;
    columnLabel: string;
    rows: string[];
    columns: string[];
    cells: EmployabilityCell[];
    chi: ChiSquareResult;
    total: number;
    excluded: number;
};

const experienceGroup = (row: Row, limit: number) => {
    const value = row.anios_vida_profesional_normalizados;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return '';
    return value <= limit ? `Hasta ${limit} años` : `Más de ${limit} años`;
};

const status = (row: Row) => {
    const value = normalizarTexto(normalizarSituacion(row.situacion_laboral_actual));
    if (value === 'empleado en organizacion') return 'Trabaja en organización';
    if (value === 'emprendimiento propio') return 'Emprendimiento';
    if (value === 'desempleado / en busqueda') return 'No trabaja';
    return '';
};

const gender = (row: Row) => {
    const value = normalizarTexto(row.genero);
    if (value === 'hombre') return 'Hombre';
    if (value === 'mujer') return 'Mujer';
    return '';
};

const sector = (row: Row) => {
    const value = normalizarTexto(normalizarSector(row.sector_empresa_trabajo));
    if (value.includes('privado')) return 'Privado';
    if (value.includes('publico')) return 'Público';
    return '';
};

const cargo = (row: Row) => String(row.cargo_actual ?? '').trim();

const experience = (row: Row) => typeof row.anios_vida_profesional_normalizados === 'number' &&
    Number.isFinite(row.anios_vida_profesional_normalizados) && row.anios_vida_profesional_normalizados >= 0
    ? row.anios_vida_profesional_normalizados : null;

function buildRelation(rows: Row[], id: string, title: string, question: string, rowLabel: string, columnLabel: string,
    pair: (row: Row) => { row: string; column: string }): EmployabilityRelation {
    const pairs = rows.map(row => ({ ...pair(row), experience: experience(row) }));
    const valid = pairs.filter(item => item.row && item.column);
    const rowOrder = [...new Set(valid.map(item => item.row))];
    const columnOrder = [...new Set(valid.map(item => item.column))];
    const cells = rowOrder.flatMap(row => columnOrder.map(column => {
        const group = valid.filter(item => item.row === row && item.column === column);
        const rowTotal = valid.filter(item => item.row === row).length;
        const values = group.map(item => item.experience).filter((value): value is number => value !== null);
        return { row, column, count: group.length, percentOfRow: rowTotal ? group.length / rowTotal * 100 : 0,
            averageExperience: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null };
    }));
    return { id, title, question, rowLabel, columnLabel, rows: rowOrder, columns: columnOrder, cells,
        chi: calcularChiCuadrada(valid.map(item => ({ varX: item.row, varY: item.column }))), total: valid.length, excluded: rows.length - valid.length };
}

export function buildEmployabilityRelations(rows: Row[], limit = 5): EmployabilityRelation[] {
    return [
        buildRelation(rows, 'experience_status', 'Experiencia y situación laboral',
            '¿La situación laboral cambia según el nivel de experiencia?', 'Experiencia profesional', 'Situación laboral',
            row => ({ row: experienceGroup(row, limit), column: status(row) })),
        buildRelation(rows, 'gender_status', 'Género y situación laboral',
            '¿Cómo se distribuye la situación laboral dentro de cada grupo?', 'Género', 'Situación laboral',
            row => ({ row: gender(row), column: status(row) })),
        buildRelation(rows, 'first_job_status', 'Primer empleo y situación actual',
            '¿La rapidez del primer empleo se relaciona con la situación actual?', 'Tiempo hasta el primer empleo', 'Situación laboral',
            row => {
                const value = normalizarTexto(normalizarPlazo(row.tiempo_conseguir_primer_empleo));
                const early = ['ya trabajaba antes de titularse', 'menos de 1 mes', 'entre 1 - 4 meses'].includes(value);
                return { row: value ? early ? 'Antes o hasta 4 meses' : 'Más de 4 meses' : '', column: status(row) };
            }),
    ];
}

export type MultivariateProfile = {
    id: string;
    title: string;
    description: string;
    rowLabel: string;
    columnLabel: string;
    cells: EmployabilityCell[];
    total: number;
    excluded: number;
};

export function buildEmployabilityProfiles(rows: Row[]): MultivariateProfile[] {
    const definitions = [
        { id: 'gender_status_experience', title: 'Perfil por género y situación laboral', description: 'Combina género, situación laboral y experiencia profesional.', rowLabel: 'Género', columnLabel: 'Situación laboral', pair: (row: Row) => ({ row: gender(row), column: status(row) }) },
        { id: 'sector_cargo_experience', title: 'Trayectoria por sector y cargo', description: 'Solo incluye titulados que trabajan en una organización.', rowLabel: 'Sector laboral', columnLabel: 'Cargo actual', pair: (row: Row) => ({ row: sector(row), column: cargo(row) }) },
    ];
    return definitions.map(definition => {
        const valid = rows.map(row => ({ ...definition.pair(row), experience: experience(row) })).filter(item => item.row && item.column);
        const rowOrder = [...new Set(valid.map(item => item.row))];
        const columnOrder = [...new Set(valid.map(item => item.column))];
        const cells = rowOrder.flatMap(row => columnOrder.map(column => {
            const values = valid.filter(item => item.row === row && item.column === column).map(item => item.experience).filter((value): value is number => value !== null);
            return { row, column, count: valid.filter(item => item.row === row && item.column === column).length, percentOfRow: 0,
                averageExperience: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null };
        }));
        return { id: definition.id, title: definition.title, description: definition.description, rowLabel: definition.rowLabel,
            columnLabel: definition.columnLabel, cells, total: valid.length, excluded: rows.length - valid.length };
    });
}
