'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, BarChart3, UploadCloud } from 'lucide-react';
import { useNavigationAccess } from './NavigationAccess';

export function HomeAccess() {
    const { status } = useNavigationAccess();
    const style = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors';
    return <div className="mx-auto flex max-w-md flex-col justify-center gap-3 sm:max-w-none sm:flex-row">{status === 'admin' ? <>
        <Link href="/dashboard" className={`${style} bg-umss-azul text-white hover:bg-blue-950`}><BarChart3 size={18} />Abrir dashboard</Link>
        <Link href="/upload" className={`${style} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}><UploadCloud size={18} />Cargar datos</Link>
    </> : <Link href="/login" className={`${style} bg-umss-azul text-white hover:bg-blue-950`}>Ingresar al sistema<ArrowRight size={18} /></Link>}</div>;
}

export function AdminHomeLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
    const { status } = useNavigationAccess();
    return status === 'admin' ? <Link href={href} className={className}>{children}</Link> : null;
}
