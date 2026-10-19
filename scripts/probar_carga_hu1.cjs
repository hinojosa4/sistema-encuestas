const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
const XLSX = require('xlsx');
// Carga los modulos puros de TypeScript sin instalar otro ejecutor de pruebas.
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, esModuleInterop: true },
}).outputText, filename);
const p = require('../lib/importPipeline.ts');
const m = require('../lib/dataMappers.ts');
const e = require('../lib/employability.ts');
const repository = require('../lib/surveyRepository.ts');
const stats = require('../lib/statistics.ts');
const postgraduate = require('../lib/postgraduate.ts');
const reader = require('../lib/readSurveyFile.ts');
const validation = require('../lib/fileValidation.ts');
const messages = require('../lib/userMessages.ts');

const books = fs.readdirSync('datos').filter(n => n.endsWith('.xlsx')).map(name => {
  const workbook = XLSX.readFile('datos/' + name);
  return { name, type: name.includes('EMPLEADORES') ? 'encuesta_empleadores' : 'encuesta_titulados',
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' }) };
});
const graduates = books.find(b => b.type === 'encuesta_titulados');
const employers = books.find(b => b.type === 'encuesta_empleadores');

test('lectura: columnas repetidas, CSV malformado, UTF8 y hojas vacias', () => {
  const bytes = text => new TextEncoder().encode(text).buffer;
  assert.throws(() => reader.readCsv(bytes('Edad,Edad\n1,2')), /repetid/);
  assert.throws(() => reader.readCsv(bytes('Edad,Genero\n1,2,3')), /CSV/);
  assert.throws(() => reader.readCsv(new Uint8Array([255,254,250]).buffer), /UTF-8/);
  assert.deepEqual(reader.readSheet({ Sheets:{ empty:{} } }, 'empty'), []);
  assert.equal(reader.readCsv(bytes('Edad;Genero\n1;Hombre'))[0].Genero, 'Hombre');
});

test('archivo sin bytes, solo titulos y filas con metadatos sin respuestas no se guardan', () => {
  assert.equal(validation.validarArchivo({ name:'vacio.xlsx', size:0 }).isValid, false);
  assert.equal(validation.validarArchivo({ name:'datos.pdf', size:30 }).isValid, false);
  assert.equal(validation.validarArchivo({ name:'datos.xlsx', size:11*1024*1024 }).isValid, false);
  assert.match(p.inspectRows([], graduates.type).errors[0], /no tiene respuestas/);
  const noAnswers = Object.fromEntries(Object.keys(graduates.rows[0]).map(h => [h, '']));
  noAnswers.Id = 50;
  const result = p.inspectRows([noAnswers], graduates.type);
  assert.equal(result.rows.length, 0);
  assert.equal(result.emptyRows, 1);
  assert.match(result.errors[0], /no tiene respuestas/);
  const csv = new TextEncoder().encode('Edad;Genero').buffer;
  assert.deepEqual(reader.readCsv(csv), []);
});

test('columnas: esquema completo, faltantes, extras y celdas sin titulo', () => {
  for (const b of books) {
    const full = p.inspectRows(b.rows, b.type);
    assert.equal(full.expectedFields, b.type === 'encuesta_titulados' ? 49 : 31);
    assert.equal(full.recognizedFields, full.expectedFields);
  }
  const partial = { ...graduates.rows[0] };
  delete partial[Object.keys(partial).find(h => h.includes('ÁREAS LE INTERESARÍA'))];
  assert.match(p.inspectRows([partial], graduates.type).errors.join(' '), /incompleto/);
  assert.ok(!p.inspectRows([partial], graduates.type).errors.join(' ').includes('area_interes_posgrado'));
  const extra = p.inspectRows([{ ...graduates.rows[0], 'Pregunta nueva del docente':'respuesta' }], graduates.type);
  assert.deepEqual(extra.errors, []);
  assert.deepEqual(extra.unknownHeaders, ['Pregunta nueva del docente']);
  const malformed = XLSX.utils.aoa_to_sheet([['Edad', null], [30, 'dato sin titulo']]);
  assert.throws(() => reader.readSheet({Sheets:{Hoja:malformed}}, 'Hoja'), /no tiene título/);
  const direct = p.inspectRows([{edad:30, situacion_laboral_actual:'Actualmente NO trabajo', sector_empresa_trabajo:''}], graduates.type);
  assert.ok(direct.errors.length > 0);
});

test('mensajes al usuario no exponen detalles de Excel ni SQL', () => {
  const detail = 'SQLSTATE relation public.secret_column PGRST204 parser failed';
  assert.ok(!messages.fileErrorMessage(new Error(detail)).includes(detail));
  assert.ok(!repository.databaseMessage(new Error(detail)).includes(detail));
  assert.ok(!repository.databaseMessage({code:'PGRST204', message:detail}).includes('PGRST'));
  assert.equal(messages.fileErrorMessage(new messages.UserFacingError('Selecciona otra hoja.')), 'Selecciona otra hoja.');
});

test('HU2: concentracion calculada por conteos y umbral mayor a 70', () => {
  assert.equal(stats.calcularConcentracion([{nombre:'a',cantidad:4},{nombre:'b',cantidad:3},{nombre:'c',cantidad:3}]).superaUmbral, false);
  assert.equal(stats.calcularConcentracion([{nombre:'a',cantidad:5},{nombre:'b',cantidad:3},{nombre:'c',cantidad:2}]).superaUmbral, true);
  assert.equal(stats.calcularConcentracion([]).superaUmbral, false);
});

test('HU2: las preferencias solo incluyen interesados y separan niveles cursados', () => {
  const rows = p.inspectRows(graduates.rows, graduates.type).rows;
  const summary = postgraduate.resumirFormacion(rows);
  assert.equal(summary.interesados, 123);
  assert.equal(summary.sinInteres, 25);
  assert.equal(summary.concentracion.total, 123);
  assert.equal(summary.concentracion.top2, 83);
  assert.equal(summary.concentracion.superaUmbral, false);
  const mixed = postgraduate.resumirFormacion([
    {interes_futuro_posgrado:'Sí', area_interes_posgrado:'IA'},
    {interes_futuro_posgrado:'NO', area_interes_posgrado:'Robótica'},
    {interes_futuro_posgrado:'SI', area_interes_posgrado:null},
    {interes_futuro_posgrado:null, area_interes_posgrado:'IA'},
  ]);
  assert.equal(mixed.areas.length, 1);
  assert.equal(mixed.areas[0].cantidad, 1);
  assert.equal(mixed.sinArea, 1);
  assert.equal(mixed.areasFueraRuta, 2);
  assert.equal(mixed.interesNoUtilizable, 1);
  assert.equal(postgraduate.normalizarNivelPosgrado('POS DOCTORADO'), 'Posdoctorado');
  assert.equal(postgraduate.normalizarNivelPosgrado('Maestría o Doctorado'), null);
});

test('HU3: cruza antecedentes reales y exporta celdas con sus bases, sin inventar fuentes', () => {
  const rows = p.inspectRows(graduates.rows, graduates.type).rows;
  const summary = postgraduate.resumirFinanciamiento(rows);
  assert.equal(summary.fuentesValidas, 98);
  assert.equal(summary.chi.total, 98);
  assert.equal(summary.excluidosCruce, 50);
  assert.deepEqual(summary.distribucion.map(r => [r.nombre,r.cantidad]), [
    ['Recursos propios',90], ['Beca parcial',5], ['Beca total',3],
  ]);
  assert.equal(summary.chi.estado, 'frecuencias_bajas');
  assert.equal(summary.chi.celdasMenor5, 10);
  assert.equal(summary.chi.pValor, null);
  assert.equal(summary.chi.existeDependencia, null);
  const exported = postgraduate.filasCruceFinanciamiento(summary);
  assert.equal(exported.length, 12);
  assert.equal(exported.reduce((n,c) => n+c.cantidad,0), 98);
  for (const nivel of summary.chi.filas) {
    assert.ok(Math.abs(exported.filter(c => c.nivel_cursado===nivel).reduce((n,c) => n+c.porcentaje_del_nivel,0)-100)<1e-10);
  }
  const mixed = postgraduate.resumirFinanciamiento([
    {ha_realizado_posgrado:'NO',nivel_posgrado_cursado:'Maestría',financiamiento_posgrado_cursado:'Recursos propios'},
    {ha_realizado_posgrado:null,nivel_posgrado_cursado:'Maestría',financiamiento_posgrado_cursado:'Recursos propios'},
    {ha_realizado_posgrado:'SI',nivel_posgrado_cursado:'Maestría',financiamiento_posgrado_cursado:null},
    {ha_realizado_posgrado:'SI',nivel_posgrado_cursado:'Maestría',financiamiento_posgrado_cursado:'Crédito desconocido'},
    {ha_realizado_posgrado:'SI',interes_futuro_posgrado:'SI',financiamiento_posgrado_cursado:'Beca total'},
  ]);
  assert.equal(mixed.chi.total, 0);
  assert.deepEqual(mixed.exclusiones,{sinPosgrado:1,rutaNoConfirmada:1,incompletas:2,noReconocidas:1});
  assert.equal(postgraduate.normalizarFinanciamiento(''), null);
  assert.equal(postgraduate.resumirFinanciamiento([]).porcentajeBeca, null);
});

test('chi-cuadrada: pares completos, tabla dispersa y referencia numerica conocida', () => {
  const pairs = counts => counts.flatMap((row,i) => row.flatMap((n,j) => Array.from({length:n},()=>({varX:String(i),varY:String(j)}))));
  const reference = stats.calcularChiCuadrada(pairs([[20,30],[30,20]]));
  assert.equal(reference.estado, 'calculada');
  assert.ok(Math.abs(reference.chi2-4)<1e-12);
  assert.ok(Math.abs(reference.pValor-0.0455002638963584)<1e-8);
  assert.equal(reference.existeDependencia, true);
  const independent = stats.calcularChiCuadrada(pairs([[25,25],[25,25]]));
  assert.equal(independent.pValor, 1);
  assert.equal(independent.existeDependencia, false);
  const sparse = stats.calcularChiCuadrada(pairs([[2,0],[0,2]]));
  assert.equal(sparse.estado, 'frecuencias_bajas');
  assert.equal(sparse.pValor, null);
  assert.deepEqual(sparse.matriz, [[2,0],[0,2]]);
  const noData = stats.calcularChiCuadrada([{varX:' ',varY:'z'}, {varX:'x',varY:''}]);
  assert.equal(noData.estado, 'datos_insuficientes');
  assert.equal(noData.excluidos, 2);
  assert.equal(noData.chi2, null);
  assert.equal(noData.pValor, null);
  const oneRow = stats.calcularChiCuadrada([{varX:' x ',varY:'a'}, {varX:'x',varY:'b'}]);
  assert.equal(oneRow.estado, 'datos_insuficientes');
  assert.deepEqual(oneRow.matriz, [[1,1]]);
});

test('duraciones: cero, ausencia, texto invalido, meses, años y politica explicita', () => {
  assert.equal(p.parseDuration('', 'experiencia').valor, null);
  assert.equal(p.parseDuration('0', 'experiencia').valor, 0);
  assert.equal(p.parseDuration('2 años', 'experiencia').valor, 2);
  assert.equal(p.parseDuration('1,5', 'experiencia').valor, 1.5);
  assert.equal(p.parseDuration('6 meses', 'desempleo').valor, 6);
  assert.equal(p.parseDuration('1 año', 'desempleo').valor, 12);
  assert.equal(p.parseDuration('2', 'desempleo').valor, null);
  assert.equal(p.parseDuration('2', 'desempleo', 'meses').valor, 2);
  assert.equal(p.parseDuration('2', 'desempleo', 'anios').valor, 24);
  for (const value of ['n/a', 'Gjvu', '-1', 'Infinity', 'NaN', '1 o 2']) assert.equal(p.parseDuration(value, 'experiencia').valor, null);
});

test('los dos XLSX oficiales conservan todos los registros y reconocen las columnas de preguntas', () => {
  for (const b of books) {
    const book = XLSX.readFile('datos/' + b.name);
    const read = p.inspectRows(reader.readSheet(book, book.SheetNames[0]), b.type);
    const result = p.inspectRows(b.rows, b.type);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.unknownHeaders, []);
    assert.equal(result.rows.length, b.type === 'encuesta_titulados' ? 148 : 53);
    assert.equal(read.rows.length, result.rows.length);
    assert.deepEqual(read.errors, []);
    assert.deepEqual(result.rows[0].raw_data, b.rows[0]);
  }
});

test('nombre y rubro distintos, preguntas adicionales y las dos otras asignaturas', () => {
  const headers = Object.keys(graduates.rows[0]);
  const h = col => headers[XLSX.utils.decode_col(col)];
  const index = graduates.rows.findIndex(r => r[h('BA')] && r[h('BD')]);
  const raw = graduates.rows[index];
  const row = p.prepareRow(raw, graduates.type);
  assert.equal(row.empresa_trabajo_actual, p.cleanString(raw[h('BA')]));
  assert.equal(row.rubro_empresa_trabajo, p.cleanString(raw[h('BD')]));
  for (const [col, field] of [['BS','otra_area_trabajo'],['BY','otro_cargo_actual'],['CG','antiguedad_trabajo_actual'],['CJ','medio_obtencion_trabajo'],['CM','remuneracion_mensual'],['EQ','otra_asignatura_ventaja'],['EW','otra_asignatura_menos_util']]) {
    assert.equal(row.respuestas_originales[field], raw[h(col)]);
  }
  assert.equal(p.prepareRow({ nivel_formacion_demandado: 'Maestría' }, 'encuesta_empleadores').nivel_formacion_demandado, 'Maestría');
});

test('HU1: denominadores reales, cero incluido, experiencia distinta de año de egreso', () => {
  const result = p.inspectRows(graduates.rows, graduates.type);
  const summary = e.resumirEmpleabilidad(result.rows);
  assert.equal(summary.ocupacion.validos, 148);
  assert.equal(summary.ocupacion.cantidad, 123);
  assert.equal(summary.ocupacion.porcentaje, 83.1);
  assert.equal(summary.insercion.validos, 101);
  assert.equal(summary.insercion.cantidad, 77);
  assert.equal(summary.insercion.porcentaje, 76.2);
  assert.equal(summary.cohortes.length, 0);
  assert.ok(summary.experiencia.total > 0 && summary.experiencia.total < 148);
  assert.equal(e.resumirEmpleabilidad([{ anios_vida_profesional_normalizados: 0 }]).experiencia.total, 1);
  assert.equal(e.resumirEmpleabilidad([]).ocupacion.porcentaje, null);
  assert.equal(p.prepareRow({ 'Año de egreso': '2020' }, graduates.type).anio_egreso, 2020);
  assert.equal(p.prepareRow({ 'Año de egreso': '2999' }, graduates.type).anio_egreso, null);
  assert.equal(p.prepareRow({ anios_vida_profesional: '10' }, graduates.type).anio_egreso, undefined);
});

test('escalas propias y No sabe se conservan; no se fusionan desacuerdos', () => {
  assert.equal(m.codigoOrdinal('En desacuerdo'), 2);
  assert.notEqual(m.parseLikertValue('En desacuerdo'), m.parseLikertValue('Totalmente en desacuerdo'));
  assert.equal(m.codigoOrdinal('Satisfecho','satisfaccion'), 3);
  assert.equal(m.parseLikertValue('Satisfecho','satisfaccion'), 5);
  const row = p.prepareRow({ confianza_carrera_formadora: 'No sabe' }, 'encuesta_empleadores');
  assert.equal(row.confianza_carrera_formadora, null);
  assert.equal(row.calidad_datos.confianza_carrera_formadora.estado, 'no_sabe');
  const result = p.inspectRows(employers.rows, employers.type);
  assert.ok(result.rows.every(r => r.respuestas_originales.participacion_evaluacion_desempeno));
  assert.ok(result.rows.every(r => r.respuestas_originales.participacion_difusion_pasantias));
});

test('bifurcaciones conservan respuestas historicas y no convierten ausencias en cero', () => {
  const row = p.prepareRow({ ha_realizado_posgrado: 'NO', nivel_posgrado_cursado: '',
    interes_red_contactos: 'NO', email_contacto: 'ejemplo@example.test',
    situacion_laboral_actual: 'Actualmente NO trabajo', ha_trabajado_antes: 'NO', tiempo_conseguir_primer_empleo: '' }, graduates.type);
  assert.equal(row.calidad_datos.nivel_posgrado_cursado.estado, 'no_aplica');
  assert.equal(row.calidad_datos.email_contacto.estado, 'ruta_desconocida');
  assert.equal(row.email_contacto, 'ejemplo@example.test');
  assert.equal(row.tiempo_desempleado_meses, null);
  assert.equal(row.calidad_datos.tiempo_conseguir_primer_empleo.estado, 'no_aplica');
});

test('selecciones multiples: no partir comas internas; no imponer cinco respuestas historicas', () => {
  assert.deepEqual(p.splitSelections('Técnico (software, redes, bases de datos), Analista (datos, procesos)'), ['Técnico (software, redes, bases de datos)', 'Analista (datos, procesos)']);
  assert.deepEqual(p.splitSelections('Robótica;Contabilidad Básica;'), ['Robótica','Contabilidad Básica']);
});

test('deduplicacion, identificadores conflictivos y archivos de instrumento incorrecto', async () => {
  const a = graduates.rows[0];
  const result = p.inspectRows([a, { ...a }], graduates.type);
  assert.equal(result.duplicates, 1);
  assert.equal(result.rows.length, 1);
  const conflict = { ...a, 'Edad que tiene actualmente:': 'diferente' };
  assert.ok(p.inspectRows([a, conflict], graduates.type).errors.length > 0);
  assert.ok(p.inspectRows(employers.rows, graduates.type).errors.length > 0);
  assert.equal(await p.responseHash(a), await p.responseHash({ ...a, 'Puntos: adicional': '90' }));
  assert.equal(await p.responseHash(a), await p.responseHash(Object.fromEntries(Object.entries(a).reverse())));
});

test('exportacion segura, estadistica finita y lectura de historicos', () => {
  assert.equal(p.safeSpreadsheetValue('=HYPERLINK("url")')[0], "'");
  assert.equal(p.safeSpreadsheetValue(-2), -2);
  assert.equal(stats.calcularEstadisticasUnivariadas([0,2,Infinity,NaN]).media, 1);
  assert.equal(stats.calcularDistribucionFrecuencias([' ', '__proto__', '__proto__'])[0].cantidad, 2);
  const raw = graduates.rows[0];
  const fixed = p.normalizeStored({ id: 1, raw_data: raw, tiempo_desempleado: 999 }, graduates.type);
  assert.notEqual(fixed.tiempo_desempleado, 999);
  const current = { version_mapeo: 2, raw_data: raw, tiempo_desempleado_meses: 24 };
  assert.equal(p.normalizeStored(current, graduates.type), current);
});

function clientMock(stored, writeError = null) {
  const writes = [];
  const client = { from() { return {
    select() { return { order() { return { async range(from, to) { return { data: stored.slice(from, to+1), error: null }; } }; } }; },
    async upsert(rows, options) { writes.push({ rows, options }); return { error: writeError, count: writeError ? null : rows.length }; },
  }; } };
  return { client, writes };
}
test('guardado unico sin borrado: omite historicos y transmite el lote en una sola solicitud', async () => {
  const hash = await p.responseHash(graduates.rows[0]);
  const { client, writes } = clientMock([{ id:1, raw_data: graduates.rows[0] }]);
  const result = await repository.savePreparedRows(client, graduates.type, [{ respuesta_hash: hash }, { respuesta_hash:'nuevo' }]);
  assert.deepEqual(result, { inserted:1, skipped:1 });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].options.ignoreDuplicates, true);
  const changed = clientMock([{ raw_data: { Id: 7 } }]);
  await assert.rejects(repository.savePreparedRows(changed.client, graduates.type,
    [{ respuesta_hash:'diferente', respuesta_origen_id:'7' }]), /ya registrada/);
  assert.equal(changed.writes.length, 0);
  const failed = clientMock([], { code:'42501' });
  await assert.rejects(repository.savePreparedRows(failed.client, graduates.type, [{respuesta_hash:'nuevo'}]));
  const pages = clientMock(Array.from({length:2101},(_,id)=>({id})));
  assert.equal((await repository.readAllRows(pages.client, graduates.type)).length, 2101);
});
