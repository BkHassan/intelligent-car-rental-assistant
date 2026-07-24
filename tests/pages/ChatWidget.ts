import { expect, Locator, Page } from '@playwright/test';

const DEFAULT_BOT_TIMEOUT = 45_000;
const DEFAULT_ACTION_TIMEOUT = 15_000;

/**
 * Page Object for the Rasa Webchat widget (rasa-webchat@1.0.1).
 * Encapsulates locators and resilient interaction patterns for WebSocket-backed flows.
 */
export class ChatWidget {
  readonly page: Page;
  readonly launcher: Locator;
  readonly container: Locator;
  readonly input: Locator;
  readonly sendButton: Locator;
  readonly botMessages: Locator;
  readonly botMessageTexts: Locator;
  readonly userMessages: Locator;
  readonly quickReplies: Locator;
  readonly messages: Locator;

  constructor(page: Page) {
    this.page = page;
    this.launcher = page.locator('.rw-launcher');
    this.container = page.locator('.rw-conversation-container');
    this.input = page.locator('.rw-new-message');
    this.sendButton = page.locator('.rw-send');
    this.botMessages = page.locator('.rw-response');
    this.botMessageTexts = page.locator('.rw-response .rw-message, .rw-response p');
    this.userMessages = page.locator('.rw-client');
    this.quickReplies = page.locator('.rw-reply, .rw-replies > div, .rw-replies > button');
    this.messages = page.locator('.rw-message');
  }

  /** Open the widget via the floating launcher button. */
  async open(): Promise<void> {
    await expect(this.launcher).toBeVisible({ timeout: DEFAULT_ACTION_TIMEOUT });
    await this.launcher.click();
    await expect(this.container).toBeVisible({ timeout: DEFAULT_ACTION_TIMEOUT });
    await expect(this.input).toBeVisible({ timeout: DEFAULT_ACTION_TIMEOUT });
  }

  /** Open the widget via the landing-page CTA (accessibility-first). */
  async openFromLandingButton(): Promise<void> {
    await this.page.getByRole('button', { name: /Discuter avec l'Assistant/i }).click();
    await expect(this.container).toBeVisible({ timeout: DEFAULT_ACTION_TIMEOUT });
    await expect(this.input).toBeVisible({ timeout: DEFAULT_ACTION_TIMEOUT });
  }

  /** Wait until the WebSocket session is connected and the input is interactive. */
  async waitForConnected(): Promise<void> {
    await expect(this.container).toBeVisible({ timeout: DEFAULT_ACTION_TIMEOUT });
    await expect(this.input).toBeVisible({ timeout: DEFAULT_BOT_TIMEOUT });
    await expect(this.input).toBeEnabled({ timeout: DEFAULT_BOT_TIMEOUT });
  }

  /**
   * @deprecated Rasa does not auto-greet on connect — use waitForConnected() then sendMessage('Bonjour').
   */
  async waitForReady(): Promise<void> {
    await this.waitForConnected();
  }

  /** Type a user message and submit with Enter. */
  async sendMessage(text: string): Promise<void> {
    await expect(this.input).toBeEnabled({ timeout: DEFAULT_ACTION_TIMEOUT });
    await this.input.fill(text);
    await this.input.press('Enter');
    await expect(this.userMessages.filter({ hasText: text }).last()).toBeVisible({
      timeout: DEFAULT_ACTION_TIMEOUT,
    });
  }

  /** Click a quick-reply chip by visible label (supports partial / regex match). */
  async clickQuickReply(label: string | RegExp): Promise<void> {
    const reply = this.quickReplies.filter({ hasText: label });
    await expect(reply.first()).toBeVisible({ timeout: DEFAULT_ACTION_TIMEOUT });
    await reply.first().click();
  }

  /** Wait until a bot response matching `matcher` appears (WebSocket-safe poll). */
  async waitForBotMessage(matcher: string | RegExp, timeout = DEFAULT_BOT_TIMEOUT): Promise<void> {
    await expect
      .poll(
        async () =>
          this.container.locator('.rw-response').filter({ hasText: matcher }).count(),
        { timeout },
      )
      .toBeGreaterThan(0);
  }

  /** Assert a bot `.rw-message` bubble matches text/regex (strict, user-facing). */
  async expectBotMessage(matcher: string | RegExp, timeout = DEFAULT_BOT_TIMEOUT): Promise<void> {
    await this.waitForBotMessage(matcher, timeout);
    const message = this.container.locator('.rw-response').filter({ hasText: matcher }).last();
    await expect(message).toBeVisible({ timeout });
  }

  /** Assert at least one bot bubble matches the given text or regex. */
  async expectBotReply(matcher: string | RegExp, timeout = DEFAULT_BOT_TIMEOUT): Promise<void> {
    const message = this.botMessages.filter({ hasText: matcher }).last();
    await expect(message).toBeVisible({ timeout });
  }

  /** Assert the latest bot bubble is not a NLU/Core fallback response. */
  async expectNotFallback(): Promise<void> {
    const latest = this.container.locator('.rw-response').last();
    await expect(latest).toBeVisible();
    await expect(latest).not.toHaveText(
      /Je n'ai pas bien compris|reformuler votre demande|Essayez l'une de ces formulations/i,
    );
  }

  /** Assert a quick-reply chip is visible before interaction. */
  async expectQuickReply(label: string | RegExp, timeout = DEFAULT_ACTION_TIMEOUT): Promise<void> {
    await expect(this.quickReplies.filter({ hasText: label }).first()).toBeVisible({ timeout });
  }

  /** Assert multiple bot replies appear in order (multi-bubble Rasa responses). */
  async expectBotReplies(matchers: Array<string | RegExp>, timeout = DEFAULT_BOT_TIMEOUT): Promise<void> {
    for (const matcher of matchers) {
      await this.expectBotReply(matcher, timeout);
    }
  }

  /** Count visible bot bubbles (useful before/after an action). */
  async botMessageCount(): Promise<number> {
    return this.botMessages.count();
  }

  /** Wait until bot message count increases (signals WebSocket round-trip complete). */
  async waitForNewBotMessage(previousCount: number, timeout = DEFAULT_BOT_TIMEOUT): Promise<void> {
    await expect
      .poll(async () => this.botMessageCount(), { timeout })
      .toBeGreaterThan(previousCount);
  }
}
