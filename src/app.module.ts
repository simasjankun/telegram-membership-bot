import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { BotModule } from './common/bot/bot.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { StripeModule } from './modules/stripe/stripe.module';
import { MembershipModule } from './modules/membership/membership.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    BotModule,
    HealthModule,
    TelegramModule,
    StripeModule,
    MembershipModule,
    NotificationsModule,
    JobsModule,
  ],
})
export class AppModule {}
