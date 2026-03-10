import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context, Markup } from 'telegraf';
import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TelegramAccessService } from '../../common/bot/telegram.access.service';
import { I18nService } from '../../common/i18n/i18n.service';

const PAGE_SIZE = 8;
const grantPending = new Set<number>();

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly adminIds: Set<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly telegramAccess: TelegramAccessService,
    private readonly i18n: I18nService,
  ) {
    this.adminIds = new Set(this.config.get<string[]>('adminTelegramIds') ?? []);
  }

  isAdmin(telegramUserId: number | string): boolean {
    return this.adminIds.has(String(telegramUserId));
  }

  isAwaitingGrantId(telegramUserId: number): boolean {
    return grantPending.has(telegramUserId);
  }

  private async getLang(ctx: Context): Promise<string | null> {
    if (!ctx.from) return null;
    const user = await this.prisma.user.findUnique({
      where: { telegramUserId: BigInt(ctx.from.id) },
      select: { languageCode: true },
    });
    return user?.languageCode ?? ctx.from.language_code ?? null;
  }

  private t(key: string, lang: string | null, vars?: Record<string, unknown>): string {
    return this.i18n.t(key, lang, vars as any);
  }

  // ─── /myid ────────────────────────────────────────────────────────────────

  async handleMyId(ctx: Context): Promise<void> {
    const id = ctx.from?.id;
    if (!id) return;
    const lang = await this.getLang(ctx);
    await ctx.reply(this.t('admin.myid', lang, { id }), { parse_mode: 'Markdown' });
  }

  // ─── Main menu ────────────────────────────────────────────────────────────

  async showMainMenu(ctx: Context, edit = false): Promise<void> {
    const lang = await this.getLang(ctx);
    const text = this.t('admin.menu', lang);
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(this.t('admin.btn.members', lang), 'admin:members:0')],
      [Markup.button.callback(this.t('admin.btn.stats', lang), 'admin:stats')],
      [Markup.button.callback(this.t('admin.btn.grant', lang), 'admin:grant')],
    ]);
    if (edit) {
      await (ctx as any).editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
    } else {
      await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    }
  }

  // ─── Members list ─────────────────────────────────────────────────────────

  async showMembersList(ctx: Context, page: number): Promise<void> {
    const lang = await this.getLang(ctx);
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
    const from = page * PAGE_SIZE + 1;
    const to = Math.min((page + 1) * PAGE_SIZE, total);
    const text = this.t('admin.members.title', lang, { count: total, from, to } as any);

    const memberButtons = members.map((sub) => {
      const name =
        [sub.user.firstName, sub.user.lastName].filter(Boolean).join(' ') ||
        sub.user.telegramUsername ||
        String(sub.user.telegramUserId);
      const tier = sub.tier === SubscriptionTier.VIP ? '🌸' : '🌿';
      return [Markup.button.callback(`${tier} ${name}`, `admin:member:${sub.user.telegramUserId}`)];
    });

    const navRow: ReturnType<typeof Markup.button.callback>[] = [];
    if (page > 0) navRow.push(Markup.button.callback(this.t('admin.btn.prev', lang), `admin:members:${page - 1}`));
    if (page < totalPages - 1) navRow.push(Markup.button.callback(this.t('admin.btn.next', lang), `admin:members:${page + 1}`));

    const keyboard = Markup.inlineKeyboard([
      ...memberButtons,
      ...(navRow.length ? [navRow] : []),
      [Markup.button.callback(this.t('admin.btn.back_menu', lang), 'admin:menu')],
    ]);

    await (ctx as any).editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
  }

  // ─── Single member ────────────────────────────────────────────────────────

  async showMember(ctx: Context, telegramUserId: string): Promise<void> {
    const lang = await this.getLang(ctx);
    const user = await this.prisma.user.findUnique({
      where: { telegramUserId: BigInt(telegramUserId) },
      include: { subscription: true, telegramMembership: true },
    });

    if (!user) {
      await (ctx as any).editMessageText(
        this.t('admin.member.not_found', lang),
        Markup.inlineKeyboard([[Markup.button.callback(this.t('admin.btn.back_menu', lang), 'admin:menu')]]),
      );
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
      `📦 ${tier}`,
      `📋 \`${sub?.status ?? '—'}\``,
      sub?.graceUntil ? `⏳ ${sub.graceUntil.toLocaleDateString('lt-LT')}` : null,
      ``,
      `📢 \`${mem?.channelMemberStatus ?? 'UNKNOWN'}\`  💬 \`${mem?.groupMemberStatus ?? 'UNKNOWN'}\``,
    ].filter(Boolean).join('\n');

    await (ctx as any).editMessageText(lines, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(this.t('admin.btn.revoke', lang), `admin:revoke:${telegramUserId}`)],
        [Markup.button.callback(this.t('admin.btn.back_members', lang), 'admin:members:0')],
      ]),
    });
  }

  // ─── Revoke ───────────────────────────────────────────────────────────────

  async confirmRevoke(ctx: Context, telegramUserId: string): Promise<void> {
    const lang = await this.getLang(ctx);
    const user = await this.prisma.user.findUnique({ where: { telegramUserId: BigInt(telegramUserId) } });
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || telegramUserId;

    await (ctx as any).editMessageText(
      this.t('admin.revoke.confirm', lang, { name, userId: telegramUserId } as any),
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(this.t('admin.btn.confirm_revoke', lang), `admin:revoke_confirm:${telegramUserId}`)],
          [Markup.button.callback(this.t('admin.btn.back_member', lang), `admin:member:${telegramUserId}`)],
        ]),
      },
    );
  }

  async executeRevoke(ctx: Context, telegramUserId: string): Promise<void> {
    const lang = await this.getLang(ctx);
    const user = await this.prisma.user.findUnique({ where: { telegramUserId: BigInt(telegramUserId) } });
    if (!user) return;

    await this.telegramAccess.removeMember(BigInt(telegramUserId));
    await this.prisma.subscription.updateMany({
      where: { userId: user.id },
      data: { status: SubscriptionStatus.CANCELED, lastStripeEventAt: new Date() },
    });

    await ctx.telegram.sendMessage(
      telegramUserId,
      this.t('admin.revoke.dm', user.languageCode),
      { parse_mode: 'Markdown' },
    );

    await (ctx as any).editMessageText(
      this.t('admin.revoke.done', lang),
      Markup.inlineKeyboard([[Markup.button.callback(this.t('admin.btn.back_members', lang), 'admin:members:0')]]),
    );

    this.logger.log(`Admin revoked access for user ${telegramUserId}`);
  }

  // ─── Grant ────────────────────────────────────────────────────────────────

  async startGrantFlow(ctx: Context): Promise<void> {
    const lang = await this.getLang(ctx);
    grantPending.add(ctx.from!.id);
    await (ctx as any).editMessageText(this.t('admin.grant.prompt', lang), { parse_mode: 'Markdown' });
  }

  async executeGrant(ctx: Context, telegramUserId: string): Promise<void> {
    const lang = await this.getLang(ctx);
    grantPending.delete(ctx.from!.id);

    const user = await this.prisma.user.findUnique({ where: { telegramUserId: BigInt(telegramUserId) } });
    if (!user) {
      await ctx.reply(this.t('admin.grant.not_found', lang, { userId: telegramUserId } as any), { parse_mode: 'Markdown' });
      return;
    }

    await this.prisma.subscription.upsert({
      where: { userId: user.id },
      update: { status: SubscriptionStatus.ACTIVE, graceUntil: null, lastStripeEventAt: new Date() },
      create: { userId: user.id, status: SubscriptionStatus.ACTIVE, tier: SubscriptionTier.STANDARD, lastStripeEventAt: new Date() },
    });

    const { channel, group } = this.telegramAccess.getInviteLinks();
    await ctx.telegram.sendMessage(telegramUserId, this.t('admin.grant.dm', user.languageCode), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📢 ' + this.t('button.channel', user.languageCode), url: channel }],
          [{ text: '💬 ' + this.t('button.group', user.languageCode), url: group }],
        ],
      },
    });

    await ctx.reply(this.t('admin.grant.done', lang, { userId: telegramUserId } as any), { parse_mode: 'Markdown' });
    this.logger.log(`Admin granted access to user ${telegramUserId}`);
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  async showStats(ctx: Context): Promise<void> {
    const lang = await this.getLang(ctx);
    const [active, pastDue, canceled, vip] = await Promise.all([
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.CANCELED } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE, tier: SubscriptionTier.VIP } }),
    ]);

    const isLt = this.i18n.lang(lang) === 'lt';
    const text = [
      this.t('admin.stats.title', lang),
      ``,
      `✅ ${isLt ? 'Aktyvūs nariai' : 'Active members'}: *${active}*`,
      `  🌿 Inner Light: *${active - vip}*`,
      `  🌸 Inner Light Plus: *${vip}*`,
      ``,
      `⚠️ ${isLt ? 'Vėluojantys mokėjimai' : 'Past due'}: *${pastDue}*`,
      `❌ ${isLt ? 'Atšaukti' : 'Canceled'}: *${canceled}*`,
    ].join('\n');

    await (ctx as any).editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback(this.t('admin.btn.back_menu', lang), 'admin:menu')]]),
    });
  }
}
