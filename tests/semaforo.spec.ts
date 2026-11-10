import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 10, 11, 0));
});

async function crearDemo(page: Page, rubro: string) {
  await page.goto('/');
  if (page.url().includes('/ingresar')) {
    await page.getByLabel('Usuario').fill('vendedor');
    await page.getByLabel('Contraseña').fill('demo1234');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL((u) => u.pathname === '/');
  }
  await page.getByRole('button', { name: rubro, exact: true }).click();
  await page.getByLabel('Nombre del negocio').fill(`Semáforo ${rubro}`);
  await page.getByLabel('WhatsApp del negocio').fill('54 9 11 5555 1234');
  await page.getByRole('button', { name: 'Abrir demo' }).click();
  await page.waitForURL(/\/d\//);
  return page.url().split('/d/')[1].split('#')[0].split('/')[0];
}

const luces = (page: Page) => page.getByRole('group', { name: 'Semáforo de stock' });
const cantidad = async (page: Page, luz: 'Rojo' | 'Amarillo' | 'Verde') =>
  Number(((await luces(page).getByRole('button', { name: new RegExp(luz) }).locator('strong').textContent()) ?? '0').replace(/\D/g, ''));

async function guardarSemaforo(page: Page, rojo: string, amarillo: string) {
  await page.getByLabel(/Rojo · reponer ya, hasta/).fill(rojo);
  await page.getByLabel(/Amarillo · pedir pronto, hasta/).fill(amarillo);
  await page.getByRole('button', { name: 'Guardar semáforo' }).click();
}

test('tienda: el dueño cambia los tres colores en Ajustes y el stock se repinta', async ({ page }) => {
  const slug = await crearDemo(page, 'Tienda');
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Stock y entradas' }).click();
  const antes = { rojo: await cantidad(page, 'Rojo'), verde: await cantidad(page, 'Verde') };
  expect(antes.rojo + (await cantidad(page, 'Amarillo')) + antes.verde).toBeGreaterThan(10);

  await page.getByRole('tab', { name: 'Ajustes' }).click();
  await guardarSemaforo(page, '5', '5');
  await expect(page.getByRole('status').filter({ hasText: 'mayor que el del rojo' })).toBeVisible();
  await guardarSemaforo(page, '5', '10');
  await expect(page.locator('#sem-verde')).toHaveText('Más de 10 u.');
  await expect(page.getByRole('status').filter({ hasText: 'Semáforo guardado.' })).toBeVisible();

  await page.reload();
  await page.getByRole('tab', { name: 'Ajustes' }).click();
  await expect(page.getByLabel(/Rojo · reponer ya, hasta/)).toHaveValue('5');
  await page.getByRole('tab', { name: 'Stock y entradas' }).click();
  expect(await cantidad(page, 'Rojo')).toBeGreaterThan(antes.rojo);
  expect(await cantidad(page, 'Verde')).toBeLessThan(antes.verde);

  // Filtrar por rojo deja solo productos con alguna variante en rojo.
  await luces(page).getByRole('button', { name: /Rojo/ }).click();
  await expect(luces(page).getByRole('button', { name: /Rojo/ })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.stock-cab').first().click();
  await expect(page.locator('.d-tabla .sem-luz.rojo').first()).toBeVisible();
  for (const t of await page.locator('.d-tabla tbody tr td:nth-child(3) strong').allTextContents()) expect(Number(t)).toBeGreaterThanOrEqual(0);
});

test('ferretería: tocar una luz lista los productos de ese color', async ({ page }) => {
  const slug = await crearDemo(page, 'Ferretería');
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Stock y reposición/ }).click();
  await expect(page.getByRole('heading', { name: 'Stock bajo el mínimo' })).toBeVisible();
  await luces(page).getByRole('button', { name: /Rojo/ }).click();
  await expect(page.getByRole('heading', { name: /Stock en rojo · De 0 a 3 u\./ })).toBeVisible();
  const filas = page.locator('.d-tabla tbody tr');
  await expect(filas.first()).toBeVisible();
  for (const t of await filas.locator('.sem-luz').allTextContents()) expect(t).toBe('Rojo');

  await page.getByRole('tab', { name: 'Ajustes' }).click();
  await guardarSemaforo(page, '0', '2');
  await page.getByRole('tab', { name: /Stock y reposición/ }).click();
  await luces(page).getByRole('button', { name: /Rojo/ }).click();
  await expect(page.getByRole('heading', { name: /Stock en rojo · Sin stock \(0 u\.\)/ })).toBeVisible();
  for (const t of await filas.locator('td:nth-child(2)').allTextContents()) expect(t).toMatch(/^0 /);
});

test('repuestos: el semáforo filtra el catálogo sin cambiar lo que ve el cliente', async ({ page }) => {
  const slug = await crearDemo(page, 'Repuestos');
  await page.goto(`/d/${slug}/panel`);
  const total = (await cantidad(page, 'Rojo')) + (await cantidad(page, 'Amarillo')) + (await cantidad(page, 'Verde'));
  await luces(page).getByRole('button', { name: /Verde/ }).click();
  const verdes = page.locator('.d-tabla tbody tr');
  await expect(verdes.first()).toBeVisible();
  for (const v of await page.getByLabel(/^Stock de /).evaluateAll((els) => els.map((e) => Number((e as HTMLInputElement).value)))) expect(v).toBeGreaterThan(5);

  await page.getByRole('tab', { name: 'Ajustes' }).click();
  await guardarSemaforo(page, '10', '20');
  await page.getByRole('tab', { name: 'Catálogo y stock' }).click();
  expect((await cantidad(page, 'Rojo')) + (await cantidad(page, 'Amarillo')) + (await cantidad(page, 'Verde'))).toBe(total);
  await luces(page).getByRole('button', { name: /Rojo/ }).click();
  for (const v of await page.getByLabel(/^Stock de /).evaluateAll((els) => els.map((e) => Number((e as HTMLInputElement).value)))) expect(v).toBeLessThanOrEqual(10);
  // Lo que se muestra al cliente sigue con su propia regla.
  await expect(page.locator('.d-tabla .stock.disponible').first()).toBeVisible();
});
