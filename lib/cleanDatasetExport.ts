import * as XLSX from 'xlsx';
import { normalizarTexto } from './dataMappers';
import { normalizeEmployerField, normalizeEmployerSector, normalizeEmployerSize, safeSpreadsheetValue, type Row } from './importPipeline';

export const EXCLUDED_INTERNAL_KEYS = new Set([
    'raw_data',
    'respuestas_originales',
    'codigos_ordinales',
    'selecciones_multiples',
    'calidad_datos',
    'version_mapeo',
    'fila_origen',
    'hora_inicio_original',
    'hora_finalizacion_original',
    'correo_microsoft',
    'nombre_microsoft',
    'marca_temporal_original',
    'id',
    'created_at',
    'updated_at',
    'importacion_id',
    'archivo_sha256',
    'archivo_nombre',
    'hoja_origen',
    'version_instrumento',
    'instrumento_origen',
    'email_contacto',
    'telefono_contacto',
    'linkedin_url',
    'correo_electronico',
    'respuesta_origen_id',
]);

const EMPLOYER_CATEGORICAL_FIELDS = new Set([
    'nombre_empresa',
    'tipo_organizacion',
    'tamano_organizacion',
    'rubro_sector',
    'ha_contratado_sistemas',
    'probabilidad_incorporacion_futura',
    'nivel_formacion_demandado',
    'medio_convocatoria',
    'cargos_desempenados',
]);

const cleanEmployerLabel = (value: unknown) => {
    const text = String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.toLocaleUpperCase('es-BO') : null;
};

function normalizeCompanyKey(value: unknown) {
    const normalized = normalizarTexto(value);
    return normalized ? normalized.toLocaleUpperCase('es-BO') : null;
}

function reportedEmployeeCount(value: unknown): number | null {
    const text = String(value ?? '').replace(/\u00a0/g, ' ').trim();
    const match = text.match(/\b\d+(?:[.,]\d+)?\b/);
    if (!match) return null;
    const count = Number(match[0].replace(',', '.'));
    return Number.isFinite(count) && count >= 0 ? count : null;
}

function prepareEmployerExportRow(row: Row): Row {
    if (!('nombre_empresa' in row) && !('tipo_organizacion' in row) && !('tamano_organizacion' in row)) return row;
    const prepared = { ...row };
    for (const field of EMPLOYER_CATEGORICAL_FIELDS) {
        if (field in prepared && field !== 'nombre_empresa') prepared[field] = normalizeEmployerField(field, prepared[field]);
    }
    if ('nombre_empresa' in prepared) {
        prepared.nombre_empresa = cleanEmployerLabel(prepared.nombre_empresa);
        prepared.nombre_empresa_normalizado = normalizeCompanyKey(row.nombre_empresa);
    }
    if ('tamano_organizacion' in row) {
        const originalSize = row.raw_data && typeof row.raw_data === 'object' ? (row.raw_data as Row).tamano_organizacion : row.tamano_organizacion;
        prepared.tamano_organizacion = normalizeEmployerSize(row.tamano_organizacion);
        prepared.numero_empleados_reportado = reportedEmployeeCount(originalSize);
    }
    if ('rubro_sector' in row) prepared.rubro_sector_categoria = normalizeEmployerSector(row.rubro_sector);
    return prepared;
}

export function cleanRowForExport(row: Row): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(prepareEmployerExportRow(row))) {
        if (EXCLUDED_INTERNAL_KEYS.has(k)) continue;
        result[k] = safeSpreadsheetValue(v);
    }
    return result;
}

export function cleanRowsToCsv(rows: Row[]): string {
    if (!rows.length) return '';
    const cleaned = rows.map(cleanRowForExport);
    const headers = Object.keys(cleaned[0] || {});
    const escapeCsv = (val: unknown) => {
        if (val === null || val === undefined) return '""';
        const s = String(val).replace(/"/g, '""');
        return `"${s}"`;
    };
    const lines = [
        headers.map(h => `"${h}"`).join(','),
        ...cleaned.map(row => headers.map(h => escapeCsv(row[h])).join(',')),
    ];
    return '\ufeff' + lines.join('\r\n');
}

export function createCleanDatasetWorkbook(titulados: Row[], empleadores: Row[]) {
    const wb = XLSX.utils.book_new();
    const cleanTitulados = titulados.map(cleanRowForExport);
    const cleanEmpleadores = empleadores.map(cleanRowForExport);

    const wsTitulados = XLSX.utils.json_to_sheet(cleanTitulados);
    wsTitulados['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: cleanTitulados.length, c: Object.keys(cleanTitulados[0] || {}).length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, wsTitulados, 'Titulados_Limpios');

    const wsEmpleadores = XLSX.utils.json_to_sheet(cleanEmpleadores);
    wsEmpleadores['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: cleanEmpleadores.length, c: Object.keys(cleanEmpleadores[0] || {}).length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, wsEmpleadores, 'Empleadores_Limpios');

    const wsMeta = XLSX.utils.json_to_sheet([
        { Indicador: 'Dataset', Detalle: 'Encuestas Depuradas de Titulados y Empleadores (ARCUSUR - UMSS)' },
        { Indicador: 'Objetivo de Acreditación', Detalle: 'Evidencia empírica para la Guía Metodológica de Análisis de Mercado y Autoevaluación ARCUSUR' },
        { Indicador: 'Total Titulados Depurados', Detalle: titulados.length },
        { Indicador: 'Total Empleadores Depurados', Detalle: empleadores.length },
        { Indicador: 'Fase Metodológica', Detalle: 'Data Wrangling / Limpieza y Normalización ETL' },
        { Indicador: 'Protección de Privacidad', Detalle: 'Datos de contacto y metadatos técnicos de formularios excluidos' },
        { Indicador: 'Fecha de Extracción (UTC)', Detalle: new Date().toISOString() },
    ]);
    XLSX.utils.book_append_sheet(wb, wsMeta, 'Metadatos_Limpieza');

    return wb;
}

export function triggerDownload(content: BlobPart, mime: string, filename: string) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

