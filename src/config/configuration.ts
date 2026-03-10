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
  communityName: process.env.COMMUNITY_NAME ?? 'Club',
  standardPackageName: process.env.STANDARD_PACKAGE_NAME ?? 'Standard',
  vipPackageName: process.env.VIP_PACKAGE_NAME ?? 'Plus',
  jobs: {
    cronSchedule: process.env.CRON_SCHEDULE ?? '0 * * * *',
    gracePeriodDays: parseFloat(process.env.GRACE_PERIOD_DAYS ?? '2'),
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
    standardPriceId: process.env.STANDARD_STRIPE_PRICE_ID!,
    vipPriceId: process.env.VIP_STRIPE_PRICE_ID!,
    standardPriceDisplay: process.env.STANDARD_PRICE_DISPLAY ?? '29 €/mėn.',
    vipPriceDisplay: process.env.VIP_PRICE_DISPLAY ?? '49 €/mėn.',
  },
});
