// Solo mensajes redactados para la persona que usa la aplicacion pueden mostrarse
// literalmente. Los errores internos de bibliotecas o servicios no se exponen.
export class UserFacingError extends Error {}

export function fileErrorMessage(error: unknown): string {
    return error instanceof UserFacingError ? error.message :
        'No pudimos abrir el archivo. Comprueba que sea un Excel o CSV válido y que puedas abrirlo en tu equipo. Luego vuelve a seleccionarlo.';
}
