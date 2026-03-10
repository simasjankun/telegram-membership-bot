import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import type { Update } from '@telegraf/types';
import { MemberStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class TelegramAccessService implements OnModuleInit {
  private readonly logger = new Logger(TelegramAccessService.name);

  private channelInviteLink!: string;
  private groupInviteLink!: string;

  private readonly channelId: string;
  private readonly groupId: string;

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {
    this.channelId = this.config.get<string>('telegram.contentChannelId')!;
    this.groupId = this.config.get<string>('telegram.discussionGroupId')!;
  }

  async onModuleInit(): Promise<void> {
    await this.refreshInviteLinks();
  }

  async refreshInviteLinks(): Promise<void> {
    try {
      const [channelLink, groupLink] = await Promise.all([
        this.bot.telegram.createChatInviteLink(this.channelId, {
          creates_join_request: true,
        }),
        this.bot.telegram.createChatInviteLink(this.groupId, {
          creates_join_request: true,
        }),
      ]);
      this.channelInviteLink = channelLink.invite_link;
      this.groupInviteLink = groupLink.invite_link;
      this.logger.log('Invite links created successfully');
    } catch (err) {
      this.logger.error(`Failed to create invite links: ${(err as Error).message}`);
    }
  }

  getInviteLinks(): { channel: string; group: string } {
    return { channel: this.channelInviteLink, group: this.groupInviteLink };
  }

  async handleJoinRequest(update: Update.ChatJoinRequestUpdate): Promise<void> {
    const request = update.chat_join_request;
    const telegramUserId = BigInt(request.from.id);
    const chatId = request.chat.id;

    const user = await this.prisma.user.findUnique({
      where: { telegramUserId },
      include: { subscription: true },
    });

    if (!user || user.subscription?.status !== SubscriptionStatus.ACTIVE) {
      await this.bot.telegram.declineChatJoinRequest(chatId, request.from.id);
      this.logger.warn(
        `Declined join request from ${request.from.id} — no active subscription`,
      );
      if (user) {
        await this.bot.telegram.sendMessage(
          request.from.id.toString(),
          this.i18n.t('join.declined', user.languageCode),
          { parse_mode: 'Markdown' },
        );
      }
      return;
    }

    await this.bot.telegram.approveChatJoinRequest(chatId, request.from.id);
    await this.upsertMembership(user.id, chatId, MemberStatus.MEMBER);

    const isChannel = chatId === parseInt(this.channelId);
    const msgKey = isChannel ? 'join.approved.channel' : 'join.approved.group';

    await this.bot.telegram.sendMessage(
      request.from.id.toString(),
      this.i18n.t(msgKey, user.languageCode),
      { parse_mode: 'Markdown' },
    );

    if (!isChannel) {
      const displayName = request.from.username
        ? `@${request.from.username}`
        : request.from.first_name;
      await this.bot.telegram.sendMessage(
        this.groupId,
        this.i18n.t('group.welcome', 'lt', { displayName }),
        { parse_mode: 'Markdown' },
      );

    }

    this.logger.log(`Approved join request for user ${user.id} in chat ${chatId}`);
  }

  async handleChatMember(
    update: Update.ChatMemberUpdate | Update.MyChatMemberUpdate,
  ): Promise<void> {
    const member =
      (update as Update.ChatMemberUpdate).chat_member ??
      (update as Update.MyChatMemberUpdate).my_chat_member;

    if (!member) return;

    const telegramUserId = BigInt(member.new_chat_member.user.id);
    const chatId = member.chat.id;
    const newStatus = this.mapTelegramStatus(member.new_chat_member.status);

    const user = await this.prisma.user.findUnique({ where: { telegramUserId } });
    if (!user) return;

    await this.upsertMembership(user.id, chatId, newStatus);
    this.logger.log(
      `Chat member update: user ${user.id} in chat ${chatId} → ${newStatus}`,
    );
  }

  async removeMember(telegramUserId: bigint): Promise<void> {
    const userId = Number(telegramUserId);
    for (const chatId of [this.channelId, this.groupId]) {
      try {
        await this.bot.telegram.banChatMember(chatId, userId);
        await this.bot.telegram.unbanChatMember(chatId, userId);
        this.logger.log(`Removed user ${userId} from chat ${chatId}`);
      } catch (err) {
        // Already not a member — not an error
        this.logger.debug(`Remove skipped for user ${userId} in ${chatId}: ${(err as Error).message}`);
      }
    }

    await this.prisma.telegramMembership.updateMany({
      where: {
        user: { telegramUserId },
      },
      data: {
        groupMemberStatus: MemberStatus.KICKED,
        channelMemberStatus: MemberStatus.KICKED,
        removedAt: new Date(),
      },
    });
  }

  private async upsertMembership(
    userId: string,
    chatId: number,
    status: MemberStatus,
  ): Promise<void> {
    const isChannel = chatId === parseInt(this.channelId);
    const isGroup = chatId === parseInt(this.groupId);
    if (!isChannel && !isGroup) return;

    await this.prisma.telegramMembership.upsert({
      where: { userId },
      update: {
        ...(isChannel ? { channelMemberStatus: status } : {}),
        ...(isGroup ? { groupMemberStatus: status } : {}),
        lastVerifiedAt: new Date(),
      },
      create: {
        userId,
        contentChannelChatId: BigInt(this.channelId),
        discussionGroupChatId: BigInt(this.groupId),
        channelMemberStatus: isChannel ? status : MemberStatus.UNKNOWN,
        groupMemberStatus: isGroup ? status : MemberStatus.UNKNOWN,
        lastVerifiedAt: new Date(),
      },
    });
  }

  private mapTelegramStatus(status: string): MemberStatus {
    switch (status) {
      case 'member':
      case 'administrator':
      case 'creator':
        return MemberStatus.MEMBER;
      case 'left':
        return MemberStatus.LEFT;
      case 'kicked':
        return MemberStatus.KICKED;
      case 'restricted':
        return MemberStatus.RESTRICTED;
      default:
        return MemberStatus.UNKNOWN;
    }
  }
}
