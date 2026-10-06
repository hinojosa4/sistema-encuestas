// app/page.tsx
import Link from 'next/link';
import { UploadCloud, BarChart3, GraduationCap, Building2, CheckCircle, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 md:py-12">
      {/* Banner Principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-10 md:p-12 mb-8 sm:mb-10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-umss-azul via-umss-rojo to-umss-azul"></div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-blue-50 text-umss-azul mb-4 border border-blue-100">
          Acreditación Internacional ARCUSUR
        </span>

        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-umss-azul tracking-tight mb-3 sm:mb-4 leading-tight sm:leading-none">
          Estudio de Mercado y Empleabilidad
        </h1>
        <h2 className="text-base sm:text-lg md:text-xl text-slate-600 font-medium max-w-3xl mx-auto mb-6 sm:mb-8">
          Carrera de Ingeniería de Sistemas · Universidad Mayor de San Simón
        </h2>

        <p className="text-xs sm:text-sm md:text-base text-slate-600 max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed">
          Plataforma analítica para la recolección, limpieza computacional y modelado estadístico
          del perfil laboral de titulados y demandas del sector productivo.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 sm:gap-4 max-w-md sm:max-w-none mx-auto">
          <Link
            href="/upload"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-umss-azul hover:bg-blue-900 text-white font-semibold px-5 sm:px-6 py-3 rounded-xl shadow-md transition-all hover:scale-[1.02] text-sm sm:text-base"
          >
            <UploadCloud className="h-5 w-5 text-umss-rojo flex-shrink-0" />
            <span>Cargar Datos (Excel / CSV)</span>
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-umss-azul font-semibold px-5 sm:px-6 py-3 rounded-xl border-2 border-umss-azul shadow-sm transition-all hover:scale-[1.02] text-sm sm:text-base"
          >
            <BarChart3 className="h-5 w-5 text-umss-azul flex-shrink-0" />
            <span>Ver Dashboard Analítico</span>
          </Link>
        </div>
      </div>

      {/* Tarjetas de Ejes de Análisis (ARCUSUR) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
        <div className="bg-white p-5 sm:p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-blue-50 text-umss-azul flex items-center justify-center mb-4">
              <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-2">
              Encuesta a Titulados de Grado
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
              Analiza la antigüedad de egreso, tasa de inserción laboral temprana, áreas prioritarias de formación continua (IA, Ciberseguridad, Software) y mecanismos de financiamiento.
            </p>
            <ul className="text-xs text-slate-600 space-y-2 mb-6">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Estadísticos descriptivos (media y desviación estándar de antigüedad)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Prueba Chi-cuadrada (Posgrado vs. Financiamiento)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Materias con mayor y menor ventaja competitiva</span>
              </li>
            </ul>
          </div>
          <Link
            href="/upload"
            className="text-xs font-bold text-umss-azul hover:text-umss-rojo flex items-center gap-1.5 mt-auto pt-2"
          >
            <span>Importar datos de titulados</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="bg-white p-5 sm:p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-red-50 text-umss-rojo flex items-center justify-center mb-4">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-2">
              Encuesta a Sector Empleador
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
              Recoge la percepción del mercado empresarial público y privado respecto a la pertinencia curricular, demanda de perfiles y evaluación en escala Likert.
            </p>
            <ul className="text-xs text-slate-600 space-y-2 mb-6">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Diagrama de Radar de competencias profesionales</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Proyección de contratación para los próximos años</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Mapeo de tecnologías y herramientas emergentes</span>
              </li>
            </ul>
          </div>
          <Link
            href="/upload"
            className="text-xs font-bold text-umss-azul hover:text-umss-rojo flex items-center gap-1.5 mt-auto pt-2"
          >
            <span>Importar datos de empleadores</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}