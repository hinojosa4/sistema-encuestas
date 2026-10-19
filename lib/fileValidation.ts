import { inspectHeaders } from './importPipeline';
// lib/fileValidation.ts

export interface ValidationResult {
    isValid: boolean;
    errorMessage?: string;
}

export const MAX_FILE_SIZE_MB = 10;

/**
 * Valida el tamaño y extensión del archivo antes de leerlo.
 */
export function validarArchivo(file: File): ValidationResult {
    if (file.size === 0) return { isValid: false, errorMessage: 'El archivo está vacío.' };
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['xlsx', 'xls', 'csv'];

    if (!extension || !allowedExtensions.includes(extension)) {
        return {
            isValid: false,
            errorMessage: 'Formato no admitido. Seleccione un archivo válido de Microsoft Excel (.xlsx, .xls) o CSV.',
        };
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
        return {
            isValid: false,
            errorMessage: `El archivo excede el tamaño máximo permitido de ${MAX_FILE_SIZE_MB} MB.`,
        };
    }

    return { isValid: true };
}

/**
 * Verifica si las columnas del archivo coinciden con la encuesta elegida.
 */
export function validarCorrespondenciaEncuesta(
    headers: string[],
    tipoEncuesta: 'encuesta_titulados' | 'encuesta_empleadores'
): ValidationResult {
    const result = inspectHeaders(headers, tipoEncuesta);
    return result.errors.length ? { isValid: false, errorMessage: result.errors.join(' ') } : { isValid: true };
}
