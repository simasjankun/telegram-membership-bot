import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegramUpdate } from './telegram.update';
import { TelegramService } from './telegram.service';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        token: config.get<string>('telegram.botToken')!,
        launchOptions: {
          webhook: {
            domain: config.get<string>('app.url')!,
            path: '/webhooks/telegram',
            secretToken: config.get<string>('telegram.webhookSecret')!,
          },
        },
      }),
    }),
  ],
  providers: [TelegramUpdate, TelegramService],
})
export class TelegramModule {}
