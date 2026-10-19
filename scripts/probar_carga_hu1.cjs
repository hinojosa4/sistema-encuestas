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
const competencies = require('../lib/competencies.ts');
const reports = require('../lib/reports.ts');
const { buildAcademicReport, UMSS_COLORS } = require('../lib/academicReport.ts');
const { academicReportToPdf } = require('../lib/academicPdf.ts');
const { generateReport } = require('../lib/reportService.ts');
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

test('egreso: valida años explícitos, calcula antigüedad y separa bases de ocupación por cohorte', () => {
  const rows = [
    { anio_egreso:2020, situacion_laboral_actual:'Empleado en Organización' },
    { anio_egreso:2020, situacion_laboral_actual:'Desempleado / En Búsqueda' },
    { anio_egreso:2020, situacion_laboral_actual:null },
    { anio_egreso:2026, situacion_laboral_actual:'Emprendimiento Propio' },
    ...[2027,1899,2020.5,'2020',null].map(anio_egreso=>({anio_egreso})),
    { anios_vida_profesional_normalizados:10 },
  ];
  const result=e.resumirEmpleabilidad(rows,3,2026);
  assert.equal(result.egreso.estadisticas.total,4);
  assert.equal(result.egreso.estadisticas.media,4.5);
  assert.equal(result.egreso.estadisticas.mediana,6);
  assert.equal(result.egreso.estadisticas.desviacionEstandar,3);
  assert.equal(result.egreso.excluidos,6);
  assert.deepEqual(result.ocupacionPorCohorte,[
    {anio:2020,respuestas:3,ocupados:1,base:2,excluidos:1,porcentaje:50},
    {anio:2026,respuestas:1,ocupados:1,base:1,excluidos:0,porcentaje:100},
  ]);
  assert.equal(p.prepareRow({ anio_egreso:'2020' }, graduates.type).anio_egreso,2020);
  const empty=e.resumirEmpleabilidad([{anios_vida_profesional_normalizados:10}],3,2026);
  assert.equal(empty.cohortes.length,0);
  const report=reports.buildReport(rows,[],{scope:'todos',corte:3},'2026-10-19T12:00:00.000Z');
  assert.equal(report.tablas.find(t=>t.nombre==='Egreso_Ocupacion').filas.length,2);
  const model=buildAcademicReport({...report,huella:'prueba-egreso'});
  assert.ok(JSON.stringify(model).includes('Tabla 3a Ocupación actual por cohorte'));
});

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

test('carga: distingue columnas, indice y tabla ausentes sin exponer errores internos', () => {
  for (const code of ['42703', 'PGRST204']) {
    assert.match(repository.databaseMessage({code, message:'correo privado y SQL interno'}), /CARGA-COLUMNAS/);
    assert.match(repository.databaseMessage({code}), /habilitar_carga_validada\.sql/);
  }
  assert.match(repository.databaseMessage({code:'42P10'}), /CARGA-INDICE/);
  assert.match(repository.databaseMessage({code:'PGRST205'}), /CARGA-TABLA/);
  assert.doesNotMatch(repository.databaseMessage({code:'42703', message:'correo privado y SQL interno'}), /correo privado|SQL interno/);
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

test('HU4: usa categorias y codigos nativos, no invierte puntajes transformados', () => {
  const field = 'satisfaccion_global_carrera';
  const r = competencies.summarizeRating([
    { [field]:5, respuestas_originales:{[field]:'Totalmente de acuerdo'} },
    { [field]:5, codigos_ordinales:{[field]:2} },
    { [field]:5 }, // Escala original desconocida: no asumir que 5 equivale a 4.
    { [field]:null },
    { [field]:'No sabe' },
    { [field]:'De acuerdo', calidad_datos:{[field]:{estado:'ruta_desconocida'}} },
  ], field, 'Titulados');
  assert.equal(r.maximo, 4);
  assert.equal(r.validas, 2);
  assert.equal(r.media, 3);
  assert.equal(r.mediana, 3);
  assert.equal(r.desviacion, 1.41);
  assert.equal(r.porcentajeDesacuerdo, 50);
  assert.equal(r.invalida, 1);
  assert.equal(r.sinRespuesta, 1);
  assert.equal(r.noSabe, 1);
  assert.equal(r.rutaDesconocida, 1);
  const efield = 'confianza_carrera_formadora';
  const employersResult = competencies.summarizeRating([
    {[efield]:'Totalmente desacuerdo'}, {[efield]:'Parcialmente de acuerdo'},
    {[efield]:'Totalmente de acuerdo'}, {[efield]:'No sabe'},
  ],efield,'Empleadores');
  assert.equal(employersResult.media, 2);
  assert.equal(employersResult.desviacion, 1);
  assert.equal(employersResult.maximo, 3);
  assert.deepEqual(employersResult.categorias.map(c=>c.cantidad),[1,1,1]);
  assert.equal(employersResult.noSabe,1);
  const empty = competencies.summarizeRating([],field,'Titulados');
  assert.equal(empty.media,null);
  assert.equal(empty.desviacion,null);
  const single = competencies.summarizeRating([{[field]:'De acuerdo'}],field,'Titulados');
  assert.equal(single.desviacion,null);
});

test('HU4: pertinencia respeta ruta y experiencia no se confunde con antiguedad de egreso', () => {
  assert.equal(competencies.hasWorkExperience({situacion_laboral_actual:'Empleado en Organización',anios_vida_profesional_normalizados:0}),true);
  assert.equal(competencies.hasWorkExperience({ha_trabajado_antes:'SI'}),true);
  assert.equal(competencies.hasWorkExperience({anios_vida_profesional_normalizados:3}),true);
  assert.equal(competencies.hasWorkExperience({anios_vida_profesional_normalizados:0,ha_trabajado_antes:'NO'}),false);
  const field='pertinencia_laboral_carrera';
  const r=competencies.summarizeRating([
    {situacion_laboral_actual:'Empleado en Organización',[field]:'De acuerdo'},
    {situacion_laboral_actual:'Emprendimiento Propio',[field]:'Totalmente de acuerdo'},
  ],field,'Titulados');
  assert.equal(r.validas,1);
  assert.equal(r.noAplica,1);
  assert.equal(r.media,3);
});

test('HU4: seleccion multiple usa personas como denominador y deduplica por persona', () => {
  const r=competencies.summarizeSelections([
    {selecciones_multiples:{aspectos_mejora:['Práctica','Practica','Teoría']}},
    {aspectos_mejora:'Práctica; Teoría'},
    {aspectos_mejora:null},
  ],'aspectos_mejora');
  assert.equal(r.respondieron,2);
  assert.equal(r.sinRespuesta,1);
  assert.equal(r.opciones.length,2);
  assert.deepEqual(r.opciones.map(o=>o.cantidad),[2,2]);
  assert.deepEqual(r.opciones.map(o=>o.porcentaje),[100,100]);
});

test('HU4: temas cuentan menciones por respuesta y conservan las no clasificadas', () => {
  const field='habilidades_fundamentales';
  const r=competencies.summarizeThemes([
    {[field]:'IA, inteligencia artificial, comunicación y trabajo en equipo'},
    {[field]:'Ingeniería de sistemas'}, // No confundir IA con un fragmento de ingeniería.
    {[field]:''},
  ],field);
  assert.equal(r.respondieron,2);
  assert.equal(r.sinRespuesta,1);
  assert.equal(r.sinClasificar,1);
  assert.equal(r.opciones.find(o=>o.nombre==='Inteligencia artificial').cantidad,1);
  assert.equal(r.opciones.find(o=>o.nombre==='Comunicación').porcentaje,50);
  assert.ok(!JSON.stringify(r).includes('Ingeniería de sistemas'));
});

test('HU4: archivos oficiales, bases conciliadas y exportacion sin textos individuales', () => {
  const g=p.inspectRows(graduates.rows, graduates.type).rows;
  const e=p.inspectRows(employers.rows, employers.type).rows;
  const summary=competencies.resumirCompetencias(g,e);
  assert.equal(summary.totalTitulados,148);
  assert.equal(summary.conExperiencia,147);
  assert.equal(summary.totalEmpleadores,53);
  assert.equal(summary.titulados[0].validas,146);
  assert.equal(summary.titulados[0].media,2.78);
  assert.equal(summary.titulados[2].validas,108);
  assert.equal(summary.mejoras[0].respondieron,147);
  assert.equal(summary.mejoras[0].opciones[0].cantidad,105);
  for (const item of [...summary.titulados,...summary.perfilEmpleadores,...summary.vinculacion]) {
    assert.equal(item.validas+item.noSabe+item.sinRespuesta+item.noAplica+item.invalida+item.rutaDesconocida,item.base);
    assert.equal(item.categorias.reduce((n,c)=>n+c.cantidad,0),item.validas);
    assert.ok(item.media===null || item.media>=1 && item.media<=item.maximo);
  }
  const all=competencies.resumirCompetencias(g,e,'todos');
  assert.equal(all.tituladosAnalizados,148);
  assert.deepEqual(all.perfilEmpleadores,summary.perfilEmpleadores);
  const exported=competencies.exportCompetencies(summary);
  assert.equal(exported.estadisticas.length,21);
  assert.ok(exported.categorias.every(r=>r.escala_maxima===(r.fuente==='Titulados'?4:3)));
  assert.ok(!JSON.stringify(exported).includes('raw_data'));
  assert.equal(competencies.resumirCompetencias([],[]).titulados[0].media,null);
});

test('HU5: valida parametros sin aceptar cortes ambiguos ni poblaciones arbitrarias', () => {
  assert.deepEqual(reports.parseReportParameters(new URLSearchParams()),{scope:'experiencia',corte:3});
  assert.deepEqual(reports.parseReportParameters(new URLSearchParams('scope=todos&corte=0')),{scope:'todos',corte:0});
  for (const query of ['scope=admin','corte=-1','corte=31','corte=3.5','corte=','corte=Infinity']) {
    assert.throws(()=>reports.parseReportParameters(new URLSearchParams(query)),/INVALID_REPORT_PARAMETERS/);
  }
});

test('HU5: matrices de doble entrada concilian y no se exportan respuestas individuales', () => {
  const g=p.inspectRows(graduates.rows,graduates.type).rows;
  const e=p.inspectRows(employers.rows,employers.type).rows;
  const report=reports.buildReport(g,e,{scope:'experiencia',corte:4},'2026-10-19T12:00:00.000Z');
  assert.equal(report.titulados,148); assert.equal(report.empleadores,53);
  assert.equal(report.cruce.total,98);
  const observed=report.tablas.find(t=>t.nombre==='HU3_Matriz_observadas');
  assert.deepEqual(observed.columnas,['Nivel cursado','Beca parcial','Beca total','Recursos propios','Total (personas)']);
  assert.deepEqual(observed.filas[0],['Diplomado',2,1,63,66]);
  assert.deepEqual(observed.filas.at(-1),['Total (personas)',5,3,90,98]);
  const pct=report.tablas.find(t=>t.nombre==='HU3_Matriz_porcentajes');
  for(const row of pct.filas.slice(0,-1)) assert.ok(Math.abs(row.slice(1,-1).reduce((a,b)=>a+b,0)-100)<1e-10);
  const book=XLSX.utils.book_new();
  for(const t of report.tablas){
    assert.ok(t.nombre.length<=31);
    assert.ok(t.filas.every(row=>row.length===t.columnas.length));
    XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([t.columnas,...t.filas].map(r=>r.map(p.safeSpreadsheetValue))),t.nombre);
  }
  const roundtrip=XLSX.read(XLSX.write(book,{type:'buffer',bookType:'xlsx'}),{type:'buffer'});
  assert.equal(roundtrip.Sheets.HU3_Matriz_observadas.B2.v,2);
  assert.equal(roundtrip.Sheets.HU3_Matriz_observadas.E6.v,98);
  const serialized=JSON.stringify(report);
  for(const personal of ['persona_privada@example.test','telefono_privado_123']) {
    assert.ok(!JSON.stringify(reports.buildReport([{...g[0],email_contacto:personal,telefono_contacto:personal}],[],{scope:'todos',corte:3})).includes(personal));
  }
  assert.ok(!serialized.includes('raw_data'));
  const empty=reports.buildReport([],[],{scope:'todos',corte:3});
  assert.equal(empty.cruce.total,0);
  assert.equal(empty.tablas[0].filas[0][1],null);
});

test('HU5: CSV escapa formulas, comillas, delimitadores y conserva ceros', () => {
  const csv=reports.tableToCsv({nombre:'test',descripcion:'',columnas:['Texto','Valor'],filas:[['=HYPERLINK("x")',0],['A,"B"\nC',null]]});
  assert.equal(csv.charCodeAt(0),0xfeff);
  const parsed=require('papaparse').parse(csv.slice(1),{header:true});
  assert.equal(parsed.data[0].Texto,"'=HYPERLINK(\"x\")");
  assert.equal(parsed.data[0].Valor,'0');
  assert.equal(parsed.data[1].Texto,'A,"B"\nC');
  assert.equal(parsed.data[1].Valor,'');
});

test('HU5: informe academico conserva estructura, datos y limitaciones del producto final', async () => {
  const g=p.inspectRows(graduates.rows,graduates.type).rows,e=p.inspectRows(employers.rows,employers.type).rows;
  const report={...reports.buildReport(g,e,{scope:'experiencia',corte:3},'2026-10-19T12:00:00.000Z'),huella:'a'.repeat(64)};
  const model=buildAcademicReport(report);
  assert.equal(model.sections.length,8);
  assert.ok(model.resumen.includes('148'));
  assert.deepEqual(UMSS_COLORS,{azul:'#003770',rojo:'#E30613',blanco:'#FFFFFF'});
  const states=model.sections[5].bloques.find(b=>b.tipo==='tabla'&&b.titulo.startsWith('Tabla 13')).filas;
  assert.ok(states.some(r=>r[0]==='Simulación de sistemas'&&r[1]==='Pendiente'));
  const bytes=await academicReportToPdf(report,{autores:'Equipo de prueba'},fs.readFileSync('public/brand/escudo-umss.jpg'));
  const doc=await require('pdf-lib').PDFDocument.load(bytes);
  assert.ok(doc.getPageCount()>=9);
  assert.equal(doc.getAuthor(),'Equipo de prueba');
  assert.equal(doc.getTitle(),model.titulo);
  const empty={...reports.buildReport([],[],{scope:'todos',corte:3}),huella:'b'.repeat(64)};
  assert.ok(!buildAcademicReport(empty).resumen.includes('NaN'));
  await academicReportToPdf(empty);
});

test('HU5: servicio lee ambas tablas paginadas sin mutaciones y falla sin reporte parcial', async () => {
  const calls=[];
  const client={from(name){return{select(){return{order(){return{async range(from,to){calls.push([name,from,to]);return{data:[],error:null};}};}};}};}};
  const report=await generateReport(client,{scope:'experiencia',corte:3});
  assert.equal(calls.length,2);
  assert.equal(report.huella.length,64);
  const {huella,...content}=report;
  assert.equal(huella,await p.sha256(JSON.stringify(content)));
  const denied={from(){return{select(){return{order(){return{async range(){return{data:null,error:{code:'42501'}};}};}};}};}};
  await assert.rejects(generateReport(denied,{scope:'todos',corte:3}));
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
  const original = {raw_data: graduates.rows[0], respuesta_origen_id:String(graduates.rows[0].Id), instrumento_origen:'form-a'};
  const { client, writes } = clientMock([{ id:1, ...original }]);
  const result = await repository.savePreparedRows(client, graduates.type, [original, {...original, respuesta_origen_id:'nuevo'}]);
  assert.deepEqual(result, { inserted:1, skipped:1 });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].options.ignoreDuplicates, true);
  const changed = clientMock([{ raw_data: { Id: 7 }, instrumento_origen:'form-a' }]);
  await assert.rejects(repository.savePreparedRows(changed.client, graduates.type,
    [{ raw_data:{Id:7,Edad:'diferente'}, respuesta_origen_id:'7', instrumento_origen:'form-a' }]), /ya registrado/);
  assert.equal(changed.writes.length, 0);
  const failed = clientMock([], { code:'42501' });
  await assert.rejects(repository.savePreparedRows(failed.client, graduates.type, [{respuesta_hash:'nuevo'}]));
  const pages = clientMock(Array.from({length:2101},(_,id)=>({id})));
  assert.equal((await repository.readAllRows(pages.client, graduates.type)).length, 2101);
});

test('anonimato: conserva respuestas iguales sin ID en ambos instrumentos', async () => {
  for (const book of [graduates, employers]) {
    const raw={...book.rows[0]}; delete raw.Id;
    const review=p.inspectRows([raw,{...raw}],book.type);
    assert.equal(review.rows.length,2);
    assert.equal(review.duplicates,0);
    const mock=clientMock([{raw_data:raw,respuesta_hash:await p.responseHash(raw)}]);
    const result=await repository.savePreparedRows(mock.client,book.type,review.rows);
    assert.equal(result.inserted,2);
    assert.notEqual(mock.writes[0].rows[0].respuesta_hash,mock.writes[0].rows[1].respuesta_hash);
  }
});

test('envios: IDs diferentes conservan respuestas iguales; mismo origen e ID evita reimportar', async () => {
  const raw=graduates.rows[0];
  const review=p.inspectRows([raw,{...raw,Id:999999}],graduates.type);
  assert.equal(review.rows.length,2);
  const a={raw_data:{respuesta:'igual'},instrumento_origen:'form-a',respuesta_origen_id:'1'};
  const b={...a,respuesta_origen_id:'2'};
  const c={...a,instrumento_origen:'form-b'};
  const first=clientMock([]);
  await repository.savePreparedRows(first.client,graduates.type,[a,b,c]);
  assert.equal(new Set(first.writes[0].rows.map(r=>r.respuesta_hash)).size,3);
  const retry=clientMock(first.writes[0].rows);
  assert.deepEqual(await repository.savePreparedRows(retry.client,graduates.type,[a,b,c]),{inserted:0,skipped:3});
  assert.equal(retry.writes.length,0);
});

test('sin ID: reimportar el mismo archivo y fila se omite; filas iguales y archivos nuevos se conservan', async () => {
  for (const type of [graduates.type,employers.type]) {
    const a={raw_data:{respuesta:'igual'},archivo_sha256:'a'.repeat(64),hoja_origen:'Hoja',fila_origen:2};
    const b={...a,fila_origen:3};
    const mock=clientMock([]);
    await repository.savePreparedRows(mock.client,type,[a,b]);
    assert.equal(mock.writes[0].rows.length,2);
    assert.notEqual(mock.writes[0].rows[0].respuesta_hash,mock.writes[0].rows[1].respuesta_hash);
    const retry=clientMock(mock.writes[0].rows);
    assert.deepEqual(await repository.savePreparedRows(retry.client,type,[a,b]),{inserted:0,skipped:2});
    const next=clientMock(mock.writes[0].rows);
    assert.equal((await repository.savePreparedRows(next.client,type,[{...a,archivo_sha256:'b'.repeat(64)}])).inserted,1);
  }
});
