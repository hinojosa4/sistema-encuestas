// app/page.tsx
import Link from 'next/link';
import { UploadCloud, BarChart3, GraduationCap, Building2, CheckCircle, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Banner Principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 mb-10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-umss-azul via-umss-rojo to-umss-azul"></div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-umss-azulClaro text-umss-azul mb-4">
          Acreditación Internacional ARCUSUR
        </span>

        <h1 className="text-3xl md:text-5xl font-extrabold text-umss-azul tracking-tight mb-4">
          Estudio de Mercado y Empleabilidad
        </h1>
        <h2 className="text-lg md:text-xl text-slate-600 font-medium max-w-3xl mx-auto mb-8">
          Carrera de Ingeniería de Sistemas · Universidad Mayor de San Simón
        </h2>

        <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          Plataforma analítica para la recolección, limpieza computacional y modelado estadístico
          del perfil laboral de titulados y demandas del sector productivo.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/upload"
            className="inline-flex items-center justify-center gap-2 bg-umss-azul hover:bg-blue-900 text-white font-semibold px-6 py-3 rounded-xl shadow-md transition-all hover:scale-[1.02]"
          >
            <UploadCloud className="h-5 w-5 text-umss-rojo" />
            Cargar Datos (Excel / CSV)
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-umss-azul font-semibold px-6 py-3 rounded-xl border-2 border-umss-azul shadow-sm transition-all hover:scale-[1.02]"
          >
            <BarChart3 className="h-5 w-5 text-umss-azul" />
            Ver Dashboard Analítico
          </Link>
        </div>
      </div>

      {/* Tarjetas de Ejes de Análisis (ARCUSUR) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="h-12 w-12 rounded-lg bg-blue-50 text-umss-azul flex items-center justify-center mb-4">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              Encuesta a Titulados de Grado
            </h3>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Analiza la antigüedad de egreso, tasa de inserción laboral temprana, áreas prioritarias de formación continua (IA, Ciberseguridad, Software) y mecanismos de financiamiento.
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                Estadísticos descriptivos (media y desviación estándar de antigüedad)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                Prueba Chi-cuadrada (Posgrado vs. Financiamiento)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                Materias con mayor y menor ventaja competitiva
              </li>
            </ul>
          </div>
          <Link
            href="/upload"
            className="text-xs font-bold text-umss-azul hover:text-umss-rojo flex items-center gap-1 mt-auto"
          >
            Importar datos de titulados <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="h-12 w-12 rounded-lg bg-red-50 text-umss-rojo flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              Encuesta a Sector Empleador
            </h3>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Recoge la percepción del mercado empresarial público y privado respecto a la pertinencia curricular, demanda de perfiles y evaluación en escala Likert.
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                Diagrama de Radar de competencias profesionales
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                Proyección de contratación para los próximos años
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                Mapeo de tecnologías y herramientas emergentes
              </li>
            </ul>
          </div>
          <Link
            href="/upload"
            className="text-xs font-bold text-umss-azul hover:text-umss-rojo flex items-center gap-1 mt-auto"
          >
            Importar datos de empleadores <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}