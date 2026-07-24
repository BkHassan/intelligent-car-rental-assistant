import { test, expect } from '@playwright/test';
import { ChatWidget } from './pages/ChatWidget';

test.describe('AutoMaroc Chatbot E2E', () => {
  test.describe.configure({ mode: 'serial' });

  let chat: ChatWidget;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/AutoMaroc/i);
    chat = new ChatWidget(page);
  });

  test('Complete Vehicle Reservation Conversation Flow', async () => {
    await test.step('Step 1 — UI Setup: navigate and open widget', async () => {
      await chat.open();
      await chat.waitForConnected();
    });

    await test.step("Step 2 — Greeting: type 'Bonjour' and verify welcome", async () => {
      const before = await chat.botMessageCount();
      await chat.sendMessage('Bonjour');
      await chat.waitForNewBotMessage(before);
      await chat.expectBotMessage(/AutoMaroc Location|bienvenue/i);
    });

    await test.step("Step 3 — Intent: type 'Je veux louer une voiture' and verify category prompt", async () => {
      const before = await chat.botMessageCount();
      await chat.sendMessage('Je veux louer une voiture');
      await chat.waitForNewBotMessage(before);
      await chat.expectNotFallback();
      await chat.expectBotMessage(/Quel type de véhicule|véhicule|catégorie|Économique|Citadine/i);
      await chat.expectQuickReply(/Économique/i);
    });

    await test.step("Step 4 — Entity: type 'Dacia Logan' and verify price or slot progression", async () => {
      const before = await chat.botMessageCount();
      await chat.sendMessage('Dacia Logan');
      await chat.waitForNewBotMessage(before);
      await chat.expectNotFallback();
      // Économique (Dacia Logan) accepted → asks pickup date; rejects invalid category
      await expect(
        chat.container.locator('.rw-response').filter({ hasText: /Je n'ai pas reconnu cette catégorie/i }),
      ).toHaveCount(0);
      await chat.expectBotMessage(/récupérer|200 DH|Économique|disponible/i, 15_000);
    });
  });

  test('opens widget and displays welcome with quick replies', async () => {
    await test.step('Open chat widget from launcher', async () => {
      await chat.open();
      await chat.waitForConnected();
    });

    await test.step('Send greeting and verify welcome flow', async () => {
      const before = await chat.botMessageCount();
      await chat.sendMessage('Bonjour');
      await chat.waitForNewBotMessage(before);
      await chat.expectBotMessage(/AutoMaroc Location/i);
    });

    await test.step('Verify main navigation quick replies', async () => {
      await chat.expectQuickReply(/Voir les véhicules/i);
      await chat.expectQuickReply(/Consulter les tarifs/i);
      await chat.expectQuickReply(/Réserver/i);
      await chat.expectQuickReply(/Conditions/i);
    });
  });

  test('opens widget from landing-page CTA button', async () => {
    await test.step('Click hero CTA button', async () => {
      await chat.openFromLandingButton();
    });

    await test.step('Verify widget is connected', async () => {
      await chat.waitForConnected();
      const before = await chat.botMessageCount();
      await chat.sendMessage('Bonjour');
      await chat.waitForNewBotMessage(before);
      await chat.expectBotMessage(/AutoMaroc/i);
    });
  });

  test('responds to natural-language greeting', async () => {
    await test.step('Open widget and connect', async () => {
      await chat.open();
      await chat.waitForConnected();
    });

    await test.step('Send greeting in French', async () => {
      const before = await chat.botMessageCount();
      await chat.sendMessage('Bonjour');
      await chat.waitForNewBotMessage(before);
    });

    await test.step('Verify bot acknowledges with welcome flow', async () => {
      await chat.expectBotMessage(/AutoMaroc/i);
      await chat.expectQuickReply(/Voir les véhicules/i);
    });
  });

  test('quick reply navigates to vehicle categories', async () => {
    await test.step('Open widget and greet', async () => {
      await chat.open();
      await chat.waitForConnected();
      await chat.sendMessage('Bonjour');
      await chat.expectBotMessage(/AutoMaroc/i);
    });

    await test.step('Click "Voir les véhicules" quick reply', async () => {
      const before = await chat.botMessageCount();
      await chat.clickQuickReply(/Voir les véhicules/i);
      await chat.waitForNewBotMessage(before);
    });

    await test.step('Verify category carousel responses', async () => {
      await chat.expectBotReplies([
        /Économique/i,
        /Dacia Logan/i,
        /200 DH/i,
        /Citadine/i,
        /Hyundai i10/i,
        /SUV/i,
        /Toyota RAV4/i,
      ]);
      await chat.expectQuickReply(/Réserver cette catégorie/i);
    });
  });

  test('quick reply shows pricing information', async () => {
    await test.step('Open widget and greet', async () => {
      await chat.open();
      await chat.waitForConnected();
      await chat.sendMessage('Bonjour');
      await chat.expectBotMessage(/AutoMaroc/i);
    });

    await test.step('Click pricing quick reply', async () => {
      const before = await chat.botMessageCount();
      await chat.clickQuickReply(/Consulter les tarifs/i);
      await chat.waitForNewBotMessage(before);
    });

    await test.step('Verify tariff response', async () => {
      await chat.expectBotReplies([/tarifs indicatifs/i, /Économique/i, /250 DH/i, /450 DH/i]);
      await chat.expectQuickReply(/Obtenir une estimation/i);
    });
  });

  test('multi-turn reservation flow via quick replies', async () => {
    await test.step('Open widget and start reservation', async () => {
      await chat.open();
      await chat.waitForConnected();
      await chat.sendMessage('Bonjour');
      await chat.expectBotMessage(/AutoMaroc/i);
      const before = await chat.botMessageCount();
      await chat.clickQuickReply(/^📅 Réserver$/i);
      await chat.waitForNewBotMessage(before);
    });

    await test.step('Select vehicle category', async () => {
      await chat.expectBotMessage(/Quel type de véhicule/i);
      await chat.expectQuickReply(/Économique/i);
      const before = await chat.botMessageCount();
      await chat.clickQuickReply(/Économique/i);
      await chat.waitForNewBotMessage(before);
    });

    await test.step('Verify form asks for pickup date', async () => {
      await chat.expectBotMessage(/récupérer/i);
      await chat.expectBotMessage(/Exemples/i);
    });
  });

  test('multi-turn reservation flow via natural language', async () => {
    await test.step('Open widget and connect', async () => {
      await chat.open();
      await chat.waitForConnected();
    });

    await test.step('Request reservation in natural language', async () => {
      const before = await chat.botMessageCount();
      await chat.sendMessage('Je veux louer une voiture');
      await chat.waitForNewBotMessage(before);
    });

    await test.step('Verify reservation form activation', async () => {
      await chat.expectBotMessage(/Quel type de véhicule/i);
      await chat.expectQuickReply(/Citadine/i);
    });
  });

  test('conditions quick reply returns policy with follow-up buttons', async () => {
    await test.step('Open widget and greet', async () => {
      await chat.open();
      await chat.waitForConnected();
      await chat.sendMessage('Bonjour');
      await chat.expectBotMessage(/AutoMaroc/i);
    });

    await test.step('Click conditions quick reply', async () => {
      const before = await chat.botMessageCount();
      await chat.clickQuickReply(/Conditions/i);
      await chat.waitForNewBotMessage(before);
    });

    await test.step('Verify conditions content and CTAs', async () => {
      await chat.expectBotReplies([/conditions essentielles/i, /21 ans/i, /2 ans/i]);
      await chat.expectQuickReply(/Documents requis/i);
    });
  });
});
