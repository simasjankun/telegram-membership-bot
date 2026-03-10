import { Injectable, Logger } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StripeCheckoutService } from '../stripe/stripe.checkout.service';
import { TelegramAccessService } from '../../common/bot/telegram.access.service';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly checkout: StripeCheckoutService,
    private readonly telegramAccess: TelegramAccessService,
  ) {}

  async handleStart(ctx: Context, startParam?: string): Promise<void> {
    const from = ctx.from;
    if (!from) return;

    this.logger.log(`/start from user ${from.id} (param: ${startParam ?? 'none'})`);

    const user = await this.upsertUser(from);
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (startParam === 'payment_success') {
      await ctx.reply(
        `Payment received! Your subscription is being activated.\n\nYou'll get a confirmation message shortly.`,
      );
      return;
    }

    if (subscription?.status === SubscriptionStatus.ACTIVE) {
      const { channel, group } = this.telegramAccess.getInviteLinks();
      await ctx.reply(
        `Your subscription is active. Use the buttons below to join:`,
        Markup.inlineKeyboard([
          [Markup.button.url('Content Channel', channel)],
          [Markup.button.url('Discussion Group', group)],
        ]),
      );
      return;
    }

    if (subscription?.status === SubscriptionStatus.PAST_DUE) {
      await ctx.reply(
        `Your payment is past due. Please update your billing details to keep your access.`,
      );
      return;
    }

    const checkoutUrl = await this.checkout.createCheckoutUrl(user);
    await ctx.reply(
      `Welcome! Subscribe to get access to the private channel and discussion group.`,
      Markup.inlineKeyboard([Markup.button.url('Subscribe', checkoutUrl)]),
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
