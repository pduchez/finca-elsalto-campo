// Biblioteca de protocolos offline (acceso secundario; el principal es contextual).
// TODO (Paso 8): buscador + contenido cacheado. El disparo contextual por
// keywords del audio se implementa junto con el procesamiento (Paso 5/8).
export default function ProtocolosPage() {
  return (
    <div className="tarjeta">
      <h1 className="text-xl font-extrabold mb-2">Protocolos</h1>
      <p className="text-finca-700">
        Biblioteca técnica consultable sin señal. Se construye en el Paso 8.
      </p>
    </div>
  );
}
