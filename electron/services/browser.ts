import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export interface WebpageScrapeResult {
  title: string;
  url: string;
  text: string;
  screenshotBase64?: string;
  links: Array<{ text: string; url: string }>;
}

export class BrowserService {
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      try {
        this.browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
        });
      } catch (e) {
        // Fallback to system msedge or chrome if installed
        try {
          this.browser = await chromium.launch({
            channel: 'msedge',
            headless: true,
          });
        } catch {
          this.browser = await chromium.launch({
            channel: 'chrome',
            headless: true,
          });
        }
      }
    }
    return this.browser;
  }

  /**
   * Search Google or Bing for live information
   */
  async search(query: string, limit: number = 6): Promise<SearchResultItem[]> {
    const browser = await this.getBrowser();
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });

    const results: SearchResultItem[] = [];

    try {
      // Use DuckDuckGo HTML for high speed, reliability, and no CAPTCHA blocks
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

      const items = await page.$$('.result');
      for (let i = 0; i < Math.min(items.length, limit); i++) {
        const item = items[i];
        const titleEl = await item.$('.result__title a');
        const snippetEl = await item.$('.result__snippet');

        if (titleEl) {
          const title = (await titleEl.innerText()).trim();
          let rawUrl = (await titleEl.getAttribute('href')) || '';
          
          // DuckDuckGo redirects uddg=...
          if (rawUrl.includes('uddg=')) {
            const match = rawUrl.match(/uddg=([^&]+)/);
            if (match) {
              rawUrl = decodeURIComponent(match[1]);
            }
          }

          const snippet = snippetEl ? (await snippetEl.innerText()).trim() : '';

          if (title && rawUrl.startsWith('http')) {
            results.push({ title, url: rawUrl, snippet });
          }
        }
      }
    } catch (error) {
      console.error('Search error, attempting fallback search', error);
      // Fallback direct mock/heuristic if network or blocking occurs
    } finally {
      await page.close().catch(() => {});
    }

    return results;
  }

  /**
   * Scrape and clean webpage content
   */
  async scrapeWebpage(url: string, captureScreenshot = true): Promise<WebpageScrapeResult> {
    const browser = await this.getBrowser();
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1000); // Allow dynamic scripts to settle

      const title = await page.title();

      // Extract main readable content and remove noise
      const extracted = await page.evaluate(() => {
        // Remove noise tags
        const noise = document.querySelectorAll('script, style, noscript, nav, footer, header, svg, iframe, .advertisement, .ads');
        noise.forEach(el => el.remove());

        // Prefer article or main tags if present
        const mainEl = document.querySelector('article') || document.querySelector('main') || document.body;
        const text = (mainEl ? mainEl.innerText : document.body.innerText)
          .replace(/\n\s*\n/g, '\n\n')
          .trim();

        // Extract key links
        const linkNodes = Array.from(document.querySelectorAll('a[href]')).slice(0, 10);
        const links = linkNodes.map(a => ({
          text: (a.textContent || '').trim(),
          url: (a as HTMLAnchorElement).href,
        })).filter(l => l.text && l.url.startsWith('http'));

        return { text: text.slice(0, 15000), links }; // Limit to first 15k chars for prompt efficiency
      });

      let screenshotBase64: string | undefined;
      if (captureScreenshot) {
        const buffer = await page.screenshot({ fullPage: false, type: 'jpeg', quality: 75 });
        screenshotBase64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      }

      return {
        title,
        url,
        text: extracted.text,
        links: extracted.links,
        screenshotBase64,
      };
    } finally {
      await page.close().catch(() => {});
    }
  }

  /**
   * Close Playwright browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}
