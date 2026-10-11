// components/upload/TableSelector.tsx
import React from 'react';

interface TableSelectorProps {
    targetTable: 'encuesta_titulados' | 'encuesta_empleadores';
    setTargetTable: (table: 'encuesta_titulados' | 'encuesta_empleadores') => void;
    disabled?: boolean;
}

export const TableSelector: React.FC<TableSelectorProps> = ({
    targetTable,
    setTargetTable,
    disabled,
}) => {
    return (
        <div className="mb-5 sm:mb-6">
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                1. Seleccione la categoría de instrumento a importar:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setTargetTable('encuesta_titulados')}
                    className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all text-xs sm:text-sm ${targetTable === 'encuesta_titulados'
                            ? 'border-umss-azul bg-blue-50/70 text-umss-azul font-bold ring-2 ring-umss-azul/20 shadow-sm'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                >
                    <span className="text-base sm:text-lg block mb-1">🎓 Encuesta a Titulados</span>
                    <span className="block text-[11px] sm:text-xs font-normal text-slate-500">
                        Registro de egresados, inserción laboral, demandas de posgrado y competencias curriculares.
                    </span>
                </button>

                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setTargetTable('encuesta_empleadores')}
                    className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all text-xs sm:text-sm ${targetTable === 'encuesta_empleadores'
                            ? 'border-umss-azul bg-blue-50/70 text-umss-azul font-bold ring-2 ring-umss-azul/20 shadow-sm'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                >
                    <span className="text-base sm:text-lg block mb-1">🏢 Encuesta al Sector Empleador</span>
                    <span className="block text-[11px] sm:text-xs font-normal text-slate-500">
                        Organizaciones públicas/privadas, evaluación de desempeño y requerimientos del mercado.
                    </span>
                </button>
            </div>
        </div>
    );
};