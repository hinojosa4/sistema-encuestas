const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
const X = require('xlsx');
const { PGlite } = require('@electric-sql/pglite');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, f);
const stats = require('../lib/statistics.ts');
const pipeline = require('../lib/importPipeline.ts');
const { buildCrossAnalyses } = require('../lib/crossAnalysis.ts');
const { classifyEmerging, summarizeEmerging } = require('../lib/emergingAreas.ts');
const { dataDictionary, variableCoverage } = require('../lib/dataDictionary.ts');
const { buildReport, tableToCsv } = require('../lib/reports.ts');
const { reportToWorkbook, uniqueSheetName } = require('../lib/excelExport.ts');
const { academicReportToPdf } = require('../lib/academicPdf.ts');
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≠ ${b}`);
const read = file => { const b = X.readFile(file); return X.utils.sheet_to_json(b.Sheets[b.SheetNames[0]], { defval: '' }); };

test('descriptivos: n−1, cuantiles tipo 7, modas, ausencias y nominales sin media', () => {
  const s = stats.describirCuantitativa([0, 1, 2, 2, 5, null, '', 'No sabe', NaN, Infinity]);
  assert.equal(s.total, 5); assert.equal(s.excluidos, 5); near(s.media, 2); near(s.varianzaMuestral, 3.5);
  near(s.desviacionMuestral, Math.sqrt(3.5)); assert.equal(s.q1, 1); assert.equal(s.q3, 2); assert.equal(s.rango, 5); assert.deepEqual(s.modas, [2]);
  assert.equal(stats.describirCuantitativa([]).media, null); assert.equal(stats.describirCuantitativa([1]).varianzaMuestral, null);
  assert.equal(stats.describirCuantitativa([0,0]).coeficienteVariacion, null);
  const n = stats.describirNominal(['A','B','B','',null]); assert.deepEqual(n.modas, ['B']); near(n.frecuencias[1].frecuenciaRelativa, 2/3); assert.equal(n.media, undefined);
  assert.deepEqual(stats.describirOrdinal(['Alto','Bajo','Medio','inválido'],['Bajo','Medio','Alto']).medianas,['Medio']);
});
test('Fisher: bilateral de referencia, márgenes degenerados, Pearson y tamaño de efecto', () => {
  near(stats.fisherExacta([[6,2],[1,4]]), 0.10256410256410256);
  // Controles independientes: probabilidades hipergeométricas con math.comb y Fraction de Python.
  near(stats.fisherExacta([[63,3],[27,5]]), 0.10888588107006804, 1e-10);
  near(stats.fisherExacta([[54,9],[12,5]]), 0.16203178498185952, 1e-10);
  assert.equal(stats.fisherExacta([[0,0],[1,2]]), null); assert.equal(stats.fisherExacta([[1.1,0],[1,2]]), null);
  const rows = [[54,9],[12,5]].flatMap((row,i)=>row.flatMap((n,j)=>Array.from({length:n},()=>({varX:String(i),varY:String(j)}))));
  const s=stats.calcularChiCuadrada(rows); assert.equal(s.estado,'frecuencias_bajas'); assert.equal(s.pValor,null); near(s.chi2,2.121575903088508,1e-8); near(s.vCramer,Math.sqrt(s.chi2/80));
});
test('temas: varias etiquetas, tildes, abreviaturas, negación, ambigüedad y revisiones vinculadas al original', () => {
  assert.deepEqual(classifyEmerging('IA e inteligencia artificial').etiquetas,['ia']);
  assert.deepEqual(classifyEmerging('CIBERSEGURIDAD; analítica; IoT y nube').etiquetas,['seguridad','datos','automatizacion','nube']);
  assert.equal(classifyEmerging('Ingeniería de sistemas').etiquetas.length,0);
  assert.equal(classifyEmerging('').estado,'sin_respuesta');
  const denied=classifyEmerging('No necesitamos IA; ciberseguridad'); assert.deepEqual(denied.etiquetas,['seguridad']); assert.equal(denied.requiereRevision,true);
  assert.deepEqual(classifyEmerging('No solo IA, también blockchain').etiquetas,['ia','blockchain']);
  const override={original:'Texto ambiguo',etiquetas:['ia','ia'],nota:'Revisado en contexto'};
  assert.deepEqual(classifyEmerging('Texto ambiguo',override).etiquetas,['ia']); assert.deepEqual(classifyEmerging('Otro texto',override).etiquetas,[]);
  const s=summarizeEmerging([{areas_emergentes_importantes:'IA y nube'},{areas_emergentes_importantes:''},{areas_emergentes_importantes:'???'}]);
  assert.equal(s.total,3); assert.equal(s.clasificables,1); assert.equal(s.sinRespuesta,1); assert.equal(s.sinClasificar,1); near(s.categorias.find(r=>r.id==='ia').porcentajeTotal,100/3);
});
test('diccionario y bases: encabezados exactos, rutas, No sabe y No aplica separados', () => {
  assert.equal(dataDictionary.length,80); assert.ok(dataDictionary.every(v=>v.encabezados_excel.length));
  const rows=[{ha_realizado_posgrado:'NO'},{ha_realizado_posgrado:'SI',nivel_posgrado_cursado:'Diplomado'},{ha_realizado_posgrado:'SI',nivel_posgrado_cursado:null}];
  const b=variableCoverage(rows,'nivel_posgrado_cursado'); assert.equal(b.total,3); assert.equal(b.aplicable,2); assert.equal(b.noAplica,1); assert.equal(b.validas,1); assert.equal(b.sinRespuesta,1);
  const row=pipeline.prepareRow({confianza_carrera_formadora:'No aplica',consistencia_titulo_competencias:'No sabe'},'encuesta_empleadores');
  assert.equal(variableCoverage([row],'confianza_carrera_formadora').noAplica,1); assert.equal(variableCoverage([row],'consistencia_titulo_competencias').noSabe,1);
  const confirmed=pipeline.prepareRow({tiempo_desempleado:'2',anios_vida_profesional:'10'},'encuesta_titulados','anios');
  assert.equal(pipeline.normalizeStored({...confirmed,version_mapeo:2},'encuesta_titulados').tiempo_desempleado_meses,24);
});
test('Excel: colisiones reales de Metodologia y nombres largos, inválidos, duplicados y vacíos', () => {
  const used=new Set(); const names=['Metodologia','metodologia','a'.repeat(50),'a'.repeat(50),'[]:*?/\\',"'"].map(n=>uniqueSheetName(n,used));
  assert.equal(new Set(names.map(n=>n.toLowerCase())).size,names.length); assert.ok(names.every(n=>n.length<=31&&!/[\\/?:*\[\]]/.test(n)));
  const r={...buildReport([],[],{scope:'todos',corte:5},'2026-10-29T12:00:00Z'),huella:'test'};
  r.tablas.push({nombre:'HU4_Metodologia',descripcion:'',columnas:['Texto','Número','Ausente'],filas:[['=secreto',0,null]]});
  const b=reportToWorkbook(r); const bytes=X.write(b,{type:'buffer',bookType:'xlsx'}), opened=X.read(bytes,{type:'buffer'});
  assert.equal(opened.SheetNames.length,r.tablas.length+1); assert.equal(new Set(opened.SheetNames.map(n=>n.toLowerCase())).size,opened.SheetNames.length);
  const sheet=opened.Sheets[opened.SheetNames.at(-1)]; assert.equal(sheet.A2.v,"'=secreto"); assert.equal(sheet.B2.v,0); assert.equal(sheet.C2,undefined);
  assert.ok(tableToCsv(r.tablas.at(-1)).startsWith('\ufeff')); assert.ok(tableToCsv(r.tablas.at(-1)).includes("'=secreto"));
});
test('fuentes reales: controles, cruces A–D, agregados privados y PDF/Excel del mismo reporte', {skip:!fs.existsSync('datos/empleadores-80-referencia.xlsx')}, async () => {
  const gf=fs.readdirSync('datos').find(n=>n.startsWith('ENCUESTA DE'));
  const g=pipeline.inspectRows(read('datos/'+gf),'encuesta_titulados').rows;
  const inspection=pipeline.inspectRows(read('datos/empleadores-80-referencia.xlsx'),'encuesta_empleadores');
  const e=inspection.rows;
  assert.equal(g.length,148); assert.equal(e.length,80); assert.equal(inspection.recognizedFields,31); assert.equal(inspection.exactDuplicates,0);
  const crosses=buildCrossAnalyses(g,e); const find=id=>crosses.find(c=>c.id===id).chi;
  assert.equal(find('A').total,98); assert.equal(find('B').total,120); assert.equal(find('C').total,145); assert.equal(find('D').total,80);
  const d=find('D'); assert.deepEqual(d.matriz[d.filas.indexOf('Privado')], d.columnas[0]==='Sí'?[54,9]:[9,54]);
  near(find('A').fisherP,0.10888588107006804,1e-10);
  const r={...buildReport(g,e,{scope:'todos',corte:5},'2026-10-29T12:00:00Z'),huella:'validacion-local-80'};
  assert.equal(r.tablas.find(t=>t.nombre==='Cruces_Contrastes').filas.length,5);
  assert.ok(!JSON.stringify(r).includes(e[0].nombre_empresa));
  const bytes=await academicReportToPdf(r); assert.equal(Buffer.from(bytes).subarray(0,5).toString(),'%PDF-');
  fs.mkdirSync('tmp/arcusur',{recursive:true}); fs.writeFileSync('tmp/arcusur/reporte-verificado.pdf',bytes);
  X.writeFile(reportToWorkbook(r),'tmp/arcusur/reporte-verificado.xlsx');
  fs.writeFileSync('tmp/arcusur/control.json',JSON.stringify({cruces:crosses.map(c=>({id:c.id,...c.chi})),areas:summarizeEmerging(e).categorias,bases:{total:e.length,clasificables:summarizeEmerging(e).clasificables,sinRespuesta:summarizeEmerging(e).sinRespuesta,sinClasificar:summarizeEmerging(e).sinClasificar,noSabe:summarizeEmerging(e).noSabe,noInterpretable:summarizeEmerging(e).noInterpretable}},null,2));
});

test('SQL: respaldo atómico 53→80, reimportación, rollback, concurrencia, permisos y conservación de 148 titulados', async () => {
  const db=new PGlite(); const admin='00000000-0000-0000-0000-000000000001';
  try {
    await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY); INSERT INTO auth.users VALUES('${admin}');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;`);
    for(const name of ['mejorar_base_datos.sql','habilitar_carga_validada.sql','configurar_acceso_administrador.sql','reemplazo_seguro_empleadores.sql','reemplazo_seguro_empleadores.sql']) await db.exec(fs.readFileSync('scripts/'+name,'utf8'));
    await db.query('INSERT INTO public.administradores_sistema(usuario_id) VALUES($1)',[admin]);
    await db.exec("INSERT INTO public.encuesta_titulados(edad) SELECT 'test' FROM generate_series(1,148); INSERT INTO public.encuesta_empleadores(nombre_empresa) SELECT 'anterior' FROM generate_series(1,53)");
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[admin]);
    const original=(await db.query('SELECT * FROM public.encuesta_titulados ORDER BY id')).rows;
    const before=async()=>(await db.query('SELECT public.previsualizar_reemplazo_empleadores() r')).rows[0].r;
    const preview=await before(); assert.equal(preview.empleadores,53); assert.equal(preview.titulados,148);
    const payload=Array.from({length:80},(_,i)=>({archivo_sha256:'a'.repeat(64),hoja_origen:'Respuestas',archivo_nombre:'fixture.xlsx',fila_origen:i+2,version_mapeo:3,raw_data:{indice:i},respuesta_hash:i.toString(16).padStart(64,'0'),areas_emergentes_importantes:'IA'}));
    // Error en la última fila revierte también las 79 anteriores y el respaldo.
    await assert.rejects(db.query('SELECT public.reemplazar_encuesta_empleadores($1,$2)',[JSON.stringify(payload.map((r,i)=>i===79?{...r,fila_origen:1}:r)),preview.version]));
    assert.equal((await before()).empleadores,53); assert.equal((await db.query('SELECT * FROM public.respaldos_empleadores')).rows.length,0);
    const replace=async(version,rows=payload)=>(await db.query('SELECT public.reemplazar_encuesta_empleadores($1,$2) r',[JSON.stringify(rows),version])).rows[0].r;
    const result=await replace(preview.version); assert.equal(result.inserted,80); assert.equal(result.sin_cambios,false); assert.ok(result.respaldo_id);
    assert.equal((await before()).empleadores,80); assert.deepEqual((await db.query('SELECT * FROM public.encuesta_titulados ORDER BY id')).rows,original);
    const backup=(await db.query('SELECT * FROM public.respaldos_empleadores')).rows[0]; assert.equal(backup.datos.length,53);
    await assert.rejects(replace(preview.version),e=>e.code==='40001');
    const second=await replace((await before()).version); assert.equal(second.sin_cambios,true); assert.equal((await db.query('SELECT * FROM public.respaldos_empleadores')).rows.length,1);
    const id=(await db.query('SELECT min(id)::int id FROM public.encuesta_empleadores')).rows[0].id;
    const review=(await db.query("SELECT public.revisar_areas_empleador($1,'IA',ARRAY['ia','ia'],'Confirmado') r",[id])).rows[0].r; assert.deepEqual(review.etiquetas,['ia']); assert.equal(review.revisado_por,admin);
    await assert.rejects(db.query("SELECT public.revisar_areas_empleador($1,'otro texto',ARRAY['ia'],'Confirmado')",[id]),e=>e.code==='40001');
    await assert.rejects(db.query("SELECT public.revisar_areas_empleador($1,'IA',ARRAY['etiqueta-inventada'],'Confirmado')",[id]),e=>e.code==='22023');
    assert.equal((await db.query('SELECT * FROM public.revisiones_areas_empleadores')).rows.length,1);
    await db.query("SELECT set_config('request.jwt.claim.sub','',false)"); await db.exec('SET ROLE authenticated');
    await assert.rejects(before(),e=>e.code==='42501'); await assert.rejects(replace('x'),e=>e.code==='42501');
    assert.equal((await db.query('SELECT * FROM public.respaldos_empleadores')).rows.length,0);
    await db.exec('RESET ROLE'); await db.exec('SET ROLE anon'); await assert.rejects(before(),e=>e.code==='42501');
  } finally { await db.close(); }
});
