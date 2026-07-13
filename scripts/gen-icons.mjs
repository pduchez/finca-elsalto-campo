// Genera los iconos PWA (placeholder de marca) sin dependencias externas.
// Diseño: hoja de cardamomo clara sobre verde finca. Reemplazar por la marca
// definitiva cuando exista. Uso: `node scripts/gen-icons.mjs`
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

// Colores (RGB)
const VERDE_FONDO = [27, 77, 30]; // finca-700 #1b4d1e
const VERDE_HOJA = [124, 199, 116]; // hoja clara
const VENA = [240, 247, 240];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// Devuelve el color RGB del pixel (x,y) normalizado. `pad` = zona segura maskable.
function pixel(nx, ny, pad) {
  // Coordenadas centradas [-1,1]
  const x = (nx - 0.5) * 2;
  const y = (ny - 0.5) * 2;
  // Rotar 45° para inclinar la hoja
  const a = Math.PI / 4;
  const rx = x * Math.cos(a) - y * Math.sin(a);
  const ry = x * Math.sin(a) + y * Math.cos(a);
  const escala = pad ? 0.62 : 0.82; // más pequeña en maskable
  const ex = rx / (0.42 * escala);
  const ey = ry / (0.24 * escala);
  const dentro = ex * ex + ey * ey <= 1;
  if (!dentro) return VERDE_FONDO;
  // Vena central
  if (Math.abs(ry) < 0.012 && Math.abs(rx) < 0.42 * escala) return VENA;
  return VERDE_HOJA;
}

function png(size, pad) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filtro None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x / size, y / size, pad);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync(join(OUT, "icon-192.png"), png(192, false));
writeFileSync(join(OUT, "icon-512.png"), png(512, false));
writeFileSync(join(OUT, "icon-maskable-512.png"), png(512, true));
writeFileSync(join(OUT, "apple-touch-icon.png"), png(180, true));
writeFileSync(join(OUT, "favicon.png"), png(64, false));
console.log("Iconos generados en public/icons/");
