'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, UploadCloud, GraduationCap, Menu, X, Home } from 'lucide-react';

export default function Navbar() {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    const navLinks = [
        { href: '/', label: 'Inicio', icon: Home },
        { href: '/upload', label: 'Cargar Datos', icon: UploadCloud },
        { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    ];

    return (
        <header className="bg-umss-azul text-white shadow-md border-b-4 border-umss-rojo sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="h-16 flex items-center justify-between gap-2">
                    {/* Branding */}
                    <Link href="/" onClick={closeMenu} className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                        <GraduationCap className="h-7 w-7 sm:h-8 sm:w-8 text-umss-rojo flex-shrink-0" />
                        <div className="min-w-0">
                            <h1 className="font-bold text-sm sm:text-base md:text-lg leading-tight tracking-wide truncate">
                                UMSS · Ingeniería de Sistemas
                            </h1>
                            <p className="text-[10px] sm:text-xs text-blue-200 truncate">
                                Sistema de Análisis de Mercado (ARCUSUR)
                            </p>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-1 sm:space-x-2">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                                        isActive
                                            ? 'bg-blue-900 text-white shadow-inner border border-blue-700/50'
                                            : 'text-blue-100 hover:bg-blue-900/60 hover:text-white'
                                    }`}
                                >
                                    <Icon className={`h-4 w-4 ${isActive ? 'text-umss-rojo' : 'text-blue-300'}`} />
                                    <span>{link.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Mobile Menu Toggle Button */}
                    <button
                        type="button"
                        onClick={toggleMenu}
                        className="md:hidden p-2 rounded-lg text-blue-100 hover:text-white hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
                        aria-label="Toggle navigation menu"
                    >
                        {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Dropdown Navigation */}
            {isMenuOpen && (
                <div className="md:hidden bg-blue-950 border-t border-blue-900/80 shadow-lg px-4 py-3 space-y-1.5 transition-all">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={closeMenu}
                                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    isActive
                                        ? 'bg-blue-900 text-white font-semibold border-l-4 border-umss-rojo'
                                        : 'text-blue-100 hover:bg-blue-900/50 hover:text-white'
                                }`}
                            >
                                <Icon className={`h-5 w-5 ${isActive ? 'text-umss-rojo' : 'text-blue-300'}`} />
                                <span>{link.label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </header>
    );
}