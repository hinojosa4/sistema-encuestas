// components/upload/DropZone.tsx
import React from 'react';
import { Upload } from 'lucide-react';

interface DropZoneProps {
    fileName: string;
    onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    onFileDrop?: (file: File) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({
    fileName,
    onFileSelected,
    disabled,
    onFileDrop,
}) => {
    return (
        <div className="mb-5 sm:mb-6">
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                2. Seleccione o arrastre el archivo de respuestas (.xlsx, .xls o .csv):
            </label>
            <div onDragOver={e => e.preventDefault()} onDrop={e => {
                e.preventDefault();
                if (!disabled && e.dataTransfer.files[0]) onFileDrop?.(e.dataTransfer.files[0]);
            }} className="border-2 border-dashed border-slate-300 hover:border-umss-azul rounded-xl p-6 sm:p-10 text-center bg-slate-50/50 cursor-pointer relative transition-colors">
                <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={onFileSelected}
                    disabled={disabled}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <Upload className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-slate-400 mb-2 sm:mb-3" />
                <p className="text-xs sm:text-sm font-semibold text-slate-700 px-2 break-all sm:break-normal">
                    {fileName ? `Documento cargado: ${fileName}` : 'Haga clic para examinar o arrastre el archivo aquí'}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-1 px-2">
                    Estructura admitida: Libros de Microsoft Excel (.xlsx) y archivos planos delimitados (.csv).
                </p>
            </div>
        </div>
    );
};
