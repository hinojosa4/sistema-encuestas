'use client';
import { useActionState, useState } from 'react';
import { resetSurveyData } from '@/app/administracion/actions';

export function ResetSurveysForm() {
    const [state, action, pending] = useActionState(resetSurveyData, { error: '', success: '' });
    const [confirmation, setConfirmation] = useState('');
    return <details className="rounded-2xl border border-red-200 bg-white p-5">
        <summary className="font-semibold text-red-800">Eliminar todas las respuestas</summary>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">Borra las respuestas de titulados y empleadores. <strong>No se puede deshacer.</strong> Guarda una copia antes de continuar.</p>
        <form action={action} className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-slate-800">Escribe BORRAR ENCUESTAS para confirmar<input name="confirmation" autoComplete="off" required value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-2 block min-h-12 w-full rounded-lg border border-slate-300 px-3 sm:max-w-md" /></label>
            <button disabled={pending || confirmation !== 'BORRAR ENCUESTAS'} className="min-h-12 w-full rounded-lg bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-50 sm:w-auto">{pending ? 'Procesando…' : 'Eliminar respuestas'}</button>
            {state.error && <p role="alert" className="text-sm text-red-800">{state.error}</p>}
            {state.success && <p role="status" className="text-sm text-emerald-800">{state.success}</p>}
        </form>
    </details>;
}
