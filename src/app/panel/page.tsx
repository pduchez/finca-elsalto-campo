// Panel del dueño (protegido). Briefing, trazabilidad, costos, avance, admin.
// TODO (Paso 7/8): auth con Supabase + las vistas de análisis. Este panel NO es
// offline-first; lo consume el dueño con señal.
export default function PanelHome() {
  return (
    <div className="min-h-full p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-extrabold text-finca-900 mb-4">
        Panel del dueño
      </h1>
      <div className="tarjeta text-finca-700">
        <p className="text-lg">
          Briefing diario, bitácora de trazabilidad, costos, avance de Emerson y
          administración. Se construye en los Pasos 7 y 8.
        </p>
      </div>
    </div>
  );
}
