import { Action, Command, On, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import type { Update as TgUpdate } from '@telegraf/types';
import { TelegramService } from './telegram.service';
import { TelegramAccessService } from '../../common/bot/telegram.access.service';
import { AdminService } from '../admin/admin.service';

@Update()
export class TelegramUpdateHandler {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly telegramAccess: TelegramAccessService,
    private readonly adminService: AdminService,
  ) {}

  // ─── Public commands ──────────────────────────────────────────────────────

  @Start()
  async onStart(ctx: Context): Promise<void> {
    await this.telegramService.handleStart(ctx);
  }

  @Command('myid')
  async onMyId(ctx: Context): Promise<void> {
    await this.adminService.handleMyId(ctx);
  }

  @Command('admin')
  async onAdmin(ctx: Context): Promise<void> {
    if (!this.adminService.isAdmin(ctx.from!.id)) return;
    await this.adminService.showMainMenu(ctx);
  }

  // ─── Tier selection ───────────────────────────────────────────────────────

  @Action(/^tier:(.+)$/)
  async onTierSelected(ctx: Context): Promise<void> {
    await this.telegramService.handleTierSelected(ctx);
  }

  // ─── Admin menu callbacks ─────────────────────────────────────────────────

  @Action('admin:menu')
  async onAdminMenu(ctx: Context): Promise<void> {
    if (!this.adminService.isAdmin(ctx.from!.id)) return;
    try { await (ctx as any).answerCbQuery(); } catch { /* ignore */ }
    await this.adminService.showMainMenu(ctx, true);
  }

  @Action(/^admin:members:(\d+)$/)
  async onAdminMembers(ctx: Context): Promise<void> {
    if (!this.adminService.isAdmin(ctx.from!.id)) return;
    try { await (ctx as any).answerCbQuery(); } catch { /* ignore */ }
    const page = parseInt((ctx as any).match[1]);
    await this.adminService.showMembersList(ctx, page);
  }

  @Action(/^admin:member:(.+)$/)
  async onAdminMember(ctx: Context): Promise<void> {
    if (!this.adminService.isAdmin(ctx.from!.id)) return;
    try { await (ctx as any).answerCbQuery(); } catch { /* ignore */ }
    await this.adminService.showMember(ctx, (ctx as any).match[1]);
  }

  @Action(/^admin:revoke:(.+)$/)
  async onAdminRevoke(ctx: Context): Promise<void> {
    if (!this.adminService.isAdmin(ctx.from!.id)) return;
    try { await (ctx as any).answerCbQuery(); } catch { /* ignore */ }
    await this.adminService.confirmRevoke(ctx, (ctx as any).match[1]);
  }

  @Action(/^admin:revoke_confirm:(.+)$/)
  async onAdminRevokeConfirm(ctx: Context): Promise<void> {
    if (!this.adminService.isAdmin(ctx.from!.id)) return;
    try { await (ctx as any).answerCbQuery(); } catch { /* ignore */ }
    await this.adminService.executeRevoke(ctx, (ctx as any).match[1]);
  }

  @Action('admin:stats')
  async onAdminStats(ctx: Context): Promise<void> {
    if (!this.adminService.isAdmin(ctx.from!.id)) return;
    try { await (ctx as any).answerCbQuery(); } catch { /* ignore */ }
    await this.adminService.showStats(ctx);
  }

  @Action('admin:grant')
  async onAdminGrant(ctx: Context): Promise<void> {
    if (!this.adminService.isAdmin(ctx.from!.id)) return;
    try { await (ctx as any).answerCbQuery(); } catch { /* ignore */ }
    await this.adminService.startGrantFlow(ctx);
  }

  @Action(/^admin:grant_tier:(\d+):(STANDARD|VIP)$/)
  async onAdminGrantTier(ctx: Context): Promise<void> {
    if (!this.adminService.isAdmin(ctx.from!.id)) return;
    try { await (ctx as any).answerCbQuery(); } catch { /* ignore */ }
    const match = (ctx as any).match as RegExpMatchArray;
    const { SubscriptionTier } = await import('@prisma/client');
    const tier = match[2] === 'VIP' ? SubscriptionTier.VIP : SubscriptionTier.STANDARD;
    await this.adminService.executeGrantWithTier(ctx, match[1], tier);
  }

  // ─── Message handler — catches grant access ID input ─────────────────────

  @On('message')
  async onMessage(ctx: Context): Promise<void> {
    const from = ctx.from;
    if (!from) return;

    if (this.adminService.isAdmin(from.id) && this.adminService.isAwaitingGrantId(from.id)) {
      const text = (ctx.message as any)?.text?.trim();
      if (text && /^\d+$/.test(text)) {
        await this.adminService.executeGrant(ctx, text);
        return;
      }
    }
  }

  // ─── Telegram events ──────────────────────────────────────────────────────

  @On('chat_join_request')
  async onJoinRequest(ctx: Context): Promise<void> {
    await this.telegramAccess.handleJoinRequest(ctx.update as TgUpdate.ChatJoinRequestUpdate);
  }

  @On('chat_member')
  async onChatMember(ctx: Context): Promise<void> {
    await this.telegramAccess.handleChatMember(ctx.update as TgUpdate.ChatMemberUpdate);
  }

  @On('my_chat_member')
  async onMyChatMember(ctx: Context): Promise<void> {
    await this.telegramAccess.handleChatMember(ctx.update as TgUpdate.MyChatMemberUpdate);
  }
}
