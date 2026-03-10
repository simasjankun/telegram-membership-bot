import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { User } from '@prisma/client';
import { StripeService } from './stripe.service';

export enum SubscriptionTier {
  STANDARD = 'STANDARD',
  VIP = 'VIP',
}

@Injectable()
export class StripeCheckoutService implements OnModuleInit {
  private readonly logger = new Logger(StripeCheckoutService.name);
  private botUsername!: string;

  constructor(
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  async onModuleInit(): Promise<void> {
    const me = await this.bot.telegram.getMe();
    this.botUsername = me.username!;
    this.logger.log(`Bot username resolved: @${this.botUsername}`);
  }

  async createCheckoutUrl(user: User, tier: SubscriptionTier): Promise<string> {
    const priceId =
      tier === SubscriptionTier.VIP
        ? this.config.get<string>('stripe.vipPriceId')!
        : this.config.get<string>('stripe.standardPriceId')!;

    const session = await this.stripe.client.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        telegram_user_id: user.telegramUserId.toString(),
        tier,
      },
      success_url: `https://t.me/${this.botUsername}`,
      cancel_url: `https://t.me/${this.botUsername}`,
    });

    return session.url!;
  }

  getPriceDisplay(tier: SubscriptionTier): string {
    return tier === SubscriptionTier.VIP
      ? this.config.get<string>('stripe.vipPriceDisplay') ?? '49 €/mėn.'
      : this.config.get<string>('stripe.standardPriceDisplay') ?? '29 €/mėn.';
  }
}
