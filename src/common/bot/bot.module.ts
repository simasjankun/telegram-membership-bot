import { Global, Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegramAccessService } from './telegram.access.service';

@Global()
@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        token: config.get<string>('telegram.botToken')!,
        launchOptions: false,
      }),
    }),
  ],
  providers: [TelegramAccessService],
  exports: [TelegrafModule, TelegramAccessService],
})
export class BotModule {}
