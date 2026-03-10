import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { getBotToken } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const port = config.get<number>('app.port') ?? 3000;
  const appUrl = config.get<string>('app.url')!;
  const webhookSecret = config.get<string>('telegram.webhookSecret')!;

  await app.listen(port);

  const bot = app.get<Telegraf>(getBotToken());
  await bot.telegram.setWebhook(`${appUrl}/webhooks/telegram`, {
    secret_token: webhookSecret,
  });

  console.log(`Application running on port ${port}`);
  console.log(`Telegram webhook: ${appUrl}/webhooks/telegram`);
}

bootstrap();
