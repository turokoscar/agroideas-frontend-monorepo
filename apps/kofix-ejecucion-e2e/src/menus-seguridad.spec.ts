import { test, expect } from '@playwright/test';

test.describe('Módulo de Gestión de Menús - Control de Accesos y Seguridad', () => {

  test('Debería denegar el acceso a la ruta de gestión de menús a usuarios no autenticados', async ({ page }) => {
    // Intentar navegar directamente a la URL de gestión de menús
    await page.goto('/main/gestion-menus');

    // Debería redirigir al login
    await expect(page).toHaveURL(/\/login/);
  });

  test('Debería denegar el acceso (403/Redirección) a usuarios autenticados sin rol de Administrador', async ({ page }) => {
    // 1. Ir a la página de login
    await page.goto('/login');

    // 2. Autenticarse como Especialista (u otro rol sin privilegios de administración)
    await page.fill('input[type="email"]', 'especialista@agroideas.gob.pe');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // 3. Esperar al dashboard principal
    await page.waitForURL(/\/main\/home/);

    // 4. Intentar forzar la navegación a la ruta protegida de gestión de menús
    await page.goto('/main/gestion-menus');

    // 5. El permissionGuard debería actuar bloqueando o redirigiendo al home
    await expect(page).toHaveURL(/\/main\/home/);
  });

  test('Debería permitir el acceso y mostrar el CRUD a usuarios con rol de Administrador', async ({ page }) => {
    // 1. Autenticarse como Administrador
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@agroideas.gob.pe');
    await page.fill('input[type="password"]', 'AdminPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/main\/home/);

    // 2. Navegar a gestión de menús
    await page.goto('/main/gestion-menus');

    // 3. Verificar que la vista cargue correctamente y se muestre la tabla de datos
    await expect(page).toHaveURL(/\/main\/gestion-menus/);
    const tablaMenus = page.locator('ui-data-table');
    await expect(tablaMenus).toBeVisible();

    // 4. Verificar presencia de botón de creación
    const botonNuevo = page.locator('button:has-text("Nuevo Menú")');
    await expect(botonNuevo).toBeVisible();
  });
});
