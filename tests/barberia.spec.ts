import { test, expect, type Page } from '@playwright/test';

// Martes 10 de noviembre de 2026, 11:00: la barbería abre de martes a sábado de 10 a 20 h.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 10, 11, 0));
});

async function ingresar(page: Page) {
  await page.goto('/');
  if (!page.url().includes('/ingresar')) return;
  await page.getByLabel('Usuario').fill('vendedor');
  await page.getByLabel('Contraseña').fill('demo1234');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((u) => u.pathname === '/');
}

async function crearDemo(page: Page, nombre = 'Barbería Norte') {
  await ingresar(page);
  await page.getByRole('button', { name: 'Barbería', exact: true }).click();
  await page.getByLabel('Nombre del negocio').fill(nombre);
  await page.getByLabel('WhatsApp del negocio').fill('54 9 11 5555 1234');
  await page.getByRole('button', { name: 'Abrir demo' }).click();
  await page.waitForURL(/\/d\//);
  return page.url().split('/d/')[1];
}

test('reserva en 3 pasos, aparece en la agenda y al cancelar avisa a la lista de espera', async ({ page }) => {
  const slug = await crearDemo(page);
  await expect(page.getByText('Demo ilustrativa de ACMIAS')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Barbería Norte' })).toBeVisible();

  // Paso 1: servicio. Paso 2: profesional, día y hora.
  await page.getByRole('button', { name: /^Degradé/ }).click();
  await page.getByRole('button', { name: /^Mateo/ }).click();
  await page.getByRole('button', { name: /^mañana/ }).click();
  await expect(page.getByRole('heading', { name: 'Horarios para mañana' })).toBeVisible();
  const primera = page.locator('.bar-hora').first();
  const horaElegida = (await primera.textContent())!.trim();
  await primera.click();

  // Paso 3: datos, sin cuenta.
  await page.getByRole('button', { name: 'Reservar turno' }).click();
  await expect(page.getByText('Escribí tu nombre.')).toBeVisible();
  await page.getByLabel('Tu nombre').fill('Ezequiel Prueba');
  await page.getByLabel('Tu WhatsApp').fill('11 5555 7777');
  await page.getByRole('button', { name: 'Reservar turno' }).click();
  await expect(page.getByRole('heading', { name: '¡Turno reservado!' })).toBeVisible();
  await expect(page.locator('.bar-burbuja')).toContainText(`Degradé (fade) con Mateo, mañana a las ${horaElegida} h`);
  await expect(page.locator('.bar-burbuja')).toContainText('/turno/');

  // El dueño lo ve en la agenda del día siguiente.
  const turnoUrl = await page.getByRole('link', { name: /Ver, cambiar o cancelar/ }).getAttribute('href');
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('group', { name: 'Días de la semana' }).getByRole('button', { name: /^Mié/ }).click();
  await expect(page.getByRole('button', { name: new RegExp(`${horaElegida} Ezequiel Prueba`) })).toBeVisible();

  // El cliente confirma y después cancela desde el enlace del WhatsApp.
  await page.goto(turnoUrl!);
  await page.getByRole('button', { name: 'Confirmo que voy' }).click();
  await expect(page.getByText('Confirmaste tu turno')).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar turno' }).click();
  await page.getByRole('button', { name: 'Sí, cancelar' }).click();
  await expect(page.getByText('El horario quedó libre.')).toBeVisible();
  await expect(page.getByText('Avisamos a Franco, que estaba en la lista de espera.')).toBeVisible();

  // En el panel, la lista de espera queda lista para avisar por WhatsApp.
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Lista de espera/ }).click();
  const fila = page.locator('li', { hasText: 'Franco Peralta' });
  await expect(fila).toContainText('Se liberó un turno: avisale ahora.');
  const wa = await fila.getByRole('link', { name: 'Avisar' }).getAttribute('href');
  expect(decodeURIComponent(wa!)).toContain(`se liberó un turno en Barbería Norte para Degradé (fade): mañana a las ${horaElegida} h`);
});

test('el cliente reprograma su turno y el horario viejo queda libre', async ({ page }) => {
  const slug = await crearDemo(page, 'Barbería Sur');
  await page.getByRole('button', { name: /^Corte clásico/ }).click();
  await page.locator('.bar-hora').first().click();
  await page.getByLabel('Tu nombre').fill('Ana Prueba');
  await page.getByLabel('Tu WhatsApp').fill('11 5555 8888');
  await page.getByRole('button', { name: 'Reservar turno' }).click();
  await page.getByRole('link', { name: /Ver, cambiar o cancelar/ }).click();
  await expect(page.getByRole('heading', { name: 'Ana, este es tu turno' })).toBeVisible();
  await page.getByRole('button', { name: 'Cambiar día u hora' }).click();
  await page.getByRole('group', { name: 'Día' }).getByRole('button', { name: /^Jue/ }).first().click();
  const nueva = (await page.locator('.bar-hora').first().textContent())!.trim();
  await page.locator('.bar-hora').first().click();
  await expect(page.getByText(`a las ${nueva} h.`)).toBeVisible();
  expect(slug).toBeTruthy();
});

test('sin lugar el cliente se anota en la lista de espera; el bloqueo del dueño saca el día', async ({ page }) => {
  const slug = await crearDemo(page, 'Barbería Este');
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Bloqueos y vacaciones' }).click();
  await page.getByLabel('Desde').fill('2026-11-12');
  await page.getByLabel('Hasta').fill('2026-11-12');
  await page.getByLabel('Motivo').fill('Feriado del local');
  await page.getByRole('button', { name: 'Bloquear' }).click();
  await expect(page.getByText(/Bloqueo guardado/)).toBeVisible();
  await expect(page.locator('li', { hasText: 'Todo el local · Feriado del local' })).toBeVisible();

  await page.goto(`/d/${slug}`);
  await page.getByRole('button', { name: /^Perfilado/ }).click();
  await page.getByRole('button', { name: /^jueves 12 de nov, sin lugar/ }).click();
  await expect(page.getByText('No quedan horarios este día.')).toBeVisible();
  await page.getByRole('button', { name: 'Anotarme en la lista de espera' }).click();
  await page.getByRole('dialog').getByLabel('Tu nombre').fill('Pedro Espera');
  await page.getByRole('dialog').getByLabel('Tu WhatsApp').fill('11 5555 4444');
  await page.getByRole('button', { name: 'Anotarme', exact: true }).click();
  await expect(page.getByText('te avisamos por WhatsApp si se libera un turno')).toBeVisible();

  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Lista de espera/ }).click();
  await expect(page.locator('li', { hasText: 'Pedro Espera' })).toContainText('Esperando que se libere un lugar.');
});

test('ficha del cliente con sellos, ausencias y métricas del negocio', async ({ page }) => {
  const slug = await crearDemo(page, 'Barbería Oeste');
  // La seña se muestra sin cobrar.
  await page.getByRole('button', { name: /^Color/ }).click();
  await page.locator('.bar-hora').first().click();
  await expect(page.getByText(/seña del 30%.*En la demo no se cobra nada/)).toBeVisible();

  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Clientes' }).click();
  await page.getByRole('button', { name: /Martín Gómez/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Le faltan 2 para corte clásico sin cargo.');
  await expect(page.getByRole('dialog')).toContainText('Degradé bajo');
  await page.getByRole('button', { name: 'Cerrar' }).click();
  await page.getByRole('button', { name: /Lucas Herrera/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Faltó 2 veces sin avisar');
  await page.getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.locator('.cli-lista li', { hasText: 'Sofía Benítez' })).toContainText('Nuevo');

  await page.getByRole('tab', { name: 'Métricas' }).click();
  await expect(page.getByText('Ocupación de la agenda esta semana')).toBeVisible();
  await expect(page.getByText('Clientes nuevos / que volvieron')).toBeVisible();

  // Marcar atendido suma un sello.
  await page.getByRole('tab', { name: 'Agenda' }).click();
  const turno = page.locator('.ag-turno.est-confirmado, .ag-turno.est-reservado').first();
  await turno.click();
  const antes = await page.getByRole('dialog').locator('.chip-rep', { hasText: 'sellos' }).textContent();
  await page.getByRole('dialog').getByRole('button', { name: 'Atendido' }).click();
  await expect(page.getByRole('dialog')).toContainText('Turno marcado como atendido.');
  const n = Number(antes!.match(/(\d+)\//)![1]);
  await expect(page.getByRole('dialog').locator('.chip-rep', { hasText: 'sellos' })).toContainText(`${n + 1}/10`);
});

test('el vendedor abre la demo de una barbería registrada', async ({ page }) => {
  await ingresar(page);
  await page.getByRole('button', { name: 'Ver demo de Barbería El Faro' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Barbería El Faro' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '¿Qué te hacés?' })).toBeVisible();
  const slug = page.url().split('/d/')[1];
  await page.goto(`/d/${slug}/sitio`);
  await expect(page.getByRole('heading', { name: 'Trabajos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tu turno, en tres toques y sin llamar' })).toBeVisible();
});
