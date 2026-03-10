export interface MessageVars {
  firstName?: string;
  communityName?: string;
  standardPackage?: string;
  vipPackage?: string;
  date?: string;
  hours?: string;
  displayName?: string;
  standardPrice?: string;
  vipPrice?: string;
}

type MsgFn = (v: MessageVars) => string;

export const messages: Record<'lt' | 'en', Record<string, MsgFn>> = {
  lt: {
    'start.chooseTier': ({ firstName, standardPackage, vipPackage, standardPrice, vipPrice }) =>
      `Sveiki, ${firstName}! 👋\n\n` +
      `Pasirinkite paketą, kuris šiuo metu geriausiai atitinka Jūsų poreikius 🤍\n\n` +
      `🌿 *${standardPackage}* — ${standardPrice}\n` +
      `Savaitinės paskaitos, praktikos, knygos, filmai, kviestiniai svečiai ir palaikymo grupė.\n\n` +
      `🌸 *${vipPackage}* — ${vipPrice}\n` +
      `Viskas iš *${standardPackage}* paketo + asmeninė 1 val. konsultacija per mėnesį ir individualus įsitikinimų perrašymo planas.`,

    'start.proceedToCheckout': () =>
      `Puiku! Spauskite žemiau, kad tęstumėte mokėjimą:`,

    'button.standardTier': ({ standardPackage, standardPrice }) =>
      `🌿 ${standardPackage} – ${standardPrice}`,

    'button.vipTier': ({ vipPackage, vipPrice }) =>
      `🌸 ${vipPackage} – ${vipPrice}`,

    'button.checkout': () => `Apmokėti 💳`,

    'start.new': ({ firstName, communityName }) =>
      `Sveiki, ${firstName}! 👋\n\n` +
      `Džiaugiamės, kad radote mus! Prisijunkite prie *${communityName}* bendruomenės — erdvės moterims, kurios nori realių vidinių pokyčių.\n\n` +
      `Pasirinkite paketą žemiau 👇`,

    'start.active': ({ firstName, communityName }) =>
      `Sveiki sugrįžę, ${firstName}! 🌸\n\n` +
      `Jūsų narystė *${communityName}* aktyvi. Prisijunkite prie bendruomenės mygtukais žemiau:`,

    'start.pastDue': ({ firstName, communityName }) =>
      `Sveiki, ${firstName}! ⚠️\n\n` +
      `Jūsų mokėjimas vėluoja. Atnaujinkite mokėjimo duomenis, kad išlaikytumėte prieigą prie *${communityName}*.`,

    'button.channel': () => `📢 Inner Light kanalas`,
    'button.group': () => `💬 Palaikymo grupė`,

    'subscription.activated': ({ communityName }) =>
      `🌟 *Sveiki atvykę į ${communityName}!*\n\n` +
      `Labai džiaugiamės, kad esate su mumis. ❤️\n\n` +
      `Prisijunkite prie bendruomenės mygtukais žemiau:`,

    'subscription.canceled': ({ communityName }) =>
      `ℹ️ *Narystė atšaukta*\n\n` +
      `Jūsų narystė *${communityName}* atšaukta. Prieiga bus panaikinta artimiausiu metu.\n\n` +
      `Norėdami vėl prisijungti, bet kada rašykite /start ❤️`,

    'payment.failed': ({ communityName, date }) =>
      `⚠️ *Mokėjimo problema*\n\n` +
      `Nepavyko apdoroti Jūsų mokėjimo. Turite iki *${date}*, kad atnaujintumėte mokėjimo duomenis ir išlaikytumėte prieigą prie *${communityName}*.\n\n` +
      `Jei kyla klausimų — susisiekite su mumis.`,

    'payment.gracePeriodReminder': ({ communityName, hours }) =>
      `⏰ *Priminimas*\n\n` +
      `Jūsų prieiga prie *${communityName}* bus panaikinta maždaug po *${hours} val.*\n\n` +
      `Atnaujinkite mokėjimo duomenis, kad išlaikytumėte prieigą.`,

    'payment.accessRemoved': ({ communityName }) =>
      `😔 *Prieiga panaikinta*\n\n` +
      `Jūsų narystė *${communityName}* nebegalioja, todėl prieiga buvo panaikinta.\n\n` +
      `Norėdami vėl prisijungti — rašykite /start 👇`,

    'join.approved.channel': ({ communityName }) =>
      `✅ *Patvirtinta!*\n\n` +
      `Jūsų prisijungimas prie *${communityName}* kanalo patvirtintas. Malonaus skaitymo! 📖`,

    'join.approved.group': ({ communityName }) =>
      `✅ *Patvirtinta!*\n\n` +
      `Jūsų prisijungimas prie *${communityName}* palaikymo grupės patvirtintas. Laukiame Jūsų! 💬`,

    'join.declined': ({ communityName }) =>
      `❌ *Prieiga negalima*\n\n` +
      `Jūsų narystė *${communityName}* šiuo metu neaktyvi. Norėdami prisijungti — rašykite /start botui.`,

    'group.welcome': ({ displayName, communityName }) =>
      `Sveiki atvykę, ${displayName}! 👋 Džiaugiamės, kad prisijungėte prie *${communityName}* bendruomenės! 🌟`,
  },

  en: {
    'start.chooseTier': ({ firstName, standardPackage, vipPackage, standardPrice, vipPrice }) =>
      `Hello, ${firstName}! 👋\n\n` +
      `Choose the package that best fits your needs right now 🤍\n\n` +
      `🌿 *${standardPackage}* — ${standardPrice}\n` +
      `Weekly lectures, practices, books, films, guest speakers and support group.\n\n` +
      `🌸 *${vipPackage}* — ${vipPrice}\n` +
      `Everything in the *${standardPackage}* package + 1h personal consultation per month and personalised belief rewriting plan.`,

    'start.proceedToCheckout': () =>
      `Great! Press below to proceed to payment:`,

    'button.standardTier': ({ standardPackage, standardPrice }) =>
      `🌿 ${standardPackage} – ${standardPrice}`,

    'button.vipTier': ({ vipPackage, vipPrice }) =>
      `🌸 ${vipPackage} – ${vipPrice}`,

    'button.checkout': () => `Pay 💳`,

    'start.new': ({ firstName, communityName }) =>
      `Hello, ${firstName}! 👋\n\n` +
      `Welcome! Join *${communityName}* — a space for women who want real inner change.\n\n` +
      `Choose your package below 👇`,

    'start.active': ({ firstName, communityName }) =>
      `Welcome back, ${firstName}! 🌸\n\n` +
      `Your *${communityName}* membership is active. Join the community using the buttons below:`,

    'start.pastDue': ({ firstName, communityName }) =>
      `Hello, ${firstName}! ⚠️\n\n` +
      `Your payment is past due. Please update your billing details to keep your *${communityName}* access.`,

    'button.channel': () => `📢 Inner Light channel`,
    'button.group': () => `💬 Support group`,

    'subscription.activated': ({ communityName }) =>
      `🌟 *Welcome to ${communityName}!*\n\n` +
      `We're so glad to have you with us. ❤️\n\n` +
      `Join the community using the buttons below:`,

    'subscription.canceled': ({ communityName }) =>
      `ℹ️ *Membership canceled*\n\n` +
      `Your *${communityName}* membership has been canceled. Access will be removed shortly.\n\n` +
      `You can rejoin anytime by sending /start ❤️`,

    'payment.failed': ({ communityName, date }) =>
      `⚠️ *Payment issue*\n\n` +
      `We couldn't process your payment. You have until *${date}* to update your billing details and keep your *${communityName}* access.\n\n` +
      `If you have any questions, please contact us.`,

    'payment.gracePeriodReminder': ({ communityName, hours }) =>
      `⏰ *Reminder*\n\n` +
      `Your *${communityName}* access will be removed in approximately *${hours} hour(s)*.\n\n` +
      `Update your billing details to keep your access.`,

    'payment.accessRemoved': ({ communityName }) =>
      `😔 *Access removed*\n\n` +
      `Your *${communityName}* membership is no longer active and your access has been removed.\n\n` +
      `To rejoin, send /start 👇`,

    'join.approved.channel': ({ communityName }) =>
      `✅ *Approved!*\n\n` +
      `Your request to join the *${communityName}* channel has been approved. Enjoy! 📖`,

    'join.approved.group': ({ communityName }) =>
      `✅ *Approved!*\n\n` +
      `Your request to join the *${communityName}* support group has been approved. Welcome! 💬`,

    'join.declined': ({ communityName }) =>
      `❌ *Access unavailable*\n\n` +
      `Your *${communityName}* membership is not active. Please send /start to subscribe.`,

    'group.welcome': ({ displayName, communityName }) =>
      `Welcome, ${displayName}! 👋 We're glad you joined the *${communityName}* community! 🌟`,
  },
};
