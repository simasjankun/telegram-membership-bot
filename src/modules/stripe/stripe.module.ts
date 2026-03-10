import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeCheckoutService } from './stripe.checkout.service';
import { StripeWebhookController } from './stripe.webhook.controller';
import { MembershipModule } from '../membership/membership.module';

@Module({
  imports: [MembershipModule],
  controllers: [StripeWebhookController],
  providers: [StripeService, StripeCheckoutService],
  exports: [StripeCheckoutService],
})
export class StripeModule {}
