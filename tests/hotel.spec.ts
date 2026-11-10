import { test, expect, type Page } from '@playwright/test';

// Martes 10 de noviembre de 2026, 11:00.
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

async function crearDemo(page: Page, nombre = 'Hotel Mirador') {
  await ingresar(page);
  await page.getByRole('button', { name: 'Hotel', exact: true }).click();
  await page.getByLabel('Nombre del negocio').fill(nombre);
  await page.getByLabel('WhatsApp del negocio').fill('54 9 11 5555 1234');
  await page.getByRole('button', { name: 'Abrir demo' }).click();
  await page.waitForURL(/\/d\//);
  return page.url().split('/d/')[1].split('#')[0].split('/')[0].split('?')[0];
}

/** Abre la vista del huésped de la habitación 204 (el código es el mismo que imprime el QR). */
async function comoHuesped(page: Page, slug: string, numero = '204') {
  const codigo = `h${numero}${((Number(numero) * 37) % 89).toString(36)}`;
  await page.goto(`/d/${slug}?hab=${codigo}`);
  await expect(page.getByText(`Habitación ${numero}`)).toBeVisible();
}

test('el huésped pide room service desde el QR y aparece en la cocina con cargo a la habitación', async ({ page }) => {
  const slug = await crearDemo(page);
  await expect(page.getByText('Demo ilustrativa de ACMIAS')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await comoHuesped(page, slug);
  await expect(page.getByRole('heading', { name: 'Hola, Raúl' })).toBeVisible();
  const totalAntes = (await page.locator('.ho-cuenta-btn > strong').textContent()) ?? '';

  await page.getByRole('button', { name: /Room service/ }).click();
  await page.getByRole('button', { name: 'Agregar Desayuno continental' }).click();
  await page.getByRole('button', { name: 'Agregar Desayuno continental' }).click();
  await page.getByRole('button', { name: 'Agregar Café de especialidad' }).click();
  await page.getByRole('button', { name: 'Quitar Desayuno continental' }).click();
  await page.getByRole('button', { name: /Ver pedido \(2\)/ }).click();
  const hoja = page.getByRole('dialog');
  await expect(hoja.getByText('1 × Desayuno continental')).toBeVisible();
  await hoja.getByLabel('¿Cuándo lo querés?').selectOption({ index: 2 });
  await hoja.getByLabel('Aclaraciones (opcional)').fill('Leche descremada');
  await hoja.getByRole('button', { name: 'Pedir a la habitación' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'la cocina recibió tu pedido para las' })).toBeVisible();
  await expect(page.locator('.ho-pedidos > li').first()).toContainText('1 Desayuno continental, 1 Café de especialidad');
  await expect(page.locator('.ho-pedidos > li').first().locator('[aria-current="step"]')).toHaveText('Recibido');
  expect(await page.locator('.ho-cuenta-btn > strong').textContent()).not.toBe(totalAntes);

  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('group', { name: 'Área' }).getByRole('button', { name: /Cocina/ }).click();
  const tarjeta = page.locator('.ho-col.c-nueva .ho-tarjeta').filter({ hasText: '204' }).filter({ hasText: 'Café de especialidad' });
  await expect(tarjeta).toContainText('Leche descremada');
  await expect(tarjeta).toContainText('a la habitación');
  await tarjeta.getByRole('button', { name: /Tomar/ }).click();
  await page.locator('.ho-col.c-en-curso .ho-tarjeta').filter({ hasText: 'Café de especialidad' }).filter({ hasText: '204' }).getByRole('button', { name: /Marcar listo/ }).click();
  await expect(page.locator('.ho-col.c-lista .ho-tarjeta').filter({ hasText: '204' }).filter({ hasText: 'Café de especialidad' })).toBeVisible();

  await comoHuesped(page, slug);
  await expect(page.locator('.ho-pedidos > li').first().locator('[aria-current="step"]')).toHaveText('Entregado');
});

test('limpieza, mantenimiento y recepción sin llamar; no se duplica un pedido abierto', async ({ page }) => {
  const slug = await crearDemo(page);
  await comoHuesped(page, slug);
  await page.getByRole('button', { name: /Algo no funciona/ }).click();
  await page.getByRole('group', { name: 'Pedidos a Mantenimiento' }).getByRole('button', { name: 'Aire acondicionado' }).click();
  await page.getByLabel('Qué pasa').fill('Hace ruido');
  await page.getByRole('button', { name: 'Pedir', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Mantenimiento recibió tu pedido' })).toBeVisible();

  await page.getByRole('button', { name: /Recepción/ }).click();
  await page.getByRole('group', { name: 'Pedidos a Recepción' }).getByRole('button', { name: 'Despertador' }).click();
  await page.getByRole('button', { name: 'Pedir', exact: true }).click();
  await expect(page.locator('.bar-err')).toContainText('Elegí la hora');
  await page.getByLabel('A qué hora').fill('07:15');
  await page.getByRole('button', { name: 'Pedir', exact: true }).click();
  await expect(page.locator('.ho-pedidos')).toContainText('Despertador');
  await expect(page.locator('.ho-pedidos')).toContainText('para las 07:15');

  await page.getByRole('button', { name: /Limpieza/ }).click();
  await page.getByRole('group', { name: 'Pedidos a Limpieza' }).getByRole('button', { name: 'Toallas limpias' }).click();
  await page.getByRole('button', { name: 'Pedir', exact: true }).click();
  await page.getByRole('button', { name: /Limpieza/ }).click();
  await page.getByRole('group', { name: 'Pedidos a Limpieza' }).getByRole('button', { name: 'Toallas limpias' }).click();
  await page.getByRole('button', { name: 'Pedir', exact: true }).click();
  await expect(page.locator('.bar-err')).toContainText('Ya pediste "Toallas limpias"');

  await page.goto(`/d/${slug}/panel`);
  const nuevos = page.locator('.ho-col.c-nueva .ho-tarjeta').filter({ hasText: '204' });
  await expect(nuevos.filter({ hasText: 'Aire acondicionado' })).toContainText('Hace ruido');
  await expect(nuevos.filter({ hasText: 'Despertador' })).toContainText('Para las 07:15');
  await expect(nuevos.filter({ hasText: 'Toallas limpias' })).toHaveCount(1);
  // Los nuevos con más de 10 minutos se marcan.
  await expect(page.locator('.ho-tarjeta.demora').filter({ hasText: '302' })).toBeVisible();
});

test('llegadas y salidas: check-in con bienvenida, check-out con la cuenta y la habitación para limpiar', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Llegadas y salidas/ }).click();

  // La 104 está para limpiar: el check-in avisa y no ocupa la habitación.
  const gabriel = page.locator('.au-leads > li').filter({ hasText: 'Gabriel Ruiz' });
  await expect(gabriel).toContainText('La habitación está para limpiar');
  await gabriel.getByRole('link', { name: 'Check-in de Gabriel Ruiz' }).click();
  await expect(page.getByRole('status')).toContainText('Marcala como libre antes del check-in');
  await gabriel.getByRole('button', { name: 'Marcar lista' }).click();
  const link = gabriel.getByRole('link', { name: 'Check-in de Gabriel Ruiz' });
  const bienvenida = decodeURIComponent((await link.getAttribute('href')) ?? '');
  expect(bienvenida).toContain('Tu habitación es la 104');
  expect(bienvenida).toContain('Wifi: Hotel-Huespedes');
  expect(bienvenida).toMatch(/\?hab=h104/);
  await link.evaluate((a: HTMLAnchorElement) => { a.removeAttribute('target'); a.addEventListener('click', (e) => e.preventDefault()); });
  await link.click();
  await expect(page.getByRole('status')).toContainText('Check-in de Gabriel Ruiz en la 104');
  await expect(page.locator('.au-leads > li').filter({ hasText: 'Gabriel Ruiz' })).toHaveCount(0);

  const ana = page.locator('.au-leads > li').filter({ hasText: 'Ana Ferreira' });
  const salida = ana.getByRole('link', { name: 'Check-out de Ana Ferreira' });
  const cuentaMsg = decodeURIComponent((await salida.getAttribute('href')) ?? '');
  expect(cuentaMsg).toContain('habitación 103');
  expect(cuentaMsg).toMatch(/Alojamiento: \d+ noches? × /);
  expect(cuentaMsg).toContain('Total:');
  await salida.evaluate((a: HTMLAnchorElement) => { a.removeAttribute('target'); a.addEventListener('click', (e) => e.preventDefault()); });
  await salida.click();
  await expect(page.getByRole('status')).toContainText('la 103 quedó para limpiar');

  await page.getByRole('tab', { name: 'Habitaciones' }).click();
  await expect(page.getByRole('button', { name: /Habitación 103, Para limpiar/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Habitación 104, Ocupada, Gabriel Ruiz/ })).toBeVisible();
  const ocupacion = page.locator('.duenio-top').getByText(/Ocupación \d+ %/);
  await expect(ocupacion).toContainText('17 de 21');
});

test('habitaciones: nueva reserva sin superponer fechas y estado de una habitación libre', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Habitaciones' }).click();
  await page.getByRole('button', { name: /Habitación 306, Libre/ }).click();
  const ficha = page.getByRole('dialog');
  await ficha.getByLabel('Huésped').fill('Marina Ortega');
  await ficha.getByLabel('WhatsApp').fill('11 2345 6789');
  await ficha.getByRole('button', { name: 'Guardar reserva' }).click();
  await expect(ficha.locator('.bar-err')).toContainText('ya está tomada en esas fechas');
  await ficha.getByLabel('Entrada').fill('2026-11-20');
  await ficha.getByLabel('Salida').fill('2026-11-23');
  await ficha.getByRole('button', { name: 'Guardar reserva' }).click();
  await expect(ficha.getByRole('status')).toContainText('Reserva de Marina Ortega en la 306 guardada');
  await ficha.getByRole('group', { name: 'Cambiar estado' }).getByRole('button', { name: 'En mantenimiento' }).click();
  await ficha.getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.getByRole('button', { name: /Habitación 306, En mantenimiento/ })).toBeVisible();
  await page.getByRole('tab', { name: /Llegadas y salidas/ }).click();
  await expect(page.locator('.au-leads > li').filter({ hasText: 'Marina Ortega' })).toContainText('20 nov');
});

test('carta: lo agotado no se puede pedir; QR por habitación', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Room service' }).click();
  await page.getByLabel('Burger de la casa disponible').uncheck();
  await comoHuesped(page, slug, '302');
  await page.getByRole('button', { name: /Room service/ }).click();
  await expect(page.locator('.ho-carta li').filter({ hasText: 'Burger de la casa' })).toContainText('No disponible ahora');
  await expect(page.getByRole('button', { name: 'Agregar Burger de la casa' })).toHaveCount(0);

  await page.goto(`/d/${slug}/qr`);
  await expect(page.getByText('QR de 22 habitaciones')).toBeVisible();
  await expect(page.getByAltText('QR de la habitación 101')).toBeVisible();
  await page.getByRole('link', { name: 'Probar como la 207' }).click();
  await expect(page.getByText('Habitación 207')).toBeVisible();

  // Un QR que no es del hotel no abre ninguna habitación.
  await page.goto(`/d/${slug}?hab=falso`);
  await expect(page.locator('.bar-err')).toContainText('no corresponde a una habitación');
});

test('métricas, sitio y demo de ejemplo registrada', async ({ page }) => {
  await ingresar(page);
  await page.getByRole('button', { name: 'Ver demo de Hotel Costa Serena' }).click();
  await expect(page.getByRole('heading', { name: 'Tu habitación, a un toque' })).toBeVisible();
  const slug = page.url().split('/d/')[1].split('#')[0].split('/')[0].split('?')[0];
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Métricas' }).click();
  await expect(page.getByText(/Ocupación \(17 de 21\)/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tiempos por área (7 días)' })).toBeVisible();
  await expect(page.locator('.met-barras li').first()).toContainText('Desayuno continental');
  await page.goto(`/d/${slug}/sitio`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Descansá');
  await expect(page.getByText(/Desde \$\s?[\d.]+/).first()).toBeVisible();
});
