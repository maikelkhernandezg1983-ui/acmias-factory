import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 9, 11, 0));
});

async function ingresar(page: Page) {
  await page.goto('/');
  if (!page.url().includes('/ingresar')) return;
  await page.getByLabel('Usuario').fill('vendedor');
  await page.getByLabel('Contraseña').fill('demo1234');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((u) => u.pathname === '/');
}

async function crearDemo(page: Page, nombre = 'Ferretería Norte') {
  await ingresar(page);
  const chip = page.getByRole('button', { name: 'Ferretería', exact: true });
  // Reintenta si el clic llegó antes de que la página terminara de cargar.
  await expect(async () => {
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 });
  }).toPass();
  await page.getByLabel('Nombre del negocio').fill(nombre);
  await page.getByLabel('WhatsApp del negocio').fill('54 9 11 5555 1234');
  await page.getByRole('button', { name: 'Abrir demo' }).click();
  await page.waitForURL(/\/d\//);
  return page.url().split('/d/')[1];
}

test('el cliente busca con sus palabras, ve la unidad clara y los complementos', async ({ page }) => {
  await crearDemo(page);
  await expect(page.getByText('Demo ilustrativa de ACMIAS')).toBeVisible();
  await page.getByLabel('Buscar productos').fill('tubo de 2');
  await page.getByRole('button', { name: /^Caño PVC desagüe 50 mm Estándar/ }).click();
  const ficha = page.getByRole('dialog');
  await expect(ficha.getByRole('button', { name: /^Por metro/ })).toBeVisible();
  await ficha.getByRole('button', { name: /^Por tira x 4 m/ }).click();
  await expect(ficha.locator('.fer-ficha-precio')).toContainText('por tira x 4 m');
  await expect(ficha.getByText('Con esto se suele llevar')).toBeVisible();
  await expect(ficha.getByRole('button', { name: /Pegamento para PVC/ })).toBeVisible();
  await ficha.getByRole('button', { name: /^Sumar al pedido/ }).click();
  await expect(page.getByRole('button', { name: /Ver pedido · 1/ })).toBeVisible();

  // Búsqueda por problema.
  await page.getByLabel('Buscar productos').fill('pierde la canilla');
  await expect(page.getByText('Canilla que gotea')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Cuerito para canilla/ }).first()).toBeVisible();
});

test('cotizador: la lista de ejemplo se arma, la línea dudosa se elige y queda aprendida', async ({ page }) => {
  const slug = await crearDemo(page, 'Ferretería Sur');
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('button', { name: 'Probar con la lista de ejemplo' }).click();
  const lineas = page.locator('.fer-linea');
  await expect(lineas).toHaveCount(4);
  await expect(page.locator('.fer-linea.dudosa')).toHaveCount(1);
  await expect(page.locator('.fer-linea.dudosa')).toContainText('"6 codos"');
  await expect(page.getByRole('button', { name: 'Guardar y enviar por WhatsApp' })).toBeDisabled();

  await page.locator('.fer-linea.dudosa').getByRole('button', { name: /^Codo PVC 90° 50 mm/ }).click();
  await expect(page.getByText(/Aprendido: cuando pidan "codos"/)).toBeVisible();
  await expect(page.locator('.fer-linea.dudosa')).toHaveCount(0);

  // Precio profesional aplicado solo.
  const totalPaso = await page.locator('.fer-total strong').textContent();
  await page.getByRole('combobox', { name: 'Cliente', exact: true }).selectOption({ label: 'Juan Pérez · Profesional (−12 %)' });
  await expect(page.locator('.fer-total')).toContainText('precio profesional (−12 %)');
  expect(await page.locator('.fer-total strong').textContent()).not.toBe(totalPaso);

  await page.getByRole('button', { name: 'Solo guardar' }).click();
  await page.getByRole('link', { name: 'Ver PDF con la marca' }).click();
  await expect(page.getByText('Presupuesto N.º 1046')).toBeVisible();
  await expect(page.getByText(/Sujeto a disponibilidad/)).toBeVisible();
  await expect(page.getByText('Pedido como: "3 caños de 50"')).toBeVisible();

  // La segunda vez, "6 codos" ya sale solo.
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('button', { name: 'Probar con la lista de ejemplo' }).click();
  await expect(page.locator('.fer-linea.dudosa')).toHaveCount(0);
  await expect(page.locator('.fer-linea', { hasText: '"6 codos"' })).toContainText('Aprendido');
  await page.getByRole('tab', { name: 'Sinónimos' }).click();
  await expect(page.getByText('"codo"')).toBeVisible();
});

test('presupuestos: recordar por WhatsApp y convertir en venta descuenta stock', async ({ page }) => {
  const slug = await crearDemo(page, 'Ferretería Este');
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Presupuestos/ }).click();
  const fila = page.locator('.fer-pres li', { hasText: 'N.º 1043' });
  await expect(fila).toContainText('Enviado hace 5 días');
  const wa = await fila.getByRole('link', { name: 'Recordar' }).getAttribute('href');
  expect(decodeURIComponent(wa!)).toContain('¿pudiste ver el presupuesto N.º 1043');
  await fila.getByRole('button', { name: 'Convertir en venta' }).click();
  await expect(page.getByText('Presupuesto N.º 1043 convertido en venta. Se descontó el stock.')).toBeVisible();
  await page.getByRole('button', { name: 'Vendidos' }).click();
  await expect(page.locator('.fer-pres li', { hasText: 'N.º 1043' })).toBeVisible();

  await page.getByRole('tab', { name: 'Clientes' }).click();
  await expect(page.locator('.fer-ficha')).toContainText('Juan Pérez');
  await expect(page.locator('.fer-ficha')).toContainText('Lista profesional (−12 %)');
});

test('precios: aumento por porcentaje con deshacer y lista del proveedor', async ({ page }) => {
  const slug = await crearDemo(page, 'Ferretería Oeste');
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Precios y proveedores' }).click();
  await page.getByLabel('Categoría').selectOption('Plomería');
  await page.getByRole('button', { name: /^Aplicar a/ }).click();
  await expect(page.getByText(/^Actualizaste .* precios\.$/)).toBeVisible();
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.getByText('Volviste a los precios anteriores.')).toBeVisible();

  await page.locator('input[type=file]').setInputFiles('public/ejemplos/lista-proveedor-ferreteria.csv');
  await expect(page.getByText(/Encontramos 48 productos en la lista del proveedor/)).toBeVisible();
  await page.getByRole('button', { name: 'Aplicar 48 precios' }).click();
  await expect(page.getByText(/Aplicaste 48 precios del proveedor/)).toBeVisible();

  await page.getByRole('tab', { name: /Stock y reposición/ }).click();
  await expect(page.getByText(/productos por debajo del mínimo/)).toBeVisible();
  const pedido = await page.getByRole('link', { name: /Pedir al proveedor/ }).getAttribute('href');
  expect(decodeURIComponent(pedido!)).toContain('Te paso el pedido');
});

test('el vendedor abre la demo de una ferretería registrada y su landing', async ({ page }) => {
  await ingresar(page);
  await page.getByRole('button', { name: 'Ver demo de Ferretería El Tornillo Feliz' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ferretería El Tornillo Feliz' })).toBeVisible();
  const slug = page.url().split('/d/')[1];
  await page.goto(`/d/${slug}/sitio`);
  await expect(page.getByRole('heading', { name: 'Mandanos tu lista y te respondemos con el presupuesto' })).toBeVisible();
});
