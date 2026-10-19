// lib/statistics.ts
import * as ss from 'simple-statistics';
import jStat from 'jstat';

// Decisión metodológica, no estimación de la encuesta. Debe fijarse antes del contraste.
export const SIGNIFICANCE_LEVEL = 0.05;

// Concentracion descriptiva por conteos originales, sin sumar porcentajes redondeados.
export function calcularConcentracion(categorias: { nombre: string; cantidad: number }[], umbral = 70) {
    const ordenadas = [...categorias].filter(c => Number.isFinite(c.cantidad) && c.cantidad > 0).sort((a, b) => b.cantidad - a.cantidad);
    const total = ordenadas.reduce((n, c) => n + c.cantidad, 0);
    const top2 = ordenadas.slice(0, 2).reduce((n, c) => n + c.cantidad, 0);
    const porcentaje = total ? top2 / total * 100 : 0;
    return { total, top2, porcentaje, superaUmbral: total > 0 && porcentaje > umbral };
}

// 1. Estadísticos descriptivos univariados (Historia de Usuario 1)
export function calcularEstadisticasUnivariadas(valores: number[]) {
    const limpios = valores.filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (limpios.length === 0) {
        return { media: 0, mediana: 0, desviacionEstandar: 0, total: 0 };
    }

    const media = ss.mean(limpios);
    const mediana = ss.median(limpios);
    const desviacionEstandar = limpios.length > 1 ? ss.sampleStandardDeviation(limpios) : 0;

    return {
        media: Number(media.toFixed(2)),
        mediana: Number(mediana.toFixed(2)),
        desviacionEstandar: Number(desviacionEstandar.toFixed(2)),
        total: limpios.length,
    };
}

// 2. Frecuencias simples para variables categóricas (Historia de Usuario 2)
export function calcularDistribucionFrecuencias(categorias: string[]) {
    const conteo = new Map<string, number>();
    let total = 0;

    categorias.forEach((cat) => {
        if (!cat) return;
        const key = cat.trim();
        if (!key) return;
        conteo.set(key, (conteo.get(key) ?? 0) + 1);
        total++;
    });

    return Array.from(conteo.entries()).map(([nombre, cantidad]) => ({
        nombre,
        cantidad,
        porcentaje: total > 0 ? Number(((cantidad / total) * 100).toFixed(1)) : 0,
    }));
}

export type ChiSquareResult = {
    alfa: number;
    chi2: number | null;
    pValor: number | null;
    gradosLibertad: number;
    existeDependencia: boolean | null;
    estado: 'calculada' | 'datos_insuficientes' | 'frecuencias_bajas' | 'error_numerico';
    filas: string[];
    columnas: string[];
    matriz: number[][];
    esperadas: number[][];
    totalesFila: number[];
    totalesColumna: number[];
    total: number;
    excluidos: number;
    celdasMenor5: number;
    minimaEsperada: number | null;
};

// Pearson sin correccion de Yates. Se conserva la tabla aunque no sea posible inferir.
// Criterio conservador de Cochran: ninguna esperada < 1 y al menos 80% >= 5;
// en tablas 2x2 se exige que todas sean >= 5.
// https://itl.nist.gov/div898/software/dataplot/refman1/auxillar/chistest.htm
export function calcularChiCuadrada(
    datos: Array<{ varX: string; varY: string }>
) : ChiSquareResult {
    const pares = datos.map(d => ({ varX: d.varX?.trim(), varY: d.varY?.trim() }))
        .filter(d => d.varX && d.varY);
    const filas = [...new Set(pares.map(d => d.varX))];
    const columnas = [...new Set(pares.map(d => d.varY))];
    const indiceFila = new Map(filas.map((v, i) => [v, i]));
    const indiceColumna = new Map(columnas.map((v, i) => [v, i]));
    const matriz = filas.map(() => columnas.map(() => 0));
    for (const par of pares) matriz[indiceFila.get(par.varX)!][indiceColumna.get(par.varY)!]++;
    const total = pares.length;
    const totalesFila = matriz.map(f => f.reduce((a, b) => a + b, 0));
    const totalesColumna = columnas.map((_, j) => matriz.reduce((n, f) => n + f[j], 0));
    const esperadas = matriz.map((f, i) => f.map((_, j) => totalesFila[i] * totalesColumna[j] / total));
    const valoresEsperados = esperadas.flat();
    const celdasMenor5 = valoresEsperados.filter(v => v < 5).length;
    const minimaEsperada = valoresEsperados.length ? Math.min(...valoresEsperados) : null;
    const base: ChiSquareResult = {
        alfa: SIGNIFICANCE_LEVEL,
        filas, columnas, matriz, esperadas, totalesFila, totalesColumna, total,
        excluidos: datos.length - total, celdasMenor5, minimaEsperada,
        gradosLibertad: Math.max(0, filas.length - 1) * Math.max(0, columnas.length - 1),
        chi2: null, pValor: null, existeDependencia: null, estado: 'datos_insuficientes',
    };
    if (filas.length < 2 || columnas.length < 2) return base;
    const chi2 = matriz.reduce((sum, f, i) => sum + f.reduce((n, obs, j) =>
        n + (obs - esperadas[i][j]) ** 2 / esperadas[i][j], 0), 0);
    base.chi2 = chi2;
    if (minimaEsperada! < 1 || celdasMenor5 / valoresEsperados.length > 0.2 ||
        (filas.length === 2 && columnas.length === 2 && celdasMenor5 > 0)) {
        return { ...base, estado: 'frecuencias_bajas' };
    }
    try {
        const pValor = 1 - jStat.chisquare.cdf(chi2, base.gradosLibertad);
        if (!Number.isFinite(pValor) || pValor < 0 || pValor > 1) return { ...base, estado: 'error_numerico' };
        return { ...base, pValor, existeDependencia: pValor < SIGNIFICANCE_LEVEL, estado: 'calculada' };
    } catch {
        return { ...base, estado: 'error_numerico' };
    }
}
