import { Module, forwardRef } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [NotificationsModule, forwardRef(() => StripeModule)],
  providers: [MembershipService],
  exports: [MembershipService],
})
export class MembershipModule {}
