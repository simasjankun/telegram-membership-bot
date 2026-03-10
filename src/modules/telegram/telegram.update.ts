import { Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { TelegramService } from './telegram.service';

@Update()
export class TelegramUpdate {
  constructor(private readonly telegramService: TelegramService) {}

  @Start()
  async onStart(ctx: Context): Promise<void> {
    await this.telegramService.handleStart(ctx);
  }
}
