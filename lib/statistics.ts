// lib/statistics.ts
import * as ss from 'simple-statistics';
import jStat from 'jstat';

// 1. Estadísticos descriptivos univariados (Historia de Usuario 1)
export function calcularEstadisticasUnivariadas(valores: number[]) {
    const limpios = valores.filter((v) => !isNaN(v) && v !== null && v !== undefined);
    if (limpios.length === 0) {
        return { media: 0, mediana: 0, desviacionEstandar: 0, total: 0 };
    }

    const media = ss.mean(limpios);
    const mediana = ss.median(limpios);
    const desviacionEstandar = limpios.length > 1 ? ss.standardDeviation(limpios) : 0;

    return {
        media: Number(media.toFixed(2)),
        mediana: Number(mediana.toFixed(2)),
        desviacionEstandar: Number(desviacionEstandar.toFixed(2)),
        total: limpios.length,
    };
}

// 2. Frecuencias simples para variables categóricas (Historia de Usuario 2)
export function calcularDistribucionFrecuencias(categorias: string[]) {
    const conteo: Record<string, number> = {};
    let total = 0;

    categorias.forEach((cat) => {
        if (!cat) return;
        const key = cat.trim();
        conteo[key] = (conteo[key] || 0) + 1;
        total++;
    });

    return Object.entries(conteo).map(([nombre, cantidad]) => ({
        nombre,
        cantidad,
        porcentaje: total > 0 ? Number(((cantidad / total) * 100).toFixed(1)) : 0,
    }));
}

// 3. Prueba Chi-cuadrada de independencia (Historia de Usuario 3)
export function calcularChiCuadrada(
    datos: Array<{ varX: string; varY: string }>
) {
    const valoresX = Array.from(new Set(datos.map((d) => d.varX).filter(Boolean)));
    const valoresY = Array.from(new Set(datos.map((d) => d.varY).filter(Boolean)));

    if (valoresX.length < 2 || valoresY.length < 2) {
        return { chi2: 0, pValor: 1, gradosLibertad: 0, matriz: [], existeDependencia: false };
    }

    // Matriz de frecuencias observadas
    const matrizObservada: number[][] = valoresX.map((x) =>
        valoresY.map((y) => datos.filter((d) => d.varX === x && d.varY === y).length)
    );

    const totalesFila = matrizObservada.map((fila) => fila.reduce((a, b) => a + b, 0));
    const totalesColumna = valoresY.map((_, colIdx) =>
        matrizObservada.reduce((acc, fila) => acc + fila[colIdx], 0)
    );
    const granTotal = totalesFila.reduce((a, b) => a + b, 0);

    if (granTotal === 0) {
        return { chi2: 0, pValor: 1, gradosLibertad: 0, matriz: [], existeDependencia: false };
    }

    // Cálculo de Chi-cuadrada
    let chi2 = 0;
    for (let i = 0; i < valoresX.length; i++) {
        for (let j = 0; j < valoresY.length; j++) {
            const esperado = (totalesFila[i] * totalesColumna[j]) / granTotal;
            if (esperado > 0) {
                const observado = matrizObservada[i][j];
                chi2 += Math.pow(observado - esperado, 2) / esperado;
            }
        }
    }

    const gradosLibertad = (valoresX.length - 1) * (valoresY.length - 1);

    // Cálculo del p-valor usando la distribución chi-cuadrada de jStat
    let pValor = 1;
    try {
        pValor = 1 - jStat.chisquare.cdf(chi2, gradosLibertad);
    } catch {
        pValor = 1;
    }

    return {
        chi2: Number(chi2.toFixed(3)),
        gradosLibertad,
        pValor: Number(pValor.toFixed(4)),
        existeDependencia: pValor < 0.05, // Significancia alfa = 0.05
        filas: valoresX,
        columnas: valoresY,
        matriz: matrizObservada,
    };
}