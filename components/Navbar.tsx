'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, BarChart3, UploadCloud, GraduationCap, Menu, X, Settings, ShieldCheck } from 'lucide-react';
import { SessionControls } from './auth/SessionControls';
import { useNavigationAccess } from './auth/NavigationAccess';
import { adminNavigation, DEFAULT_ADMIN_PATH, isWorkspacePath } from '@/lib/adminNavigation';

const icons = { '/upload': UploadCloud, '/dashboard': BarChart3, '/administracion': Settings };

export default function Navbar() {
    const pathname = usePathname();
    const { status } = useNavigationAccess();
    const [menuPath, setMenuPath] = useState<string | null>(null);
    const workspace = isWorkspacePath(pathname);
    const showAdmin = status === 'admin' && workspace;
    const isMenuOpen = menuPath === pathname;
    const closeMenu = () => setMenuPath(null);
    const links = () => adminNavigation.map(({ href, label }) => {
        const Icon = icons[href];
        const selected = pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} onClick={closeMenu} aria-current={selected ? 'page' : undefined}
            className={`flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-white ${selected ? 'bg-white text-umss-azul shadow-sm' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}>
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" /><span>{label}</span>
        </Link>;
    });
    return <header className="sticky top-0 z-50 border-b-[3px] border-umss-rojo bg-umss-azul text-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex min-h-16 items-center justify-between gap-4 sm:min-h-18">
                <Link href={workspace || status === 'admin' ? DEFAULT_ADMIN_PATH : '/'} onClick={closeMenu} className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-white sm:gap-3">
                    <GraduationCap aria-hidden="true" className="h-7 w-7 shrink-0 text-red-400 sm:h-8 sm:w-8" />
                    <div className="min-w-0"><p className="truncate text-sm font-bold leading-tight sm:text-base">UMSS · Ingeniería de Sistemas</p><p className="mt-1 truncate text-[10px] text-blue-100 sm:text-xs">Sistema de Análisis de Mercado</p></div>
                </Link>
                {showAdmin && <nav aria-label="Navegación del sistema" className="hidden items-center gap-1 lg:flex">{links()}</nav>}
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    {showAdmin && <span className="hidden items-center gap-1.5 border-l border-white/20 pl-4 text-xs font-medium text-blue-100 xl:inline-flex"><ShieldCheck size={15} aria-hidden="true" />Administrador</span>}
                    {pathname === '/login' && <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-blue-100 hover:bg-white/10 hover:text-white focus-visible:outline-white"><ArrowLeft size={16} aria-hidden="true" /><span className="hidden sm:inline">Volver a la portada</span><span className="sm:hidden">Portada</span></Link>}
                    <SessionControls onExit={closeMenu} />
                    {showAdmin && <button type="button" onClick={() => setMenuPath(value => value === pathname ? null : pathname)} aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={isMenuOpen} aria-controls="mobile-navigation" className="flex h-11 w-11 items-center justify-center rounded-lg text-blue-100 hover:bg-white/10 focus-visible:outline-white lg:hidden">{isMenuOpen ? <X size={22} /> : <Menu size={22} />}</button>}
                </div>
            </div>
            {showAdmin && isMenuOpen && <nav id="mobile-navigation" aria-label="Navegación del sistema en móvil" className="space-y-1 border-t border-white/20 py-3 lg:hidden">{links()}</nav>}
        </div>
    </header>;
}
