import { test, expect, type Page } from '@playwright/test';

// Martes 10 de noviembre de 2026, 11:00. La inmobiliaria muestra propiedades de lunes a viernes de 10 a 18 y sábados de 10 a 13.
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

async function crearDemo(page: Page, nombre = 'Inmobiliaria Centro') {
  await ingresar(page);
  await page.getByRole('button', { name: 'Inmobiliaria', exact: true }).click();
  await page.getByLabel('Nombre del negocio').fill(nombre);
  await page.getByLabel('WhatsApp del negocio').fill('54 9 11 5555 1234');
  await page.getByRole('button', { name: 'Abrir demo' }).click();
  await page.waitForURL(/\/d\//);
  return page.url().split('/d/')[1].split('#')[0];
}

const ultimoWa = (page: Page) => page.evaluate(() => (window as unknown as { __wa: string[] }).__wa.at(-1) ?? '');
const tarjetas = (page: Page) => page.locator('.in-card');

test('el interesado busca con sus palabras, ve el costo de entrada y agenda una visita', async ({ page }) => {
  await crearDemo(page);
  await expect(page.getByText('Demo ilustrativa de ACMIAS')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

  await page.getByLabel('Buscar propiedades').fill('depto acepta mascotas');
  await expect(tarjetas(page).first()).toBeVisible();
  for (const l of await tarjetas(page).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''))) expect(l).toMatch(/[Dd]epartamento|[Mm]onoambiente/);

  await tarjetas(page).first().click();
  const ficha = page.getByRole('dialog');
  const codigo = ((await ficha.getByText(/Código P-\d+/).textContent()) ?? '').match(/P-\d+/)![0];
  await expect(ficha.getByText('Para entrar necesitás (estimado)')).toBeVisible();
  await expect(ficha.locator('.in-costos li.total')).toContainText('$');
  await expect(ficha.getByText(/ubicación aproximada/)).toBeVisible();

  await ficha.getByText('Quiero visitarla').click();
  await ficha.getByRole('group', { name: 'Día de la visita' }).getByRole('button').nth(1).click();
  await ficha.getByRole('group', { name: 'Horario de la visita' }).getByRole('button').first().click();
  await ficha.getByLabel('Tu nombre').fill('Lucía Ferraro');
  await ficha.getByLabel('Tu WhatsApp').fill('11 4444 5555');
  await ficha.getByLabel('Mensaje (opcional)').fill('¿Se puede entrar en marzo?');
  await ficha.getByRole('button', { name: 'Agendar visita y consultar' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'tu visita quedó agendada' })).toBeVisible();
  const wa = await ultimoWa(page);
  expect(wa).toContain('Inmobiliaria Centro');
  expect(wa).toContain('Lucía Ferraro');
  expect(wa).toContain(codigo);
  expect(wa).toContain('¿Se puede entrar en marzo?');
  expect(wa).toMatch(/Reservé una visita para .+ a las \d{1,2}:\d{2} h/);
});

test('cambia entre alquilar, comprar y temporario, filtra por tipo y busca por código', async ({ page }) => {
  await crearDemo(page);
  const ops = page.getByRole('group', { name: 'Operación' });
  await ops.getByRole('button', { name: 'Comprar' }).click();
  await expect(page.locator('.au-cuantos')).toContainText(/propiedades? en venta/);
  await expect(page.locator('.au-cuantos')).toBeVisible();
  for (const l of await tarjetas(page).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''))) expect(l).toContain('USD');

  await page.getByRole('group', { name: 'Tipo de propiedad' }).getByRole('button', { name: 'Casas' }).click();
  for (const l of await tarjetas(page).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''))) expect(l).toMatch(/[Cc]asa/);

  await ops.getByRole('button', { name: 'Temporario' }).click();
  await expect(tarjetas(page).first()).toContainText('/ noche');

  // Un código encuentra la propiedad aunque esté en otra operación.
  await ops.getByRole('button', { name: 'Alquilar' }).click();
  await ops.getByRole('button', { name: 'Comprar' }).click();
  const codigo = ((await tarjetas(page).first().getAttribute('aria-label')) ?? '').match(/P-\d+/)![0];
  await ops.getByRole('button', { name: 'Alquilar' }).click();
  await page.getByLabel('Buscar propiedades').fill(codigo);
  await expect(tarjetas(page)).toHaveCount(1);
  await expect(tarjetas(page).first()).toHaveAttribute('aria-label', new RegExp(codigo));
});

test('pedir requisitos de un alquiler y un propietario que quiere tasar llegan al panel', async ({ page }) => {
  const slug = await crearDemo(page);
  await tarjetas(page).filter({ hasNot: page.locator('.au-badge.res') }).first().click();
  const ficha = page.getByRole('dialog');
  await ficha.getByText('Quiero conocer los requisitos').click();
  await ficha.getByLabel('Tu nombre').fill('Tomás Ibarra');
  await ficha.getByLabel('Tu WhatsApp').fill('11 3333 2222');
  await ficha.getByRole('button', { name: 'Consultar por esta propiedad' }).click();
  expect(await ultimoWa(page)).toContain('¿Qué requisitos piden para alquilarla?');

  await page.getByRole('button', { name: 'Quiero que la tasen' }).click();
  const cap = page.getByRole('dialog');
  await cap.getByRole('button', { name: 'Vender' }).click();
  await cap.getByRole('button', { name: 'Pedir tasación' }).click();
  await expect(cap.getByRole('alert')).toContainText('Completá tu nombre');
  await cap.getByLabel('Tipo').selectOption('casa');
  await cap.getByLabel('Zona').selectOption('Las Lomas');
  await cap.getByLabel('Tu nombre').fill('Norma Quiroga');
  await cap.getByLabel('Tu WhatsApp').fill('11 2222 1111');
  await cap.getByRole('button', { name: 'Pedir tasación' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'coordinar la tasación' })).toBeVisible();
  expect(await ultimoWa(page)).toContain('Quiero vender mi casa de 2 ambientes en Las Lomas');

  await page.goto(`/d/${slug}/panel`);
  const consulta = page.locator('.au-leads > li').filter({ hasText: 'Tomás Ibarra' });
  await expect(consulta).toContainText('Requisitos');
  await consulta.getByRole('link', { name: 'Responder' }).evaluate((a: HTMLAnchorElement) => a.removeAttribute('target'));
  await expect(consulta.getByRole('link', { name: 'Responder' })).toHaveAttribute('href', /wa\.me/);

  await page.getByRole('tab', { name: /Propietarios/ }).click();
  const prop = page.locator('.au-leads > li').filter({ hasText: 'Norma Quiroga' });
  await expect(prop).toContainText('Quiere vender');
  await expect(prop).toContainText('Casa de 2 ambientes en Las Lomas');
  await prop.getByLabel('Estado de Norma Quiroga').selectOption('captada');
  await page.reload();
  await page.getByRole('tab', { name: /Propietarios/ }).click();
  await expect(page.getByLabel('Estado de Norma Quiroga')).toHaveValue('captada');
});

test('el panel carga una propiedad, la reserva y la marca alquilada', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Propiedades/ }).click();
  await expect(page.locator('.au-stock > li.lento').first()).toContainText('sin movimiento');

  await page.getByRole('button', { name: 'Cargar propiedad' }).click();
  await page.getByRole('button', { name: 'Publicar en el catálogo' }).click();
  await expect(page.locator('.bar-err')).toContainText('título y el precio');
  await page.getByLabel('Título').fill('Dúplex con patio');
  await page.getByRole('combobox', { name: 'Tipo', exact: true }).selectOption('ph');
  await page.getByLabel('Alquiler por mes').fill('700000');
  await page.getByLabel('Acepta mascotas').check();
  await page.getByRole('button', { name: 'Publicar en el catálogo' }).click();
  const st = page.getByRole('status').filter({ hasText: 'quedó publicada' });
  await expect(st).toBeVisible();
  const codigo = ((await st.textContent()) ?? '').match(/P-\d+/)![0];

  const fila = page.locator('.au-stock > li').filter({ hasText: 'Dúplex con patio' });
  await fila.getByLabel(`Estado de ${codigo}`).selectOption('reservada');
  await page.goto(`/d/${slug}`);
  await page.getByLabel('Buscar propiedades').fill('duplex patio mascotas');
  await expect(tarjetas(page)).toHaveCount(1);
  await expect(tarjetas(page).first()).toHaveAttribute('aria-label', /reservada/);

  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Propiedades/ }).click();
  await page.locator('.au-stock > li').filter({ hasText: 'Dúplex con patio' }).getByLabel(`Estado de ${codigo}`).selectOption('cerrada');
  await page.getByRole('group', { name: 'Ver' }).getByRole('button', { name: 'Alquiladas o vendidas' }).click();
  await expect(page.locator('.au-stock > li').filter({ hasText: 'Dúplex con patio' })).toBeVisible();
  await page.goto(`/d/${slug}`);
  await page.getByLabel('Buscar propiedades').fill('duplex patio');
  await expect(tarjetas(page)).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Avisarme cuando entre' })).toBeVisible();
});

test('las visitas se confirman y los ajustes cambian el costo de entrada', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Visitas/ }).click();
  const primera = page.locator('.au-leads > li').filter({ has: page.getByRole('button', { name: 'Confirmar' }) }).first();
  const nombre = ((await primera.locator('.au-lead-txt strong').first().textContent()) ?? '').split(' ').slice(0, 2).join(' ');
  await primera.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.locator('.au-leads > li').filter({ hasText: nombre }).first()).toContainText('Confirmado');
  await expect(page.getByRole('link', { name: 'Recordar' }).first()).toHaveAttribute('href', /wa\.me/);

  await page.getByRole('tab', { name: 'Métricas' }).click();
  await expect(page.getByText('Las más consultadas')).toBeVisible();
  await expect(page.getByText('Sin movimiento (más de 60 días)')).toBeVisible();

  await page.getByRole('tab', { name: 'Ajustes' }).click();
  await page.getByLabel('Depósito (meses)').fill('2');
  await page.getByRole('button', { name: 'Guardar ajustes' }).click();
  await expect(page.getByText('Ajustes guardados.')).toBeVisible();
  await page.goto(`/d/${slug}`);
  await tarjetas(page).first().click();
  await expect(page.getByRole('dialog').getByText('Depósito (2 meses)')).toBeVisible();
});

test('la demo de ejemplo registrada abre con su sitio', async ({ page }) => {
  await ingresar(page);
  await page.getByRole('button', { name: 'Ver demo de Propiedades del Parque' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Encontrá dónde vivir/ })).toBeVisible();
  const slug = page.url().split('/d/')[1].split('#')[0];
  await page.goto(`/d/${slug}/sitio`);
  await expect(page.getByRole('heading', { name: 'Destacadas' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Ver las \d+ propiedades/ })).toBeVisible();
  await expect(page.getByText('Imágenes ilustrativas')).toBeVisible();
});
