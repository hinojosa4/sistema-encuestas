// components/dashboard/TabChiCuadrada.tsx
import React from 'react';

interface TabChiCuadradaProps {
    chiData: {
        chi2: number;
        gradosLibertad: number;
        pValor: number;
        existeDependencia: boolean;
        filas?: string[];
        columnas?: string[];
        matriz?: number[][];
    };
}

export const TabChiCuadrada: React.FC<TabChiCuadradaProps> = ({ chiData }) => {
    const matrizValida = chiData.matriz && chiData.matriz.length > 0 && chiData.filas && chiData.columnas;
    
    // Calcular valor máximo para escala de color de mapa de calor (Heatmap)
    const maxVal = matrizValida
        ? Math.max(...chiData.matriz!.flat(), 1)
        : 1;

    return (
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
                <div>
                    <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                        Prueba de Independencia Chi-Cuadrada (χ²) y Mapa de Calor (HU 3 & HU 5)
                    </h3>
                    <p className="text-xs text-slate-500">
                        Cruce bivariado entre Nivel de Posgrado Cursado/Deseado y Fuente de Financiamiento.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-slate-100 px-3 py-1.5 rounded-md font-mono border border-slate-200">
                        χ²: <strong>{chiData.chi2}</strong>
                    </span>
                    <span className="bg-slate-100 px-3 py-1.5 rounded-md font-mono border border-slate-200">
                        gl: <strong>{chiData.gradosLibertad}</strong>
                    </span>
                    <span
                        className={`px-3 py-1.5 rounded-md font-bold border ${chiData.existeDependencia
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                    >
                        p-valor: {chiData.pValor} ({chiData.existeDependencia ? 'Existe Dependencia' : 'Variables Independientes'})
                    </span>
                </div>
            </div>

            <div className="text-xs text-slate-600 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200 leading-relaxed">
                <strong>Fundamento Teórico ARCUSUR:</strong> Con un nivel de significancia estadístico <strong>α = 0.05</strong>, se contrasta si la decisión de cursar estudios avanzados de posgrado en los graduados de Ingeniería de Sistemas está condicionada por la disponibilidad de financiamiento externo (becas institucionales/empresariales) frente a recursos propios.
            </div>

            {matrizValida && chiData.filas && chiData.columnas ? (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-semibold">
                            <tr>
                                <th className="px-4 py-3 text-left">Nivel Posgrado \ Financiamiento</th>
                                {chiData.columnas.map((col, idx) => (
                                    <th key={idx} className="px-4 py-3 text-center">{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {chiData.filas.map((fila, fIdx) => (
                                <tr key={fIdx} className="hover:bg-slate-50">
                                    <td className="px-4 py-2.5 font-medium text-slate-800">{fila}</td>
                                    {chiData.matriz![fIdx].map((val, cIdx) => {
                                        const ratio = maxVal > 0 ? val / maxVal : 0;
                                        // Estilo dinámico de mapa de calor (Heatmap)
                                        let cellBg = 'bg-white text-slate-600';
                                        if (val > 0) {
                                            if (ratio >= 0.7) cellBg = 'bg-blue-100/90 text-umss-azul font-bold';
                                            else if (ratio >= 0.3) cellBg = 'bg-blue-50/70 text-slate-800 font-semibold';
                                            else cellBg = 'bg-slate-50 text-slate-700';
                                        }

                                        return (
                                            <td key={cIdx} className={`px-4 py-2.5 text-center font-mono transition-colors ${cellBg}`}>
                                                {val}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-xs text-slate-400 italic">No se registran suficientes datos cruzados para calcular la matriz.</p>
            )}
        </div>
    );
};