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

async function crearDemo(page: Page, tipo: 'Ropa y regalos' | 'Almacén' = 'Ropa y regalos', nombre = 'Lupe Moda') {
  await ingresar(page);
  await page.getByRole('button', { name: 'Tienda', exact: true }).click();
  await page.getByRole('button', { name: tipo }).click();
  await page.getByLabel('Nombre del negocio').fill(nombre);
  await page.locator('#logo').setInputFiles(LOGO);
  await expect(page.getByText('tomados del logo')).toBeVisible();
  await page.getByLabel('WhatsApp del negocio').fill('54 9 11 5555 1234');
  await page.getByRole('button', { name: 'Abrir demo' }).click();
  await page.waitForURL(/\/d\//);
  return page.url().split('/d/')[1];
}

async function stockDe(page: Page, slug: string, producto: string, variante: string) {
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Stock y entradas' }).click();
  await page.getByRole('button', { name: new RegExp(`^${producto}`) }).click();
  const fila = page.locator('tr', { hasText: variante }).first();
  return Number(await fila.locator('td').nth(2).textContent());
}

test('el cliente elige talle y color con stock real y pide por WhatsApp', async ({ page, context }) => {
  await crearDemo(page);
  await expect(page.getByText('Demo ilustrativa de ACMIAS')).toBeVisible();
  await page.getByRole('button', { name: /^Remera básica/ }).click();
  await page.getByRole('button', { name: /^Arena/ }).click();
  await expect(page.getByRole('button', { name: 'Talle XL, sin stock' })).toBeDisabled();
  await page.getByRole('button', { name: /^Negro/ }).click();
  await page.getByRole('button', { name: 'Talle M', exact: true }).click();
  await expect(page.getByText('¡Quedan 2!')).toBeVisible();
  await page.getByRole('button', { name: /^Agregar ·/ }).click();
  await page.getByRole('button', { name: 'Agregar Taza estampada al pedido' }).click();
  await page.getByRole('button', { name: /Ver pedido · 2/ }).click();
  await page.getByRole('button', { name: /^Envío/ }).click();
  await page.getByRole('button', { name: /Enviar pedido por WhatsApp/ }).click();
  await expect(page.getByText('Escribí la dirección de entrega.')).toBeVisible();
  await page.getByLabel('Dirección de entrega').fill('Belgrano 1234');
  await context.route('https://wa.me/**', (r) => r.fulfill({ status: 200, body: 'ok' }));
  const solicitud = context.waitForEvent('request', (r) => r.url().startsWith('https://wa.me/'));
  const popup = context.waitForEvent('page');
  await page.getByRole('button', { name: /Enviar pedido por WhatsApp/ }).click();
  const url = decodeURIComponent((await solicitud).url());
  (await popup).close();
  expect(url).toContain('1 × Remera básica (Talle M · Negro)');
  expect(url).toContain('1 × Taza estampada (Único)');
  expect(url).toContain('Envío a: Belgrano 1234');
  await expect(page.getByRole('status').filter({ hasText: 'Pedido enviado' })).toBeVisible();
});

test('al confirmar un pedido de WhatsApp el stock baja y aparece en movimientos', async ({ page }) => {
  const slug = await crearDemo(page);
  const antes = await stockDe(page, slug, 'Remera básica', 'Talle S · Negro');
  await page.getByRole('tab', { name: /Pedidos de WhatsApp/ }).click();
  await page.getByRole('button', { name: 'Confirmar pedido de Carla' }).click();
  await expect(page.getByText('Pedido confirmado: el stock ya se descontó.')).toBeVisible();
  await expect(page.getByText('Confirmado', { exact: true })).toBeVisible();
  expect(await stockDe(page, slug, 'Remera básica', 'Talle S · Negro')).toBe(antes - 2);
});

test('venta de mostrador en 3 toques, con código de barras y alerta de faltante', async ({ page }) => {
  const slug = await crearDemo(page);
  const antes = await stockDe(page, slug, 'Taza estampada', 'Único');
  const codigo = (await page.locator('tr', { hasText: 'Único' }).first().locator('code').textContent())!.trim();
  await page.goto(`/d/${slug}/mostrador`);
  const buscador = page.getByLabel(/Buscar producto/);
  // Lector USB: escribe el código y Enter
  await buscador.fill(codigo);
  await buscador.press('Enter');
  await expect(page.getByText('Taza estampada (Único) al ticket')).toBeVisible();
  // Variante: buscar, tocar producto, tocar variante
  await buscador.fill('remera');
  await page.getByRole('button', { name: /Remera básica/ }).click();
  await page.getByRole('group', { name: 'Variantes de Remera básica' }).getByRole('button', { name: /Talle M · Negro/ }).click();
  await page.getByRole('button', { name: 'Transferencia' }).click();
  await page.getByRole('button', { name: /^Cobrar/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Remera básica Talle M · Negro quedó en 1' })).toBeVisible();
  expect(await stockDe(page, slug, 'Taza estampada', 'Único')).toBe(antes - 1);
  await page.getByRole('tab', { name: 'Ventas' }).click();
  await expect(page.getByRole('cell', { name: 'Mostrador · transferencia' }).first()).toBeVisible();
});

test('alertas, pedido sugerido al proveedor y lo que no rota', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.goto(`/d/${slug}/panel`);
  await expect(page.locator('.alertas').getByText('Remera básica · Talle M · Negro')).toBeVisible();
  await expect(page.getByText(/Quedan 2 \(mínimo 3\)/)).toBeVisible();
  const enlace = page.getByRole('link', { name: /Enviar pedido a Textil del Sur/ });
  const href = decodeURIComponent((await enlace.getAttribute('href'))!);
  expect(href).toContain('wa.me/5491155550099');
  expect(href).toMatch(/\d+ × Remera básica \(Talle M · Negro\)/);
  await page.getByRole('button', { name: 'Recibir todo lo sugerido' }).click();
  await expect(page.getByText(/stock actualizado/)).toBeVisible();
  await expect(page.getByText('Todo en orden: nada por debajo del mínimo.')).toBeVisible();
  await page.getByRole('tab', { name: 'Ventas' }).click();
  await expect(page.getByRole('heading', { name: 'Lo más vendido de la semana' })).toBeVisible();
  const quietos = page.locator('section', { has: page.getByRole('heading', { name: 'Lo que no rota' }) });
  await expect(quietos.getByText('Gorro de lana')).toBeVisible();
  await expect(quietos.getByText('Aros de acero')).toBeVisible();
});

test('almacén: vencimientos por lote y entrada con fecha', async ({ page }) => {
  const slug = await crearDemo(page, 'Almacén', 'Almacén Don Tito');
  await page.goto(`/d/${slug}/panel`);
  const vence = page.locator('section', { has: page.getByRole('heading', { name: 'Vence pronto' }) });
  await expect(vence.getByText('Yogur bebible frutilla 1 L')).toBeVisible();
  await expect(vence.getByText(/vence en 5 días/)).toBeVisible();
  await expect(vence.getByText(/venció hace 1 día/)).toBeVisible();
  await page.getByRole('tab', { name: 'Stock y entradas' }).click();
  await page.getByRole('button', { name: /^Leche entera 1 L/ }).click();
  await page.getByLabel('Unidades que entran de Leche entera 1 L Único').fill('24');
  await page.getByLabel('Vencimiento del lote de Leche entera 1 L Único').fill('2030-01-15');
  await page.getByRole('button', { name: 'Sumar entrada de Leche entera 1 L Único' }).click();
  await expect(page.getByText('Entraron 24 de Leche entera 1 L.')).toBeVisible();
  await expect(page.locator('tr', { hasText: '24 vence 15/01' })).toBeVisible();
  // El catálogo del almacén suma productos con un toque
  await page.goto(`/d/${slug}`);
  await page.getByRole('button', { name: 'Agregar Yerba mate 1 kg al pedido' }).click();
  await expect(page.getByRole('button', { name: /Ver pedido · 1/ })).toBeVisible();
});

test('cargar planilla de tienda sin la clave de IA avisa qué falta', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Cargar planilla' }).click();
  await page.locator('input[type=file]').setInputFiles('public/ejemplos/planilla-tienda.csv');
  await expect(page.getByText(/ANTHROPIC_API_KEY/)).toBeVisible();
});

test('el sitio de la tienda muestra los destacados', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.goto(`/d/${slug}/sitio`);
  await expect(page.getByRole('heading', { name: 'Elegí tu talle y tu color, con stock real' })).toBeVisible();
  await expect(page.getByText('Taza estampada')).toBeVisible();
});
