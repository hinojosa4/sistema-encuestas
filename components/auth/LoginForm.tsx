'use client';
import { useActionState, useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { signIn } from '@/app/login/actions';

export function LoginForm({ destination }: { destination: string }) {
    const [state, action, pending] = useActionState(signIn, { error: '' });
    const [visible, setVisible] = useState(false);
    return <form action={action} className="mt-6 space-y-5">
        <input type="hidden" name="next" value={destination} />
        <label className="block text-sm font-medium text-slate-800">Correo electrónico<input name="email" type="email" required maxLength={254} autoComplete="username" spellCheck={false} autoCapitalize="none" placeholder="tu.correo@ejemplo.com" className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base placeholder:text-slate-400" /></label>
        <div><label htmlFor="admin-password" className="text-sm font-medium text-slate-800">Contraseña</label><div className="relative mt-2"><input id="admin-password" name="password" type={visible ? 'text' : 'password'} required maxLength={256} autoComplete="current-password" className="block min-h-12 w-full rounded-lg border border-slate-300 px-3 pr-14" /><button type="button" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} onClick={() => setVisible(v => !v)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-slate-600">{visible ? <EyeOff size={20} /> : <Eye size={20} />}</button></div></div>
        {state.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-relaxed text-red-800">{state.error}</p>}
        <button disabled={pending} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-umss-azul px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-950 disabled:opacity-60"><LockKeyhole size={18} aria-hidden="true" />{pending ? 'Verificando acceso…' : 'Iniciar sesión'}</button>
        <details className="border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-600"><summary className="font-medium text-slate-700">¿Necesitas ayuda para ingresar?</summary><p className="mt-2">Si olvidaste la contraseña o tu cuenta no tiene acceso, contacta al responsable del sistema. El alta de cuentas se gestiona de forma privada.</p></details>
    </form>;
}
