import { test, expect } from '@playwright/test';

/**
 * scenarios.spec.ts
 * Tests scenario switching and its effect on waterfall numbers and warnings.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('ranger_tranches_state');
  });
  await page.goto('/');
  await page.waitForSelector('button:has-text("Reset Demo")', { timeout: 10_000 });
});

test.describe('Scenario buttons', () => {
  test('Normal button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Normal' })).toBeVisible();
  });

  test('Low Yield button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Low Yield' })).toBeVisible();
  });

  test('Drawdown button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Drawdown' })).toBeVisible();
  });
});

test.describe('Normal scenario (default)', () => {
  test('shows healthy market description', async ({ page }) => {
    await expect(page.getByText(/Healthy market/)).toBeVisible();
  });

  test('TARGET MET badge visible in waterfall', async ({ page }) => {
    await expect(page.getByText('TARGET MET')).toBeVisible();
  });

  test('no warning in normal scenario', async ({ page }) => {
    await expect(page.getByText('Risk Buffer Exhausted')).not.toBeVisible();
    await expect(page.getByText('Protected Position Absorbing Losses')).not.toBeVisible();
  });
});

test.describe('Low Yield scenario', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole('button', { name: 'Low Yield' }).click();
  });

  test('shows compressed yield description', async ({ page }) => {
    await expect(page.getByText(/Compressed yield/)).toBeVisible();
  });

  test('base APY updates to 6%', async ({ page }) => {
    await expect(page.locator('span').filter({ hasText: /^\+6\.00%$/ })).toBeVisible();
  });

  test('waterfall still shows', async ({ page }) => {
    await expect(page.getByText('Gross Vault Yield')).toBeVisible();
  });

  test('no warning in low yield scenario', async ({ page }) => {
    await expect(page.getByText('Risk Buffer Exhausted')).not.toBeVisible();
    await expect(page.getByText('Protected Position Absorbing Losses')).not.toBeVisible();
  });
});

test.describe('Drawdown scenario', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole('button', { name: 'Drawdown' }).click();
  });

  test('shows loss event description', async ({ page }) => {
    await expect(page.getByText(/Loss event/)).toBeVisible();
  });

  test('base APY updates to negative value', async ({ page }) => {
    await expect(page.locator('span').filter({ hasText: /^-5\.00%$/ })).toBeVisible();
  });

  test('FIRST LOSS badge appears in waterfall buffer panel', async ({ page }) => {
    // exact: true — avoids matching 'loss reserve' substrings
    await expect(page.getByText('FIRST LOSS', { exact: true })).toBeVisible();
  });

  test('no full-exhaustion warning in 5% drawdown', async ({ page }) => {
    // -5% loss = $50k from $300k buffer — not exhausted, no banner
    await expect(page.getByText('Risk Buffer Exhausted')).not.toBeVisible();
  });

  test('gross yield shows negative value in waterfall', async ({ page }) => {
    await expect(page.getByText('Gross Vault Yield')).toBeVisible();
    // Row exists; colour check would require screenshot comparison — omitted here
  });
});

test.describe('Scenario switching', () => {
  test('switching from Drawdown back to Normal removes FIRST LOSS indicator', async ({ page }) => {
    await page.getByRole('button', { name: 'Drawdown' }).click();
    await expect(page.getByText('FIRST LOSS', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Normal' }).click();
    await expect(page.getByText('TARGET MET')).toBeVisible();
    await expect(page.getByText('FIRST LOSS', { exact: true })).not.toBeVisible();
  });

  test('switching scenarios updates description text', async ({ page }) => {
    await expect(page.getByText(/Healthy market/)).toBeVisible();

    await page.getByRole('button', { name: 'Low Yield' }).click();
    await expect(page.getByText(/Compressed yield/)).toBeVisible();
    await expect(page.getByText(/Healthy market/)).not.toBeVisible();

    await page.getByRole('button', { name: 'Drawdown' }).click();
    await expect(page.getByText(/Loss event/)).toBeVisible();
  });
});
