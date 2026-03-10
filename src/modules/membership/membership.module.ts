import { Module } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [MembershipService],
  exports: [MembershipService],
})
export class MembershipModule {}
