import { Module } from '@nestjs/common';
import { ExpiryJob } from './expiry.job';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [ExpiryJob],
})
export class JobsModule {}
