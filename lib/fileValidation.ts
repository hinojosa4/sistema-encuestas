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
    const headersTexto = headers.join(' ').toLowerCase();

    if (tipoEncuesta === 'encuesta_titulados') {
        const tieneTerminosTitulado =
            headersTexto.includes('egreso') ||
            headersTexto.includes('posgrado') ||
            headersTexto.includes('edad') ||
            headersTexto.includes('titulado') ||
            headersTexto.includes('desempleado') ||
            headersTexto.includes('vida profesional');

        if (!tieneTerminosTitulado) {
            return {
                isValid: false,
                errorMessage:
                    'El archivo cargado no parece corresponder a la "Encuesta a Titulados". Verifique haber seleccionado la categoría correcta.',
            };
        }
    }

    if (tipoEncuesta === 'encuesta_empleadores') {
        const tieneTerminosEmpleador =
            headersTexto.includes('empresa') ||
            headersTexto.includes('organizacion') ||
            headersTexto.includes('rubro') ||
            headersTexto.includes('empleador') ||
            headersTexto.includes('contratado') ||
            headersTexto.includes('talento');

        if (!tieneTerminosEmpleador) {
            return {
                isValid: false,
                errorMessage:
                    'El archivo cargado no parece corresponder a la "Encuesta a Empleadores". Verifique haber seleccionado la categoría correcta.',
            };
        }
    }

    return { isValid: true };
}