'use client';

import { useActionState, useReducer } from 'react';
import { clearDeletionHistory } from '@/app/administracion/actions';

export function ClearDeletionHistoryForm() {
    const [state, action, pending] = useActionState(clearDeletionHistory, { error: '', success: '' });
    const [confirmation, setConfirmation] = useReducer((_: string, next: string) => next, '');

    return <details className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <summary className="cursor-pointer text-sm font-semibold text-amber-900">Limpiar historial</summary>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-amber-900">Elimina solo los registros del historial de borrados. No modifica las respuestas.</p>
        <form action={action} className="mt-3 space-y-2">
            <label className="block text-xs font-medium text-amber-950">Escribe LIMPIAR HISTORIAL para confirmar<input name="confirmation" autoComplete="off" required value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-1 block min-h-10 w-full rounded-md border border-amber-300 bg-white px-2 text-sm sm:min-w-64" /></label>
            <button disabled={pending || confirmation !== 'LIMPIAR HISTORIAL'} className="min-h-10 rounded-md bg-amber-700 px-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50">{pending ? 'Limpiando…' : 'Limpiar historial'}</button>
            {state.error && <p role="alert" className="text-xs text-red-800">{state.error}</p>}
            {state.success && <p role="status" className="text-xs text-emerald-800">{state.success}</p>}
        </form>
    </details>;
}
