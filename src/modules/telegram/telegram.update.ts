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

  @Start()
  async onStart(ctx: Context): Promise<void> {
    await this.telegramService.handleStart(ctx);
  }

  @Action(/^tier:(.+)$/)
  async onTierSelected(ctx: Context): Promise<void> {
    await this.telegramService.handleTierSelected(ctx);
  }

  // ─── Public command ───────────────────────────────────────────────────────

  @Command('myid')
  async onMyId(ctx: Context): Promise<void> {
    await this.adminService.handleMyId(ctx);
  }

  // ─── Admin commands (ignored if sender is not in ADMIN_TELEGRAM_IDS) ─────

  @Command('checkuser')
  async onCheckUser(ctx: Context): Promise<void> {
    if (!this.adminService.isAdmin(ctx.from!.id)) return;
    const args = (ctx.message as any)?.text?.split(' ').slice(1).join(' ') ?? '';
    await this.adminService.handleCheckUser(ctx, args);
  }

  @Command('grantaccess')
  async onGrantAccess(ctx: Context): Promise<void> {
    if (!this.adminService.isAdmin(ctx.from!.id)) return;
    const args = (ctx.message as any)?.text?.split(' ').slice(1).join(' ') ?? '';
    await this.adminService.handleGrantAccess(ctx, args);
  }

  @Command('revokeaccess')
  async onRevokeAccess(ctx: Context): Promise<void> {
    if (!this.adminService.isAdmin(ctx.from!.id)) return;
    const args = (ctx.message as any)?.text?.split(' ').slice(1).join(' ') ?? '';
    await this.adminService.handleRevokeAccess(ctx, args);
  }

  @Command('stats')
  async onStats(ctx: Context): Promise<void> {
    if (!this.adminService.isAdmin(ctx.from!.id)) return;
    await this.adminService.handleStats(ctx);
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
