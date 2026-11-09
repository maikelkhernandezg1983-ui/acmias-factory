import { catalogoBase } from './catalogo';
import { lineaDesde } from './logica';
import type { EstadoFerreteria, Presupuesto } from './tipos';

export const VERSION_FERRETERIA = 1;

const U = (id: string, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
export const FOTO_PORTADA_FER = U('photo-1514443031610-8c063c7a9822');

/** Lista de muestra de la escena principal (BRD 06), tal como la escribiría un plomero. */
export const LISTA_MUESTRA = '3 caños de 50\n6 codos\n1 pegamento\n20 m cable 2,5';

/** Ferretería El Tornillo Feliz: ~3.000 productos generados, clientes y presupuestos de ejemplo. */
export function crearEstadoFerreteria(moneda: string, ahora = Date.now()): EstadoFerreteria {
  const cat = catalogoBase(moneda);
  const de = (familia: string, medida?: string, extra?: string) =>
    cat.find((p) => p.familia === familia && p.linea === 'Estándar' && (!medida || p.medida === medida) && (!extra || p.variante === extra))!;
  const dia = 86_400_000;
  const descuentos = { paso: 0, profesional: 12, constructora: 18 };
  const pres = (numero: number, dias: number, clienteId: string | null, tipo: Presupuesto['tipo'], estado: Presupuesto['estado'], items: [ReturnType<typeof de>, string, number][], origen: Presupuesto['origen']): Presupuesto => ({
    id: `pr${numero}`,
    numero,
    fecha: new Date(ahora - dias * dia).toISOString(),
    clienteId,
    tipo,
    lineas: items.map(([p, u, c]) => lineaDesde(p, u, c, descuentos[tipo])),
    estado,
    origen,
    validezDias: 7,
    ...(estado === 'vendido' ? { vendido: new Date(ahora - (dias - 1) * dia).toISOString() } : {}),
    ejemplo: true,
  });
  return {
    version: VERSION_FERRETERIA,
    rubro: 'ferreteria',
    precios: {},
    stock: {},
    aprendidos: {},
    palabras: { chicote: 'flexible', cañito: 'caño' },
    descuentos,
    clientes: [
      { id: 'cl1', nombre: 'Juan Pérez', oficio: 'Plomero', tipo: 'profesional', whatsapp: '5491155530011', ejemplo: true },
      { id: 'cl2', nombre: 'Constructora Del Sur', oficio: 'Constructora', tipo: 'constructora', whatsapp: '5491155530022', ejemplo: true },
      { id: 'cl3', nombre: 'Marta Ibáñez', oficio: 'Electricista', tipo: 'profesional', whatsapp: '5491155530033', ejemplo: true },
    ],
    presupuestos: [
      pres(1041, 12, 'cl1', 'profesional', 'vendido', [[de('pvc', '110 mm'), 'tira', 4], [de('codo90', '110 mm'), 'u', 6], [de('pegpvc', '250 cc'), 'u', 1]], 'lista'),
      pres(1042, 9, 'cl2', 'constructora', 'vendido', [[de('cemento', '50 kg'), 'u', 30], [de('cal', '25 kg'), 'u', 20]], 'mostrador'),
      pres(1043, 5, 'cl1', 'profesional', 'abierto', [[de('termo', '20 mm'), 'tira', 6], [de('codotf', '20 mm'), 'u', 12], [de('llavepaso', '1/2"'), 'u', 2], [de('teflon', '12 mm x 10 m'), 'u', 3]], 'lista'),
      pres(1044, 2, 'cl3', 'profesional', 'abierto', [[de('cable', '2,5 mm²', 'Rojo'), 'rollo', 1], [de('cable', '2,5 mm²', 'Celeste'), 'rollo', 1], [de('termica', '20 A', '2 polos'), 'u', 3]], 'lista'),
      pres(1045, 1, null, 'paso', 'abierto', [[de('latexint', '4 L', 'Blanco'), 'u', 2], [de('rodillo', '22 cm', 'Lana'), 'u', 1]], 'web'),
    ],
    proximoNumero: 1046,
    proveedor: { nombre: 'Distribuidora Ferretera Norte', whatsapp: '5491155550098' },
  };
}
