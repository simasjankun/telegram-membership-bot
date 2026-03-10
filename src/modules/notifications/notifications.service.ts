import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Markup } from 'telegraf';
import { User } from '@prisma/client';
import { MessageDirection } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TelegramAccessService } from '../../common/bot/telegram.access.service';
import { I18nService } from '../../common/i18n/i18n.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly prisma: PrismaService,
    private readonly telegramAccess: TelegramAccessService,
    private readonly i18n: I18nService,
  ) {}

  async sendSubscriptionActivated(user: User): Promise<void> {
    const lang = user.languageCode;
    const { channel, group } = this.telegramAccess.getInviteLinks();
    const content = this.i18n.t('subscription.activated', lang);

    try {
      await this.bot.telegram.sendMessage(
        user.telegramUserId.toString(),
        content,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url(this.i18n.t('button.channel', lang), channel)],
            [Markup.button.url(this.i18n.t('button.group', lang), group)],
          ]),
        },
      );
      await this.logMessage(user.id, 'subscription_activated', content);
    } catch (err) {
      this.logger.error(`Failed to send DM to ${user.id}: ${(err as Error).message}`);
    }
  }

  async sendPaymentFailed(user: User, graceUntil: Date): Promise<void> {
    const date = graceUntil.toLocaleDateString('lt-LT', { day: 'numeric', month: 'long' });
    const content = this.i18n.t('payment.failed', user.languageCode, { date });
    await this.sendDm(user, 'payment_failed', content);
  }

  async sendGracePeriodReminder(user: User, graceUntil: Date): Promise<void> {
    const hours = Math.ceil((graceUntil.getTime() - Date.now()) / 3600000).toString();
    const content = this.i18n.t('payment.gracePeriodReminder', user.languageCode, { hours });
    await this.sendDm(user, 'grace_period_reminder', content);
  }

  async sendAccessRemoved(user: User): Promise<void> {
    const content = this.i18n.t('payment.accessRemoved', user.languageCode);
    await this.sendDm(user, 'access_removed', content);
  }

  async sendSubscriptionCanceled(user: User): Promise<void> {
    const content = this.i18n.t('subscription.canceled', user.languageCode);
    await this.sendDm(user, 'subscription_canceled', content);
  }

  private async sendDm(user: User, templateKey: string, content: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(user.telegramUserId.toString(), content, {
        parse_mode: 'Markdown',
      });
      await this.logMessage(user.id, templateKey, content);
    } catch (err) {
      this.logger.error(`Failed to send DM to user ${user.id}: ${(err as Error).message}`);
    }
  }

  private async logMessage(userId: string, templateKey: string, content: string): Promise<void> {
    await this.prisma.messageLog.create({
      data: { userId, direction: MessageDirection.OUTBOUND, templateKey, content },
    });
  }
}
