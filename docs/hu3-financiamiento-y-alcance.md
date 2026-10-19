# Financiamiento y alcance de HU1, HU2 y HU3

Actualización: 19 de octubre de 2026.

## Análisis implementado

HU3 analiza antecedentes: nivel de posgrado cursado o en curso y fuente utilizada. No mezcla interés futuro con nivel cursado ni utiliza financiamiento del negocio como financiamiento educativo. Los campos originales permanecen intactos. Esta mejora no necesita modificar el esquema SQL.

La base de la distribución incluye solo titulados que declaran haber realizado formación complementaria y una fuente reconocida. El cruce exige además un nivel reconocido. Se contabilizan por separado las respuestas fuera de ruta, incompletas y con categorías no reconocidas. No se reemplazan vacíos por recursos propios.

El catálogo de fuentes conserva las tres categorías del instrumento: recursos propios, beca total y beca parcial. No identifica al otorgante de la beca. Los niveles se normalizan por un catálogo explícito; no se infiere el nivel a partir de una coincidencia parcial de texto.

El panel ofrece distribución con gráfico/tabla, matriz con cantidades, porcentajes por nivel y frecuencias esperadas, totales y explicación de exclusiones. El mapa de calor representa porcentajes por fila, no significancia. El Excel general incorpora distribuciones HU2/HU3, celdas del cruce con observadas/esperadas y porcentajes, y una hoja de metodología con bases, exclusiones, estado del contraste y resultados.

### Cómo leer las tres vistas de la tabla

- **Cantidad de personas:** respuestas reales de cada combinación. Por ejemplo, dos personas de diplomado utilizaron beca parcial.
- **Porcentaje dentro del nivel:** divide esa cantidad entre el total de su fila. En ese ejemplo, 2 / 66 = 3,03% de quienes cursaron diplomado.
- **Valores esperados para χ²:** cantidades teóricas bajo independencia. Se calculan como total de fila × total de columna / total general. En el ejemplo, 66 × 5 / 98 = 3,37. Los decimales no representan personas adicionales ni datos faltantes.

Las dos primeras vistas utilizan una escala verde por proporción, con leyenda explícita y gris para cero. En la vista de esperadas se señalan valores menores de 1 en naranja y de 1 a menos de 5 en ámbar. Seleccionar una celda resalta fila y columna y muestra la lectura del cruce en texto; los colores nunca son el único medio de comunicar el resultado.

HU3 solicita las tablas de contingencia y la aplicación de chi-cuadrada. Las tres vistas son ayudas de presentación: las cantidades constituyen la tabla observada, los porcentajes facilitan comparaciones y las esperadas permiten comprobar el cálculo y sus supuestos. El selector y los colores son decisiones de interfaz, no requisitos textuales adicionales de HU3.

La tarjeta de personas que indicaron cómo pagaron su posgrado utiliza fondo blanco y explica su base. El estado anterior «No disponible» del p-valor se expresa ahora como «No interpretable con esta aproximación» cuando hay frecuencias bajas, acompañado de la razón. Este estado no indica un fallo de importación.

## Contraste estadístico

Se aplica Pearson sin corrección de Yates únicamente a pares completos. Una tabla con menos de dos categorías por variable conserva sus conteos, pero no produce estadístico ni p-valor inferencial. Nunca se devuelve p = 1 como sustituto de un error o ausencia de datos.

La aplicación adopta un criterio conservador: ninguna frecuencia esperada menor de 1 y al menos 80% de esperadas de 5 o más. Para 2 × 2 se exige que todas sean de 5 o más. Si no se cumple, se conserva el estadístico descriptivo y las tablas, pero se omiten el p-valor asintótico y la conclusión inferencial. Un método exacto o de permutación queda pendiente para esas tablas; no se agrupan categorías para forzar los supuestos.

Referencia metodológica: [NIST, Chi-square Independence Test](https://itl.nist.gov/div898/software/dataplot/refman1/auxillar/chistest.htm).

Un p-valor no significativo se presenta como ausencia de evidencia suficiente de asociación, no como prueba de independencia. El contraste presupone respuestas independientes y no demuestra causalidad, restricciones económicas ni intenciones futuras. Eliminar duplicados exactos no garantiza una respuesta por persona ni una muestra representativa.

## Control con los archivos entregados

- 148 respuestas de titulados; 98 declaran formación complementaria y permiten el cruce; 50 no han realizado posgrado.
- Financiamiento: 90 recursos propios, 5 beca parcial y 3 beca total. Base: 98.
- Matriz por nivel: diplomado 66, especialidad 3, maestría 27 y doctorado 2.
- Chi-cuadrada: aproximadamente 5,501272; 6 grados de libertad. Diez de doce esperadas son menores de 5; mínima aproximada 0,061224. No se publica un p-valor asintótico interpretable.
- HU2: 123 interesados y 25 no interesados. Los 123 interesados tienen área declarada; IA e Ingeniería de Software reúnen 83 preferencias (67,48%).

HU2 ahora explicita Sí/No válidos, interesados sin área y respuestas fuera de ruta. Sus porcentajes temáticos se calculan solo sobre interesados con área declarada; sus antecedentes académicos se limitan a quienes confirman formación complementaria. Se unifican escritura y acentos de las cinco áreas del instrumento, sin fusionar temas diferentes.

## Preguntas pendientes y datos necesarios

| Historia | Pregunta pendiente | Dato que debe recogerse |
| --- | --- | --- |
| HU1 | ¿Cuál es la antigüedad desde el egreso y cómo varía la inserción por cohorte? | Año de egreso; definir además plazo e indicador de inserción y seguimiento. La experiencia profesional no sustituye el año. |
| HU2 | ¿Qué nivel desean estudiar y en qué área? | Nivel de posgrado deseado, vinculado a la respuesta de área futura. |
| HU3 | ¿Con qué fuente prevén financiar ese nivel? | Principal fuente prevista: recursos propios, beca, crédito o patrocinio, con opción explícita de no definido. Si se permiten combinaciones, recoger montos o proporciones y definir otro análisis apropiado. |
| Decisión económica | ¿Qué barreras existen y es sostenible abrir un programa? | Barreras, disposición y capacidad de pago, costos, aranceles, cupos y matrícula efectiva. |

Los campos históricos `nivel_posgrado_cursado` y `financiamiento_posgrado_cursado` no responden preguntas sobre el futuro. `interes_futuro_posgrado` solo expresa Sí/No. `anio_egreso` se agrega en `habilitar_carga_validada.sql`, pero no aparece en los archivos oficiales. Crear una columna no proporciona respuestas faltantes. Los nuevos datos requieren un instrumento complementario y un mapeo explícito antes de incorporarse.

## Verificación

`npm test` incluye controles con los Excel oficiales, casos fuera de ruta, vacíos, niveles ambiguos, matriz exportable, tablas dispersas y una referencia numérica 2 × 2 con χ² = 4 y p ≈ 0,045500264. Se comprueban también TypeScript, ESLint y la compilación de producción. La ejecución local no certifica permisos ni datos remotos de Supabase.
