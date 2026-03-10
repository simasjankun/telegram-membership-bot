import { Module } from '@nestjs/common';
import { TelegramUpdateHandler } from './telegram.update';
import { TelegramService } from './telegram.service';
import { TelegramWebhookController } from './telegram.webhook.controller';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [StripeModule],
  controllers: [TelegramWebhookController],
  providers: [TelegramUpdateHandler, TelegramService],
})
export class TelegramModule {}
