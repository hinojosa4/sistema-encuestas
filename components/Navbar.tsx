// components/Navbar.tsx
import Link from 'next/link';
import { BarChart3, UploadCloud, GraduationCap } from 'lucide-react';

export default function Navbar() {
    return (
        <header className="bg-umss-azul text-white shadow-md border-b-4 border-umss-rojo">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <GraduationCap className="h-8 w-8 text-umss-rojo" />
                    <div>
                        <h1 className="font-bold text-lg leading-tight tracking-wide">
                            UMSS · Ingeniería de Sistemas
                        </h1>
                        <p className="text-xs text-blue-200">
                            Sistema de Análisis de Mercado (Enfoque ARCUSUR)
                        </p>
                    </div>
                </div>

                <nav className="flex space-x-4">
                    <Link
                        href="/"
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-900 transition-colors"
                    >
                        <span>Inicio</span>
                    </Link>
                    <Link
                        href="/upload"
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-900/60 hover:bg-blue-900 transition-colors"
                    >
                        <UploadCloud className="h-4 w-4 text-umss-rojo" />
                        <span>Cargar Datos</span>
                    </Link>
                    <Link
                        href="/dashboard"
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-900 transition-colors"
                    >
                        <BarChart3 className="h-4 w-4" />
                        <span>Dashboard</span>
                    </Link>
                </nav>
            </div>
        </header>
    );
}