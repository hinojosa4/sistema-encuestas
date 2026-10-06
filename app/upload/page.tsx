// app/upload/page.tsx
'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabaseClient';
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react';

export default function UploadPage() {
    const [targetTable, setTargetTable] = useState<'encuesta_titulados' | 'encuesta_empleadores'>('encuesta_titulados');
    const [dataPreview, setDataPreview] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // 1. Procesar archivo Excel o CSV en el cliente
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessage(null);
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension === 'csv') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data.length > 0) {
                        setHeaders(Object.keys(results.data[0] as object));
                        setDataPreview(results.data);
                    }
                },
                error: (err) => {
                    setMessage({ type: 'error', text: `Error al leer CSV: ${err.message}` });
                },
            });
        } else if (extension === 'xlsx' || extension === 'xls') {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const workbook = XLSX.read(bstr, { type: 'binary' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                    if (json.length > 0) {
                        setHeaders(Object.keys(json[0] as object));
                        setDataPreview(json);
                    }
                } catch (error: any) {
                    setMessage({ type: 'error', text: `Error al leer Excel: ${error.message}` });
                }
            };
            reader.readAsBinaryString(file);
        } else {
            setMessage({ type: 'error', text: 'Formato no soportado. Selecciona un archivo .xlsx, .xls o .csv' });
        }
    };

    // 2. Insertar registros en lotes (batch) a Supabase
    const handleSaveToDatabase = async () => {
        if (dataPreview.length === 0) return;

        setLoading(true);
        setMessage(null);

        try {
            // Limpieza básica de datos (Data Wrangling)
            const cleanedData = dataPreview.map((row) => {
                const item: any = {};
                for (const key in row) {
                    let value = row[key];
                    if (typeof value === 'string') {
                        value = value.trim(); // Quitar espacios accidentales
                    }
                    item[key] = value;
                }
                return item;
            });

            // Insertar por lotes de 100 para no saturar la red
            const batchSize = 100;
            let totalInserted = 0;

            for (let i = 0; i < cleanedData.length; i += batchSize) {
                const batch = cleanedData.slice(i, i + batchSize);
                const { error } = await supabase.from(targetTable).insert(batch);

                if (error) {
                    throw new Error(error.message);
                }
                totalInserted += batch.length;
            }

            setMessage({
                type: 'success',
                text: `¡Éxito! Se cargaron correctamente ${totalInserted} registros en la tabla "${targetTable}".`,
            });
            setDataPreview([]);
            setHeaders([]);
            setFileName('');
        } catch (err: any) {
            setMessage({
                type: 'error',
                text: `Error al insertar en la base de datos: ${err.message}. Verifica que las columnas coincidan.`,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-10 px-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">

                {/* Encabezado */}
                <div className="border-b border-slate-100 pb-5 mb-6">
                    <h2 className="text-2xl font-bold text-umss-azul flex items-center gap-2">
                        <FileSpreadsheet className="text-umss-rojo" />
                        Carga y Procesamiento de Encuestas
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                        Sube el archivo Excel o CSV exportado desde Microsoft Forms / Google Forms para almacenarlo en la base de datos y actualizar las métricas.
                    </p>
                </div>

                {/* Selección de tipo de encuesta */}
                <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        1. Selecciona el tipo de encuesta que vas a cargar:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setTargetTable('encuesta_titulados')}
                            className={`p-4 rounded-lg border text-left font-medium transition-all ${targetTable === 'encuesta_titulados'
                                    ? 'border-umss-azul bg-umss-azulClaro text-umss-azul font-bold ring-2 ring-umss-azul/20'
                                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                        >
                            🎓 Encuesta a Titulados (Graduados)
                            <span className="block text-xs font-normal text-slate-500 mt-1">
                                Datos de egreso, formación continua, empleo y asignaturas
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setTargetTable('encuesta_empleadores')}
                            className={`p-4 rounded-lg border text-left font-medium transition-all ${targetTable === 'encuesta_empleadores'
                                    ? 'border-umss-azul bg-umss-azulClaro text-umss-azul font-bold ring-2 ring-umss-azul/20'
                                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                        >
                            🏢 Encuesta a Empleadores
                            <span className="block text-xs font-normal text-slate-500 mt-1">
                                Datos de empresas públicas/privadas, competencias y demanda
                            </span>
                        </button>
                    </div>
                </div>

                {/* Zona de subida de archivo */}
                <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        2. Selecciona o arrastra el archivo (.xlsx, .xls o .csv):
                    </label>
                    <div className="border-2 border-dashed border-slate-300 hover:border-umss-azul rounded-xl p-8 text-center bg-slate-50/50 cursor-pointer relative transition-colors">
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                        <p className="text-sm font-semibold text-slate-700">
                            {fileName ? `Archivo seleccionado: ${fileName}` : 'Haz clic aquí o arrastra tu archivo Excel / CSV'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Compatible con Microsoft Excel (.xlsx), CSV delimitado por coma o punto y coma
                        </p>
                    </div>
                </div>

                {/* Notificaciones */}
                {message && (
                    <div
                        className={`p-4 rounded-lg mb-6 flex items-start gap-3 ${message.type === 'success'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                            }`}
                    >
                        {message.type === 'success' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <p className="text-sm">{message.text}</p>
                    </div>
                )}

                {/* Vista previa de datos */}
                {dataPreview.length > 0 && (
                    <div className="mt-8 border-t border-slate-100 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-slate-800">
                                    Vista Previa de Datos ({dataPreview.length} filas detectadas)
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Revisa las primeras 5 filas antes de guardar en Supabase.
                                </p>
                            </div>
                            <button
                                onClick={handleSaveToDatabase}
                                disabled={loading}
                                className="bg-umss-azul hover:bg-blue-900 text-white font-medium px-5 py-2.5 rounded-lg shadow transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4" />
                                        Confirmar y Guardar en Base de Datos
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-lg">
                            <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
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
                )}

            </div>
        </div>
    );
}