const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
const XLSX = require('xlsx');

// Permite probar los módulos TypeScript sin añadir otro ejecutor de pruebas.
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } },
).outputText, filename);

const statistics = require('../lib/statistics.ts');
const pipeline = require('../lib/importPipeline.ts');
const employability = require('../lib/employability.ts');
const postgraduate = require('../lib/postgraduate.ts');
const { buildReport } = require('../lib/reports.ts');

const readFirstSheet = (filename) => {
  const workbook = XLSX.readFile(filename);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
};

const sourceFiles = fs.readdirSync('datos').filter((name) => name.startsWith('ENCUESTA') && name.endsWith('.xlsx'));
const graduatesFile = sourceFiles.find((name) => name.includes('TITULADOS'));
const employersFile = sourceFiles.find((name) => name.includes('EMPLEADORES'));

test('estadística descriptiva: media, mediana y desviación estándar muestral', () => {
  const result = statistics.describirCuantitativa([1, 2, 3, 4]);

  assert.equal(result.total, 4);
  assert.equal(result.media, 2.5);
  assert.equal(result.mediana, 2.5);
  assert.equal(result.varianzaMuestral, 5 / 3);
  assert.equal(result.desviacionMuestral, Math.sqrt(5 / 3));
});

test('frecuencias: cantidades y porcentajes usan el denominador de respuestas válidas', () => {
  const result = statistics.calcularDistribucionFrecuencias(['Sí', 'No', 'Sí', '', 'No sabe']);

  assert.deepEqual(result, [
    { nombre: 'Sí', cantidad: 2, porcentaje: 50 },
    { nombre: 'No', cantidad: 1, porcentaje: 25 },
    { nombre: 'No sabe', cantidad: 1, porcentaje: 25 },
  ]);
});

test('tablas analíticas: datos reales, matriz de financiamiento y cruces', { skip: !graduatesFile || !employersFile }, () => {
  const graduateRows = pipeline.inspectRows(readFirstSheet(`datos/${graduatesFile}`), 'encuesta_titulados').rows;
  const employerRows = pipeline.inspectRows(readFirstSheet(`datos/${employersFile}`), 'encuesta_empleadores').rows;

  assert.equal(graduateRows.length, 148);
  assert.equal(employerRows.length, 80);

  const employabilitySummary = employability.resumirEmpleabilidad(graduateRows, 3, 2026);
  assert.equal(employabilitySummary.experiencia.total > 0, true);
  assert.equal(employabilitySummary.situaciones.reduce((sum, row) => sum + row.cantidad, 0), 148);
  assert.equal(employabilitySummary.edad.reduce((sum, row) => sum + row.cantidad, 0), 148);

  const financingSummary = postgraduate.resumirFinanciamiento(graduateRows);
  assert.equal(financingSummary.fuentesValidas, 98);
  assert.equal(financingSummary.chi.total, 98);
  assert.equal(financingSummary.chi.matriz.flat().reduce((sum, value) => sum + value, 0), 98);
  assert.equal(financingSummary.chi.totalesFila.reduce((sum, value) => sum + value, 0), 98);

  const report = buildReport(graduateRows, employerRows, { scope: 'todos', corte: 5 }, '2026-11-01T12:00:00.000Z');
  const table = (name) => report.tablas.find((item) => item.nombre === name);

  for (const name of ['Resumen', 'HU1_Ocupacion', 'HU1_Experiencia', 'HU3_Fuentes', 'HU3_Matriz_observadas', 'Cruces_Contrastes', 'HU4_Estadisticos']) {
    assert.ok(table(name), `Debe existir la tabla ${name}`);
  }

  assert.equal(table('HU3_Matriz_observadas').filas.at(-1).at(-1), 98);
  assert.equal(table('Cruces_Contrastes').filas.length, 5);
  assert.ok(table('HU4_Estadisticos').filas.length > 0);
});

