import { redirect } from 'next/navigation';
import Image from 'next/image';
import { BarChart3, FileChartColumn, ClipboardList, ShieldCheck } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';
import { serverSupabase } from '@/lib/auth/server';
import { inspectAdminAccess, loginDestination } from '@/lib/auth/access';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; motivo?: string }> }) {
    const params = await searchParams;
    const destination = loginDestination(params.next);
    const access = await inspectAdminAccess(await serverSupabase());
    if (access.status === 'admin') redirect(destination);
    const notice = params.motivo === 'sin-permiso' ? 'Tu cuenta no tiene permiso de administración.' : params.motivo === 'verificacion' ? 'No se pudo verificar el acceso. Inténtalo nuevamente o contacta al responsable del sistema.' : params.motivo === 'sesion' ? 'Inicia sesión para continuar.' : '';
    const features = [
        { icon: ClipboardList, title: 'Encuestas del estudio', detail: 'Organiza las respuestas de titulados y empleadores.' },
        { icon: BarChart3, title: 'Indicadores y cruces', detail: 'Explora el perfil laboral y las preferencias de formación.' },
        { icon: FileChartColumn, title: 'Informes académicos', detail: 'Exporta resultados con sus bases y trazabilidad.' },
    ];
    return <div className="mx-auto flex min-h-[calc(100svh-132px)] max-w-6xl items-center px-4 py-6 sm:px-6 sm:py-8 lg:py-6">
        <div className="mx-auto grid w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_48px_-24px_rgba(15,23,42,0.25)] lg:max-w-none lg:grid-cols-[1.05fr_1fr]">
            <aside aria-label="Sobre el sistema" className="relative hidden border-r border-slate-200 bg-slate-50 px-10 py-8 lg:block">
                <div aria-hidden="true" className="absolute top-0 left-0 h-1 w-full bg-umss-rojo" />
                <div className="flex items-center gap-4"><Image src="/brand/escudo-umss.jpg" width={52} height={64} alt="Escudo de la Universidad Mayor de San Simón" className="h-14 w-12 shrink-0 object-contain" /><div><p className="text-sm font-bold text-umss-azul">Universidad Mayor de San Simón</p><p className="mt-1 text-xs text-slate-600">Facultad de Ciencias y Tecnología</p></div></div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-umss-azul">Ingeniería de Sistemas · ARCUSUR</p>
                <p className="mt-3 max-w-sm text-3xl font-bold leading-tight tracking-tight text-slate-900">Análisis de mercado y empleabilidad</p>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600">Información para orientar la formación continua y apoyar las decisiones académicas de la carrera.</p>
                <ul className="mt-6 hidden space-y-4 lg:block">{features.map(({ icon: Icon, title, detail }) => <li key={title} className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-umss-azul"><Icon size={19} aria-hidden="true" /></span><div><p className="text-sm font-semibold text-slate-800">{title}</p><p className="mt-1 text-xs leading-relaxed text-slate-600">{detail}</p></div></li>)}</ul>
            </aside>
            <section aria-labelledby="login-title" className="px-6 py-8 sm:px-10 lg:flex lg:flex-col lg:justify-center lg:px-12 lg:py-10">
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500"><ShieldCheck size={15} aria-hidden="true" />Acceso de administración</p>
                <h1 id="login-title" className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Inicia sesión</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">Ingresa con tu cuenta autorizada para continuar.</p>
                {notice && <p role="status" className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{notice}</p>}
                <LoginForm destination={destination} />
            </section>
        </div>
    </div>;
}
