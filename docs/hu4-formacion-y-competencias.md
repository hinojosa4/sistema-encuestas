# HU4: formación, competencias y oportunidades de mejora

Actualización: 19 de octubre de 2026.

## Implementación

La pestaña HU4 se llama «Formación y competencias». Contiene tres perspectivas:

1. **Formación y trabajo:** satisfacción global, concordancia entre formación y requerimientos, y pertinencia del trabajo actual desde los titulados. Incluye medias, medianas, desviaciones muestrales, desacuerdo, distribución de las categorías originales y exclusiones por pregunta.
2. **Mejoras curriculares:** aspectos útiles, aspectos por mejorar, asignaturas que dieron ventaja y asignaturas percibidas como menos útiles. Cada pregunta permite alternar gráfico y tabla. Una opción se cuenta una vez por persona; los porcentajes usan como denominador las personas que respondieron esa pregunta, no la suma de selecciones. Por eso pueden sumar más de 100%.
3. **Perspectiva de empleadores:** ocho preguntas sobre perfil y desempeño, diez de vinculación institucional, menciones de áreas/herramientas/habilidades y radares complementarios. Las opiniones de empresas no sustituyen las de titulados ni se vinculan por identidad.

El filtro inicial incluye titulados con experiencia laboral declarada: trabajo actual en organización, emprendimiento actual, trabajo previo declarado o experiencia profesional positiva. Se puede elegir «Todos los titulados» como contexto. El filtro afecta las valoraciones y selecciones de titulados y la exportación; no modifica las respuestas de empleadores. No es una clasificación por cargo ni una estimación de antigüedad desde el egreso.

La pertinencia del puesto actual pertenece a la rama de trabajo en organización. Se excluyen de ese indicador otras situaciones, aun si hay una respuesta histórica fuera de ruta; los originales permanecen intactos.

## Escalas y calidad

- Titulados: acuerdo original de cuatro categorías, códigos 1–4.
- Empleadores: acuerdo original de tres categorías, códigos 1–3; «No sabe» sin puntaje.
- Se usan categorías originales identificables o códigos ordinales nativos válidos. Un puntaje histórico transformado a 1–5 sin categoría ni código original no se convierte por suposición: queda fuera de los cálculos.
- Las categorías de desacuerdo de titulados son las dos inferiores. En empleadores solo se considera «Totalmente en desacuerdo»; «Parcialmente de acuerdo» conserva su categoría propia.
- Se muestran por separado válidas, sin respuesta, no sabe, no aplica, inválidas y ruta desconocida. Los conteos concilian con la base de cada pregunta. No se asigna cero a ausencias.
- Media y desviación son resúmenes descriptivos de códigos ordinales, no niveles de dominio ni una demostración de distancias iguales entre categorías. Se incluyen distribuciones y medianas para interpretarlos. No hay media sin respuestas válidas ni desviación muestral con menos de dos.
- Los radares usan medias nativas de empleadores (1–3), con su escala explícita. Si falta un eje, no se dibuja como cero; la tabla permanece disponible. Se retira el nombre «Destrezas TI y Práctica», porque el ítem abarca varias competencias laborales.

## Menciones abiertas de empleadores

Se ofrece una clasificación orientativa por expresiones explícitas. Los temas incluyen IA, software, datos, seguridad, redes, nube/DevOps, proyectos, comunicación, equipo, análisis/resolución de problemas, aprendizaje, ética y liderazgo. El catálogo exacto y sus reglas son visibles en el panel y se exportan.

Se normalizan acentos y escritura. Una respuesta cuenta una vez por tema aunque repita términos. Los porcentajes usan todas las respuestas no vacías de esa pregunta, incluidas las que no coinciden con el catálogo. La cantidad de respuestas sin coincidencias se muestra explícitamente. No se publican comentarios individuales en el panel ni en las hojas analíticas nuevas.

Es una clasificación preliminar por palabras clave: puede omitir sinónimos o contar menciones negadas. No estima demanda de puestos, no mide suficiencia y requiere revisión humana antes de sustentar decisiones curriculares. No se fuerza una categoría a respuestas sin coincidencias.

«Otra asignatura» libre se conserva en los datos originales, sin clasificar automáticamente su contenido. La selección de una asignatura como menos útil no justifica eliminarla sin evaluación académica.

## Exportación

La exportación general incorpora cinco hojas:

- `HU4_Estadisticos`: pregunta, fuente, población, escala, bases, estadísticos y exclusiones.
- `HU4_Categorias`: frecuencias y porcentajes de categorías originales por pregunta.
- `HU4_Mejoras`: conteos por opción y base de personas que respondieron.
- `HU4_Demanda`: temas mencionados por empleadores, bases y respuestas sin clasificar.
- `HU4_Metodologia`: filtro, alcance, bases de texto y reglas de clasificación.

Las cadenas de las hojas nuevas pasan por la protección de exportación existente para evitar interpretación como fórmulas. Las hojas originales del exportador general conservan su funcionamiento previo.

## Qué sigue faltando para completar literalmente HU4

El instrumento permite describir satisfacción, concordancia y oportunidades generales de mejora. No contiene una valoración separada de suficiencia de cada hard skill y soft skill frente al puesto. Para completar esa parte se requiere recoger una pregunta por competencia y contexto laboral. Si se desea una brecha numérica, hacen falta mediciones de formación recibida y nivel requerido en una escala comparable por la misma persona. No se restan medias de titulados y empleadores como si fueran mediciones pareadas.

No se agrega una escala original de cinco categorías mediante transformación matemática: si se quiere aplicar cinco opciones, corresponde una nueva versión identificada del instrumento. Estas mejoras no requieren migración SQL ni reescriben las respuestas existentes.

## Control con los datos del docente

Filtro inicial: 147 de 148 titulados tienen experiencia declarada. Satisfacción: 146 respuestas válidas, media 2,78/4 y desviación muestral 0,63. Concordancia: 146 válidas, media 2,62/4 y desviación 0,62. Pertinencia: 108 válidas, media 3,25/4 y desviación 0,75.

Actualización del plan de estudios: 105 de 147 personas de esa población la seleccionan como mejora (71,43%). La base no es el total de selecciones. Hay 53 respuestas de empleadores; sus bases válidas varían por pregunta debido a «No sabe».

## Verificación

Pruebas automáticas: escalas nativas frente a puntuaciones transformadas, exclusiones, ausencia de falsa desviación con una respuesta, rutas de pertinencia, filtro de experiencia, denominadores de selección múltiple, deduplicación por persona/opción, clasificación de menciones y bases conciliadas con ambos Excel oficiales. Se comprueban también TypeScript, ESLint y compilación de producción. La validación local no certifica datos ni permisos remotos de Supabase.
