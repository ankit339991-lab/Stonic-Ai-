import { chromium, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { EventEmitter } from 'events';

export interface VisibleBrowserStatus {
  isEnabled: boolean;
  isOpen: boolean;
  currentWebsite: string;
  currentAction: string;
  lastCommand: string;
  profilePath: string;
  logs: Array<{ timestamp: string; message: string; type: 'info' | 'success' | 'warn' | 'error' }>;
}

export class VisibleBrowserService extends EventEmitter {
  private context: BrowserContext | null = null;
  private activePage: Page | null = null;
  private isEnabled: boolean = true;
  private currentAction: string = 'Idle';
  private currentWebsite: string = 'None';
  private lastCommand: string = '';
  private logs: Array<{ timestamp: string; message: string; type: 'info' | 'success' | 'warn' | 'error' }> = [];
  private profileDir: string;
  private isAborted: boolean = false;

  constructor() {
    super();
    // Dedicated persistent profile directory so logins to ChatGPT, Gemini, Google persist
    try {
      this.profileDir = path.join(app.getPath('userData'), 'stonic_chrome_profile');
    } catch {
      this.profileDir = path.join(process.cwd(), '.stonic_data', 'stonic_chrome_profile');
    }

    if (!fs.existsSync(this.profileDir)) {
      fs.mkdirSync(this.profileDir, { recursive: true });
    }
  }

  private addLog(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logItem = { timestamp, message, type };
    this.logs.unshift(logItem);
    if (this.logs.length > 50) this.logs.pop();
    this.emitStatus();
  }

  private setAction(action: string, website?: string) {
    this.currentAction = action;
    if (website) this.currentWebsite = website;
    this.emitStatus();
  }

  public getStatus(): VisibleBrowserStatus {
    return {
      isEnabled: this.isEnabled,
      isOpen: this.context !== null,
      currentWebsite: this.currentWebsite,
      currentAction: this.currentAction,
      lastCommand: this.lastCommand,
      profilePath: this.profileDir,
      logs: [...this.logs],
    };
  }

  private emitStatus() {
    this.emit('status-update', this.getStatus());
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    this.addLog(`Visible Browser Automation set to ${enabled ? 'ENABLED' : 'DISABLED'}`, 'info');
    if (!enabled && this.context) {
      this.close();
    }
    this.emitStatus();
  }

  public stopAutomation() {
    this.isAborted = true;
    this.setAction('Stopped by User');
    this.addLog('Browser automation execution halted by user.', 'warn');
  }

  /**
   * Get or launch the visible Google Chrome browser using persistent profile
   */
  public async getPage(): Promise<Page> {
    this.isAborted = false;

    if (this.activePage && !this.activePage.isClosed() && this.context) {
      return this.activePage;
    }

    this.setAction('Launching visible Google Chrome...');
    this.addLog('Launching visible Google Chrome with persistent profile...', 'info');

    // Launch options for visible Chrome with persistent profile
    const launchArgs = [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-default-browser-check',
      '--disable-infobars',
    ];

    try {
      // 1. Try launching actual Google Chrome channel
      this.context = await chromium.launchPersistentContext(this.profileDir, {
        headless: false,
        channel: 'chrome',
        viewport: null, // Full window
        args: launchArgs,
      });
      this.addLog('Connected to Google Chrome successfully.', 'success');
    } catch (e1: any) {
      this.addLog(`Chrome channel fallback triggered: ${e1.message}`, 'warn');
      try {
        // 2. Try Microsoft Edge channel
        this.context = await chromium.launchPersistentContext(this.profileDir, {
          headless: false,
          channel: 'msedge',
          viewport: null,
          args: launchArgs,
        });
        this.addLog('Connected to Microsoft Edge successfully.', 'success');
      } catch (e2: any) {
        // 3. Fallback to bundled Chromium (visible)
        this.context = await chromium.launchPersistentContext(this.profileDir, {
          headless: false,
          viewport: null,
          args: launchArgs,
        });
        this.addLog('Connected to visible Chromium browser.', 'info');
      }
    }

    this.context.on('close', () => {
      this.context = null;
      this.activePage = null;
      this.currentWebsite = 'None';
      this.setAction('Idle');
      this.addLog('Visible browser window closed.', 'info');
    });

    const pages = this.context.pages();
    this.activePage = pages.length > 0 ? pages[0] : await this.context.newPage();

    this.activePage.on('close', () => {
      this.activePage = null;
      this.emitStatus();
    });

    this.emitStatus();
    return this.activePage;
  }

  /**
   * Open a specific website visibly
   */
  async openWebsite(target: 'chatgpt' | 'gemini' | 'google' | 'youtube' | string): Promise<{ success: boolean; message: string; url: string }> {
    this.lastCommand = `Open ${target}`;
    const page = await this.getPage();

    let url = target;
    let siteName = target;

    if (target.toLowerCase().includes('chatgpt')) {
      url = 'https://chatgpt.com';
      siteName = 'ChatGPT';
    } else if (target.toLowerCase().includes('gemini')) {
      url = 'https://gemini.google.com';
      siteName = 'Google Gemini';
    } else if (target.toLowerCase().includes('google')) {
      url = 'https://www.google.com';
      siteName = 'Google';
    } else if (target.toLowerCase().includes('youtube')) {
      url = 'https://www.youtube.com';
      siteName = 'YouTube';
    }

    this.setAction(`Navigating to ${siteName}...`, siteName);
    this.addLog(`Opening ${url} in visible browser...`, 'info');

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.bringToFront();
      this.setAction('Ready', siteName);
      this.addLog(`${siteName} loaded and ready.`, 'success');
      return { success: true, message: `${siteName} opened successfully in Chrome.`, url };
    } catch (err: any) {
      this.setAction('Error loading page', siteName);
      this.addLog(`Failed to load ${siteName}: ${err.message}`, 'error');
      return { success: false, message: `Failed to open ${siteName}: ${err.message}`, url };
    }
  }

  /**
   * 1. CHATGPT AUTOMATION: Type question, submit, wait for generation, extract complete answer
   */
  async askChatGPT(question: string): Promise<{ success: boolean; answer: string; message: string }> {
    this.lastCommand = `Ask ChatGPT: "${question}"`;
    this.addLog(`Automating ChatGPT query: "${question}"`, 'info');

    try {
      const page = await this.getPage();

      // Ensure we are on chatgpt.com
      if (!page.url().includes('chatgpt.com')) {
        this.setAction('Navigating to chatgpt.com...', 'ChatGPT');
        await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
      }

      await page.bringToFront();

      // Robust fallback selectors for ChatGPT prompt input
      this.setAction('Locating ChatGPT prompt input...', 'ChatGPT');
      const inputSelectors = [
        '#prompt-textarea',
        'div[contenteditable="true"]',
        'textarea[placeholder*="Message"]',
        'textarea[data-id="root"]',
        'textarea',
        '[data-placeholder]',
      ];

      let inputFound = false;
      for (const selector of inputSelectors) {
        if (this.isAborted) throw new Error('Automation stopped by user');
        const loc = page.locator(selector).first();
        if (await loc.isVisible({ timeout: 2000 }).catch(() => false)) {
          this.setAction('Typing question into ChatGPT...', 'ChatGPT');
          this.addLog(`Typing prompt: "${question}"`, 'info');
          await loc.click();
          await loc.fill(question);
          inputFound = true;
          break;
        }
      }

      if (!inputFound) {
        // Fallback: keyboard type
        await page.keyboard.type(question, { delay: 10 });
      }

      await page.waitForTimeout(500);
      if (this.isAborted) throw new Error('Automation stopped by user');

      // Submit question
      this.setAction('Submitting question...', 'ChatGPT');
      const sendButtonSelectors = [
        'button[data-testid="send-button"]',
        'button[aria-label="Send prompt"]',
        'button[aria-label="Send message"]',
        'button:has(svg[viewBox])',
      ];

      let sent = false;
      for (const btnSel of sendButtonSelectors) {
        const btn = page.locator(btnSel).first();
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
          const isEnabled = await btn.isEnabled().catch(() => false);
          if (isEnabled) {
            await btn.click();
            sent = true;
            this.addLog('Clicked ChatGPT send button.', 'info');
            break;
          }
        }
      }

      if (!sent) {
        await page.keyboard.press('Enter');
        this.addLog('Pressed Enter to submit prompt to ChatGPT.', 'info');
      }

      // Wait until ChatGPT finishes generating its response
      this.setAction('Waiting for ChatGPT response generation...', 'ChatGPT');
      this.addLog('Waiting for ChatGPT response to complete...', 'info');

      // In ChatGPT, during generation, the stop button appears or response is streaming
      const stopSelectors = [
        'button[data-testid="stop-button"]',
        'button[aria-label="Stop generating"]',
        '.result-streaming',
      ];

      // Wait a moment for generation to initiate
      await page.waitForTimeout(1500);

      // Poll until stop button is gone and text stabilizes
      let lastText = '';
      let sameCount = 0;
      const startTime = Date.now();
      const maxWaitMs = 60000; // 60s max wait

      while (Date.now() - startTime < maxWaitMs) {
        if (this.isAborted) throw new Error('Automation stopped by user');

        // Check if stop button is visible
        let isStreaming = false;
        for (const stopSel of stopSelectors) {
          if (await page.locator(stopSel).first().isVisible().catch(() => false)) {
            isStreaming = true;
            break;
          }
        }

        // Extract latest assistant message content
        const currentText = await page.evaluate(() => {
          const assistantMsgs = document.querySelectorAll('[data-message-author-role="assistant"], .agent-turn, .markdown');
          if (assistantMsgs.length > 0) {
            const last = assistantMsgs[assistantMsgs.length - 1];
            return (last.textContent || '').trim();
          }
          return '';
        });

        if (!isStreaming && currentText.length > 10) {
          if (currentText === lastText) {
            sameCount++;
            if (sameCount >= 2) {
              // Text has stabilized and streaming has stopped
              break;
            }
          } else {
            sameCount = 0;
            lastText = currentText;
          }
        }

        await page.waitForTimeout(1000);
      }

      // Final extraction of complete answer
      this.setAction('Extracting final ChatGPT answer...', 'ChatGPT');
      const finalAnswer = await page.evaluate(() => {
        const assistantMsgs = document.querySelectorAll('[data-message-author-role="assistant"], .agent-turn, .markdown');
        if (assistantMsgs.length > 0) {
          const last = assistantMsgs[assistantMsgs.length - 1] as HTMLElement;
          // Clone to strip unnecessary UI buttons/footers
          const clone = last.cloneNode(true) as HTMLElement;
          const toRemove = clone.querySelectorAll('button, svg, [role="button"], .sr-only');
          toRemove.forEach((el) => el.remove());
          return (clone.innerText || clone.textContent || '').trim();
        }
        return '';
      });

      this.setAction('Completed', 'ChatGPT');
      if (finalAnswer) {
        this.addLog(`Extracted response (${finalAnswer.length} chars).`, 'success');
        return {
          success: true,
          answer: finalAnswer,
          message: `ChatGPT Response: ${finalAnswer}`,
        };
      } else {
        const msg = 'Prompt was sent to ChatGPT, but response text could not be extracted automatically. Please view the visible Chrome window.';
        this.addLog(msg, 'warn');
        return { success: false, answer: '', message: msg };
      }
    } catch (err: any) {
      this.setAction('Error', 'ChatGPT');
      this.addLog(`ChatGPT automation error: ${err.message}`, 'error');
      return { success: false, answer: '', message: `ChatGPT Automation error: ${err.message}` };
    }
  }

  /**
   * 2. GEMINI AUTOMATION: Type question, submit, wait for response, extract answer
   */
  async askGemini(question: string): Promise<{ success: boolean; answer: string; message: string }> {
    this.lastCommand = `Ask Gemini: "${question}"`;
    this.addLog(`Automating Gemini query: "${question}"`, 'info');

    try {
      const page = await this.getPage();

      // Ensure we are on gemini.google.com
      if (!page.url().includes('gemini.google.com')) {
        this.setAction('Navigating to gemini.google.com...', 'Gemini');
        await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
      }

      await page.bringToFront();

      // Locate prompt input in Gemini
      this.setAction('Locating Gemini prompt input...', 'Gemini');
      const inputSelectors = [
        'rich-textarea .ql-editor',
        'div[contenteditable="true"]',
        'textarea[aria-label*="prompt"]',
        '[aria-label*="Enter a prompt"]',
        '.text-input-field',
        'textarea',
      ];

      let inputFound = false;
      for (const selector of inputSelectors) {
        if (this.isAborted) throw new Error('Automation stopped by user');
        const loc = page.locator(selector).first();
        if (await loc.isVisible({ timeout: 2000 }).catch(() => false)) {
          this.setAction('Typing question into Gemini...', 'Gemini');
          this.addLog(`Typing prompt to Gemini: "${question}"`, 'info');
          await loc.click();
          await loc.fill(question);
          inputFound = true;
          break;
        }
      }

      if (!inputFound) {
        await page.keyboard.type(question, { delay: 10 });
      }

      await page.waitForTimeout(500);
      if (this.isAborted) throw new Error('Automation stopped by user');

      // Submit question in Gemini
      this.setAction('Submitting question to Gemini...', 'Gemini');
      const sendButtons = [
        'button[aria-label*="Send prompt"]',
        'button.send-button',
        'button[aria-label*="Submit"]',
        '.send-button-container button',
      ];

      let sent = false;
      for (const btnSel of sendButtons) {
        const btn = page.locator(btnSel).first();
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
          const isEnabled = await btn.isEnabled().catch(() => false);
          if (isEnabled) {
            await btn.click();
            sent = true;
            this.addLog('Clicked Gemini send button.', 'info');
            break;
          }
        }
      }

      if (!sent) {
        await page.keyboard.press('Enter');
        this.addLog('Pressed Enter to submit prompt to Gemini.', 'info');
      }

      // Wait for generation to complete
      this.setAction('Waiting for Gemini response generation...', 'Gemini');
      this.addLog('Waiting for Gemini response to complete...', 'info');

      await page.waitForTimeout(2000);

      // Poll until response finishes mutating
      let lastText = '';
      let sameCount = 0;
      const startTime = Date.now();
      const maxWaitMs = 60000;

      while (Date.now() - startTime < maxWaitMs) {
        if (this.isAborted) throw new Error('Automation stopped by user');

        const isStopVisible = await page.locator('button[aria-label*="Stop"]').first().isVisible().catch(() => false);

        const currentText = await page.evaluate(() => {
          const responseNodes = document.querySelectorAll('.model-response-text, message-content, .response-container-content');
          if (responseNodes.length > 0) {
            const last = responseNodes[responseNodes.length - 1];
            return (last.textContent || '').trim();
          }
          return '';
        });

        if (!isStopVisible && currentText.length > 10) {
          if (currentText === lastText) {
            sameCount++;
            if (sameCount >= 2) {
              break;
            }
          } else {
            sameCount = 0;
            lastText = currentText;
          }
        }

        await page.waitForTimeout(1000);
      }

      // Final extraction
      this.setAction('Extracting Gemini answer...', 'Gemini');
      const finalAnswer = await page.evaluate(() => {
        const responseNodes = document.querySelectorAll('.model-response-text, message-content, .response-container-content');
        if (responseNodes.length > 0) {
          const last = responseNodes[responseNodes.length - 1] as HTMLElement;
          const clone = last.cloneNode(true) as HTMLElement;
          const toRemove = clone.querySelectorAll('button, svg, [role="button"]');
          toRemove.forEach((el) => el.remove());
          return (clone.innerText || clone.textContent || '').trim();
        }
        return '';
      });

      this.setAction('Completed', 'Gemini');
      if (finalAnswer) {
        this.addLog(`Extracted Gemini response (${finalAnswer.length} chars).`, 'success');
        return {
          success: true,
          answer: finalAnswer,
          message: `Gemini Response: ${finalAnswer}`,
        };
      } else {
        const msg = 'Prompt was sent to Gemini, but response text could not be extracted automatically. Please view visible Chrome window.';
        this.addLog(msg, 'warn');
        return { success: false, answer: '', message: msg };
      }
    } catch (err: any) {
      this.setAction('Error', 'Gemini');
      this.addLog(`Gemini automation error: ${err.message}`, 'error');
      return { success: false, answer: '', message: `Gemini Automation error: ${err.message}` };
    }
  }

  /**
   * 3. GOOGLE SEARCH AUTOMATION: Type query, submit, extract results, summarize
   */
  async searchGoogle(query: string): Promise<{ success: boolean; summary: string; results: Array<{ title: string; snippet: string; url: string }> }> {
    this.lastCommand = `Google Search: "${query}"`;
    this.addLog(`Executing visible Google search for: "${query}"`, 'info');

    try {
      const page = await this.getPage();
      this.setAction('Navigating to Google...', 'Google');
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.bringToFront();

      this.setAction('Extracting Google search results...', 'Google');
      await page.waitForTimeout(1500);

      const results = await page.evaluate(() => {
        const items: Array<{ title: string; snippet: string; url: string }> = [];
        const resultContainers = document.querySelectorAll('div.g, div[data-sokoban-container]');

        resultContainers.forEach((container) => {
          const titleEl = container.querySelector('h3');
          const linkEl = container.querySelector('a');
          const snippetEl = container.querySelector('.VwiC3b, .IsZvec, [style*="-webkit-line-clamp"]');

          if (titleEl && linkEl && linkEl.href.startsWith('http')) {
            const title = (titleEl.textContent || '').trim();
            const snippet = snippetEl ? (snippetEl.textContent || '').trim() : '';
            if (title && !items.some((it) => it.url === linkEl.href)) {
              items.push({ title, snippet, url: linkEl.href });
            }
          }
        });

        return items.slice(0, 5);
      });

      this.setAction('Completed', 'Google');
      this.addLog(`Found ${results.length} search results for "${query}".`, 'success');

      let spokenSummary = '';
      if (results.length > 0) {
        const top = results[0];
        spokenSummary = `Google search for ${query}: Top result is "${top.title}". ${top.snippet || ''}`;
      } else {
        spokenSummary = `Google search results for ${query} are displayed in your Chrome browser window.`;
      }

      return {
        success: true,
        summary: spokenSummary,
        results,
      };
    } catch (err: any) {
      this.setAction('Error', 'Google');
      this.addLog(`Google search error: ${err.message}`, 'error');
      return { success: false, summary: `Google search error: ${err.message}`, results: [] };
    }
  }

  /**
   * 4. YOUTUBE AUTOMATION: Search, click top result, autoplay, control playback
   */
  async playYouTube(query: string): Promise<{ success: boolean; title: string; url: string }> {
    this.lastCommand = `Play YouTube: "${query}"`;
    this.addLog(`Searching YouTube and playing: "${query}"`, 'info');

    try {
      const page = await this.getPage();
      this.setAction(`Searching YouTube for "${query}"...`, 'YouTube');
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.bringToFront();

      this.setAction('Selecting top video result...', 'YouTube');
      // Wait for video items to appear
      await page.waitForSelector('ytd-video-renderer, ytd-grid-video-renderer', { timeout: 15000 });

      // Click the first video title
      const videoLink = page.locator('ytd-video-renderer a#video-title').first();
      const videoTitle = (await videoLink.innerText().catch(() => query)).trim();

      this.setAction(`Playing "${videoTitle}"...`, 'YouTube');
      this.addLog(`Opening video: "${videoTitle}"`, 'info');
      await videoLink.click();

      // Wait for video player and ensure playback
      await page.waitForSelector('video.html5-main-video', { timeout: 15000 }).catch(() => {});
      await page.evaluate(() => {
        const v = document.querySelector('video') as HTMLVideoElement;
        if (v) {
          v.play().catch(() => {});
        }
      });

      this.setAction(`Playing: ${videoTitle}`, 'YouTube');
      this.addLog(`Video "${videoTitle}" is now playing on YouTube.`, 'success');

      return {
        success: true,
        title: videoTitle,
        url: page.url(),
      };
    } catch (err: any) {
      this.setAction('Error', 'YouTube');
      this.addLog(`YouTube playback error: ${err.message}`, 'error');
      return { success: false, title: query, url: '' };
    }
  }

  /**
   * Control YouTube playback: pause, resume, stop
   */
  async controlYouTube(action: 'pause' | 'resume' | 'stop'): Promise<{ success: boolean; message: string }> {
    this.lastCommand = `YouTube ${action}`;
    this.addLog(`Executing YouTube playback command: ${action}`, 'info');

    if (!this.activePage || this.activePage.isClosed()) {
      return { success: false, message: 'Visible browser is not currently active.' };
    }

    try {
      const executed = await this.activePage.evaluate((act) => {
        const v = document.querySelector('video') as HTMLVideoElement;
        if (!v) return false;
        if (act === 'pause') {
          v.pause();
          return true;
        } else if (act === 'resume') {
          v.play();
          return true;
        } else if (act === 'stop') {
          v.pause();
          v.currentTime = 0;
          return true;
        }
        return false;
      }, action);

      if (executed) {
        this.addLog(`YouTube video ${action}d successfully.`, 'success');
        return { success: true, message: `YouTube video ${action}d successfully.` };
      } else {
        // Fallback: send Space key to toggle play/pause
        await this.activePage.keyboard.press('Space');
        return { success: true, message: `Sent toggle playback command to video.` };
      }
    } catch (err: any) {
      this.addLog(`YouTube control error: ${err.message}`, 'error');
      return { success: false, message: `Failed to ${action} YouTube: ${err.message}` };
    }
  }

  /**
   * Close visible browser session
   */
  async close() {
    if (this.context) {
      try {
        await this.context.close();
      } catch {}
      this.context = null;
      this.activePage = null;
      this.currentWebsite = 'None';
      this.setAction('Idle');
      this.addLog('Visible browser session closed.', 'info');
    }
  }
}
