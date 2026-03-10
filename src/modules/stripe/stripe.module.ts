import { Module, forwardRef } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeCheckoutService } from './stripe.checkout.service';
import { StripeWebhookController } from './stripe.webhook.controller';
import { MembershipModule } from '../membership/membership.module';

@Module({
  imports: [forwardRef(() => MembershipModule)],
  controllers: [StripeWebhookController],
  providers: [StripeService, StripeCheckoutService],
  exports: [StripeService, StripeCheckoutService],
})
export class StripeModule {}
