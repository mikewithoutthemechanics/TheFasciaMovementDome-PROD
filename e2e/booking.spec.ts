import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test('should display available booking slots', async ({ page }) => {
    await page.goto('/book');
    await expect(page.locator('text=Select a Dome')).toBeVisible();
  });

  test('should allow selecting a dome and date', async ({ page }) => {
    await page.goto('/book');
    await page.click('.dome-option:first-child');
    await page.fill('input[type="date"]', '2024-12-25');
    await expect(page.locator('.time-slots')).toBeVisible();
  });

  test('should complete booking flow', async ({ page }) => {
    await page.goto('/book');
    await page.click('.dome-option:first-child');
    await page.fill('input[type="date"]', '2024-12-25');
    await page.click('.time-slot:first-child');
    await page.click('button:has-text("Confirm Booking")');
    await expect(page.locator('text=Booking Confirmed')).toBeVisible();
  });
});
