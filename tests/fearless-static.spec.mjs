import { test, expect } from '@playwright/test';
import { createVisualEvidenceRecorder } from './support/clover-visual-evidence.mjs';

test('reader can navigate the static book, album, and artwork experience', async ({ page }, testInfo) => {
  await page.route(/\.(?:mp3|mp4|m4a|wav)(?:\?.*)?$/i, (route) => route.abort());

  const evidence = createVisualEvidenceRecorder(page, testInfo, {
    projectId: 'fearless-free-ebook',
    baseOrigin: 'http://127.0.0.1:4173'
  });
  let journeyCompleted = false;

  try {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/Fearless: The Altar of Light and Darkness/i);
    await expect(page.getByRole('heading', { level: 1, name: 'The Altar of Light and Darkness' })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    const pdfLink = page.getByRole('link', { name: 'Read PDF' }).first();
    await expect(pdfLink).toHaveAttribute('href', /Fearless_Book1_RollinD_Free_Ebook\.pdf$/);

    const albumTitle = page.locator('[data-album-panel-title]');
    await expect(albumTitle).not.toHaveText(/Loading album|Album unavailable/i);
    const firstTrackTitle = (await albumTitle.textContent())?.trim();
    expect(firstTrackTitle).toBeTruthy();
    await evidence.capture('reader-home', { priority: 100 });

    if (testInfo.project.name === 'mobile-webkit') {
      const menuButton = page.locator('[data-menu-toggle]');
      await expect(menuButton).toBeVisible();
      await menuButton.click();
      await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
      await evidence.capture('mobile-navigation', { priority: 95 });
      await page.keyboard.press('Escape');
      await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    }

    await page.getByRole('button', { name: 'Next song' }).click();
    await expect(albumTitle).not.toHaveText(firstTrackTitle || '');
    const secondTrackTitle = (await albumTitle.textContent())?.trim();
    expect(secondTrackTitle).toBeTruthy();

    await page.getByRole('button', { name: 'Show lyrics' }).click();
    const lyricsPanel = page.locator('[data-album-lyrics-panel]');
    await expect(lyricsPanel).toBeVisible();
    await expect(lyricsPanel.locator('[data-album-lyrics-title]')).toHaveText(secondTrackTitle || '');
    await evidence.capture('album-lyrics', { priority: 85 });
    await page.getByRole('button', { name: 'Close lyrics' }).click();
    await expect(lyricsPanel).toBeHidden();

    const firstArtwork = page.locator('.book-art-card a').first();
    await firstArtwork.click();
    const lightbox = page.locator('[data-art-lightbox]');
    await expect(lightbox).toBeVisible();
    await evidence.capture('artwork-lightbox', { priority: 80 });
    await page.getByRole('button', { name: /close/i }).last().click();
    await expect(lightbox).toBeHidden();

    const readerResponse = await page.goto('/read.html', { waitUntil: 'domcontentloaded' });
    expect(readerResponse?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/Fearless/i);
    await evidence.capture('book-reader', { priority: 70 });
    journeyCompleted = true;
  } finally {
    const receipt = await evidence.finalize();
    if (journeyCompleted) expect(receipt.overallStatus).toBe('passed');
  }
});
