const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { inspectAdminAccess, loginDestination } = require('../lib/auth/access.ts');
const { adminNavigation, DEFAULT_ADMIN_PATH, isWorkspacePath } = require('../lib/adminNavigation.ts');
const { resetErrorMessage, resetResult } = require('../lib/adminOperations.ts');

test('carga: reproduce columna ausente y la migracion permite guardar sin cambiar historicos', async () => {
  const db = new PGlite();
  try {
    await db.exec(fs.readFileSync('scripts/mejorar_base_datos.sql','utf8'));
    await db.query("INSERT INTO public.encuesta_titulados(edad) VALUES ('historico')");
    await assert.rejects(db.query('SELECT respuesta_hash FROM public.encuesta_titulados'), error => error.code === '42703');
    const sql = fs.readFileSync('scripts/habilitar_carga_validada.sql','utf8');
    await db.exec(sql);
    await db.exec(sql);
    for (const table of ['encuesta_titulados','encuesta_empleadores']) {
      await db.query(`SELECT id,raw_data,respuesta_hash,respuesta_origen_id,instrumento_origen FROM public.${table}`);
      const insert = `INSERT INTO public.${table}(respuesta_hash) VALUES ($1) ON CONFLICT(respuesta_hash) DO NOTHING`;
      await db.query(insert,['b'.repeat(64)]);
      await db.query(insert,['b'.repeat(64)]);
      assert.equal((await db.query(`SELECT count(*)::int AS n FROM public.${table} WHERE respuesta_hash=$1`,['b'.repeat(64)])).rows[0].n,1);
    }
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.encuesta_titulados WHERE edad='historico'")).rows[0].n,1);
  } finally { await db.close(); }
});

test('borrado: errores utiles sin mostrar SQL, datos personales ni credenciales', () => {
  assert.match(resetErrorMessage({code:'21000',message:'DELETE requires a WHERE clause'}),/BORRADO-FILTRO/);
  assert.doesNotMatch(resetErrorMessage({code:'21000',message:'other cardinality error'}),/BORRADO-FILTRO/);
  for(const code of ['PGRST202','PGRST203','42883','42P01','42703','42501','23503','55P03','57014','40P01','P0001']) {
    const result=resetErrorMessage({code,message:'secreto token SQL correo@example.test',details:'datos personales'});
    assert.ok(result.includes(code));assert.doesNotMatch(result,/secreto|token|correo@example|datos personales/);
  }
  assert.doesNotMatch(resetErrorMessage({code:'token-secreto',message:'SQL privado'}),/token-secreto|SQL privado/);
  assert.match(resetErrorMessage(new Error('conexion con token-secreto')),/No se pudo confirmar/);
});

test('borrado: valida resultado antes de anunciar exito', () => {
  assert.deepEqual(resetResult({titulados:148,empleadores:53}),{titulados:148,empleadores:53});
  assert.deepEqual(resetResult({titulados:0,empleadores:0}),{titulados:0,empleadores:0});
  for(const result of [null,{},[],{titulados:'148',empleadores:53},{titulados:-1,empleadores:1},{titulados:1.2,empleadores:0},{titulados:1,empleadores:Infinity}]) assert.equal(resetResult(result),null);
});

test('acceso: verifica usuario y permiso; rechaza anonimos, metadatos manipulados y errores', async () => {
  let checked = 0;
  const client = (user, permission, userError = null, permissionError = null) => ({
    auth: { getUser: async () => ({data:{user},error:userError}) },
    rpc: async name => { assert.equal(name,'es_administrador');checked++;return {data:permission,error:permissionError}; },
  });
  assert.equal((await inspectAdminAccess(client(null,true))).status,'anonymous');
  assert.equal(checked,0);
  const forged={id:'user',user_metadata:{role:'admin',administrador:true}};
  assert.equal((await inspectAdminAccess(client(forged,false))).status,'forbidden');
  assert.equal((await inspectAdminAccess(client(forged,'true'))).status,'forbidden');
  assert.equal((await inspectAdminAccess(client(forged,true,null,{code:'PGRST202'}))).status,'unavailable');
  assert.equal((await inspectAdminAccess(client(null,true,{status:401}))).status,'anonymous');
  assert.equal((await inspectAdminAccess(client(null,true,{status:503}))).status,'unavailable');
  assert.equal((await inspectAdminAccess({auth:{getUser:async()=>{throw Error('red');}}})).status,'unavailable');
  assert.equal((await inspectAdminAccess(client({id:'admin'},true))).status,'admin');
});

test('login: solo permite destinos internos conocidos', () => {
  for(const destination of ['/dashboard','/upload','/administracion']) assert.equal(loginDestination(destination),destination);
  for(const destination of ['https://evil.example','//evil.example','/\\evil.example','/dashboard?next=https://evil.example','javascript:alert(1)',null,{},'']) assert.equal(loginDestination(destination),'/upload');
  assert.equal(DEFAULT_ADMIN_PATH,'/upload');
  assert.deepEqual(adminNavigation.map(item=>item.href),['/upload','/dashboard','/administracion']);
  assert.equal(isWorkspacePath('/'),false);
  assert.equal(isWorkspacePath('/login'),false);
  assert.equal(isWorkspacePath('/dashboard'),true);
  assert.equal(isWorkspacePath('/dashboard/reportes'),true);
  assert.equal(isWorkspacePath('/dashboard-falso'),false);
});

test('PostgreSQL: politicas, activacion, revocacion y borrado atomico con auditoria', { timeout:120000 }, async () => {
  const db = new PGlite();
  const admin='11111111-1111-4111-8111-111111111111';
  const other='22222222-2222-4222-8222-222222222222';
  const permissionDenied=error=>error.code==='42501';
  const identity=async(role,uid='')=>{
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[uid]);
    await db.exec(`SET ROLE ${role}`);
  };
  try {
    await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id UUID PRIMARY KEY,email TEXT UNIQUE,email_confirmed_at TIMESTAMPTZ);
      CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      GRANT USAGE ON SCHEMA auth,public TO anon,authenticated;
      INSERT INTO auth.users VALUES ('${admin}','admin_umss2026@gmail.com',now()),('${other}','sinpermiso@example.test',now());`);
    await db.exec(fs.readFileSync('scripts/mejorar_base_datos.sql','utf8'));
    await db.exec(fs.readFileSync('scripts/habilitar_carga_validada.sql','utf8'));
    await db.exec(`INSERT INTO public.encuesta_titulados(edad,respuesta_hash) VALUES ('test','${'a'.repeat(64)}');
      INSERT INTO public.encuesta_empleadores(nombre_empresa) VALUES ('fixture');
      CREATE POLICY legado_abierto ON public.encuesta_titulados FOR ALL TO anon USING(true) WITH CHECK(true);
      GRANT ALL ON public.encuesta_titulados TO anon;`);
    const migration=fs.readFileSync('scripts/configurar_acceso_administrador.sql','utf8');
    await db.exec(migration);
    await db.exec(migration);
    const correction=fs.readFileSync('scripts/corregir_borrado_administrador.sql','utf8');
    await db.exec(correction);
    await db.exec(correction);
    await db.exec(fs.readFileSync('scripts/diagnosticar_borrado_administrador.sql','utf8'));
    await db.exec(fs.readFileSync('scripts/activar_administrador.sql','utf8'));
    await db.exec(fs.readFileSync('scripts/activar_administrador.sql','utf8'));
    const policy=await db.query("SELECT policyname FROM pg_policies WHERE tablename='encuesta_titulados'");
    assert.equal(policy.rows.some(r=>r.policyname==='legado_abierto'),false);
    assert.equal((await db.query('SELECT count(*)::int n FROM public.encuesta_titulados')).rows[0].n,1);
    await identity('anon');
    await assert.rejects(db.query('SELECT * FROM public.encuesta_titulados'),permissionDenied);
    await assert.rejects(db.query('SELECT public.es_administrador()'),permissionDenied);
    await assert.rejects(db.query('SELECT public.vaciar_encuestas_administrador()'),permissionDenied);
    await identity('authenticated',other);
    assert.equal((await db.query('SELECT public.es_administrador() allowed')).rows[0].allowed,false);
    assert.equal((await db.query('SELECT * FROM public.encuesta_titulados')).rows.length,0);
    await assert.rejects(db.query("INSERT INTO public.encuesta_titulados(edad) VALUES('test')"),permissionDenied);
    await assert.rejects(db.query('SELECT * FROM public.administradores_sistema'),permissionDenied);
    await assert.rejects(db.query(`INSERT INTO public.administradores_sistema(usuario_id) VALUES('${other}')`),permissionDenied);
    await assert.rejects(db.query('SELECT public.vaciar_encuestas_administrador()'),permissionDenied);
    await identity('authenticated',admin);
    assert.equal((await db.query('SELECT public.es_administrador() allowed')).rows[0].allowed,true);
    assert.equal((await db.query('SELECT * FROM public.encuesta_titulados')).rows.length,1);
    await db.query("INSERT INTO public.encuesta_titulados(edad,respuesta_hash) VALUES('test',$1)",['b'.repeat(64)]);
    await db.query("INSERT INTO public.encuesta_titulados(edad,respuesta_hash) VALUES('test',$1) ON CONFLICT(respuesta_hash) DO NOTHING",['b'.repeat(64)]);
    await assert.rejects(db.query('DELETE FROM public.encuesta_titulados'),permissionDenied);
    await assert.rejects(db.query("INSERT INTO public.administracion_eventos(accion,detalle) VALUES('borrado_encuestas','{}')"),permissionDenied);
    const cleared=(await db.query('SELECT public.vaciar_encuestas_administrador() result')).rows[0].result;
    assert.deepEqual(cleared,{titulados:2,empleadores:1});
    assert.equal((await db.query('SELECT * FROM public.encuesta_titulados')).rows.length,0);
    assert.equal((await db.query('SELECT * FROM public.encuesta_empleadores')).rows.length,0);
    const audit=(await db.query('SELECT usuario_id,detalle FROM public.administracion_eventos')).rows;
    assert.equal(audit.length,1);assert.equal(audit[0].usuario_id,admin);assert.deepEqual(audit[0].detalle,cleared);
    await db.exec('RESET ROLE');
    await db.exec(`INSERT INTO public.encuesta_titulados(edad) VALUES('test'); INSERT INTO public.encuesta_empleadores(nombre_empresa) VALUES('fixture');
      CREATE FUNCTION public.fallo_prueba() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'fallo inducido'; END$$;
      CREATE TRIGGER fallo_prueba BEFORE DELETE ON public.encuesta_empleadores FOR EACH STATEMENT EXECUTE FUNCTION public.fallo_prueba();`);
    await identity('authenticated',admin);
    await assert.rejects(db.query('SELECT public.vaciar_encuestas_administrador()'),/fallo inducido/);
    assert.equal((await db.query('SELECT * FROM public.encuesta_titulados')).rows.length,1);
    assert.equal((await db.query('SELECT * FROM public.encuesta_empleadores')).rows.length,1);
    assert.equal((await db.query('SELECT * FROM public.administracion_eventos')).rows.length,1);
    await db.exec('RESET ROLE');
    await db.query('UPDATE public.administradores_sistema SET habilitado=false WHERE usuario_id=$1',[admin]);
    await identity('authenticated',admin);
    assert.equal((await db.query('SELECT public.es_administrador() allowed')).rows[0].allowed,false);
    assert.equal((await db.query('SELECT * FROM public.encuesta_titulados')).rows.length,0);
    await assert.rejects(db.query('SELECT public.vaciar_encuestas_administrador()'),permissionDenied);
  } finally { await db.close(); }
});
