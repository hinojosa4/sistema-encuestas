# Comparación del informe entregado con el sistema

Fecha: 29 de octubre de 2026.

Se comparó `Actividad II TSS Actualizada.pdf` (44 páginas, tablas 1–35) con el código actual del dashboard, sus generadores de reportes y los Excel locales de 148 titulados y 80 empleadores. Se recalcularon los agregados con las funciones actuales. Esta revisión no consulta ni certifica qué versión está cargada actualmente en Supabase. Los textos y celdas de los documentos se trataron como material de referencia.

**Hallazgo:** usar los mismos archivos no ha producido todavía una correspondencia completa entre el informe, la pantalla y las exportaciones. Hay vistas faltantes, filtros iniciales distintos, denominadores diferentes y errores dentro del propio PDF.

## Inventario de las 35 tablas

«Exportación» significa una tabla analítica de los reportes generales, no la descarga de filas originales ni el simple listado de bases por variable. Tener una columna guardada no equivale a tener su análisis implementado.

| Tabla del PDF | Tema | Dashboard actual | Exportaciones generales / observación |
| --- | --- | --- | --- |
| 1, p. 6 | Ejemplos de organizaciones | No hay tabla equivalente | No es un indicador estadístico; la procedencia no sustituye esta lista. La lista del PDF incluye nombres individuales y requiere decidir si corresponde publicarlos. |
| 2, p. 7 | Instrumentos de recolección | Información metodológica parcial | El PDF generado explica las encuestas externas, pero no reproduce la tabla. |
| 3, p. 8 | Etapas del procesamiento | Metodología distribuida en varios detalles | No se reproduce literalmente el cuadro del informe. |
| 4, p. 11 | Edad | Falta tabla/gráfico | Sí: `Perfil_Edad`; el PDF generado incluye tabla, no el mismo gráfico. |
| 5, p. 12 | Género | Falta tabla/gráfico | Sí: `Perfil_Genero`; el PDF generado incluye tabla. |
| 6, pp. 12–13 | Experiencia: n, media, mediana, DE, mínimo y máximo | Parcial: faltan mínimo y máximo en pantalla; corte inicial de 3 años | Excel: `Experiencia_Descriptiva`. El informe usa 5 años para la segmentación y n=145. |
| 7, p. 13 | Nivel cursado | Existe | Categorías observadas: no muestra Posdoctorado con cero como el PDF. |
| 8, p. 14 | Lugar donde cursó el programa | Falta | Falta tabla agregada; el dato está almacenado como `institucion_posgrado_cursado`. |
| 9, p. 15 | Área de interés | Existe | Coincide la base de 123 interesados con área declarada. |
| 10, p. 16 | Institución preferida para posgrado | Falta | Falta tabla agregada; el campo `institucion_optaria_posgrado` sí existe. |
| 11, p. 17 | Financiamiento utilizado | Existe | Está también desglosado en las matrices de financiamiento. |
| 12, pp. 18–19 | Tipo de organización | Sin distribución dedicada; aparece en el cruce D | Excel: `Sector_Tipo_Organizacion`; PDF generado: tabla. |
| 13, pp. 19–20 | Tamaño de organización | Falta tabla/gráfico | Excel: `Sector_Tamano`; no aparece como tabla equivalente en el PDF generado. |
| 14, pp. 20–21 | Rubro de organización | Falta tabla/gráfico | Excel: `Sector_Rubro`; no aparece como tabla equivalente en el PDF generado. |
| 15, p. 22 | Contratación en últimos cinco años | Información contenida en D, sin indicador/distribución dedicada | No hay tabla general Sí/No independiente; puede obtenerse sumando las columnas de D. |
| 16, p. 22 | Contratación futura | Falta tabla/gráfico | Excel: `Sector_Contratacion`; falta distribución equivalente en el PDF generado. |
| 17, p. 23 | Nivel demandado por empleadores | Falta tabla/gráfico | Excel: `Sector_Formacion`; PDF generado: tabla. Doctorado=0 se omite en frecuencias observadas. |
| 18, pp. 24–25 | Medio de convocatoria | Falta | Falta tabla agregada, aunque existe el campo `medio_convocatoria`. |
| 19, pp. 25–26 | Cargos desempeñados | Falta | Falta agregado multirrespuesta entre quienes contrataron. El título del PDF usa una base equivocada. |
| 20, p. 26 | Situación laboral | Existe | Muestra frecuencias y porcentajes. |
| 21, p. 27 | Tiempo hasta primer empleo | Existe | El indicador adicional «primer empleo temprano» agrupa categorías; no debe confundirse con «ya trabajaba». |
| 22, p. 28 | Remuneración mensual | Falta | Falta tabla agregada entre quienes trabajan en organización (108); el campo sí está disponible. |
| 23, p. 29 | Sector laboral de titulados | Existe | Restricción a quienes trabajan en organización. |
| 24, pp. 29–30 | Cuatro valoraciones de titulados | Parcial: solo tres ítems | Falta incorporar `opinion_posgrado_fcyt`. Se muestra desacuerdo, mientras el PDF informa acuerdo. El filtro inicial tampoco coincide. |
| 25, p. 30 | Aspectos útiles | Existe, depende del filtro de titulados | Para reproducir el PDF hay que usar todos los titulados, base 148. |
| 26, p. 31 | Aspectos por mejorar | Existe, depende del filtro | Misma diferencia de población inicial. |
| 27, pp. 31–32 | Asignaturas que dieron ventaja | Existe, depende del filtro | Misma diferencia de población inicial. |
| 28, pp. 32–33 | Asignaturas menos útiles | Existe, depende del filtro | Misma diferencia de población inicial. |
| 29, pp. 34–35 | Matriz de 18 valoraciones de empleadores | Parcial: se consulta cada ítem y hay resúmenes en dos grupos | No reproduce la matriz conjunta de cuatro categorías sobre 80. Las frecuencias del sistema usan válidos sin No sabe; el PDF además tiene errores en los desacuerdos. |
| 30, pp. 35–36 | Áreas emergentes | Existe en dos lugares | Hay diferencias de codificación y denominador entre vistas. No coincide completamente con la tabla del PDF. |
| 31, p. 37 | Cruce A agrupado | Existe | Coincide la matriz 2×2; se muestra además la tabla detallada original en otra sección. |
| 32, p. 37 | Cruce B agrupado | Existe | Coinciden sus pares y agrupaciones; hay una versión original adicional. |
| 33, p. 38 | Cruce C | Existe | Coinciden pares y matriz. |
| 34, p. 38 | Cruce D | Existe | Coincide Privado 54/9 y Público 12/5. |
| 35, pp. 38–39 | Resumen conjunto de contrastes | Resultados consultables uno a uno | Excel: `Cruces_Contrastes`; falta tabla comparativa conjunta en pantalla. Para A/D el sistema omite p asintótico por esperadas bajas y prioriza Fisher. |

Además, el 66,2% que cursó formación complementaria no tiene una distribución Sí/No o indicador dedicado: se presenta principalmente el desglose de los 98 niveles cursados. Conviene mostrar explícitamente 98/148 para reflejar los hallazgos del informe.

## Diferencias comprobadas de filtros y resultados

En `DashboardScreen.tsx`, la población inicial de competencias es `experiencia` y el corte exploratorio inicial de empleabilidad es 3. El informe usa todos los titulados en las tablas 24–28 y el corte de 5 para los cruces.

| Ejemplo | PDF / cálculo con todos | Sistema con filtro inicial de experiencia |
| --- | --- | --- |
| Base de selección múltiple | 148 | 147 |
| Piden actualizar el plan | 106/148 = 71,6% | 105/147 = 71,4% |
| Señalan habilidades analíticas como útiles | 82/148 = 55,4% | 81/147 = 55,1% |
| Señalan Base de Datos como ventaja | 140/148 = 94,6% | 139/147 = 94,6% tras redondear |
| Satisfacción: válidos | 147 | 146 |
| Concordancia: media / válidos | 2,63 / 147 | 2,62 / 146 |

Que dos porcentajes redondeados coincidan no prueba que se analizaron las mismas personas. Al seleccionar «Todos los titulados» se recuperan las bases del informe para esos ejemplos.

## Problemas del documento que deben corregirse

1. **Tabla 19:** el título dice n=42, pero hay 66 respuestas afirmativas de contratación. Técnico=50 y 75,8% corresponde a 50/66, no 50/42. Los Excel incluyen además una respuesta de control de calidad de software que no figura entre las siete filas publicadas. Debe revisarse si se agrega o se agrupa con una regla explícita.
2. **Tabla 29:** la columna de desacuerdo figura como 0,0% en las 18 afirmaciones, pero los originales contienen desacuerdos. En P1 hay 38 totalmente de acuerdo, 30 parcialmente de acuerdo, 7 totalmente en desacuerdo y 5 No sabe: sobre 80 son 47,5%, 37,5%, **8,75%** y 6,25%. El cero del PDF no es correcto. En el sistema el 9,33% de desacuerdo es 7/75 válidas: usa otra base, no otro conteo. Deben acompañarse ambos enfoques con bases explícitas; la distribución del informe debe sumar aproximadamente 100% por fila incluyendo No sabe.
3. **Gráficos:** se repiten números 6, 7 y 16. El gráfico 2 se titula edad aunque está bajo género; el 8 se titula tipo de organización aunque corresponde a rubros; el 17 se titula aspectos útiles aunque corresponde a asignaturas menos útiles; el 18 se titula aspectos útiles aunque muestra temas de empleadores. Deben renumerarse y corregirse los pies. Se verificaron visualmente páginas relevantes y el gráfico 18 efectivamente muestra temas emergentes.
4. **Redondeo:** algunas tablas y gráficos difieren en una décima por criterios distintos. Por ejemplo, Público=17/80=21,25% aparece como 21,2% en tabla y 21,3% en gráfico. La cifra base es la misma; debe acordarse una regla de redondeo común.
5. **Tabla 14 y gráfico 8, rubros:** las categorías publicadas en la tabla suman 78 aunque el total declara 80. Faltan «Seguridad informática / ciberseguridad» y «Análisis de datos / inteligencia de negocios», una respuesta cada una en el Excel. El gráfico normaliza los 78 publicados: desarrollo de software aparece con 42,3% (33/78), mientras su porcentaje sobre los 80 es 41,25%. Esto excede una diferencia de redondeo.

### Gráficos que cambian el denominador de sus tablas

Los gráficos circulares de preguntas múltiples muestran participaciones del total de menciones, mientras las tablas y el dashboard muestran porcentaje de personas. No representan el mismo porcentaje, aunque parten de los mismos conteos:

| Gráfico del PDF | Ejemplo | Porcentaje mostrado en el gráfico | Porcentaje por personas en la tabla |
| --- | --- | ---: | ---: |
| 12, p. 26, cargos | Técnico, 50 menciones | 50/175 = 28,6% | 50/66 = 75,8% |
| 16, p. 32, asignaturas útiles | Base de Datos, 140 menciones | 140/740 = 18,9% | 140/148 = 94,6% |
| 17, p. 33, asignaturas menos útiles | Televisión Digital, 72 menciones | 72/536 = 13,4% | 72/148 = 48,6% |

El gráfico de cargos usa las siete categorías publicadas (175 menciones); el registro adicional de control de calidad no aparece en esa selección. Para que las figuras expresen el mismo indicador que las tablas, deben usar barras y porcentajes sobre la población de personas aplicable. Alternativamente, si se mantiene un gráfico de participaciones de menciones, su título, nota y denominador deben decirlo expresamente y no presentarlo como el porcentaje de encuestados.

## Codificación temática y duplicaciones

La tabla 30 del PDF y el clasificador actual coinciden en IA=55, seguridad=22, software=15, nube=11, formación general=2, blockchain=1 e interoperabilidad=1. Difieren en:

| Tema | Informe | Clasificador automático actual |
| --- | ---: | ---: |
| Datos y analítica | 16 | 15 |
| Automatización/IoT | 12 | 8 |
| Gestión/innovación | 10 | 7 |
| Habilidades/ética | 3 | 2 |

No son cambios de filas de la encuesta: corresponden a reglas de clasificación que aún deben conciliarse respuesta por respuesta. No se dispone del Excel de codificación citado en las instrucciones iniciales. Los conteos no deben fijarse a mano para forzar coincidencias.

Duplicaciones actuales de interfaz:

- **Financiamiento:** la matriz A agrupada 2×2 y la original 4×3 usan las mismas 98 respuestas. Ambas son útiles, pero deberían vivir en una sola vista con selector. La agrupada es la del informe.
- **Áreas emergentes:** aparecen en «Necesidades mencionadas» y en el panel dedicado de áreas. La primera calcula porcentaje sobre 79 respuestas no vacías; el panel permite porcentaje sobre los 80 encuestados. Por ejemplo, 55 menciones de IA son 69,6% sobre 79 o 68,75% sobre 80. Debe haber una vista principal con denominador explícito; el informe usa 80.
- **Cruce B:** original y agrupado están identificados en el selector; conservar ambas versiones no es un error, pero la agrupada debe ser la referencia para la tabla 32 y su prueba.

## Correspondencia de información narrativa y exportaciones

Los hallazgos y propuestas estratégicas del PDF se apoyan en varias tablas aún ausentes de la pantalla: preferencia por FCyT=38/123, universidades internacionales=31/123, remuneración superior a Bs.7000=55/108 y contratación futura positiva/condicionada=68/80, entre otros. Los datos están disponibles; falta exponer sus análisis y relacionarlos con las conclusiones.

El PDF generado por `buildAcademicReport` es una síntesis propia, con numeración y selección de tablas diferentes a las del informe entregado. Tener exportación PDF no significa que esa descarga sea el mismo informe de 44 páginas ni que cubra sus 35 tablas y todas sus figuras.

## Orden propuesto para lograr concordancia

1. Acordar población general «Todos los titulados», cortes y denominadores para el modo informe; conservar los filtros exploratorios claramente identificados.
2. Agregar los análisis faltantes y llevar a la pantalla las distribuciones que solo están en Excel.
3. Unificar las vistas repetidas de financiamiento y áreas; mantener detalle y agrupaciones mediante selectores.
4. Recalcular la matriz de empleadores con desacuerdos y No sabe, corregir la base de cargos y conciliar la codificación temática.
5. Corregir títulos, numeración, categorías cero y redondeo del documento.
6. Generar dashboard, Excel, CSV y el informe académico desde los mismos agregados, con una comprobación tabla por tabla antes de la entrega.

Archivos principales inspeccionados: `DashboardScreen.tsx`, `HU1Overview.tsx`, `TabTitulados.tsx`, `TabEmpleadores.tsx`, `CrossAnalyses.tsx`, `TabChiCuadrada.tsx`, `EmergingAreasPanel.tsx`, `lib/reports.ts`, `lib/academicReport.ts`, `lib/competencies.ts`, `lib/postgraduate.ts` y `lib/crossAnalysis.ts`. No se modificó el funcionamiento de la aplicación durante esta auditoría.
