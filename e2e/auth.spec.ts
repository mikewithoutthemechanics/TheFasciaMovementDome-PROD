import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/signin');
    await expect(page.locator('text=Sign In')).toBeVisible();
    await expect(page.locator('button:has-text("Sign in with Google")')).toBeVisible();
  });

  test('should navigate to signup', async ({ page }) => {
    await page.goto('/signin');
    await page.click('text=Sign up');
    await expect(page.locator('text=Create Account')).toBeVisible();
  });

  test('should handle OAuth login', async ({ page }) => {
    await page.goto('/signin');
    await page.click('button:has-text("Sign in with Google")');
    // Should redirect to Google OAuth
    await expect(page).toHaveURL(/accounts\.google\.com/);
  });
});
