import { test, expect } from '@playwright/test';
import { catalogoBase } from '@/lib/rubros/ferreteria/catalogo';
import { buscar, leerLista, problema, unidadElegida } from '@/lib/rubros/ferreteria/logica';

// Lógica pura: corre una sola vez (no depende del tamaño de pantalla).
test.beforeEach(({}, info) => test.skip(info.project.name !== 'escritorio', 'Solo lógica'));

const lista = catalogoBase('ARS');
const vacio = { aprendidos: {}, palabras: {} };

/** FER-17: 15 listas de muestra con el resultado esperado de cada renglón. */
const MUESTRAS: { lista: string; esperado: [cantidad: number, unidad: string | null, contiene: string | null][] }[] = [
  { lista: '3 caños de 50\n6 codos\n1 pegamento\n20 m cable 2,5', esperado: [[3, 'tira', 'Caño PVC desagüe 50 mm'], [6, 'u', null], [1, 'u', 'Pegamento para PVC 125 cc'], [20, 'm', 'Cable unipolar 2,5 mm² Rojo']] },
  { lista: '2 tiras tubo 110\n4 codos 90 de 110', esperado: [[2, 'tira', 'Caño PVC desagüe 110 mm'], [4, 'u', 'Codo PVC 90° 110 mm']] },
  { lista: '10 m caño pvc 40', esperado: [[10, 'm', 'Caño PVC desagüe 40 mm']] },
  { lista: '1 rollo cable 1,5 celeste', esperado: [[1, 'rollo', 'Cable unipolar 1,5 mm² Celeste']] },
  { lista: '2 termicas 20', esperado: [[2, 'u', 'Llave térmica 20 A 2 polos']] },
  { lista: '1 caja autoperforante 8x1/2 fresada', esperado: [[1, 'caja', 'Tornillo autoperforante 8x1/2 Cabeza fresada']] },
  { lista: '50 tacos del 8', esperado: [[50, 'u', 'Tarugo de nylon N.º 8 Común']] },
  { lista: '2 latex blanco 4 litros interior', esperado: [[2, 'u', 'Látex interior 4 L Blanco']] },
  { lista: '3 focos 9w', esperado: [[3, 'u', 'Lámpara LED 9 W Luz fría']] },
  { lista: '- 1 teflon\n- 2 cueritos 1/2', esperado: [[1, 'u', 'Cinta de teflón 12 mm x 10 m'], [2, 'u', 'Cuerito para canilla 1/2"']] },
  { lista: '6 tiras termofusion 20\n12 codos termofusion 20', esperado: [[6, 'tira', 'Caño termofusión agua 20 mm'], [12, 'u', 'Codo termofusión 90° 20 mm']] },
  { lista: '1 rodillo\n1 lija 120 al agua', esperado: [[1, 'u', 'Rodillo 22 cm Lana'], [1, 'u', 'Lija grano 120 Al agua']] },
  { lista: '4 cintas aisladoras', esperado: [[4, 'u', 'Cinta aisladora 10 m Negra']] },
  { lista: '30 bolsas cemento 50 kg', esperado: [[30, 'u', 'Cemento 50 kg']] },
  { lista: 'mecha widia 6 x2', esperado: [[2, 'u', 'Mecha para pared (widia) 6 mm']] },
];

test('el catálogo tiene unos 3.000 productos y la búsqueda tarda menos de 300 ms', () => {
  expect(lista.length).toBeGreaterThan(2900);
  const t0 = performance.now();
  const r = buscar(lista, 'tubo de 2');
  expect(performance.now() - t0).toBeLessThan(300);
  expect(r[0].nombre).toBe('Caño PVC desagüe 50 mm');
});

test('sinónimos: "caño", "tubo" y "PVC 2" encuentran lo mismo (FER-03)', () => {
  const a = buscar(lista, 'caño de 50')[0];
  expect(buscar(lista, 'tubo de 2')[0].id).toBe(a.id);
  expect(buscar(lista, 'pvc 2')[0].id).toBe(a.id);
  expect(buscar(lista, 'Tubo 2"')[0].id).toBe(a.id);
  expect(problema('se me pierde la canilla del patio')?.familias).toContain('cuerito');
});

for (const [i, m] of MUESTRAS.entries()) {
  test(`lista de muestra ${i + 1}: ${m.lista.replace(/\n/g, ' / ')}`, () => {
    const r = leerLista(m.lista, lista, vacio);
    expect(r).toHaveLength(m.esperado.length);
    m.esperado.forEach(([cant, uni, nombre], j) => {
      expect(r[j].cantidad).toBe(cant);
      if (nombre === null) {
        expect(r[j].confianza).toBe('baja');
        expect(r[j].opciones.length).toBeGreaterThan(1);
      } else {
        expect(r[j].confianza, r[j].original).toBe('alta');
        expect(r[j].elegido?.nombre).toBe(nombre);
        expect(r[j].elegido?.linea).toBe('Estándar');
      }
      if (uni && r[j].elegido) expect(unidadElegida(r[j].elegido!, r[j]), r[j].original).toBe(uni);
    });
  });
}

test('lo que elige el vendedor queda aprendido (FER-06)', () => {
  const r = leerLista('6 codos', lista, vacio);
  expect(r[0].confianza).toBe('baja');
  const elegido = r[0].opciones[0];
  const r2 = leerLista('6 codos', lista, { aprendidos: { codo: elegido.id }, palabras: {} });
  expect(r2[0].confianza).toBe('alta');
  expect(r2[0].aprendido).toBe(true);
});
