import { test, expect } from '@playwright/test';

/**
 * dashboard.spec.ts
 * Basic load, structure, and Phase 7.1 tests.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('ranger_tranches_state');
  });
  await page.goto('/');
  // Wait for dashboard to fully initialise (loading spinner disappears)
  await page.waitForSelector('button:has-text("Reset Demo")', { timeout: 10_000 });
});

test.describe('Dashboard load', () => {
  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/Ranger Shield/);
  });

  test('header shows product name', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Ranger Shield', exact: true })).toBeVisible();
  });

  test('subtitle shows hackathon MVP', async ({ page }) => {
    await expect(page.getByText('Protected Yield Protocol · Hackathon MVP')).toBeVisible();
  });

  test('footer shows mock adapter status', async ({ page }) => {
    await expect(page.getByText(/Mock Vault Adapter/)).toBeVisible();
  });

  test('Reset Demo button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Reset Demo' })).toBeVisible();
  });
});

test.describe('Section structure', () => {
  test('Base Vault section is visible', async ({ page }) => {
    // exact: true avoids matching 'Base Vault APY' label in VaultOverview
    await expect(page.getByText('Base Vault', { exact: true })).toBeVisible();
  });

  test('Stress Test Scenarios section is visible', async ({ page }) => {
    await expect(page.getByText('Stress Test Scenarios')).toBeVisible();
  });

  test('Yield Waterfall section is visible', async ({ page }) => {
    await expect(page.getByText('Yield Waterfall', { exact: true })).toBeVisible();
  });

  test('Yield Positions section is visible', async ({ page }) => {
    await expect(page.getByText('Yield Positions')).toBeVisible();
  });

  test('Protected Position card is visible', async ({ page }) => {
    await expect(page.getByText('Protected Position').first()).toBeVisible();
  });

  test('Risk Buffer card is visible', async ({ page }) => {
    await expect(page.getByText('Risk Buffer').first()).toBeVisible();
  });

  test('How Ranger Shield Works explainer is visible', async ({ page }) => {
    await expect(page.getByText('How Ranger Shield Works')).toBeVisible();
  });
});

test.describe('Phase 7.1 — Waterfall pre-computed on initial load', () => {
  test('waterfall shows Gross Vault Yield without user interaction', async ({ page }) => {
    await expect(page.getByText('Gross Vault Yield')).toBeVisible();
  });

  test('waterfall does NOT show empty placeholder on fresh load', async ({ page }) => {
    await expect(
      page.getByText('Select a scenario above to view the waterfall breakdown.')
    ).not.toBeVisible();
  });

  test('waterfall shows Protocol Fee row on fresh load', async ({ page }) => {
    await expect(page.getByText(/Protocol Fee/)).toBeVisible();
  });

  test('waterfall shows Protected panel on fresh load', async ({ page }) => {
    // Unique text only in WaterfallBreakdown protected panel
    await expect(page.getByText('Priority — 10% annual target APY')).toBeVisible();
  });

  test('waterfall shows Buffer panel on fresh load', async ({ page }) => {
    // Unique text only in WaterfallBreakdown buffer panel
    await expect(page.getByText('Residual — loss reserve')).toBeVisible();
  });
});

test.describe('Vault overview', () => {
  test('displays base APY', async ({ page }) => {
    // formatApy(0.12) = '+12.00%'; the APY label is 'Base Vault APY'
    await expect(page.locator('span').filter({ hasText: /^\+12\.00%$/ })).toBeVisible();
  });
});

test.describe('Warning banner', () => {
  test('no warning on normal scenario', async ({ page }) => {
    // Check for the specific warning text rather than role="alert"
    // (Next.js adds its own role="alert" route-announcer element)
    await expect(page.getByText('Risk Buffer Exhausted')).not.toBeVisible();
    await expect(page.getByText('Protected Position Absorbing Losses')).not.toBeVisible();
  });
});
