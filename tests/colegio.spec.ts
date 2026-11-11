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

async function crearDemo(page: Page, nombre = 'Escuela del Sol') {
  await ingresar(page);
  await page.getByRole('button', { name: 'Colegio', exact: true }).click();
  await page.getByLabel('Nombre del negocio').fill(nombre);
  await page.getByLabel('WhatsApp del negocio').fill('54 9 11 5555 1234');
  await page.getByRole('button', { name: 'Abrir demo' }).click();
  await page.waitForURL(/\/d\//);
  return page.url().split('/d/')[1].split('#')[0].split('/')[0].split('?')[0];
}

const sinAbrir = async (link: ReturnType<Page['getByRole']>) => link.evaluate((a: HTMLAnchorElement) => { a.removeAttribute('target'); a.addEventListener('click', (e) => e.preventDefault()); });

test('comunicado: el colegio publica, la familia lo lee y el panel cuenta la lectura', async ({ page }) => {
  const slug = await crearDemo(page);
  await expect(page.getByText('Demo ilustrativa de ACMIAS')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Comunicados' }).click();
  await page.getByRole('button', { name: 'Publicar comunicado' }).click();
  await expect(page.locator('.bar-err')).toContainText('Escribí un título');
  await page.getByLabel('Título').fill('Feria de ciencias');
  await page.getByLabel('Para').selectOption({ label: '5.° grado' });
  await page.getByLabel('Texto').fill('El jueves los chicos de 5.° presentan sus experimentos a las 10 h. ¡Las familias están invitadas!');
  await page.getByRole('button', { name: 'Publicar comunicado' }).click();
  await expect(page.getByRole('status')).toContainText('Comunicado publicado para 5.° grado');
  const item = page.locator('.co-items > li').filter({ hasText: 'Feria de ciencias' });
  await expect(item).toContainText(/0 de \d+ familias lo leyeron/);
  await item.getByRole('button', { name: /Ver las \d+ que no lo leyeron/ }).click();
  const responsable = ((await item.locator('.au-leads li strong').first().textContent()) ?? '').trim();
  const recordar = item.getByRole('link', { name: `Recordar a ${responsable}` });
  expect(decodeURIComponent((await recordar.getAttribute('href')) ?? '')).toContain('"Feria de ciencias"');

  // La familia entra con su código y lo lee.
  await page.getByRole('tab', { name: /Cuotas/ }).click();
  await page.getByRole('button', { name: responsable }).first().click();
  const codigo = ((await page.getByRole('dialog').locator('strong').first().textContent()) ?? '').trim();
  await page.goto(`/d/${slug}`);
  await page.getByLabel('Código de familia o WhatsApp').fill(codigo.toLowerCase());
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText(/Tenés .*comunicado/)).toBeVisible();
  await page.getByRole('button', { name: /Feria de ciencias/ }).click();
  await expect(page.getByText('presentan sus experimentos')).toBeVisible();
  await expect(page.getByRole('button', { name: /Feria de ciencias/ })).toContainText('Leído');

  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Comunicados' }).click();
  await expect(page.locator('.co-items > li').filter({ hasText: 'Feria de ciencias' })).toContainText(/1 de \d+ familias lo leyeron/);
});

test('autorización: la familia autoriza con un toque y el panel lo refleja', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.getByRole('group', { name: 'Familias de ejemplo' }).getByRole('button').first().click();
  const grupo = page.getByRole('group', { name: /Salida al Museo de Ciencias de / }).first();
  await expect(grupo).toBeVisible();
  const hijo = ((await grupo.getAttribute('aria-label')) ?? '').replace('Salida al Museo de Ciencias de ', '');
  await grupo.getByRole('button', { name: 'Autorizo', exact: true }).click();
  await expect(grupo.getByRole('button', { name: 'Autorizo', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status').filter({ hasText: `autorizaste a ${hijo}` })).toBeVisible();

  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Autorizaciones/ }).click();
  const salida = page.locator('.co-items > li').filter({ hasText: 'Salida al Museo de Ciencias' });
  await expect(salida).toContainText(/\d+ autorizaron · \d+ no · \d+ sin responder/);
  await expect(salida.locator('.au-leads li').filter({ hasText: new RegExp(`^${hijo} `) })).toHaveCount(0);

  // Pedir una nueva autorización valida cursos.
  await page.getByLabel('Título').fill('Salida al teatro');
  await page.getByRole('button', { name: 'Pedir autorización' }).click();
  await expect(page.locator('.bar-err')).toContainText('Elegí al menos un curso');
  await page.getByRole('group', { name: 'Cursos' }).getByLabel('3.° grado').check();
  await page.getByRole('button', { name: 'Pedir autorización' }).click();
  await expect(page.locator('.co-items > li').filter({ hasText: 'Salida al teatro' })).toContainText(/0 autorizaron · 0 no · 15 sin responder/);
});

test('asistencia: tomar lista, avisar a la familia y justificar desde el portal', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Asistencia/ }).click();
  await page.getByRole('group', { name: 'Curso' }).getByRole('button', { name: /^2\.° grado/ }).click();
  const primero = page.locator('.co-lista li').first();
  const nombre = ((await primero.locator('.co-nombre').textContent()) ?? '').split(', ').reverse().join(' ');
  await primero.getByRole('button', { name: /A ausente/ }).click();
  await page.locator('.co-lista li').nth(1).getByRole('button', { name: /T tarde/ }).click();
  await expect(page.getByText('1 ausentes · 1 tarde')).toBeVisible();
  await page.getByRole('button', { name: 'Guardar lista de 2.° grado' }).click();
  await expect(page.getByRole('group', { name: 'Curso' }).getByRole('button', { name: /^2\.° grado ✓/ })).toBeVisible();
  const avisar = page.getByRole('link', { name: `Avisar a la familia de ${nombre}` });
  expect(decodeURIComponent((await avisar.getAttribute('href')) ?? '')).toContain(`que ${nombre.split(' ')[0]} no vino hoy (martes, 10 de noviembre)`);
  await expect(page.getByRole('tab', { name: 'Asistencia (4/8)' })).toBeVisible();

  // La familia justifica la falta.
  await page.getByRole('tab', { name: /Alumnos/ }).click();
  await page.getByRole('searchbox', { name: 'Buscar alumnos' }).fill(nombre);
  const fila = page.locator('.ct-tabla tbody tr').first();
  const responsable = ((await fila.locator('td').nth(2).textContent()) ?? '').trim();
  await page.getByRole('tab', { name: /Cuotas/ }).click();
  await page.getByRole('button', { name: responsable }).first().click();
  const codigo = ((await page.getByRole('dialog').locator('strong').first().textContent()) ?? '').trim();
  await page.goto(`/d/${slug}`);
  await page.getByLabel('Código de familia o WhatsApp').fill(codigo);
  await page.getByRole('button', { name: 'Entrar' }).click();
  const falta = page.locator('.co-faltas li').filter({ hasText: 'martes, 10 de noviembre' });
  await falta.getByRole('button', { name: 'Justificar' }).click();
  await falta.getByLabel('Motivo').fill('Turno con el dentista');
  await falta.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.locator('.co-faltas li').filter({ hasText: 'justificada: Turno con el dentista' })).toBeVisible();
});

test('cuotas: hermanos con descuento, la familia avisa que pagó y el colegio confirma', async ({ page }) => {
  const slug = await crearDemo(page);
  // Entra con la primera familia de ejemplo que tenga cuotas para pagar.
  const ya = page.getByRole('link', { name: /Ya pagué: avisar al colegio/ });
  for (let i = 0; i < 3; i++) {
    await page.getByRole('group', { name: 'Familias de ejemplo' }).getByRole('button').nth(i).click();
    await expect(page.locator('.co-hijos > div')).toHaveCount(2);
    if (await ya.count()) break;
    await page.getByRole('button', { name: 'Salir' }).click();
  }
  expect(decodeURIComponent((await ya.getAttribute('href')) ?? '')).toMatch(/Ya pagué .+: \$/);
  const hijos = await page.locator('.co-hijos strong').allTextContents();
  await sinAbrir(ya);
  await ya.click();
  await expect(page.getByText('Avisaste que pagaste')).toBeVisible();

  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Cuotas/ }).click();
  await page.getByRole('group', { name: 'Filtrar familias' }).getByRole('button', { name: 'Avisaron que pagaron' }).click();
  const filas = page.locator('.ct-tabla tbody tr');
  const antes = await filas.count();
  await filas.filter({ hasText: `${hijos[0]} (` }).filter({ hasText: `${hijos[1]} (` }).locator('.ct-link').click();
  const ficha = page.getByRole('dialog');
  await expect(ficha.locator('.ho-resumen li').filter({ hasText: '10 % hermano' })).toBeVisible();
  await expect(ficha.getByText('la familia avisó que pagó').first()).toBeVisible();
  for (const b of await ficha.getByRole('button', { name: /Confirmar pago de/ }).all()) await b.click();
  await ficha.getByRole('button', { name: 'Cerrar' }).click();
  await expect(filas).toHaveCount(antes - 1);

  await page.getByRole('group', { name: 'Filtrar familias' }).getByRole('button', { name: 'Con deuda' }).click();
  const siguiente = page.getByRole('link', { name: /Recordar deuda al siguiente: / });
  expect(decodeURIComponent((await siguiente.getAttribute('href')) ?? '')).toContain('Te recordamos las cuotas pendientes');
});

test('alumnos: importación desde Excel agrupando hermanos y beca', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Alumnos/ }).click();
  await page.getByRole('button', { name: 'Importar desde Excel' }).click();
  const descarga = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar planilla de ejemplo' }).click();
  const ruta = await (await descarga).path();
  await page.getByLabel('Elegir planilla de alumnos').setInputFiles({ name: 'alumnos.csv', mimeType: 'text/csv', buffer: (await import('node:fs')).readFileSync(ruta!) });
  await expect(page.locator('.met').filter({ hasText: 'Alumnos leídos' })).toContainText('184');
  await expect(page.locator('.met').filter({ hasText: 'Nuevos' })).toContainText('64');
  await page.getByRole('button', { name: 'Importar 184 alumnos' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'se sumaron 64 alumnos' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Alumnos (184)' })).toBeVisible();

  await page.getByRole('searchbox', { name: 'Buscar alumnos' }).fill('Mateo Acosta');
  const beca = page.getByLabel('Beca de Mateo Acosta');
  await beca.selectOption('50');
  await page.reload();
  await page.getByRole('tab', { name: /Alumnos/ }).click();
  await page.getByRole('searchbox', { name: 'Buscar alumnos' }).fill('Mateo Acosta');
  await expect(page.getByLabel('Beca de Mateo Acosta')).toHaveValue('50');
});

test('preinscripción desde el sitio y vacantes; demo de ejemplo registrada', async ({ page }) => {
  await ingresar(page);
  await page.getByRole('button', { name: 'Ver demo de Colegio Los Aromos' }).click();
  await expect(page.getByRole('heading', { name: 'Todo lo del colegio, en un lugar' })).toBeVisible();
  const slug = page.url().split('/d/')[1].split('#')[0].split('/')[0].split('?')[0];
  await page.goto(`/d/${slug}/sitio`);
  await page.getByRole('button', { name: 'Enviar preinscripción' }).click();
  await expect(page.locator('.bar-err')).toContainText('nombre del alumno');
  await page.getByLabel('Nombre del alumno').fill('Bruno Calderón');
  await page.getByLabel('Curso que va a hacer').selectOption({ label: '1.° grado' });
  await page.getByLabel('Adulto responsable').fill('Julia Calderón');
  await page.getByLabel('WhatsApp').fill('11 4567 8910');
  await page.getByLabel('Tiene un hermano en el colegio').check();
  await page.getByRole('button', { name: 'Enviar preinscripción' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'recibimos la preinscripción de Bruno Calderón' })).toBeVisible();

  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: /Inscripciones/ }).click();
  const pre = page.locator('.au-leads > li').filter({ hasText: 'Bruno Calderón' });
  await expect(pre).toContainText('tiene hermano en el colegio');
  const vacAntes = Number(await page.locator('.co-vacantes div').filter({ hasText: '1.° grado' }).locator('strong').textContent());
  await pre.getByLabel('Estado de la preinscripción de Bruno Calderón').selectOption('aceptada');
  await expect(page.locator('.co-vacantes div').filter({ hasText: '1.° grado' }).locator('strong')).toHaveText(String(vacAntes - 1));
  expect(decodeURIComponent((await pre.getByRole('link', { name: 'Escribir a Julia Calderón' }).getAttribute('href')) ?? '')).toContain('¡Bruno Calderón tiene vacante en 1.° grado!');
});
