import { test, expect, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Martes 10 de noviembre de 2026, 11:00. Las cuotas vencen el día 10 a las 23:59.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 10, 11, 0));
  await page.addInitScript(() => {
    const w = window as unknown as { __wa: string[]; open: (u: string) => null };
    w.__wa = [];
    w.open = (u: string) => {
      w.__wa.push(decodeURIComponent(String(u)));
      return null;
    };
  });
});

async function ingresar(page: Page) {
  await page.goto('/');
  if (!page.url().includes('/ingresar')) return;
  await page.getByLabel('Usuario').fill('vendedor');
  await page.getByLabel('Contraseña').fill('demo1234');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((u) => u.pathname === '/');
}

async function crearDemo(page: Page, nombre = 'Estudio Ledesma') {
  await ingresar(page);
  await page.getByRole('button', { name: 'Estudio contable', exact: true }).click();
  await page.getByLabel('Nombre del negocio').fill(nombre);
  await page.getByLabel('WhatsApp del negocio').fill('54 9 11 5555 1234');
  await page.getByRole('button', { name: 'Abrir demo' }).click();
  await page.waitForURL(/\/d\//);
  return page.url().split('/d/')[1].split('#')[0].split('/')[0];
}

const ultimoWa = (page: Page) => page.evaluate(() => (window as unknown as { __wa: string[] }).__wa.at(-1) ?? '');

test('tablero: ingresos del mes, deudas y tareas a la vista', async ({ page }) => {
  const slug = await crearDemo(page);
  await expect(page.getByText('Demo ilustrativa de ACMIAS')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await page.goto(`/d/${slug}/panel`);
  await expect(page.getByRole('heading', { name: 'Noviembre 2026' })).toBeVisible();
  await expect(page.getByText('Cobrado del mes')).toBeVisible();
  await expect(page.getByText(/Deuda vencida de \d+ clientes/)).toBeVisible();
  await expect(page.getByText(/^\d+ de 47$/).first()).toBeVisible();
  await expect(page.locator('.ct-barras li')).toHaveCount(6);

  // Un pago que avisó el cliente se confirma a mano.
  const avisos = page.locator('section').filter({ hasText: 'Pagos que avisaron los clientes' }).locator('.au-leads > li');
  const antes = await avisos.count();
  expect(antes).toBeGreaterThan(0);
  await avisos.first().getByRole('button', { name: 'Confirmar pago' }).click();
  await expect(avisos).toHaveCount(antes - 1);
});

test('tareas del mes en orden: terminar avisa por WhatsApp con el costo y pasa al siguiente', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Tareas del mes/ }).click();
  const sigue = page.locator('.ct-sigue');
  const primero = ((await sigue.locator('strong').textContent()) ?? '').trim();
  expect(primero).toMatch(/^N° 27 · /);
  const nombre = primero.replace(/^N° \d+ · /, '');
  await sigue.getByRole('button', { name: 'Terminar y avisar' }).click();
  const wa = await ultimoWa(page);
  expect(wa).toContain('Estudio Ledesma');
  expect(wa).toContain('Ya terminamos tu declaración mensual de noviembre 2026');
  expect(wa).toMatch(/Honorarios del mes: \$\s?[\d.]+/);
  expect(wa).toContain('Total a pagar');
  await expect(page.getByRole('status').filter({ hasText: `${nombre}: terminada y avisada` })).toBeVisible();
  await expect(sigue.locator('strong')).toContainText('N° 28 · ');
  await expect(page.getByRole('tab', { name: /Tareas del mes \(27\/47\)/ })).toBeVisible();

  // Reabrir la deja otra vez primera en la fila.
  await page.getByRole('group', { name: 'Ver tareas' }).getByRole('button', { name: 'Terminadas' }).click();
  await page.getByRole('button', { name: `Reabrir la tarea de ${nombre}` }).click();
  await expect(sigue.locator('strong')).toContainText(`N° 27 · ${nombre}`);
});

test('clientes: el ojito muestra la clave 15 segundos y queda registrado; historial con confirmación manual', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Clientes/ }).click();
  const fila = page.locator('.ct-tabla tbody tr').first();
  await expect(fila.locator('code')).toHaveText('••••••••');
  const ojo = fila.getByRole('button', { name: /Ver la clave de/ });
  const nombre = ((await ojo.getAttribute('aria-label')) ?? '').replace('Ver la clave de ', '');
  await ojo.click();
  await expect(fila.locator('code')).not.toHaveText('••••••••');
  await expect(fila.getByRole('button', { name: `Ocultar la clave de ${nombre}` })).toHaveAttribute('aria-pressed', 'true');
  await page.clock.runFor(16_000);
  await expect(fila.locator('code')).toHaveText('••••••••');

  await page.getByRole('tab', { name: 'Ajustes' }).click();
  await expect(page.locator('.ct-accesos li').first()).toContainText(nombre);
  await expect(page.locator('.ct-accesos li').first()).toContainText('Vio la clave');

  // Buscar por usuario y abrir el historial.
  await page.getByRole('tab', { name: /Clientes/ }).click();
  await page.getByRole('group', { name: 'Filtrar por estado de pago' }).getByRole('button', { name: 'Con deuda' }).click();
  const deudor = page.locator('.ct-tabla tbody tr').first();
  await deudor.locator('.ct-link').click();
  const ficha = page.getByRole('dialog');
  await expect(ficha.getByRole('heading', { name: 'Historial de pagos' })).toBeVisible();
  const vencida = ficha.locator('.ct-meses li.vencida').first();
  const mes = ((await vencida.locator('strong').textContent()) ?? '').trim();
  const vencidasAntes = await ficha.locator('.ct-meses li.vencida').count();
  await vencida.getByRole('button', { name: /Confirmar pago/ }).click();
  await expect(ficha.getByRole('status')).toContainText(`Pago de ${mes.toLowerCase()} confirmado`);
  await expect(ficha.locator('.ct-meses li.vencida')).toHaveCount(vencidasAntes - 1);
  await expect(ficha.getByRole('link', { name: `Enviar comprobante de ${mes.toLowerCase()}` })).toHaveAttribute('href', /wa\.me/);
});

test('importación masiva: 280 clientes desde la planilla, sin duplicar los que ya estaban', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Importar' }).click();
  const descarga = page.waitForEvent('download');
  await page.getByRole('button', { name: /Descargar planilla de ejemplo/ }).click();
  const archivo = await (await descarga).path();
  await page.getByLabel('Elegir planilla de clientes').setInputFiles({ name: 'clientes-280.csv', mimeType: 'text/csv', buffer: (await import('node:fs')).readFileSync(archivo!) });
  await expect(page.getByRole('heading', { name: /Revisá antes de importar/ })).toBeVisible();
  for (const c of ['Nombre', 'Apellido', 'Usuario', 'Clave', 'WhatsApp', 'Honorario']) await expect(page.getByLabel('Columnas reconocidas').getByText(c, { exact: true })).toBeVisible();
  await expect(page.locator('.met').filter({ hasText: 'Clientes leídos' })).toContainText('280');
  await expect(page.locator('.met').filter({ hasText: 'Nuevos' })).toContainText('232');
  await page.getByRole('button', { name: 'Importar 280 clientes' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'se sumaron 232 clientes y se actualizaron 48' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Clientes (280)' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Tareas del mes \(26\/280\)/ })).toBeVisible();

  // Una planilla propia con títulos distintos y errores se valida antes de guardar.
  const otra = join(tmpdir(), `cartera-${Date.now()}.csv`);
  writeFileSync(otra, 'Apellido y nombre;CUIT;Teléfono;Cuota\nGómez Ana;20-11111111-2;11 4444 5555;$ 25.000\n;20-2222;;\nRuiz Leo;20-11111111-2;;10000\n');
  await page.getByLabel('Elegir planilla de clientes').setInputFiles(otra);
  await expect(page.locator('.met').filter({ hasText: 'Clientes leídos' })).toContainText('1');
  await expect(page.locator('.bar-err')).toContainText('Se descartan 2 filas');
  await expect(page.locator('.ct-tabla tbody tr').first()).toContainText('+5491144445555');
  await expect(page.locator('.ct-tabla tbody tr').first()).toContainText('25.000');
});

test('deudas: recordatorio con el detalle de meses y "recordar al siguiente"', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Deudas/ }).click();
  const siguiente = page.getByRole('link', { name: /Recordar al siguiente: / });
  const nombre = ((await siguiente.textContent()) ?? '').replace(/.*Recordar al siguiente: /, '').trim();
  const href = decodeURIComponent((await siguiente.getAttribute('href')) ?? '');
  expect(href).toContain('Te recordamos que tenés honorarios pendientes');
  expect(href).toMatch(/- \w+ 2026: \$/);
  expect(href).toContain('alias');
  await siguiente.evaluate((a: HTMLAnchorElement) => a.removeAttribute('target'));
  await siguiente.evaluate((a: HTMLAnchorElement) => a.addEventListener('click', (e) => e.preventDefault()));
  await siguiente.click();
  await expect(page.locator('.au-leads > li').filter({ hasText: nombre }).getByText('Recordado hoy')).toBeVisible();
  await expect(page.getByRole('link', { name: /Recordar al siguiente: / })).not.toContainText(nombre);
});

test('portal del cliente: ve su cuenta sin la clave y avisa que pagó', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.getByRole('button', { name: 'Ver mi cuenta' }).click();
  await expect(page.locator('.bar-err')).toContainText('No encontramos ese usuario');
  await page.getByRole('group', { name: 'Clientes de ejemplo' }).getByRole('button').nth(1).click();
  await expect(page.getByRole('heading', { name: 'Tenés para pagar' })).toBeVisible();
  await expect(page.getByText(/Declaración mensual de noviembre 2026/)).toBeVisible();
  await expect(page.locator('code')).toHaveCount(0);
  const ya = page.getByRole('link', { name: /Ya pagué: avisar al estudio/ });
  expect(decodeURIComponent((await ya.getAttribute('href')) ?? '')).toMatch(/Ya pagué .+: \$/);
  await ya.evaluate((a: HTMLAnchorElement) => { a.removeAttribute('target'); a.addEventListener('click', (e) => e.preventDefault()); });
  await ya.click();
  await expect(page.getByText('Avisaste que pagaste. El estudio lo confirma cuando ve la transferencia.')).toBeVisible();

  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Clientes/ }).click();
  await page.getByRole('group', { name: 'Filtrar por estado de pago' }).getByRole('button', { name: 'Avisaron que pagaron' }).click();
  await expect(page.locator('.ct-tabla tbody tr')).toHaveCount(6);
});

test('la demo de ejemplo registrada abre con su sitio', async ({ page }) => {
  await ingresar(page);
  await page.getByRole('button', { name: 'Ver demo de Estudio Contable Ribera' }).click();
  await expect(page.getByRole('heading', { name: 'Tu cuenta con el estudio' })).toBeVisible();
  const slug = page.url().split('/d/')[1].split('#')[0].split('/')[0];
  await page.goto(`/d/${slug}/sitio`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tus impuestos al día');
  await expect(page.getByRole('link', { name: /Ver mi cuenta/ })).toBeVisible();
});
