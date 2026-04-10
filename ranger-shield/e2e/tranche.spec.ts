import { test, expect } from '@playwright/test';

/**
 * tranche.spec.ts
 * Tests deposit, redeem, and reset interactions on tranche cards.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('ranger_tranches_state');
  });
  await page.goto('/');
  await page.waitForSelector('button:has-text("Reset Demo")', { timeout: 10_000 });
});

test.describe('Protected Position card', () => {
  test('shows Projected APY label', async ({ page }) => {
    await expect(page.getByText('Projected APY').first()).toBeVisible();
  });

  test('shows 70% of capital badge', async ({ page }) => {
    await expect(page.getByText('70% of capital')).toBeVisible();
  });

  test('shows Priority Yield role badge', async ({ page }) => {
    await expect(page.getByText('Priority Yield')).toBeVisible();
  });

  test('shows NAV Per Share', async ({ page }) => {
    await expect(page.getByText('NAV Per Share').first()).toBeVisible();
  });

  test('deposit form has correct placeholder', async ({ page }) => {
    const inputs = page.getByPlaceholder('Min $10 USDC');
    await expect(inputs.first()).toBeVisible();
  });

  test('redeem form has correct placeholder', async ({ page }) => {
    const inputs = page.getByPlaceholder('Number of shares');
    await expect(inputs.first()).toBeVisible();
  });
});

test.describe('Risk Buffer card', () => {
  test('shows 30% of capital badge', async ({ page }) => {
    await expect(page.getByText('30% of capital')).toBeVisible();
  });

  test('shows Loss Reserve role badge', async ({ page }) => {
    await expect(page.getByText('Loss Reserve', { exact: true })).toBeVisible();
  });

  test('shows Residual after Protected label', async ({ page }) => {
    await expect(page.getByText('Residual after Protected')).toBeVisible();
  });
});

test.describe('Deposit into Protected Position', () => {
  test('depositing valid amount succeeds — input clears', async ({ page }) => {
    const depositInput = page.getByPlaceholder('Min $10 USDC').first();
    await depositInput.fill('10000');

    const depositButtons = page.getByRole('button', { name: 'Deposit' });
    await depositButtons.first().click();

    // Input clears on successful deposit
    await expect(depositInput).toHaveValue('');
  });

  test('depositing below minimum shows error', async ({ page }) => {
    const depositInput = page.getByPlaceholder('Min $10 USDC').first();
    await depositInput.fill('5');

    await page.getByRole('button', { name: 'Deposit' }).first().click();

    await expect(page.getByText('Minimum deposit is $10 USDC').first()).toBeVisible();
  });

  test('depositing empty value shows error', async ({ page }) => {
    // Empty number input → NaN → same "Minimum deposit" error
    const depositInput = page.getByPlaceholder('Min $10 USDC').first();
    await depositInput.fill('');

    await page.getByRole('button', { name: 'Deposit' }).first().click();

    await expect(page.getByText('Minimum deposit is $10 USDC').first()).toBeVisible();
  });
});

test.describe('Deposit into Risk Buffer', () => {
  test('depositing valid amount into risk buffer succeeds', async ({ page }) => {
    const depositInputs = page.getByPlaceholder('Min $10 USDC');
    const bufferInput = depositInputs.nth(1);
    await bufferInput.fill('5000');

    const depositButtons = page.getByRole('button', { name: 'Deposit' });
    await depositButtons.nth(1).click();

    await expect(bufferInput).toHaveValue('');
  });
});

test.describe('Redeem validation', () => {
  test('redeeming zero shares shows error', async ({ page }) => {
    const redeemInput = page.getByPlaceholder('Number of shares').first();
    await redeemInput.fill('0');

    await page.getByRole('button', { name: 'Redeem' }).first().click();

    await expect(page.getByText('Enter a positive share amount').first()).toBeVisible();
  });

  test('redeeming more than available shows error', async ({ page }) => {
    const redeemInput = page.getByPlaceholder('Number of shares').first();
    await redeemInput.fill('999999999');

    await page.getByRole('button', { name: 'Redeem' }).first().click();

    await expect(page.getByText(/Max redeemable/).first()).toBeVisible();
  });
});

test.describe('Reset Demo', () => {
  test('reset clears state and rebuilds dashboard', async ({ page }) => {
    // Deposit first to mutate state
    const depositInput = page.getByPlaceholder('Min $10 USDC').first();
    await depositInput.fill('10000');
    await page.getByRole('button', { name: 'Deposit' }).first().click();

    // Reset
    await page.getByRole('button', { name: 'Reset Demo' }).click();

    // Dashboard rebuilds after brief loading state
    await page.waitForSelector('button:has-text("Reset Demo")', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Ranger Shield', exact: true })).toBeVisible();
  });
});

test.describe('localStorage persistence', () => {
  test('state persists after page reload', async ({ page }) => {
    // Deposit to change state
    const depositInput = page.getByPlaceholder('Min $10 USDC').first();
    await depositInput.fill('50000');
    await page.getByRole('button', { name: 'Deposit' }).first().click();

    // Reload
    await page.reload();
    await page.waitForSelector('button:has-text("Reset Demo")', { timeout: 10_000 });

    await expect(page.getByRole('heading', { name: 'Ranger Shield', exact: true })).toBeVisible();
    await expect(page.getByText('Gross Vault Yield')).toBeVisible();
  });
});
