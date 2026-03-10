import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context, Markup } from 'telegraf';
import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TelegramAccessService } from '../../common/bot/telegram.access.service';

const PAGE_SIZE = 8;

// Tracks admins waiting to enter a Telegram ID for grant access
const grantPending = new Set<number>();

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

  isAwaitingGrantId(telegramUserId: number): boolean {
    return grantPending.has(telegramUserId);
  }

  // ─── /myid ────────────────────────────────────────────────────────────────

  async handleMyId(ctx: Context): Promise<void> {
    const id = ctx.from?.id;
    if (!id) return;
    await ctx.reply(`Jūsų Telegram ID: \`${id}\``, { parse_mode: 'Markdown' });
  }

  // ─── Main menu ────────────────────────────────────────────────────────────

  async showMainMenu(ctx: Context, edit = false): Promise<void> {
    const text = `🛠 *Admin Panel*\n\nPasirinkite veiksmą:`;
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('👥 Narių sąrašas', 'admin:members:0')],
      [Markup.button.callback('📊 Statistika', 'admin:stats')],
      [Markup.button.callback('✅ Suteikti prieigą', 'admin:grant')],
    ]);

    if (edit) {
      await (ctx as any).editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
    } else {
      await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    }
  }

  // ─── Members list (paginated) ─────────────────────────────────────────────

  async showMembersList(ctx: Context, page: number, edit = true): Promise<void> {
    const [members, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { status: SubscriptionStatus.ACTIVE },
        include: { user: true },
        orderBy: { updatedAt: 'desc' },
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
    ]);

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const text = `👥 *Aktyvūs nariai* (${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} iš ${total})`;

    const memberButtons = members.map((sub) => {
      const name = [sub.user.firstName, sub.user.lastName].filter(Boolean).join(' ') ||
        sub.user.telegramUsername || String(sub.user.telegramUserId);
      const tier = sub.tier === SubscriptionTier.VIP ? '🌸' : '🌿';
      return [Markup.button.callback(`${tier} ${name}`, `admin:member:${sub.user.telegramUserId}`)];
    });

    const navRow: ReturnType<typeof Markup.button.callback>[] = [];
    if (page > 0) navRow.push(Markup.button.callback('◀ Atgal', `admin:members:${page - 1}`));
    if (page < totalPages - 1) navRow.push(Markup.button.callback('Pirmyn ▶', `admin:members:${page + 1}`));

    const keyboard = Markup.inlineKeyboard([
      ...memberButtons,
      ...(navRow.length ? [navRow] : []),
      [Markup.button.callback('↩ Meniu', 'admin:menu')],
    ]);

    if (edit) {
      await (ctx as any).editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
    } else {
      await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    }
  }

  // ─── Single member view ───────────────────────────────────────────────────

  async showMember(ctx: Context, telegramUserId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { telegramUserId: BigInt(telegramUserId) },
      include: { subscription: true, telegramMembership: true },
    });

    if (!user) {
      await (ctx as any).editMessageText(`❌ Vartotojas nerastas.`,
        Markup.inlineKeyboard([[Markup.button.callback('↩ Meniu', 'admin:menu')]]));
      return;
    }

    const sub = user.subscription;
    const mem = user.telegramMembership;
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';
    const username = user.telegramUsername ? `@${user.telegramUsername}` : '—';
    const tier = sub?.tier === SubscriptionTier.VIP ? '🌸 Inner Light Plus' : '🌿 Inner Light';

    const lines = [
      `👤 *${name}* (${username})`,
      `🆔 \`${user.telegramUserId}\``,
      ``,
      `📦 Paketas: ${tier}`,
      `📋 Statusas: \`${sub?.status ?? 'nėra'}\``,
      sub?.graceUntil ? `⏳ Grace iki: ${sub.graceUntil.toLocaleDateString('lt-LT')}` : null,
      ``,
      `📢 Kanalas: \`${mem?.channelMemberStatus ?? 'UNKNOWN'}\``,
      `💬 Grupė: \`${mem?.groupMemberStatus ?? 'UNKNOWN'}\``,
    ].filter((l) => l !== null).join('\n');

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('❌ Panaikinti prieigą', `admin:revoke:${telegramUserId}`)],
      [Markup.button.callback('↩ Narių sąrašas', 'admin:members:0')],
    ]);

    await (ctx as any).editMessageText(lines, { parse_mode: 'Markdown', ...keyboard });
  }

  // ─── Revoke access ────────────────────────────────────────────────────────

  async confirmRevoke(ctx: Context, telegramUserId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { telegramUserId: BigInt(telegramUserId) },
    });
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || telegramUserId;

    await (ctx as any).editMessageText(
      `❌ Ar tikrai norite panaikinti prieigą?\n\n👤 *${name}* (\`${telegramUserId}\`)`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('✅ Taip, panaikinti', `admin:revoke_confirm:${telegramUserId}`)],
          [Markup.button.callback('↩ Atgal', `admin:member:${telegramUserId}`)],
        ]),
      },
    );
  }

  async executeRevoke(ctx: Context, telegramUserId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { telegramUserId: BigInt(telegramUserId) },
    });
    if (!user) return;

    await this.telegramAccess.removeMember(BigInt(telegramUserId));
    await this.prisma.subscription.updateMany({
      where: { userId: user.id },
      data: { status: SubscriptionStatus.CANCELED, lastStripeEventAt: new Date() },
    });

    await ctx.telegram.sendMessage(
      telegramUserId,
      `😔 Jūsų prieiga prie *Inner Light* buvo panaikinta administratoriaus.\n\nNorėdami vėl prisijungti — rašykite /start.`,
      { parse_mode: 'Markdown' },
    );

    await (ctx as any).editMessageText(
      `✅ Prieiga panaikinta.`,
      Markup.inlineKeyboard([[Markup.button.callback('↩ Narių sąrašas', 'admin:members:0')]]),
    );

    this.logger.log(`Admin revoked access for user ${telegramUserId}`);
  }

  // ─── Grant access ─────────────────────────────────────────────────────────

  async startGrantFlow(ctx: Context): Promise<void> {
    grantPending.add(ctx.from!.id);
    await (ctx as any).editMessageText(
      `✅ *Suteikti prieigą*\n\nĮveskite nario Telegram ID:\n_(atšaukti: /admin)_`,
      { parse_mode: 'Markdown' },
    );
  }

  async executeGrant(ctx: Context, telegramUserId: string): Promise<void> {
    grantPending.delete(ctx.from!.id);

    const user = await this.prisma.user.findUnique({
      where: { telegramUserId: BigInt(telegramUserId) },
    });

    if (!user) {
      await ctx.reply(`❌ Vartotojas \`${telegramUserId}\` nerastas. Ar jis jau rašė /start botui?`,
        { parse_mode: 'Markdown' });
      return;
    }

    await this.prisma.subscription.upsert({
      where: { userId: user.id },
      update: { status: SubscriptionStatus.ACTIVE, graceUntil: null, lastStripeEventAt: new Date() },
      create: { userId: user.id, status: SubscriptionStatus.ACTIVE, tier: SubscriptionTier.STANDARD, lastStripeEventAt: new Date() },
    });

    const { channel, group } = this.telegramAccess.getInviteLinks();
    await ctx.telegram.sendMessage(telegramUserId, `✅ Prieiga suteikta! Prisijunkite:`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📢 Kanalas', url: channel }],
          [{ text: '💬 Grupė', url: group }],
        ],
      },
    });

    await ctx.reply(`✅ Prieiga suteikta vartotojui \`${telegramUserId}\`.`, { parse_mode: 'Markdown' });
    this.logger.log(`Admin granted access to user ${telegramUserId}`);
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  async showStats(ctx: Context): Promise<void> {
    const [active, pastDue, canceled, vip] = await Promise.all([
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.CANCELED } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE, tier: SubscriptionTier.VIP } }),
    ]);

    const text = [
      `📊 *Inner Light statistika*`,
      ``,
      `✅ Aktyvūs nariai: *${active}*`,
      `  🌿 Inner Light: *${active - vip}*`,
      `  🌸 Inner Light Plus: *${vip}*`,
      ``,
      `⚠️ Vėluojantys mokėjimai: *${pastDue}*`,
      `❌ Atšaukti: *${canceled}*`,
    ].join('\n');

    await (ctx as any).editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('↩ Meniu', 'admin:menu')]]),
    });
  }
}
