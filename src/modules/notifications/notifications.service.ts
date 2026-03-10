import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Markup } from 'telegraf';
import { User } from '@prisma/client';
import { MessageDirection } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TelegramAccessService } from '../../common/bot/telegram.access.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly prisma: PrismaService,
    private readonly telegramAccess: TelegramAccessService,
  ) {}

  async sendSubscriptionActivated(user: User): Promise<void> {
    const { channel, group } = this.telegramAccess.getInviteLinks();

    const content = `Your subscription is now active!\n\nJoin the community using the buttons below:`;

    await this.bot.telegram.sendMessage(
      user.telegramUserId.toString(),
      content,
      Markup.inlineKeyboard([
        [Markup.button.url('Content Channel', channel)],
        [Markup.button.url('Discussion Group', group)],
      ]),
    );

    await this.logMessage(user.id, 'subscription_activated', content);
  }

  async sendPaymentFailed(user: User, graceUntil: Date): Promise<void> {
    const date = graceUntil.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    const content = `We couldn't process your payment.\n\nYou have until ${date} to update your billing details before losing access.`;
    await this.sendDm(user, 'payment_failed', content);
  }

  async sendGracePeriodReminder(user: User, graceUntil: Date): Promise<void> {
    const hours = Math.ceil((graceUntil.getTime() - Date.now()) / 3600000);
    const content = `Reminder: Your access will be removed in approximately ${hours} hour(s).\n\nUpdate your billing details to keep access.`;
    await this.sendDm(user, 'grace_period_reminder', content);
  }

  async sendAccessRemoved(user: User): Promise<void> {
    const content = `Your access has been removed due to an unpaid subscription.\n\nSend /start to resubscribe and rejoin.`;
    await this.sendDm(user, 'access_removed', content);
  }

  async sendSubscriptionCanceled(user: User): Promise<void> {
    const content = `Your subscription has been canceled. Your access will be removed shortly.\n\nYou can resubscribe at any time.`;
    await this.sendDm(user, 'subscription_canceled', content);
  }

  private async sendDm(user: User, templateKey: string, content: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(user.telegramUserId.toString(), content);
      await this.logMessage(user.id, templateKey, content);
    } catch (err) {
      this.logger.error(`Failed to send DM to user ${user.id}: ${(err as Error).message}`);
    }
  }

  private async logMessage(userId: string, templateKey: string, content: string): Promise<void> {
    await this.prisma.messageLog.create({
      data: {
        userId,
        direction: MessageDirection.OUTBOUND,
        templateKey,
        content,
      },
    });
  }
}
