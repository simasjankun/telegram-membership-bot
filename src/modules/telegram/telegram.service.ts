import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleStart(ctx: Context): Promise<void> {
    const from = ctx.from;
    if (!from) return;

    this.logger.log(`/start from user ${from.id} (@${from.username ?? 'no username'})`);

    await this.upsertUser(from);

    await ctx.reply(
      `Hello, ${from.first_name}!\n\nWelcome. Use the button below to subscribe and get access to the community.`,
    );
  }

  private async upsertUser(from: NonNullable<Context['from']>): Promise<void> {
    await this.prisma.user.upsert({
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
