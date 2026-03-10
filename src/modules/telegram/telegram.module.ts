import { Module } from '@nestjs/common';
import { TelegramUpdateHandler } from './telegram.update';
import { TelegramService } from './telegram.service';
import { TelegramWebhookController } from './telegram.webhook.controller';
import { StripeModule } from '../stripe/stripe.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [StripeModule, AdminModule],
  controllers: [TelegramWebhookController],
  providers: [TelegramUpdateHandler, TelegramService],
})
export class TelegramModule {}
