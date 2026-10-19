import Link from 'next/link';
import { requireAdministrator } from '@/lib/auth/server';
import { AdminSessionGuard } from '@/components/auth/AdminSessionGuard';
import { ResetSurveysForm } from '@/components/admin/ResetSurveysForm';

export default async function AdministrationPage() {
    const { client, user } = await requireAdministrator('/administracion');
    const history = await client.from('administracion_eventos').select('id,accion,detalle,created_at').order('created_at', { ascending: false }).limit(10);
    return <AdminSessionGuard>
        <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:py-8">
            <header><h1 className="text-2xl font-bold text-slate-900">Administración de datos</h1><p className="mt-2 break-words text-sm text-slate-600">{user.email}</p></header>
            <section className="grid gap-4 sm:grid-cols-2">
                <Link href="/upload" className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-umss-azul"><h2 className="font-semibold text-slate-900">Importar encuestas</h2><p className="mt-2 text-sm text-slate-600">Agrega respuestas desde Excel o CSV.</p></Link>
                <Link href="/dashboard" className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-umss-azul"><h2 className="font-semibold text-slate-900">Consultar y exportar</h2><p className="mt-2 text-sm text-slate-600">Indicadores e informes del estudio.</p></Link>
            </section>
            <ResetSurveysForm />
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="font-semibold text-slate-900">Historial de borrados</h2>
                {history.error ? <p className="mt-3 text-sm text-amber-900">No se pudo cargar el historial.</p> : !history.data?.length ? <p className="mt-3 text-sm text-slate-600">Sin borrados registrados.</p> : <ul className="mt-4 divide-y divide-slate-100">{history.data.map(row => <li key={row.id} className="py-3 text-sm text-slate-700"><p className="font-medium">{new Date(row.created_at).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}</p><p className="mt-1">{Number(row.detalle?.titulados ?? 0)} titulados · {Number(row.detalle?.empleadores ?? 0)} empleadores</p></li>)}</ul>}
            </section>
        </div>
    </AdminSessionGuard>;
}
