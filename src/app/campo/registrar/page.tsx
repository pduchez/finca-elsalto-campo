// Flujo de captura: área → actividad → audio/foto/jornales → listo.
// TODO (Paso 4): implementar selección de área (6 botones), luego actividad
// (8 botones) y la pantalla de captura (mantener para hablar, tomar foto,
// contador de jornaleros, LISTO). Guardado offline en IndexedDB (Paso 3).
export default function RegistrarPage() {
  return (
    <div className="tarjeta">
      <h1 className="text-xl font-extrabold mb-2">Registrar</h1>
      <p className="text-finca-700">
        Aquí va el flujo de captura (área, actividad, voz, foto, jornales). Se
        construye en el Paso 4.
      </p>
    </div>
  );
}
