// Ejecutar tras instalar @electric-sql/pglite en tmp/sql-validation.
// Todo se prueba en memoria: no utiliza .env ni accede a Supabase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('../tmp/sql-validation/node_modules/@electric-sql/pglite');
const sql = fs.readFileSync(path.join(__dirname, 'mejorar_base_datos.sql'), 'utf8') + '\n' +
  fs.readFileSync(path.join(__dirname, 'habilitar_carga_validada.sql'), 'utf8');

async function rejected(db, statement, params = []) {
  await db.query('SAVEPOINT invalid_case');
  let failed = false;
  try { await db.query(statement, params); } catch { failed = true; }
  await db.query('ROLLBACK TO SAVEPOINT invalid_case');
  assert.ok(failed, 'La entrada invalida debio ser rechazada');
}

async function main() {
  const db = new PGlite();
  try {
    await db.exec(sql);
    await db.exec(sql); // Repetir la migracion debe funcionar.
    await db.query(`INSERT INTO public.encuesta_titulados
      (edad, ha_trabajado_antes, tiempo_desempleado, raw_data)
      VALUES ('35 años o más', 'NO', 99, '{"texto":"original"}')`);
    const before = (await db.query('SELECT * FROM public.encuesta_titulados')).rows;
    await db.exec(sql);
    const after = (await db.query('SELECT * FROM public.encuesta_titulados')).rows;
    assert.deepEqual(after, before, 'La migracion no debe cambiar respuestas historicas');

    await db.query('BEGIN');
    await db.query(`INSERT INTO public.encuesta_titulados (respuesta_hash)
      VALUES ($1)`, ['b'.repeat(64)]);
    await rejected(db, `INSERT INTO public.encuesta_titulados (respuesta_hash)
      VALUES ($1)`, ['b'.repeat(64)]);
    await rejected(db, `INSERT INTO public.encuesta_titulados (respuesta_hash)
      VALUES ('no-es-una-huella')`);
    // Igual que el guardado de la app: ignorar conflictos de huella sin UPDATE.
    await db.query(`INSERT INTO public.encuesta_titulados (respuesta_hash)
      VALUES ($1) ON CONFLICT (respuesta_hash) DO NOTHING`, ['b'.repeat(64)]);
    await db.query(`INSERT INTO public.encuesta_titulados (instrumento_origen, respuesta_origen_id)
      VALUES ('form-a', '7')`);
    await rejected(db, `INSERT INTO public.encuesta_titulados (instrumento_origen, respuesta_origen_id)
      VALUES ('form-a', '7')`);
    await db.query(`INSERT INTO public.encuesta_titulados (instrumento_origen, respuesta_origen_id)
      VALUES ('form-b', '7')`);
    // Cero es valido; NULL puede corresponder a una rama omitida o unidad desconocida.
    await db.query(`INSERT INTO public.encuesta_titulados
      (anios_vida_profesional_normalizados, tiempo_desempleado_meses,
       ha_trabajado_antes, origen_emprendimiento, fila_origen)
      VALUES (0, NULL, 'NO', NULL, 2)`);
    await rejected(db, `INSERT INTO public.encuesta_titulados
      (tiempo_desempleado_meses) VALUES (-1)`);
    const countBeforeFailure = (await db.query('SELECT count(*)::int AS n FROM public.encuesta_titulados')).rows[0].n;
    await rejected(db, `INSERT INTO public.encuesta_titulados
      (tiempo_desempleado_meses) VALUES (1), (-1)`);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public.encuesta_titulados')).rows[0].n,
      countBeforeFailure, 'Un fallo debe revertir todo el lote, incluida su primera fila valida');
    await rejected(db, `INSERT INTO public.encuesta_titulados
      (tiempo_desempleado_meses) VALUES ('NaN')`);
    await rejected(db, `INSERT INTO public.encuesta_titulados
      (tiempo_desempleado_meses) VALUES ('Infinity')`);
    await rejected(db, `INSERT INTO public.encuesta_titulados
      (raw_data) VALUES ('[]')`);
    await rejected(db, `INSERT INTO public.encuesta_empleadores
      (calidad_datos) VALUES ('"texto"')`);
    await rejected(db, `INSERT INTO public.encuesta_titulados
      (fila_origen) VALUES (1)`);
    await rejected(db, `INSERT INTO public.encuesta_titulados
      (importacion_id) VALUES ('00000000-0000-0000-0000-000000000001')`);

    const payload = ['encuesta_titulados', 'fuente.xlsx', 'a'.repeat(64), 148];
    const inserted = await db.query(`INSERT INTO public.importaciones_encuestas
      (tipo_encuesta, archivo_nombre, archivo_sha256, filas_detectadas)
      VALUES ($1,$2,$3,$4) RETURNING id`, payload);
    const id = inserted.rows[0].id;
    await db.query(`INSERT INTO public.encuesta_titulados
      (importacion_id, fila_origen) VALUES ($1, 3)`, [id]);
    await rejected(db, `INSERT INTO public.encuesta_titulados
      (importacion_id, fila_origen) VALUES ($1, 3)`, [id]);
    await rejected(db, 'DELETE FROM public.importaciones_encuestas WHERE id = $1', [id]);
    await rejected(db, `UPDATE public.importaciones_encuestas
      SET filas_importadas = 149 WHERE id = $1`, [id]);
    await db.query(`UPDATE public.importaciones_encuestas
      SET estado = 'completada', filas_importadas = 148, finalizada_at = now()
      WHERE id = $1`, [id]);
    await rejected(db, `INSERT INTO public.importaciones_encuestas
      (tipo_encuesta, archivo_nombre, archivo_sha256, filas_detectadas, estado)
      VALUES ($1,$2,$3,$4,'completada')`, payload);
    // Un intento fallido se conserva aunque el mismo archivo ya tenga una carga.
    await db.query(`INSERT INTO public.importaciones_encuestas
      (tipo_encuesta, archivo_nombre, archivo_sha256, filas_detectadas, estado)
      VALUES ($1,$2,$3,$4,'fallida')`, payload);
    await db.query('ROLLBACK');

    const rls = (await db.query(`SELECT relname, relrowsecurity FROM pg_class
      WHERE oid IN ('public.encuesta_titulados'::regclass,
                    'public.encuesta_empleadores'::regclass,
                    'public.importaciones_encuestas'::regclass)`)).rows;
    assert.equal(rls.length, 3);
    assert.ok(rls.every(r => r.relrowsecurity));
    assert.equal((await db.query('SELECT count(*)::int AS n FROM pg_policies')).rows[0].n, 0,
      'La migracion no debe abrir acceso mediante politicas nuevas');
    console.log('OK: creacion, reejecucion, preservacion de registros, ramas anulables, tiempos validos, JSON, FK, duplicados de archivo y RLS.');
  } finally { await db.close(); }

  // Esquema previo: faltan las columnas nuevas; el ID existente no se reemplaza.
  const previous = new PGlite();
  try {
    const base = sql.slice(sql.indexOf('CREATE TABLE IF NOT EXISTS public.encuesta_titulados'),
      sql.indexOf('-- 2. Estas columnas'));
    await previous.exec(base);
    await previous.exec(`ALTER TABLE public.encuesta_titulados
      DROP COLUMN ha_trabajado_antes, DROP COLUMN antiguedad_trabajo_actual,
      DROP COLUMN otra_asignatura_ventaja;
      INSERT INTO public.encuesta_titulados (id, empresa_trabajo_actual)
      VALUES (50, 'registro conservado');
      CREATE POLICY politica_preexistente ON public.encuesta_titulados
      FOR SELECT USING (false);`);
    await previous.exec(sql);
    assert.deepEqual((await previous.query(`SELECT id, empresa_trabajo_actual,
      ha_trabajado_antes, antiguedad_trabajo_actual FROM public.encuesta_titulados`)).rows,
    [{id:50, empresa_trabajo_actual:'registro conservado', ha_trabajado_antes:null,
      antiguedad_trabajo_actual:null}]);
    assert.equal((await previous.query(`SELECT count(*)::int AS n FROM pg_policies
      WHERE policyname = 'politica_preexistente'`)).rows[0].n, 1);
    console.log('OK: actualizacion de tabla preexistente sin cambiar ID ni respuestas.');
  } finally { await previous.close(); }

  const plural = new PGlite();
  try {
    await plural.exec('CREATE TABLE public.encuestas_titulados (id integer)');
    await assert.rejects(plural.exec(sql), /plural/);
    await plural.exec('ROLLBACK');
    assert.equal((await plural.query("SELECT to_regclass('public.encuesta_titulados') AS tabla")).rows[0].tabla, null);
    console.log('OK: deteccion de esquema alternativo en plural y rollback.');
  } finally { await plural.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
