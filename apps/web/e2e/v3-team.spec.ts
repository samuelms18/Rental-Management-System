import { test, expect } from '@playwright/test';
import { signInStaff } from './helpers';

test('header shows who is signed in; the owner changes a manager to owner and back', async ({ page }) => {
  await signInStaff(page, 'owner@example.com');
  await expect(page.getByRole('link', { name: /Owner/ }).first()).toBeVisible();

  await page.goto('/owner/team');
  const samuel = page.locator('div', { hasText: 'samuel@example.com' }).filter({ has: page.getByRole('button', { name: 'Make owner' }) }).last();
  await expect(samuel).toBeVisible();
  await samuel.getByRole('button', { name: 'Make owner' }).click();
  await expect(page.getByText('Role changed.').first()).toBeVisible();
  const samuelOwner = page.locator('div', { hasText: 'samuel@example.com' }).filter({ has: page.getByRole('button', { name: 'Make manager' }) }).last();
  await samuelOwner.getByRole('button', { name: 'Make manager' }).click();
  await expect(page.getByRole('button', { name: 'Make owner' }).first()).toBeVisible();
  await page.screenshot({ path: 'e2e/screens/13-team.png', fullPage: true });
});

test('a manager cannot change roles', async ({ page }) => {
  await signInStaff(page, 'samuel@example.com');
  await page.goto('/owner/team');
  await expect(page.getByText('Only an owner can change roles or add people.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Make owner' })).toHaveCount(0);
});
