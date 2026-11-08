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

async function crearDemo(page: Page, nombre = 'Café La Esquina Azul') {
  await ingresar(page);
  await page.getByLabel('Nombre del negocio').fill(nombre);
  await page.locator('#logo').setInputFiles(LOGO);
  await expect(page.getByText('tomados del logo')).toBeVisible();
  await page.getByLabel('WhatsApp del negocio').fill('54 9 11 5555 1234');
  await page.getByRole('button', { name: 'Abrir demo' }).click();
  await page.waitForURL(/\/d\/cafe-la-esquina-azul/);
}

test('el vendedor crea una demo y el comensal pide por WhatsApp', async ({ page, context }) => {
  await crearDemo(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Café La Esquina Azul' })).toBeVisible();
  await expect(page.getByText('Demo ilustrativa de ACMIAS')).toBeVisible();
  await page.screenshot({ path: `test-results/carta-${test.info().project.name}.png`, fullPage: false });

  await page.getByRole('button', { name: /Milanesa con puré/ }).first().click();
  await page.getByLabel('Aclaraciones').fill('sin cebolla');
  await page.getByLabel('Agregar uno').click();
  await page.getByRole('button', { name: /^Agregar ·/ }).click();
  await page.getByRole('button', { name: /Ver pedido · 2/ }).click();
  await page.getByRole('button', { name: 'Delivery' }).click();
  await page.getByRole('button', { name: /Enviar pedido por WhatsApp/ }).click();
  await expect(page.getByText('Escribí la dirección de entrega.')).toBeVisible();
  await page.getByLabel('Dirección de entrega').fill('Av. Siempre Viva 742');
  await context.route('https://wa.me/**', (r) => r.fulfill({ status: 200, body: 'ok' }));
  const solicitud = context.waitForEvent('request', (r) => r.url().startsWith('https://wa.me/'));
  const popup = context.waitForEvent('page');
  await page.getByRole('button', { name: /Enviar pedido por WhatsApp/ }).click();
  const url = decodeURIComponent((await solicitud).url());
  const wa = await popup;
  expect(url).toContain('wa.me/5491155551234');
  expect(url).toContain('2 x Milanesa con puré');
  expect(url).toContain('Nota: sin cebolla');
  expect(url).toContain('Dirección: Av. Siempre Viva 742');
  await wa.close();
  await expect(page.getByRole('status').filter({ hasText: 'Pedido enviado' })).toBeVisible();
});

test('la mesa del QR llega al pedido y los agotados no se pueden pedir', async ({ page }) => {
  await crearDemo(page);
  await page.goto('/d/cafe-la-esquina-azul?mesa=4');
  await expect(page.getByText('Mesa 4').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Flan casero.*agotado/ })).toBeDisabled();
});

test('panel del dueño: aumento masivo con deshacer, agotado y pedidos', async ({ page }) => {
  await crearDemo(page);
  await page.goto('/d/cafe-la-esquina-azul/panel');
  await page.getByRole('switch', { name: 'Wok de vegetales agotado' }).click();
  await page.getByRole('tab', { name: 'Subir precios' }).click();
  await page.getByLabel('Categoría').selectOption({ label: 'Cafetería' });
  await page.getByLabel('Porcentaje').fill('20');
  await page.getByRole('button', { name: /Aplicar a 4 platos/ }).click();
  await expect(page.getByText('Actualizaste 4 precios.')).toBeVisible();
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.getByText('Volviste a los precios anteriores.')).toBeVisible();
  await page.getByRole('tab', { name: 'Pedidos y vistas' }).click();
  await expect(page.getByText('Lo más visto de la carta')).toBeVisible();
  await page.screenshot({ path: `test-results/panel-${test.info().project.name}.png` });
  await page.goto('/d/cafe-la-esquina-azul');
  await expect(page.getByRole('button', { name: /Wok de vegetales.*agotado/ })).toBeDisabled();
});

test('importar menú sin clave avisa qué falta', async ({ page }) => {
  await crearDemo(page);
  await page.goto('/d/cafe-la-esquina-azul/panel');
  await page.getByRole('tab', { name: 'Importar menú' }).click();
  await page.locator('input[type=file]').nth(1).setInputFiles(LOGO);
  await expect(page.getByText(/ANTHROPIC_API_KEY/)).toBeVisible();
});

test('QR por mesa, carta impresa y sitio', async ({ page }) => {
  await crearDemo(page);
  await page.goto('/d/cafe-la-esquina-azul/qr');
  await expect(page.getByRole('img', { name: /QR de la mesa/ })).toHaveCount(10);
  await page.goto('/d/cafe-la-esquina-azul/imprimir');
  await expect(page.getByRole('heading', { name: 'Cafetería' })).toBeVisible();
  await page.goto('/d/cafe-la-esquina-azul/sitio');
  await expect(page.getByRole('link', { name: 'Ver la carta' })).toBeVisible();
  await page.screenshot({ path: `test-results/sitio-${test.info().project.name}.png` });
});

test('enlace compartido abre la demo en otro dispositivo', async ({ page, browser }) => {
  await crearDemo(page);
  await page.goto('/');
  await page.getByRole('button', { name: /Compartir/ }).click();
  await page.getByRole('img', { name: /Código QR/ }).waitFor();
  const otro = await browser.newContext();
  const p2 = await otro.newPage();
  const enlace = await page.evaluate(() => {
    const demos = JSON.parse(localStorage.getItem('acmias:demos') || '[]');
    const { logo, ...resto } = demos[0];
    void logo;
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(resto)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `/d/${resto.slug}#c=${b64}`;
  });
  await p2.goto(`${test.info().project.use.baseURL}${enlace}`);
  await expect(p2.getByRole('heading', { level: 1, name: 'Café La Esquina Azul' })).toBeVisible();
  await otro.close();
});

test('slug desconocido muestra cómo seguir', async ({ page }) => {
  await page.goto('/d/no-existe');
  await expect(page.getByRole('heading', { name: 'Esta demo no está en este dispositivo' })).toBeVisible();
});

test('enlace compartido con datos inválidos no rompe nada', async ({ page }) => {
  const malo = Buffer.from(JSON.stringify({ slug: 'malo', rubro: 'restaurante', negocio: 'X', colorPrincipal: '#000000', colorSecundario: '#ffffff', apertura: 5, direccion: {} })).toString('base64url');
  await page.goto(`/d/malo#c=${malo}`);
  await expect(page.getByRole('heading', { name: 'Esta demo no está en este dispositivo' })).toBeVisible();
});

test('la API de importación rechaza pedidos de otro origen', async ({ request }) => {
  const r = await request.post('/api/importar-menu', { headers: { origin: 'https://otro-sitio.com' }, multipart: { archivo: { name: 'a.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') } } });
  expect([403, 503]).toContain(r.status());
});

test('mesa fuera de rango se ignora', async ({ page }) => {
  await crearDemo(page);
  await page.goto('/d/cafe-la-esquina-azul?mesa=99');
  await expect(page.getByText('Carta digital')).toBeVisible();
});

test('el vendedor abre la demo de un cliente registrado con un toque', async ({ page }) => {
  await ingresar(page);
  await page.getByRole('button', { name: 'Ver demo de Trattoria Don Bruno' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Trattoria Don Bruno' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Ver demo de Trattoria Don Bruno' })).toHaveText('Abrir su demo');
  await page.getByRole('button', { name: 'Ver demo de Trattoria Don Bruno' }).click();
  await expect(page).toHaveURL(/trattoria-don-bruno-[a-z0-9-]+$/);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Ver demo de Repuestos Ruta 9' })).toBeDisabled();
});

test('la landing registra un cliente y aparece en el panel', async ({ page, request }) => {
  const nombre = `Bodegón Prueba ${Date.now() % 100000}`;
  const base = { negocio: nombre, rubro: 'restaurante', colorPrincipal: '#2a4d8f', colorSecundario: '#ffcc00', whatsapp: '+54 9 11 5555 9999', email: 'cliente@ejemplo.com', caso: 'Carta con QR', aceptaContacto: true };
  const ajena = await request.post('/api/registros', { data: base, headers: { origin: 'https://otro-sitio.com' } });
  expect(ajena.status()).toBe(403);
  const sinAceptar = await request.post('/api/registros', { data: { ...base, aceptaContacto: false }, headers: { origin: 'https://acmias-landing-demo-bmhi.vercel.app' } });
  expect(sinAceptar.status()).toBe(422);
  const ok = await request.post('/api/registros', { data: base, headers: { origin: 'https://acmias-landing-demo-bmhi.vercel.app' } });
  expect(ok.status()).toBe(201);
  expect(ok.headers()['access-control-allow-origin']).toBe('https://acmias-landing-demo-bmhi.vercel.app');
  await ingresar(page);
  await page.getByRole('button', { name: `Ver demo de ${nombre}` }).click();
  await expect(page.getByRole('heading', { level: 1, name: nombre })).toBeVisible();
});

test('la mesa solo sale del QR: sin QR no se puede elegir una mesa a mano', async ({ page }) => {
  await crearDemo(page);
  await page.getByRole('button', { name: /Sumar Pasta al pesto/ }).click();
  await page.getByRole('button', { name: /Ver pedido · 1/ }).click();
  await expect(page.getByRole('button', { name: 'Para llevar' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'En la mesa' }).click();
  await expect(page.getByText('Escaneá el QR de tu mesa')).toBeVisible();
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Enviar pedido por WhatsApp/ })).toBeDisabled();
  await page.goto('/d/cafe-la-esquina-azul/qr');
  await page.getByRole('link', { name: 'Probar como mesa 3' }).click();
  await page.getByRole('button', { name: /Sumar Pasta al pesto/ }).click();
  await page.getByRole('button', { name: /Ver pedido · 1/ }).click();
  await expect(page.getByText('Tomada del QR de tu mesa')).toBeVisible();
  await expect(page.getByRole('button', { name: /Enviar pedido por WhatsApp/ })).toBeEnabled();
});

test('el portal del vendedor pide usuario y contraseña', async ({ page, request }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/ingresar$/);
  await expect(page.getByRole('heading', { name: 'Portal del vendedor' })).toBeVisible();
  await page.getByLabel('Usuario').fill('vendedor');
  await page.getByLabel('Contraseña').fill('equivocada');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByText('Usuario o contraseña incorrectos.')).toBeVisible();
  expect((await request.get('/api/registros')).status()).toBe(401);
  await ingresar(page);
  await expect(page.getByText('Vendedor: vendedor')).toBeVisible();
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/ingresar$/);
  await page.goto('/');
  await expect(page).toHaveURL(/\/ingresar$/);
});

test('las demos siguen abiertas para el cliente sin ingresar', async ({ page }) => {
  await page.goto('/d/cualquier-demo');
  await expect(page).toHaveURL(/\/d\/cualquier-demo$/);
  await expect(page.getByRole('heading', { name: 'Esta demo no está en este dispositivo' })).toBeVisible();
});
