import * as XLSX from 'xlsx';
import { safeSpreadsheetValue } from './importPipeline';
import type { AnalysisReport } from './reports';

export function uniqueSheetName(label: string, used: Set<string>) {
    const clean = label.replace(/[\\/?:*\[\]\x00-\x1f]/g, ' ').replace(/^'+|'+$/g, '').trim() || 'Hoja';
    let name = clean.slice(0, 31), n = 1;
    while (used.has(name.toLowerCase())) {
        const suffix = `_${++n}`;
        name = clean.slice(0, 31 - suffix.length) + suffix;
    }
    used.add(name.toLowerCase());
    return name;
}
export function reportToWorkbook(report: AnalysisReport) {
    const book = XLSX.utils.book_new(), used = new Set<string>();
    const append = (name: string, rows: unknown[][]) => {
        const sheet = XLSX.utils.aoa_to_sheet(rows.map(r => r.map(v => v == null ? null : safeSpreadsheetValue(v))));
        sheet['!cols'] = (rows[0] ?? []).map((_, i) => ({ wch: i === 0 ? 45 : 24 }));
        if (rows.length && rows[0].length) sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: rows[0].length - 1 } }) };
        XLSX.utils.book_append_sheet(book, sheet, uniqueSheetName(name, used));
    };
    append('Identificacion', [['Indicador', 'Valor'], ['Reporte SHA-256', report.huella], ['Versión de datos SHA-256', report.datosVersion ?? 'Sin huella registrada'], ['Generado UTC', report.generadoUTC], ['Versión', report.version], ['Población de competencias', report.parametros.scope], ['Corte exploratorio (años)', report.parametros.corte], ['Titulados', report.titulados], ['Empleadores', report.empleadores]]);
    for (const t of report.tablas) append(t.nombre, [t.columnas, ...t.filas]);
    return book;
}
