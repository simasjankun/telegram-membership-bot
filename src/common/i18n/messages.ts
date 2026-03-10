export interface MessageVars {
  firstName?: string;
  communityName?: string;
  date?: string;
  hours?: string;
  displayName?: string;
  standardPrice?: string;
  vipPrice?: string;
}

type MsgFn = (v: MessageVars) => string;

export const messages: Record<'lt' | 'en', Record<string, MsgFn>> = {
  lt: {
    'start.chooseTier': ({ firstName, communityName }) =>
      `Sveiki, ${firstName}! 👋\n\n` +
      `Pasirinkite narystę *${communityName}*:\n\n` +
      `📢 Turinio kanalas ir 💬 diskusijų grupė — abiejose narystėse vienodi.\n` +
      `⭐ *VIP* nariai gauna asmeninį ženklelį diskusijų grupėje.`,

    'start.proceedToCheckout': () =>
      `Puiku! Spauskite žemiau, kad tęstumėte mokėjimą:`,

    'button.standardTier': ({ standardPrice }) => `Standartinė – ${standardPrice}`,
    'button.vipTier': ({ vipPrice }) => `⭐ VIP – ${vipPrice}`,
    'button.checkout': () => `Apmokėti 💳`,

    'start.new': ({ firstName, communityName }) =>
      `Sveiki, ${firstName}! 👋\n\n` +
      `Džiaugiamės, kad radote mus! Prisijunkite prie *${communityName}* ir gaukite prieigą prie:\n\n` +
      `📢 *Turinio kanalo* — išskirtiniai įrašai tik nariams\n` +
      `💬 *Diskusijų grupės* — bendravimas su kitais nariais\n\n` +
      `Paspauskite mygtuką žemiau ir prisijunkite! 👇`,

    'start.active': ({ firstName }) =>
      `Sveiki sugrįžę, ${firstName}! 🌸\n\n` +
      `Jūsų prenumerata aktyvi. Prisijunkite prie bendruomenės mygtukais žemiau:`,

    'start.pastDue': ({ firstName }) =>
      `Sveiki, ${firstName}! ⚠️\n\n` +
      `Jūsų mokėjimas vėluoja. Atnaujinkite mokėjimo duomenis, kad išlaikytumėte prieigą prie bendruomenės.`,

    'button.subscribe': () => `Prenumeruoti 💳`,
    'button.channel': () => `📢 Turinio kanalas`,
    'button.group': () => `💬 Diskusijų grupė`,

    'subscription.activated': ({ communityName }) =>
      `🎉 *Prenumerata aktyvuota!*\n\n` +
      `Sveiki atvykę į *${communityName}*! Labai džiaugiamės, kad esate su mumis. ❤️\n\n` +
      `Paspauskite žemiau esančius mygtukus, kad prisijungtumėte:`,

    'subscription.canceled': () =>
      `ℹ️ *Prenumerata atšaukta*\n\n` +
      `Jūsų prenumerata atšaukta. Prieiga bus panaikinta artimiausiu metu.\n\n` +
      `Norėdami vėl prisijungti, bet kada rašykite /start ❤️`,

    'payment.failed': ({ date }) =>
      `⚠️ *Mokėjimo problema*\n\n` +
      `Nepavyko apdoroti Jūsų mokėjimo. Turite iki *${date}*, kad atnaujintumėte mokėjimo duomenis ir išlaikytumėte prieigą.\n\n` +
      `Jei kyla klausimų — susisiekite su mumis.`,

    'payment.gracePeriodReminder': ({ hours, communityName }) =>
      `⏰ *Priminimas*\n\n` +
      `Jūsų prieiga prie *${communityName}* bus panaikinta maždaug po *${hours} val.*\n\n` +
      `Atnaujinkite mokėjimo duomenis, kad išlaikytumėte prieigą.`,

    'payment.accessRemoved': ({ communityName }) =>
      `😔 *Prieiga panaikinta*\n\n` +
      `Jūsų prenumerata neaktyvi, todėl prieiga prie *${communityName}* buvo panaikinta.\n\n` +
      `Norėdami vėl prisijungti — rašykite /start 👇`,

    'join.approved.channel': () =>
      `✅ *Patvirtinta!*\n\n` +
      `Jūsų prisijungimas prie turinio kanalo patvirtintas. Malonaus skaitymo! 📖`,

    'join.approved.group': () =>
      `✅ *Patvirtinta!*\n\n` +
      `Jūsų prisijungimas prie diskusijų grupės patvirtintas. Laukiame Jūsų! 💬`,

    'join.declined': () =>
      `❌ *Prieiga negalima*\n\n` +
      `Jūsų prenumerata šiuo metu neaktyvi. Norėdami prisijungti — rašykite /start botui.`,

    'group.welcome': ({ displayName, communityName }) =>
      `Sveiki atvykę, ${displayName}! 👋 Džiaugiamės, kad prisijungėte prie *${communityName}*! ❤️`,
  },

  en: {
    'start.chooseTier': ({ firstName, communityName }) =>
      `Hello, ${firstName}! 👋\n\n` +
      `Choose your *${communityName}* membership:\n\n` +
      `📢 Content channel and 💬 discussion group are included in both plans.\n` +
      `⭐ *VIP* members receive a personal badge in the discussion group.`,

    'start.proceedToCheckout': () =>
      `Great! Press below to proceed to payment:`,

    'button.standardTier': ({ standardPrice }) => `Standard – ${standardPrice}`,
    'button.vipTier': ({ vipPrice }) => `⭐ VIP – ${vipPrice}`,
    'button.checkout': () => `Pay 💳`,

    'start.new': ({ firstName, communityName }) =>
      `Hello, ${firstName}! 👋\n\n` +
      `Welcome to *${communityName}*! Subscribe to get access to:\n\n` +
      `📢 *Content channel* — exclusive posts for members\n` +
      `💬 *Discussion group* — connect with the community\n\n` +
      `Press the button below to subscribe! 👇`,

    'start.active': ({ firstName }) =>
      `Welcome back, ${firstName}! 🌸\n\n` +
      `Your subscription is active. Join the community using the buttons below:`,

    'start.pastDue': ({ firstName }) =>
      `Hello, ${firstName}! ⚠️\n\n` +
      `Your payment is past due. Please update your billing details to keep your access.`,

    'button.subscribe': () => `Subscribe 💳`,
    'button.channel': () => `📢 Content Channel`,
    'button.group': () => `💬 Discussion Group`,

    'subscription.activated': ({ communityName }) =>
      `🎉 *Subscription activated!*\n\n` +
      `Welcome to *${communityName}*! We're so glad to have you. ❤️\n\n` +
      `Press the buttons below to join:`,

    'subscription.canceled': () =>
      `ℹ️ *Subscription canceled*\n\n` +
      `Your subscription has been canceled. Your access will be removed shortly.\n\n` +
      `You can resubscribe anytime by sending /start ❤️`,

    'payment.failed': ({ date }) =>
      `⚠️ *Payment issue*\n\n` +
      `We couldn't process your payment. You have until *${date}* to update your billing details and keep your access.\n\n` +
      `If you have any questions, please contact us.`,

    'payment.gracePeriodReminder': ({ hours, communityName }) =>
      `⏰ *Reminder*\n\n` +
      `Your access to *${communityName}* will be removed in approximately *${hours} hour(s)*.\n\n` +
      `Update your billing details to keep your access.`,

    'payment.accessRemoved': ({ communityName }) =>
      `😔 *Access removed*\n\n` +
      `Your subscription is no longer active, so your access to *${communityName}* has been removed.\n\n` +
      `To rejoin, send /start 👇`,

    'join.approved.channel': () =>
      `✅ *Approved!*\n\n` +
      `Your request to join the content channel has been approved. Enjoy! 📖`,

    'join.approved.group': () =>
      `✅ *Approved!*\n\n` +
      `Your request to join the discussion group has been approved. Welcome! 💬`,

    'join.declined': () =>
      `❌ *Access unavailable*\n\n` +
      `Your subscription is not active. Please send /start to subscribe.`,

    'group.welcome': ({ displayName, communityName }) =>
      `Welcome, ${displayName}! 👋 We're glad you joined *${communityName}*! ❤️`,
  },
};
