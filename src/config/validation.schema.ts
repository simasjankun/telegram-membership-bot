import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  APP_URL: Joi.string().uri().required(),

  DATABASE_URL: Joi.string().required(),
  DATABASE_POOL_URL: Joi.string().required(),

  REDIS_URL: Joi.string().default('redis://localhost:6379'),

  TELEGRAM_BOT_TOKEN: Joi.string().required(),
  TELEGRAM_DISCUSSION_GROUP_ID: Joi.string().required(),
  TELEGRAM_CONTENT_CHANNEL_ID: Joi.string().required(),
  TELEGRAM_WEBHOOK_SECRET: Joi.string().required(),

  COMMUNITY_NAME: Joi.string().default('Club'),
  STANDARD_PACKAGE_NAME: Joi.string().default('Standard'),
  VIP_PACKAGE_NAME: Joi.string().default('Plus'),
  CRON_SCHEDULE: Joi.string().default('0 * * * *'),
  GRACE_PERIOD_DAYS: Joi.number().default(2),

  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),
  STANDARD_STRIPE_PRICE_ID: Joi.string().required(),
  VIP_STRIPE_PRICE_ID: Joi.string().required(),
  STANDARD_PRICE_DISPLAY: Joi.string().default('29 €/mėn.'),
  VIP_PRICE_DISPLAY: Joi.string().default('49 €/mėn.'),
});
