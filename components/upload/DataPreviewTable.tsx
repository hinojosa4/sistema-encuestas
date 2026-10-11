// components/upload/DataPreviewTable.tsx
import React from 'react';
import { Upload, Loader2 } from 'lucide-react';

interface DataPreviewTableProps {
    headers: string[];
    dataPreview: any[];
    loading: boolean;
    onConfirm: () => void;
}

export const DataPreviewTable: React.FC<DataPreviewTableProps> = ({
    headers,
    dataPreview,
    loading,
    onConfirm,
}) => {
    if (dataPreview.length === 0) return null;

    return (
        <div className="mt-6 sm:mt-8 border-t border-slate-100 pt-5 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                        Vista Previa de Datos ({dataPreview.length} registros detectados)
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500">
                        Comprobación inicial de las primeras 5 filas antes del almacenamiento definitivo.
                    </p>
                </div>

                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="w-full sm:w-auto bg-umss-azul hover:bg-blue-900 text-white font-medium px-5 py-2.5 rounded-lg shadow transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Procesando registros...</span>
                        </>
                    ) : (
                        <>
                            <Upload className="h-4 w-4" />
                            <span>Confirmar y Guardar en Repositorio</span>
                        </>
                    )}
                </button>
            </div>

            <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-lg w-full">
                <table className="min-w-full divide-y divide-slate-200 text-[11px] sm:text-xs text-left">
                    <thead className="bg-slate-100 sticky top-0 font-semibold text-slate-700">
                        <tr>
                            {headers.map((h, idx) => (
                                <th key={idx} className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {dataPreview.slice(0, 5).map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50">
                                {headers.map((h, cIdx) => (
                                    <td key={cIdx} className="px-3 py-2 border-r border-slate-100 whitespace-nowrap text-slate-600">
                                        {String(row[h] ?? '')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};