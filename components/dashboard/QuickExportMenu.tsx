'use client';

import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { ChevronDown, Download, FileSpreadsheet, Layers } from 'lucide-react';
import type { Row } from '@/lib/importPipeline';
import { createCleanDatasetWorkbook } from '@/lib/cleanDatasetExport';

type QuickExportMenuProps = {
    titulados: Row[];
    empleadores: Row[];
    onOpenReports: () => void;
};

export function QuickExportMenu({ titulados, empleadores, onOpenReports }: QuickExportMenuProps) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const downloadCleanDataset = () => {
        setOpen(false);
        const workbook = createCleanDatasetWorkbook(titulados, empleadores);
        XLSX.writeFile(workbook, `Dataset_Limpio_UMSS_ARCUSUR_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="flex items-center gap-2 w-full sm:w-auto relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setOpen(value => !value)}
                aria-expanded={open}
                aria-haspopup="true"
                className="inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-4 py-2.5 rounded-lg text-xs sm:text-sm shadow transition-colors flex-1 sm:flex-initial"
            >
                <Download className="h-4 w-4" />
                <span>Exportar datos</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-100">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Descarga rápida</p>
                    </div>
                    <button
                        type="button"
                        onClick={downloadCleanDataset}
                        className="w-full text-left px-3 py-2.5 text-xs sm:text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 font-medium transition-colors"
                    >
                        <FileSpreadsheet className="h-4 w-4 text-emerald-700 shrink-0" />
                        <div>
                            <div className="font-semibold text-slate-900">Dataset limpio (.xlsx)</div>
                            <div className="text-[11px] text-slate-500">{titulados.length} titulados y {empleadores.length} empleadores depurados</div>
                        </div>
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                        type="button"
                        onClick={() => { setOpen(false); onOpenReports(); }}
                        className="w-full text-left px-3 py-2 text-xs text-umss-azul hover:bg-blue-50 flex items-center gap-2 font-semibold transition-colors"
                    >
                        <Layers className="h-3.5 w-3.5 shrink-0" />
                        <span>Ver centro completo de reportes y PDF</span>
                    </button>
                </div>
            )}
        </div>
    );
}
