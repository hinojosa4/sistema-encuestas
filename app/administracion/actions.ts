'use server';
import { revalidatePath } from 'next/cache';
import { requireAdministrator } from '@/lib/auth/server';
import { resetErrorMessage, resetResult } from '@/lib/adminOperations';

export type ResetState = { error: string; success: string };

export async function resetSurveyData(_previous: ResetState, form: FormData): Promise<ResetState> {
    const { client } = await requireAdministrator('/administracion');
    if (form.get('confirmation') !== 'BORRAR ENCUESTAS') return { error: 'Escribe exactamente BORRAR ENCUESTAS para confirmar.', success: '' };
    try {
        const { data, error } = await client.rpc('vaciar_encuestas_administrador');
        revalidatePath('/dashboard');
        revalidatePath('/administracion');
        if (error) return { error: resetErrorMessage(error), success: '' };
        const result = resetResult(data);
        if (!result) return { error: resetErrorMessage(null), success: '' };
        return { error: '', success: `Se eliminaron ${result.titulados} respuestas de titulados y ${result.empleadores} de empleadores. La operación quedó registrada.` };
    } catch (error) { return { error: resetErrorMessage(error), success: '' }; }
}
