import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus, MessageDirection } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TelegramAccessService } from '../../common/bot/telegram.access.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ExpiryJob {
  private readonly logger = new Logger(ExpiryJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramAccess: TelegramAccessService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    const schedule = this.config.get<string>('jobs.cronSchedule') ?? '0 * * * *';
    const job = new CronJob(schedule, () => void this.run());
    this.schedulerRegistry.addCronJob('expiry-check', job);
    job.start();
    this.logger.log(`Expiry job scheduled: ${schedule}`);
  }

  async run(): Promise<void> {
    this.logger.log('Running expiry check...');
    await this.processExpired();
    await this.sendGracePeriodReminders();
  }

  private async processExpired(): Promise<void> {
    const expired = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.PAST_DUE,
        graceUntil: { lt: new Date() },
      },
      include: { user: true },
    });

    for (const sub of expired) {
      this.logger.log(`Removing access for user ${sub.userId} — grace period expired`);

      await this.telegramAccess.removeMember(sub.user.telegramUserId);

      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: SubscriptionStatus.CANCELED, lastStripeEventAt: new Date() },
      });

      await this.notifications.sendAccessRemoved(sub.user);
    }

    if (expired.length > 0) {
      this.logger.log(`Removed access for ${expired.length} user(s)`);
    }
  }

  private async sendGracePeriodReminders(): Promise<void> {
    const warningThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const nearExpiry = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.PAST_DUE,
        graceUntil: { gt: new Date(), lt: warningThreshold },
      },
      include: { user: true },
    });

    for (const sub of nearExpiry) {
      const alreadyWarned = await this.prisma.messageLog.findFirst({
        where: {
          userId: sub.userId,
          templateKey: 'grace_period_reminder',
          direction: MessageDirection.OUTBOUND,
          createdAt: { gt: new Date(Date.now() - 20 * 60 * 60 * 1000) },
        },
      });

      if (!alreadyWarned) {
        await this.notifications.sendGracePeriodReminder(sub.user, sub.graceUntil!);
        this.logger.log(`Sent grace period reminder to user ${sub.userId}`);
      }
    }
  }
}
