import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { User } from '@prisma/client';
import { MessageDirection } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly prisma: PrismaService,
  ) {}

  async sendSubscriptionActivated(user: User): Promise<void> {
    const content =
      `Your subscription is now active! 🎉\n\n` +
      `Join links for the channel and discussion group will be sent shortly.`;

    await this.sendDm(user, 'subscription_activated', content);
  }

  async sendPaymentFailed(user: User): Promise<void> {
    const content =
      `We couldn't process your payment. Please update your billing details to keep your access.`;

    await this.sendDm(user, 'payment_failed', content);
  }

  async sendSubscriptionCanceled(user: User): Promise<void> {
    const content =
      `Your subscription has been canceled. Your access will be removed shortly.\n\n` +
      `You can resubscribe at any time.`;

    await this.sendDm(user, 'subscription_canceled', content);
  }

  private async sendDm(user: User, templateKey: string, content: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(user.telegramUserId.toString(), content);

      await this.prisma.messageLog.create({
        data: {
          userId: user.id,
          direction: MessageDirection.OUTBOUND,
          templateKey,
          content,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to send DM to user ${user.id}: ${(err as Error).message}`,
      );
    }
  }
}
