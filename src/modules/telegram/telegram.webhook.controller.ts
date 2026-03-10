import { Controller, Post, Req, Res, Headers, HttpCode, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { Request, Response } from 'express';

@Controller('webhooks/telegram')
export class TelegramWebhookController {
  private readonly logger = new Logger(TelegramWebhookController.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  async handleUpdate(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('x-telegram-bot-api-secret-token') secretToken: string,
  ): Promise<void> {
    const expected = this.config.get<string>('telegram.webhookSecret');

    if (secretToken !== expected) {
      this.logger.warn('Webhook received with invalid secret token');
      res.status(403).send('Forbidden');
      return;
    }

    await this.bot.handleUpdate(req.body as Parameters<typeof this.bot.handleUpdate>[0], res);
  }
}
