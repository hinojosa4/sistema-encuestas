import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { normalizarTexto } from './dataMappers';
import { MAX_ROWS, type Row } from './importPipeline';
import { UserFacingError } from './userMessages';

export function validateHeaders(headers: unknown[]) {
    const seen = new Set<string>();
    for (const header of headers) {
        const key = normalizarTexto(header);
        if (key && seen.has(key) && !key.startsWith('otra asignatura')) throw new UserFacingError(`La columna «${String(header)}» aparece repetida. Revisa los títulos del archivo antes de cargarlo.`);
        seen.add(key);
    }
}
export function readSheet(workbook: XLSX.WorkBook, name: string): Row[] {
    const sheet = workbook.Sheets[name];
    const reference = sheet?.['!fullref'] ?? sheet?.['!ref'];
    if (!reference) return [];
    const range = XLSX.utils.decode_range(reference);
    if (range.e.r - range.s.r > MAX_ROWS) throw new UserFacingError(`Esta hoja tiene demasiadas filas. Usa hojas con hasta ${MAX_ROWS} respuestas.`);
    const header = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, range: { s: range.s, e: { r: range.s.r, c: range.e.c } } })[0] ?? [];
    validateHeaders(header);
    // Las celdas vacias por bifurcacion son validas; datos bajo una columna SIN
    // titulo no lo son, porque no se puede saber a que pregunta pertenecen.
    for (let c = range.s.c; c <= range.e.c; c++) {
        if (String(header[c - range.s.c] ?? '').trim()) continue;
        for (let r = range.s.r + 1; r <= range.e.r; r++) {
            const value = sheet[XLSX.utils.encode_cell({ r, c })]?.v;
            if (value != null && String(value).trim()) throw new UserFacingError(`La columna ${XLSX.utils.encode_col(c)} tiene datos pero no tiene título. Agrega el título de la pregunta o elimina esa columna si no pertenece a la encuesta.`);
        }
    }
    return XLSX.utils.sheet_to_json<Row>(sheet, { defval: '', blankrows: true });
}
export function readCsv(bytes: ArrayBuffer): Row[] {
    let text: string;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { throw new UserFacingError('No pudimos leer los caracteres de este CSV. Vuelve a guardarlo en Excel como «CSV UTF-8» y selecciónalo de nuevo.'); }
    validateHeaders(Papa.parse<string[]>(text, { preview: 1 }).data[0] ?? []);
    const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: 'greedy' });
    if (parsed.errors.length) {
        const error = parsed.errors[0];
        const position = typeof error.row === 'number' ? ` en la fila ${error.row + 2}` : '';
        throw new UserFacingError(error.code === 'TooManyFields' || error.code === 'TooFewFields'
            ? `El CSV tiene una cantidad de campos distinta de sus títulos${position}. Revisa esa fila y vuelve a exportar el archivo.`
            : 'No pudimos separar las columnas del CSV. Vuelve a exportarlo desde Excel y comprueba que las respuestas estén en sus columnas.');
    }
    if (parsed.data.length > MAX_ROWS) throw new UserFacingError(`Este archivo tiene demasiadas respuestas. Usa archivos con hasta ${MAX_ROWS} respuestas.`);
    return parsed.data;
}
