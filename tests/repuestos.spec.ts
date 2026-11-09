import { test, expect, type Page } from '@playwright/test';

const LOGO = process.env.LOGO_PRUEBA ?? '/tmp/logo-prueba.png';

async function ingresar(page: Page) {
  await page.goto('/');
  if (!page.url().includes('/ingresar')) return;
  await page.getByLabel('Usuario').fill('vendedor');
  await page.getByLabel('Contraseña').fill('demo1234');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((u) => u.pathname === '/');
}

async function crearDemo(page: Page) {
  await ingresar(page);
  await page.getByRole('button', { name: 'Repuestos', exact: true }).click();
  await expect(page.getByLabel('Mesas')).toHaveCount(0);
  await page.getByLabel('Nombre del negocio').fill('Repuestos El Pistón');
  await page.locator('#logo').setInputFiles(LOGO);
  await expect(page.getByText('tomados del logo')).toBeVisible();
  await page.getByLabel('WhatsApp del negocio').fill('54 9 11 5555 1234');
  await page.getByRole('button', { name: 'Abrir demo' }).click();
  await page.waitForURL(/\/d\/repuestos-el-piston/);
}

async function elegirAuto(page: Page) {
  await page.getByRole('button', { name: 'Marca A', exact: true }).click();
  await page.getByRole('button', { name: /^Sedán/ }).click();
  await page.getByRole('button', { name: '2014', exact: true }).click();
  await expect(page.getByText('Marca A Sedán 1.6 nafta 2014')).toBeVisible();
}

test('el cliente elige su auto y ve solo las piezas compatibles', async ({ page }) => {
  await crearDemo(page);
  await expect(page.getByText('Demo ilustrativa de ACMIAS')).toBeVisible();
  await elegirAuto(page);
  await page.getByRole('button', { name: /^Frenos/ }).click();
  await expect(page.getByRole('heading', { name: 'Frenos que le sirven a tu auto' })).toBeVisible();
  await expect(page.locator('.pieza')).toHaveCount(4);
  await expect(page.getByText('PD-512')).toHaveCount(0);
  await page.getByLabel('Ver también las que no figuran para tu auto').check();
  await expect(page.getByText('PD-512')).toBeVisible();
  await expect(page.getByText('No figura para tu auto').first()).toBeVisible();
  // El auto queda guardado en el celular
  await page.reload();
  await expect(page.getByText('Marca A Sedán 1.6 nafta 2014')).toBeVisible();
});

test('la búsqueda por código tolera errores y encuentra OEM y equivalentes', async ({ page }) => {
  await crearDemo(page);
  const buscador = page.getByLabel(/Buscar por código/);
  await buscador.fill('FA21O');
  await expect(page.getByRole('heading', { name: /1 resultado para “FA21O”/ })).toBeVisible();
  await expect(page.locator('.pieza .cod').first()).toHaveText('FA-210');
  await buscador.fill('58101-1RA00');
  await expect(page.getByText('OEM 58101-1RA00').first()).toBeVisible();
  await buscador.fill('GDB3330');
  await expect(page.getByText('Equivale a GDB3330')).toBeVisible();
  await buscador.fill('turbo xyz');
  await expect(page.getByText('No encontramos ese código')).toBeVisible();
  await page.waitForTimeout(1500);
  await page.goto(page.url().replace(/\/?$/, '') + '/panel');
  await page.getByRole('tab', { name: 'Cotizaciones y demanda' }).click();
  await expect(page.getByText('“turbo xyz”')).toBeVisible();
});

test('la cotización llega por WhatsApp con el auto, los códigos y la cantidad', async ({ page, context }) => {
  await crearDemo(page);
  await elegirAuto(page);
  await page.getByRole('button', { name: /^Frenos/ }).click();
  await page.getByRole('button', { name: 'Sumar PD-330 a la cotización' }).click();
  await page.getByRole('button', { name: /^Discos de freno ventilados/ }).click();
  await expect(page.getByText('Confirmá la compatibilidad con el vendedor')).toBeVisible();
  await page.getByRole('button', { name: 'Sumar uno' }).click();
  await page.getByRole('button', { name: /Sumar a la cotización/ }).click();
  await page.getByRole('button', { name: /Ver cotización · 3/ }).click();
  await context.route('https://wa.me/**', (r) => r.fulfill({ status: 200, body: 'ok' }));
  const solicitud = context.waitForEvent('request', (r) => r.url().startsWith('https://wa.me/'));
  const popup = context.waitForEvent('page');
  await page.getByRole('button', { name: /Enviar cotización por WhatsApp/ }).click();
  const url = decodeURIComponent((await solicitud).url());
  (await popup).close();
  expect(url).toContain('wa.me/5491155551234');
  expect(url).toContain('Vehículo: Marca A Sedán 1.6 nafta 2014');
  expect(url).toContain('1 × Pastillas de freno delanteras · cód. PD-330');
  expect(url).toContain('2 × Discos de freno ventilados (par) · cód. DV-280');
  await expect(page.getByRole('status').filter({ hasText: 'Cotización enviada' })).toBeVisible();
});

test('el taller ve su precio y repite una cotización anterior', async ({ page }) => {
  await crearDemo(page);
  await elegirAuto(page);
  await page.getByLabel(/Buscar por código/).fill('PD-330');
  const precioLista = await page.locator('.pieza').first().locator('.pieza-precio').textContent();
  await page.getByRole('button', { name: 'Soy taller' }).click();
  await page.getByRole('button', { name: /Entrar como Taller Hermanos Ruiz/ }).click();
  await expect(page.getByRole('heading', { name: 'Cotizaciones anteriores' })).toBeVisible();
  await page.getByRole('button', { name: /Repetir cotización PD-330, DV-280, LF-500/ }).click();
  await expect(page.getByText('Precios de taller para')).toBeVisible();
  await expect(page.locator('.cot-lineas li')).toHaveCount(3);
  await page.getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.locator('.pieza').first().locator('.pieza-lista')).toContainText('Lista');
  await expect(page.locator('.pieza').first().locator('.pieza-precio')).not.toHaveText(precioLista!);
});

test('el dueño sube precios por marca con vista previa y deshacer, y suma una compatibilidad', async ({ page }) => {
  await crearDemo(page);
  await page.goto('/d/repuestos-el-piston/panel');
  await page.getByRole('tab', { name: 'Subir precios' }).click();
  await page.getByLabel('Qué piezas').selectOption('marca:Ignis');
  await page.getByLabel('Porcentaje').fill('10');
  await page.getByRole('button', { name: 'Aplicar a 5 piezas' }).click();
  await expect(page.getByText('Actualizaste 5 precios.')).toBeVisible();
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.getByText('Volviste a los precios anteriores.')).toBeVisible();
  await page.getByRole('tab', { name: 'Catálogo y stock' }).click();
  const fila = page.locator('tr', { hasText: 'BE-91' });
  await fila.getByRole('button', { name: 'Agregar compatibilidad' }).click();
  await page.getByLabel('Agregar compatibilidad a BE-91').selectOption({ label: 'Marca B Hatch 1.4 nafta 2015–2020' });
  await expect(page.getByText('BE-91 ahora figura para ese auto')).toBeVisible();
  await expect(fila.getByText('Marca B Hatch')).toBeVisible();
});

test('cargar planilla sin la clave de IA avisa qué falta', async ({ page }) => {
  await crearDemo(page);
  await page.goto('/d/repuestos-el-piston/panel');
  await page.getByRole('tab', { name: 'Cargar planilla' }).click();
  await page.locator('input[type=file]').setInputFiles('public/ejemplos/planilla-repuestos.csv');
  await expect(page.getByText(/ANTHROPIC_API_KEY/)).toBeVisible();
});

test('el sitio lleva al catálogo con el auto ya elegido', async ({ page }) => {
  await crearDemo(page);
  await page.goto('/d/repuestos-el-piston/sitio');
  await expect(page.getByRole('heading', { name: 'La pieza justa para tu auto' })).toBeVisible();
  await page.getByLabel('Vehículo').selectOption({ label: 'Marca C Pick-up 2.5 diésel' });
  await page.getByLabel('Año').selectOption('2012');
  await page.getByRole('button', { name: 'Ver piezas' }).click();
  await expect(page.getByText('Marca C Pick-up 2.5 diésel 2012')).toBeVisible();
});

test('el enlace compartido abre la demo de repuestos en otro dispositivo', async ({ page, browser, context, baseURL }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseURL });
  await crearDemo(page);
  await page.goto('/');
  await page.getByRole('button', { name: /Compartir/ }).first().click();
  await page.getByRole('button', { name: 'Copiar enlace' }).click();
  const enlace = await page.evaluate(() => navigator.clipboard.readText());
  expect(enlace).toContain('#c=');
  const otro = await browser.newContext();
  const p2 = await otro.newPage();
  await p2.goto(enlace);
  await expect(p2.getByRole('heading', { name: '¿Para qué auto buscás?' })).toBeVisible();
  await expect(p2.getByRole('heading', { name: 'Repuestos El Pistón' })).toBeVisible();
  await otro.close();
});
