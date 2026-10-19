'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut } from 'lucide-react';
import { signOut } from '@/app/login/actions';
import { useNavigationAccess } from './NavigationAccess';

export function SessionControls({ onExit }: { onExit?: () => void }) {
    const pathname = usePathname();
    const { status } = useNavigationAccess();
    if (pathname === '/login' || status === 'pending') return null;
    const style = 'inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/40 px-3 py-2 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-white';
    return status === 'admin'
        ? <form action={signOut}><button onClick={onExit} className={style}><LogOut size={16} aria-hidden="true" />Salir</button></form>
        : <Link href="/login" className={style}><LogIn size={16} aria-hidden="true" />Ingresar</Link>;
}
