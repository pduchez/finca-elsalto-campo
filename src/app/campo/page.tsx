import BotonGrande from "@/components/BotonGrande";

// Home de Emerson: plan del día (offline) + botón REGISTRAR + accesos.
// TODO (Paso 3): el plan del día se lee de IndexedDB (cacheado la noche anterior).
export default function CampoHome() {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-2xl font-extrabold text-finca-900 mb-3">
          Plan de hoy
        </h1>
        <div className="tarjeta text-finca-700">
          {/* Placeholder: se llena con el plan cacheado (Paso 3 / Paso 7). */}
          <p className="text-lg">
            Aún no hay plan cargado para hoy. Podés registrar lo que hagas de
            todos modos.
          </p>
        </div>
      </section>

      <BotonGrande href="/campo/registrar" className="text-2xl py-8">
        🎤 REGISTRAR
      </BotonGrande>

      <div className="grid grid-cols-1 gap-4">
        <BotonGrande href="/campo/asistencia" variante="secundario">
          👷 Asistencia
        </BotonGrande>
        <BotonGrande href="/campo/destajo" variante="secundario">
          💵 Tarea por destajo
        </BotonGrande>
        <BotonGrande href="/campo/protocolos" variante="secundario">
          📖 Protocolos
        </BotonGrande>
      </div>
    </div>
  );
}
