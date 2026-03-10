import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context } from 'telegraf';
import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TelegramAccessService } from '../../common/bot/telegram.access.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly adminIds: Set<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly telegramAccess: TelegramAccessService,
  ) {
    this.adminIds = new Set(this.config.get<string[]>('adminTelegramIds') ?? []);
  }

  isAdmin(telegramUserId: number | string): boolean {
    return this.adminIds.has(String(telegramUserId));
  }

  async handleMyId(ctx: Context): Promise<void> {
    const id = ctx.from?.id;
    if (!id) return;
    await ctx.reply(`Jūsų Telegram ID: \`${id}\``, { parse_mode: 'Markdown' });
  }

  async handleCheckUser(ctx: Context, args: string): Promise<void> {
    const targetId = args.trim();
    if (!targetId) {
      await ctx.reply('Naudojimas: /checkuser <telegram\\_id>', { parse_mode: 'Markdown' });
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { telegramUserId: BigInt(targetId) },
      include: { subscription: true, telegramMembership: true },
    });

    if (!user) {
      await ctx.reply(`Vartotojas \`${targetId}\` nerastas DB.`, { parse_mode: 'Markdown' });
      return;
    }

    const sub = user.subscription;
    const mem = user.telegramMembership;
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    const username = user.telegramUsername ? `@${user.telegramUsername}` : '—';

    const lines = [
      `👤 *${name}* (${username})`,
      `🆔 \`${user.telegramUserId}\``,
      ``,
      `*Narystė:*`,
      `• Statusas: \`${sub?.status ?? 'nėra'}\``,
      `• Paketas: \`${sub?.tier ?? '—'}\``,
      sub?.graceUntil ? `• Grace iki: \`${sub.graceUntil.toLocaleDateString('lt-LT')}\`` : null,
      ``,
      `*Telegram:*`,
      `• Kanalas: \`${mem?.channelMemberStatus ?? 'UNKNOWN'}\``,
      `• Grupė: \`${mem?.groupMemberStatus ?? 'UNKNOWN'}\``,
      mem?.removedAt ? `• Pašalintas: \`${mem.removedAt.toLocaleDateString('lt-LT')}\`` : null,
    ].filter((l) => l !== null).join('\n');

    await ctx.reply(lines, { parse_mode: 'Markdown' });
  }

  async handleGrantAccess(ctx: Context, args: string): Promise<void> {
    const targetId = args.trim();
    if (!targetId) {
      await ctx.reply('Naudojimas: /grantaccess <telegram\\_id>', { parse_mode: 'Markdown' });
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { telegramUserId: BigInt(targetId) },
    });

    if (!user) {
      await ctx.reply(`Vartotojas \`${targetId}\` nerastas DB.`, { parse_mode: 'Markdown' });
      return;
    }

    await this.prisma.subscription.upsert({
      where: { userId: user.id },
      update: { status: SubscriptionStatus.ACTIVE, graceUntil: null, lastStripeEventAt: new Date() },
      create: {
        userId: user.id,
        status: SubscriptionStatus.ACTIVE,
        tier: SubscriptionTier.STANDARD,
        lastStripeEventAt: new Date(),
      },
    });

    const { channel, group } = this.telegramAccess.getInviteLinks();
    await ctx.reply(
      `✅ Prieiga suteikta vartotojui \`${targetId}\`.\n\nJoin nuorodos išsiųstos.`,
      { parse_mode: 'Markdown' },
    );

    await ctx.telegram.sendMessage(
      targetId,
      `✅ Jūsų prieiga prie *Inner Light* suteikta administratoriaus.\n\nPrisijunkite mygtukais žemiau:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📢 Kanalas', url: channel }],
            [{ text: '💬 Grupė', url: group }],
          ],
        },
      },
    );

    this.logger.log(`Admin granted access to user ${targetId}`);
  }

  async handleRevokeAccess(ctx: Context, args: string): Promise<void> {
    const targetId = args.trim();
    if (!targetId) {
      await ctx.reply('Naudojimas: /revokeaccess <telegram\\_id>', { parse_mode: 'Markdown' });
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { telegramUserId: BigInt(targetId) },
    });

    if (!user) {
      await ctx.reply(`Vartotojas \`${targetId}\` nerastas DB.`, { parse_mode: 'Markdown' });
      return;
    }

    await this.telegramAccess.removeMember(BigInt(targetId));

    await this.prisma.subscription.updateMany({
      where: { userId: user.id },
      data: { status: SubscriptionStatus.CANCELED, lastStripeEventAt: new Date() },
    });

    await ctx.reply(`✅ Prieiga panaikinta vartotojui \`${targetId}\`.`, { parse_mode: 'Markdown' });
    this.logger.log(`Admin revoked access for user ${targetId}`);
  }

  async handleStats(ctx: Context): Promise<void> {
    const [active, pastDue, canceled, vip] = await Promise.all([
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.CANCELED } }),
      this.prisma.subscription.count({
        where: { status: SubscriptionStatus.ACTIVE, tier: SubscriptionTier.VIP },
      }),
    ]);

    const standard = active - vip;

    const lines = [
      `📊 *Inner Light statistika*`,
      ``,
      `✅ Aktyvūs nariai: *${active}*`,
      `  🌿 Inner Light: *${standard}*`,
      `  🌸 Inner Light Plus: *${vip}*`,
      ``,
      `⚠️ Vėluojantys mokėjimai: *${pastDue}*`,
      `❌ Atšaukti: *${canceled}*`,
    ].join('\n');

    await ctx.reply(lines, { parse_mode: 'Markdown' });
  }
}
