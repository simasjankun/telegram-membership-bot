import { On, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import type { Update as TgUpdate } from '@telegraf/types';
import { TelegramService } from './telegram.service';
import { TelegramAccessService } from '../../common/bot/telegram.access.service';

@Update()
export class TelegramUpdateHandler {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly telegramAccess: TelegramAccessService,
  ) {}

  @Start()
  async onStart(ctx: Context): Promise<void> {
    await this.telegramService.handleStart(ctx);
  }

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
