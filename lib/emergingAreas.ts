import { normalizarTexto } from './dataMappers';
import type { Row } from './importPipeline';

export const THEMATIC_VERSION = 'areas-2026-10-29.2';
export const emergingRules = [
    { id: 'ia', nombre: 'Inteligencia artificial y aprendizaje automático', patron: /\b(ia|ai|inteligencia artificial|inteligente artificial|inteligencia artifical|machine learning|maching learning|aprendizaje automatico|deep learning|modelos generativos|ia generativa|agentes inteligentes)\b/ },
    { id: 'seguridad', nombre: 'Ciberseguridad y protección de datos', patron: /\b(ciberseguridad|ciber seguridad|ciber|cybersecurity|seguridad informatica|seguridad de (la informacion|datos|sistemas)|proteccion de datos|pentesting|informatica forense|informatica forence)\b/ },
    { id: 'datos', nombre: 'Datos y analítica', patron: /\b(big data|ciencia de datos|ingenier[oa]s? de datos|analitica|analisis de datos|business intelligence|bi|bases? de datos|data science|data warehouse)\b|^datos$/ },
    { id: 'software', nombre: 'Desarrollo y arquitectura de software', patron: /\b(software|programacion|desarrollo web|desarrollo movil|desarrollo de aplicaciones|desarrollo y soporte|devs|apis|microservicios|devops|arquitectura de sistemas|ingenieria de software)\b/ },
    { id: 'automatizacion', nombre: 'Automatización, IoT e industria 4.0', patron: /\b(iot|internet de las cosas|robotica|automatizacion|industria 4[ .]0)\b/ },
    { id: 'nube', nombre: 'Computación en la nube e infraestructura', patron: /\b(cloud|aws|azure|gcp|nube|infraestructura|servidores|redes de (datos|computadoras))\b/ },
    { id: 'gestion', nombre: 'Gestión, negocio e innovación digital', patron: /\b(transformacion digital|innovacion|gestion de proyectos|emprendimiento|negocio|negocios|gestion empresarial|product owner|marketing)\b/ },
    { id: 'transversales', nombre: 'Habilidades transversales y ética', patron: /\b(etica|liderazgo|comunicacion|trabajo en equipo|habilidades blandas|pensamiento critico)\b/ },
    { id: 'general', nombre: 'Formación general y adaptación tecnológica', patron: /\b(formacion general|adaptacion tecnologica|adaptabilidad|aprendizaje continuo|actualizacion tecnologica|nuevas tecnologias)\b/ },
    { id: 'blockchain', nombre: 'Blockchain y tecnologías descentralizadas', patron: /\b(blockchain|tecnologias descentralizadas|cadena de bloques)\b/ },
    { id: 'interoperabilidad', nombre: 'Interoperabilidad y estándares sectoriales', patron: /\b(interoperabilidad|integracion de sistemas|estandares sectoriales|estandares de salud|hl7|fhir)\b/ },
];
export type ThemeOverride = { etiquetas: string[]; nota: string; revisado_por?: string; revisado_utc?: string; original: string };
export function originalEmerging(row: Row) {
    return String((row.respuestas_originales as Row | undefined)?.areas_emergentes_importantes ?? row.areas_emergentes_importantes ?? '');
}
export function classifyEmerging(original: string, override?: ThemeOverride | null) {
    const hasResponse = !!original.trim(), etiquetas: string[] = [];
    // Variantes presentes en las fuentes: sugerir etiqueta, exigir revisión de la interpretación.
    let ambiguas = /\b(inteligente artificial|inteligencia artifical|maching learning|informatica forence|ciber)\b/.test(normalizarTexto(original));
    for (const rule of emergingRules) {
        // Segmentar frases; conservar la alerta cuando hay una mención negada o ambigua.
        const clauses = original.split(/[;,\n!?]|(?<!\d)\.(?!\d)/).map(normalizarTexto);
        for (const clause of clauses) {
            const match = rule.patron.exec(clause);
            if (!match) continue;
            const before = clause.slice(0, match.index);
            if (/\b(no|sin|nunca)\b(?:\s+\w+){0,3}\s*$/.test(before) && !/\bno solo\b/.test(before)) { ambiguas = true; continue; }
            if (!etiquetas.includes(rule.id)) etiquetas.push(rule.id);
        }
    }
    const manual = override?.original === original && Array.isArray(override.etiquetas) && (hasResponse || !override.etiquetas.length) && override.etiquetas.every(id => emergingRules.some(r => r.id === id));
    const selected = manual ? [...new Set(override.etiquetas)] : etiquetas;
    const noSabe = /^(no sabe|no se|no (tengo|tenemos) conocimiento\b)/.test(normalizarTexto(original));
    const noInterpretable = !selected.length && hasResponse && normalizarTexto(original).length < 3;
    return { original, etiquetas: selected, metodo: manual ? 'Revisión manual' : THEMATIC_VERSION,
        estado: !hasResponse ? 'sin_respuesta' : selected.length ? 'clasificable' : noSabe ? 'no_sabe' : noInterpretable ? 'no_interpretable' : 'sin_clasificar',
        requiereRevision: !manual && (hasResponse && (!selected.length || ambiguas)),
        nota: manual ? override.nota : ambiguas ? 'Mención negada o ambigua; revisar contexto.' : '',
        revisadoUTC: manual ? override.revisado_utc ?? null : null,
        revisadoPor: manual ? override.revisado_por ?? null : null };
}
export function summarizeEmerging(rows: Row[]) {
    const respuestas = rows.map((row, i) => ({ referencia: String(row.id ?? `fila-${row.fila_origen ?? i + 2}`), fila: row.fila_origen ?? i + 2,
        archivo: String(row.archivo_nombre ?? ''), archivoSha256: String(row.archivo_sha256 ?? ''), hoja: String(row.hoja_origen ?? ''),
        ...classifyEmerging(originalEmerging(row), row.clasificacion_areas as ThemeOverride | undefined) }));
    const clasificables = respuestas.filter(r => r.etiquetas.length).length;
    return { total: rows.length, clasificables, sinRespuesta: respuestas.filter(r => r.estado === 'sin_respuesta').length,
        sinClasificar: respuestas.filter(r => r.estado !== 'sin_respuesta' && !r.etiquetas.length).length,
        noSabe: respuestas.filter(r => r.estado === 'no_sabe').length,
        noInterpretable: respuestas.filter(r => r.estado === 'no_interpretable').length,
        requierenRevision: respuestas.filter(r => r.requiereRevision).length, respuestas,
        categorias: emergingRules.map(rule => {
            const cantidad = respuestas.filter(r => r.etiquetas.includes(rule.id)).length;
            return { id: rule.id, nombre: rule.nombre, cantidad, porcentajeTotal: rows.length ? cantidad / rows.length * 100 : null,
                porcentajeClasificables: clasificables ? cantidad / clasificables * 100 : null };
        }).sort((a, b) => b.cantidad - a.cantidad), version: THEMATIC_VERSION };
}
