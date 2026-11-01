// Solo lectura de fuentes; nunca conecta a Supabase. No imprime datos personales.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const X = require('xlsx');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, f);
const p = require('../lib/importPipeline.ts');
const { graduateFieldLabels, employerFieldLabels } = require('../lib/surveyFields.ts');
const directory = process.argv[2] || 'datos';
const headers = {};
for (const name of fs.readdirSync(directory).filter(n => n.startsWith('ENCUESTA') && n.endsWith('.xlsx'))) {
  const book = X.readFile(path.join(directory, name));
  const rows = X.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: '' });
  const type = name.includes('EMPLEADORES') ? 'encuesta_empleadores' : 'encuesta_titulados';
  const result = p.inspectRows(rows, type);
  headers[type] ??= {};
  for (const h of Object.keys(rows[0] || {})) {
    const original = p.prepareRow({ [h]: '' }, type).respuestas_originales;
    for (const field of Object.keys(original)) {
      headers[type][field] ??= [];
      if (!headers[type][field].includes(h)) headers[type][field].push(h);
    }
  }
  const labels = type === 'encuesta_titulados' ? graduateFieldLabels : employerFieldLabels;
  const safe = Object.fromEntries(Object.keys(labels).filter(k => !/nombre|correo|contacto|empresa|linkedin/.test(k))
    .filter(k => ['tipo_organizacion', 'ha_contratado_sistemas', 'ha_realizado_posgrado', 'interes_futuro_posgrado'].includes(k))
    .map(k => [k, result.rows.reduce((s, r) => { s[r[k] ?? 'Sin respuesta'] = (s[r[k] ?? 'Sin respuesta'] || 0) + 1; return s; }, {})]));
  console.log(JSON.stringify({ archivo: name, filas: rows.length, preparadas: result.rows.length,
    reconocidas: result.recognizedFields, errores: result.errors, controles: safe }));
}
if (process.argv.includes('--headers')) fs.writeFileSync(path.join(__dirname, '../lib/surveyHeaders.json'), JSON.stringify(headers, null, 2) + '\n');
