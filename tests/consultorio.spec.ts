import { test, expect, type Page } from '@playwright/test';

// Martes 10 de noviembre de 2026, 10:00: el consultorio atiende de lunes a viernes de 9 a 19 h (pausa de 13 a 15).
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 10, 10, 0));
});

async function ingresar(page: Page) {
  await page.goto('/');
  if (!page.url().includes('/ingresar')) return;
  await page.getByLabel('Usuario').fill('vendedor');
  await page.getByLabel('Contraseña').fill('demo1234');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((u) => u.pathname === '/');
}

async function crearDemo(page: Page, nombre = 'Consultorio Norte') {
  await ingresar(page);
  await page.getByRole('button', { name: 'Consultorio', exact: true }).click();
  await page.getByLabel('Nombre del negocio').fill(nombre);
  await page.getByLabel('WhatsApp del negocio').fill('54 9 11 5555 1234');
  await page.getByRole('button', { name: 'Abrir demo' }).click();
  await page.waitForURL(/\/d\//);
  return page.url().split('/d/')[1];
}

const CLINICO = /diagn|alergi|evoluc|antecedent|s[ií]ntoma|medicaci|tratamiento/i;

test('reserva con cobertura, recordatorio neutro, agenda y cancelación que avisa a la lista de espera', async ({ page }) => {
  const slug = await crearDemo(page);
  await expect(page.getByText('Demo con datos ficticios')).toBeVisible();

  // Paso 1: profesional, filtrando por cobertura.
  await page.getByRole('group', { name: 'Filtrar por cobertura' }).getByRole('button', { name: 'Salud Plus' }).click();
  await expect(page.getByRole('button', { name: /^Lic\. Andrés Castillo/ })).toHaveCount(0);
  await page.getByRole('button', { name: /^Dra\. Laura Méndez/ }).click();

  // Paso 2: tipo de consulta y horario.
  await page.getByRole('button', { name: /^Primera consulta clínica/ }).click();
  await page.getByRole('button', { name: /^mañana/ }).click();
  const primera = page.locator('.bar-hora').first();
  const horaElegida = (await primera.textContent())!.trim();
  await primera.click();

  // Paso 3: datos de contacto y cobertura, sin motivo de consulta.
  await page.getByLabel('Nombre y apellido').fill('Paciente Prueba');
  await page.getByLabel('WhatsApp').fill('11 5555 7777');
  await page.getByRole('button', { name: 'Reservar turno' }).click();
  await expect(page.getByText('Escribí tu número de afiliado.')).toBeVisible();
  await page.getByLabel('Número de afiliado').fill('SP-123456');
  await page.getByRole('button', { name: 'Reservar turno' }).click();
  await expect(page.getByRole('heading', { name: '¡Turno reservado!' })).toBeVisible();

  // CON-04: el WhatsApp no dice con quién ni para qué es el turno.
  const burbuja = page.locator('.bar-burbuja');
  await expect(burbuja).toContainText(`tu turno en Consultorio Norte quedó reservado para mañana a las ${horaElegida} h`);
  const texto = (await burbuja.textContent())!;
  expect(texto).not.toMatch(/Méndez|Laura|clínic|Primera|médic/i);

  // La secretaria lo ve en la agenda, con su cobertura.
  const turnoUrl = await page.getByRole('link', { name: /Ver, cambiar o cancelar/ }).getAttribute('href');
  await page.goto(`/d/${slug}/panel`);
  await expect(page.getByText('Agenda de la secretaría')).toBeVisible();
  await page.getByRole('group', { name: 'Días de la semana' }).getByRole('button', { name: /^Mié/ }).click();
  await page.getByRole('button', { name: new RegExp(`${horaElegida} Paciente Prueba`) }).click();
  await expect(page.getByRole('dialog')).toContainText('Salud Plus · SP-123456');
  const recordatorio = await page.getByRole('dialog').getByRole('link', { name: 'Enviar recordatorio' }).getAttribute('href');
  expect(decodeURIComponent(recordatorio!)).not.toMatch(/Méndez|clínic|Primera/i);
  await page.getByRole('button', { name: 'Cerrar' }).click();

  // El paciente cancela desde el enlace y se avisa a la lista de espera.
  await page.goto(turnoUrl!);
  await page.getByRole('button', { name: 'Cancelar turno' }).click();
  await page.getByRole('button', { name: 'Sí, cancelar' }).click();
  await expect(page.getByText('Avisamos a Elena, que estaba en la lista de espera.')).toBeVisible();
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Lista de espera/ }).click();
  const wa = await page.locator('li', { hasText: 'Elena Bustos' }).getByRole('link', { name: 'Avisar' }).getAttribute('href');
  expect(decodeURIComponent(wa!)).toContain(`se liberó un turno en Consultorio Norte para mañana a las ${horaElegida} h`);
});

test('ficha administrativa sin datos clínicos, historia clínica solo como vista previa y accesos registrados', async ({ page }) => {
  const slug = await crearDemo(page, 'Consultorio Sur');
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Pacientes' }).click();
  await page.getByRole('button', { name: /Ana Martínez/ }).click();
  const ficha = page.getByRole('dialog');
  await expect(ficha).toContainText('Historial de turnos');
  await expect(ficha.getByLabel('Cobertura')).toBeVisible();
  await expect(ficha.getByText(/Diagnóstico|Alergias/)).toHaveCount(0);

  await ficha.getByRole('button', { name: 'Historia clínica · Próximamente' }).click();
  await expect(ficha).toContainText('Vista previa con datos ficticios · Módulo próximamente');
  await expect(ficha).toContainText('Evoluciones');
  await expect(ficha.locator('textarea, input')).toHaveCount(0); // no se puede editar
  await page.getByRole('button', { name: 'Cerrar' }).click();

  // CON-08: lo guardado en el dispositivo no tiene ningún campo clínico.
  const guardado = await page.evaluate((s) => localStorage.getItem(`acmias:demo:${s}`), slug);
  expect(guardado).toBeTruthy();
  expect(guardado!).not.toMatch(CLINICO);

  // CON-12: el acceso a la ficha quedó registrado.
  await page.getByRole('tab', { name: 'Ajustes' }).click();
  await expect(page.getByText('Abrió la ficha de Ana Martínez')).toBeVisible();
});

test('la secretaria da un sobreturno y bloquea vacaciones', async ({ page }) => {
  const slug = await crearDemo(page, 'Consultorio Este');
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('button', { name: 'Nuevo turno' }).click();
  const hoja = page.getByRole('dialog');
  await hoja.getByLabel('Profesional').selectOption({ label: 'Laura Méndez' });
  await hoja.getByText('Sobreturno').click();
  await hoja.getByRole('combobox', { name: 'Hora' }).selectOption({ label: '11:00 · Laura' });
  await hoja.getByLabel('Paciente').fill('Carlos Pereyra');
  await hoja.getByRole('button', { name: 'Guardar turno' }).click();
  await expect(page.getByRole('button', { name: /11:00 · ST Carlos Pereyra/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Bloqueos y vacaciones' }).click();
  await page.getByLabel('Quién').selectOption({ label: 'Andrés Castillo' });
  await page.getByLabel('Desde').fill('2026-11-16');
  await page.getByLabel('Hasta').fill('2026-11-20');
  await page.getByLabel('Motivo').fill('Vacaciones');
  await page.getByRole('button', { name: 'Bloquear' }).click();
  await expect(page.locator('li', { hasText: 'Andrés Castillo · Vacaciones' })).toContainText('Del 16 nov al 20 nov');

  await page.getByRole('tab', { name: 'Métricas' }).click();
  await expect(page.getByText('Pacientes nuevos / recurrentes')).toBeVisible();
  await expect(page.getByText(/Ausencias \(/)).toBeVisible();
});

test('el vendedor abre la demo de un consultorio registrado y su landing', async ({ page }) => {
  await ingresar(page);
  await page.getByRole('button', { name: 'Ver demo de Consultorio Integral Sur' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Consultorio Integral Sur' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '¿Con quién te querés atender?' })).toBeVisible();
  await expect(page.getByText('También por videollamada')).toBeVisible();
  const slug = page.url().split('/d/')[1];
  await page.goto(`/d/${slug}/sitio`);
  await expect(page.getByRole('heading', { name: 'Profesionales' })).toBeVisible();
  await expect(page.getByText(/De lunes a viernes de 09:00 a 19:00 h \(cerrado de 13:00 a 15:00\)/)).toBeVisible();
});
