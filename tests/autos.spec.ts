import { test, expect, type Page } from '@playwright/test';

// Martes 10 de noviembre de 2026, 11:00. La agencia toma pruebas de lunes a viernes de 9 a 18 y sábados de 9 a 13.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 10, 11, 0));
  // Los WhatsApp se abren en otra pestaña: los guardamos para revisar el mensaje.
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

async function crearDemo(page: Page, nombre = 'Agencia Norte') {
  await ingresar(page);
  await page.getByRole('button', { name: 'Autos y motos', exact: true }).click();
  await page.getByLabel('Nombre del negocio').fill(nombre);
  await page.getByLabel('WhatsApp del negocio').fill('54 9 11 5555 1234');
  await page.getByRole('button', { name: 'Abrir demo' }).click();
  await page.waitForURL(/\/d\//);
  return page.url().split('/d/')[1].split('#')[0];
}

const ultimoWa = (page: Page) => page.evaluate(() => (window as unknown as { __wa: string[] }).__wa.at(-1) ?? '');

test('el cliente busca con sus palabras, simula la cuota, ofrece su usado y reserva la prueba de manejo', async ({ page }) => {
  const slug = await crearDemo(page);
  await expect(page.getByText('Demo ilustrativa de ACMIAS')).toBeVisible();

  await page.getByLabel('Buscar en el stock').fill('camioneta automática');
  const tarjetas = page.locator('.au-card');
  await expect(tarjetas.first()).toBeVisible();
  for (const l of await tarjetas.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''))) expect(l).toMatch(/SUV|Pick-up/);

  await page.locator('.au-card:not([aria-label*="reservado"])').first().click();
  const ficha = page.getByRole('dialog');
  const modelo = (await ficha.locator('#au-t-ficha').textContent())!.trim();
  const antes = await ficha.locator('.au-cuota strong').textContent();
  await ficha.getByRole('button', { name: '48 cuotas' }).click();
  await expect(ficha.locator('.au-cuota strong')).not.toHaveText(antes!);
  await expect(ficha.getByText(/No es una oferta/)).toBeVisible();

  await ficha.getByText('Entrego mi usado').click();
  await ficha.getByLabel('Qué vehículo es').fill('Hatch 1.4 nafta');
  await ficha.getByLabel('Año').fill('2016');
  await ficha.getByLabel('Kilómetros').fill('98000');

  await ficha.getByText('Quiero una prueba de manejo').click();
  await ficha.getByRole('group', { name: 'Día de la prueba' }).getByRole('button', { name: 'mañana' }).click();
  const hora = (await ficha.locator('.bar-hora').first().textContent())!.trim();
  await ficha.locator('.bar-hora').first().click();

  await ficha.getByRole('button', { name: 'Reservar prueba y consultar' }).click();
  await expect(ficha.getByText('Completá tu nombre')).toBeVisible();
  await ficha.getByLabel('Tu nombre').fill('Cliente Prueba');
  await ficha.getByLabel('Tu WhatsApp').fill('11 5555 7777');
  await ficha.getByRole('button', { name: 'Reservar prueba y consultar' }).click();
  await expect(page.getByText('tu prueba de manejo quedó reservada')).toBeVisible();

  const wa = await ultimoWa(page);
  expect(wa).toContain(`Me interesa el`);
  expect(wa).toContain(modelo);
  expect(wa).toContain('Simulé 48 cuotas');
  expect(wa).toContain('Quiero entregar mi usado: Hatch 1.4 nafta, 2016, 98.000 km.');
  expect(wa).toContain(`Reservé la prueba de manejo para mañana a las ${hora} h.`);

  // La agencia la ve en el panel con todo cargado y en la agenda de pruebas.
  await page.goto(`/d/${slug}/panel`);
  const fila = page.locator('.au-leads li', { hasText: 'Cliente Prueba' });
  await expect(fila).toContainText('Prueba de manejo');
  await expect(fila).toContainText('Simuló 48 cuotas');
  await expect(fila).toContainText('Entrega Hatch 1.4 nafta 2016');
  await page.getByRole('tab', { name: /Pruebas de manejo/ }).click();
  await expect(page.locator('.au-leads li', { hasText: 'Cliente Prueba' })).toContainText(modelo);
});

test('el mismo vehículo no se puede reservar dos veces en el mismo horario', async ({ page }) => {
  await crearDemo(page, 'Agencia Sur');
  const abrirYElegir = async () => {
    await page.locator('.au-card:not([aria-label*="reservado"])').first().click();
    const ficha = page.getByRole('dialog');
    await ficha.getByText('Quiero una prueba de manejo').click();
    await ficha.getByRole('group', { name: 'Día de la prueba' }).getByRole('button', { name: 'mañana' }).click();
    return ficha;
  };
  let ficha = await abrirYElegir();
  const primera = (await ficha.locator('.bar-hora').first().textContent())!.trim();
  await ficha.locator('.bar-hora').first().click();
  await ficha.getByLabel('Tu nombre').fill('Ana Uno');
  await ficha.getByLabel('Tu WhatsApp').fill('11 5555 1111');
  await ficha.getByRole('button', { name: 'Reservar prueba y consultar' }).click();
  await expect(page.getByText('tu prueba de manejo quedó reservada')).toBeVisible();
  ficha = await abrirYElegir();
  await expect(ficha.locator('.bar-hora').first()).not.toHaveText(primera);
});

test('panel: responder consultas, tasar un usado y manejar el stock', async ({ page }) => {
  const slug = await crearDemo(page, 'Agencia Este');
  await page.goto(`/d/${slug}/panel`);
  await expect(page.getByText('Panel de la agencia')).toBeVisible();

  // Tasación: la agencia carga el valor y se lo manda al cliente (la demo nunca inventa uno).
  await page.getByRole('tab', { name: /Usados para tasar/ }).click();
  const primero = page.locator('.au-leads li').first();
  await expect(primero).toContainText('Sin tasar');
  const quien = (await primero.textContent())!.match(/de ([A-ZÁÉÍÓÚ][a-záéíóú]+ [A-ZÁÉÍÓÚ][a-záéíóú]+)/)![1];
  const usado = page.locator('.au-leads li', { hasText: `de ${quien}` });
  await usado.getByRole('textbox').fill('4500000');
  await usado.getByRole('button', { name: 'Enviar oferta' }).click();
  await expect(usado).toContainText('Ofrecido');
  expect(await ultimoWa(page)).toMatch(/te ofrecemos .*sujeto a revisión del vehículo/);

  // Stock: cargar un vehículo nuevo lo publica en el catálogo; marcarlo vendido lo saca.
  await page.getByRole('tab', { name: /Stock/ }).click();
  await page.getByRole('button', { name: 'Cargar vehículo' }).click();
  await page.getByRole('combobox', { name: 'Tipo', exact: true }).selectOption('suv');
  await page.getByLabel('Marca', { exact: true }).fill('Marca Z');
  await page.getByLabel('Modelo y versión').fill('SUV de prueba 1.3');
  await page.getByLabel('Kilómetros').fill('15000');
  await page.getByLabel('Precio', { exact: true }).fill('9999999');
  await page.getByRole('button', { name: 'Publicar en el catálogo' }).click();
  await expect(page.getByText('SUV de prueba 1.3 quedó publicado')).toBeVisible();

  await page.goto(`/d/${slug}`);
  await page.getByLabel('Buscar en el stock').fill('SUV de prueba');
  await expect(page.locator('.au-card')).toHaveCount(1);

  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Stock/ }).click();
  await page.getByLabel('Estado de SUV de prueba 1.3').selectOption('vendido');
  await page.goto(`/d/${slug}`);
  await page.getByLabel('Buscar en el stock').fill('SUV de prueba');
  await expect(page.getByText('No tenemos eso en stock ahora.')).toBeVisible();

  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Métricas' }).click();
  await expect(page.getByText('Consultas en 7 días')).toBeVisible();
  await expect(page.getByText('Vendidos en 30 días')).toBeVisible();
});

test('filtros de motos y 0 km, y demo registrada con su landing', async ({ page }) => {
  await ingresar(page);
  await page.getByRole('button', { name: 'Ver demo de Motores del Sur' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Tu próximo auto o moto/ })).toBeVisible();
  await page.getByRole('group', { name: 'Filtros' }).getByRole('button', { name: 'Motos' }).click();
  for (const l of await page.locator('.au-card').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''))) expect(l).toMatch(/Naked|Scooter|Enduro|Trail/);
  await page.getByRole('group', { name: 'Filtros' }).getByRole('button', { name: '0 km' }).click();
  for (const l of await page.locator('.au-card').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''))) expect(l).toContain('0 km');
  const slug = page.url().split('/d/')[1].split('#')[0];
  await page.goto(`/d/${slug}/sitio`);
  await expect(page.getByRole('heading', { name: 'Autos y motos con cuota, permuta y prueba de manejo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Destacados' })).toBeVisible();
});
