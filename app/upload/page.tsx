// app/upload/page.tsx
'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { mapearFilaEmpleador, mapearFilaTitulado } from '@/lib/dataMappers';
import { validarArchivo, validarCorrespondenciaEncuesta } from '@/lib/fileValidation';

import { TableSelector } from '@/components/upload/TableSelector';
import { DropZone } from '@/components/upload/DropZone';
import { DataPreviewTable } from '@/components/upload/DataPreviewTable';

export default function UploadPage() {
    const [targetTable, setTargetTable] = useState<'encuesta_titulados' | 'encuesta_empleadores'>('encuesta_titulados');
    const [dataPreview, setDataPreview] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const procesarDatosLeidos = (data: any[], detectedHeaders: string[]) => {
        // Validación de correspondencia institucional
        const validacionEncuesta = validarCorrespondenciaEncuesta(detectedHeaders, targetTable);
        if (!validacionEncuesta.isValid) {
            setMessage({ type: 'error', text: validacionEncuesta.errorMessage! });
            setDataPreview([]);
            setHeaders([]);
            return;
        }

        setHeaders(detectedHeaders);
        setDataPreview(data);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessage(null);
        const file = e.target.files?.[0];
        if (!file) return;

        // Validación preliminar de archivo
        const validacionArchivo = validarArchivo(file);
        if (!validacionArchivo.isValid) {
            setMessage({ type: 'error', text: validacionArchivo.errorMessage! });
            return;
        }

        setFileName(file.name);
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension === 'csv') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data.length > 0) {
                        const detectedHeaders = Object.keys(results.data[0] as object);
                        procesarDatosLeidos(results.data, detectedHeaders);
                    } else {
                        setMessage({ type: 'error', text: 'El archivo seleccionado no contiene registros de respuestas.' });
                    }
                },
                error: () => {
                    setMessage({ type: 'error', text: 'Inconsistencia al interpretar el archivo CSV. Compruebe la codificación.' });
                },
            });
        } else {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const workbook = XLSX.read(bstr, { type: 'binary' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                    if (json.length > 0) {
                        const detectedHeaders = Object.keys(json[0] as object);
                        procesarDatosLeidos(json, detectedHeaders);
                    } else {
                        setMessage({ type: 'error', text: 'La hoja de cálculo seleccionada no contiene registros de respuestas.' });
                    }
                } catch {
                    setMessage({ type: 'error', text: 'No fue posible abrir el archivo de Excel. Verifique que no esté dañado.' });
                }
            };
            reader.readAsBinaryString(file);
        }
    };

    const handleSaveToDatabase = async () => {
        if (dataPreview.length === 0) return;

        setLoading(true);
        setMessage(null);

        try {
            // 1. Limpieza y mapeo estructurado de cada fila
            const cleanedData = dataPreview.map((row) =>
                targetTable === 'encuesta_empleadores' ? mapearFilaEmpleador(row) : mapearFilaTitulado(row)
            );

            // 2. Limpieza automática previa para evitar duplicados accidentales
            const { error: deleteError } = await supabase
                .from(targetTable)
                .delete()
                .neq('id', 0);

            if (deleteError) {
                throw new Error('No se pudo restablecer la cohorte anterior.');
            }

            // 3. Inserción por lotes de 100 registros (Batch Insert)
            const batchSize = 100;
            let totalInserted = 0;

            for (let i = 0; i < cleanedData.length; i += batchSize) {
                const batch = cleanedData.slice(i, i + batchSize);
                const { error: insertError } = await supabase.from(targetTable).insert(batch);

                if (insertError) {
                    console.error('Detalle técnico de la inserción:', insertError);
                    throw new Error('Estructura de datos incompatible con el esquema institucional.');
                }
                totalInserted += batch.length;
            }

            const nombreInstrumento = targetTable === 'encuesta_titulados' ? 'Titulados' : 'Empleadores';

            setMessage({
                type: 'success',
                text: `Se importaron y procesaron correctamente ${totalInserted} registros en el repositorio institucional de ${nombreInstrumento}.`,
            });

            setDataPreview([]);
            setHeaders([]);
            setFileName('');
        } catch (err) {
            console.error('Error durante la importación:', err);
            setMessage({
                type: 'error',
                text: 'No fue posible completar la importación. Compruebe que el documento corresponda al instrumento oficial seleccionado e intente nuevamente.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-6 sm:py-10 px-3 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 md:p-8">

                {/* Encabezado Institucional */}
                <div className="border-b border-slate-100 pb-4 sm:pb-5 mb-5 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-umss-azul flex items-center gap-2">
                        <FileSpreadsheet className="text-umss-rojo h-6 w-6 flex-shrink-0" />
                        <span>Módulo de Importación y Procesamiento de Datos</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                        Plataforma institucional para la ingesta y estructuración de respuestas recopiladas en los instrumentos de autoevaluación ARCUSUR.
                    </p>
                </div>

                {/* 1. Selector de Encuesta */}
                <TableSelector
                    targetTable={targetTable}
                    setTargetTable={(t) => {
                        setTargetTable(t);
                        setDataPreview([]);
                        setHeaders([]);
                        setFileName('');
                        setMessage(null);
                    }}
                    disabled={loading}
                />

                {/* 2. Zona de Carga Directa */}
                <DropZone
                    fileName={fileName}
                    onFileSelected={handleFileUpload}
                    disabled={loading}
                />

                {/* Mensajes y Alertas Profesionales */}
                {message && (
                    <div
                        className={`p-4 rounded-xl mb-6 flex items-start gap-3 text-xs sm:text-sm ${message.type === 'success'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                            }`}
                    >
                        {message.type === 'success' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <p className="leading-relaxed font-medium">{message.text}</p>
                    </div>
                )}

                {/* 3. Vista Previa Tabular */}
                <DataPreviewTable
                    headers={headers}
                    dataPreview={dataPreview}
                    loading={loading}
                    onConfirm={handleSaveToDatabase}
                />
            </div>
        </div>
    );
}