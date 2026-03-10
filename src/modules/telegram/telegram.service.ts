import { Injectable, Logger } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StripeCheckoutService, SubscriptionTier } from '../stripe/stripe.checkout.service';
import { TelegramAccessService } from '../../common/bot/telegram.access.service';
import { I18nService } from '../../common/i18n/i18n.service';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly checkout: StripeCheckoutService,
    private readonly telegramAccess: TelegramAccessService,
    private readonly i18n: I18nService,
  ) {}

  async handleStart(ctx: Context): Promise<void> {
    const from = ctx.from;
    if (!from) return;

    this.logger.log(`/start from user ${from.id}`);
    const user = await this.upsertUser(from);
    const lang = user.languageCode;
    const { channel, group } = this.telegramAccess.getInviteLinks();

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (subscription?.status === SubscriptionStatus.ACTIVE) {
      await ctx.reply(
        this.i18n.t('start.active', lang, { firstName: from.first_name }),
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url(this.i18n.t('button.channel', lang), channel)],
            [Markup.button.url(this.i18n.t('button.group', lang), group)],
          ]),
        },
      );
      return;
    }

    if (subscription?.status === SubscriptionStatus.PAST_DUE) {
      await ctx.reply(
        this.i18n.t('start.pastDue', lang, { firstName: from.first_name }),
        { parse_mode: 'Markdown' },
      );
      return;
    }

    await ctx.reply(
      this.i18n.t('start.chooseTier', lang, {
        firstName: from.first_name,
        standardPrice: this.checkout.getPriceDisplay(SubscriptionTier.STANDARD),
        vipPrice: this.checkout.getPriceDisplay(SubscriptionTier.VIP),
      }),
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(
            this.i18n.t('button.standardTier', lang, {
              standardPrice: this.checkout.getPriceDisplay(SubscriptionTier.STANDARD),
            }),
            'tier:standard',
          )],
          [Markup.button.callback(
            this.i18n.t('button.vipTier', lang, {
              vipPrice: this.checkout.getPriceDisplay(SubscriptionTier.VIP),
            }),
            'tier:vip',
          )],
        ]),
      },
    );
  }

  async handleTierSelected(ctx: Context): Promise<void> {
    // Answer immediately — must happen within 10s or Telegram shows spinner forever
    try { await (ctx as any).answerCbQuery(); } catch { /* ignore */ }

    const from = ctx.from;
    if (!from) return;

    const match = (ctx as any).match as RegExpMatchArray | undefined;
    const tier = match?.[1] === 'vip' ? SubscriptionTier.VIP : SubscriptionTier.STANDARD;

    const user = await this.prisma.user.findUnique({
      where: { telegramUserId: BigInt(from.id) },
    });
    if (!user) return;

    const lang = user.languageCode;
    const checkoutUrl = await this.checkout.createCheckoutUrl(user, tier);

    await ctx.reply(
      this.i18n.t('start.proceedToCheckout', lang),
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url(this.i18n.t('button.checkout', lang), checkoutUrl)],
        ]),
      },
    );
  }

  private async upsertUser(from: NonNullable<Context['from']>) {
    return this.prisma.user.upsert({
      where: { telegramUserId: BigInt(from.id) },
      update: {
        telegramUsername: from.username ?? null,
        firstName: from.first_name,
        lastName: from.last_name ?? null,
        languageCode: from.language_code ?? null,
        dmStartedAt: new Date(),
      },
      create: {
        telegramUserId: BigInt(from.id),
        telegramUsername: from.username ?? null,
        firstName: from.first_name,
        lastName: from.last_name ?? null,
        languageCode: from.language_code ?? null,
        dmStartedAt: new Date(),
      },
    });
  }
}
