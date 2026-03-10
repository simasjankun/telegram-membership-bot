export default () => ({
  app: {
    port: parseInt(process.env.PORT ?? '3000', 10),
    url: process.env.APP_URL!,
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },
  database: {
    url: process.env.DATABASE_URL!,
    poolUrl: process.env.DATABASE_POOL_URL!,
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    discussionGroupId: process.env.TELEGRAM_DISCUSSION_GROUP_ID!,
    contentChannelId: process.env.TELEGRAM_CONTENT_CHANNEL_ID!,
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET!,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    priceId: process.env.STRIPE_PRICE_ID!,
  },
});
