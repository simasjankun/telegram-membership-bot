import {
  Controller,
  Post,
  Headers,
  HttpCode,
  BadRequestException,
  Logger,
  Req,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import { MembershipService } from '../membership/membership.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly membership: MembershipService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<void> {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    let event: ReturnType<typeof this.stripe.constructEvent>;
    try {
      event = this.stripe.constructEvent(req.rawBody, signature);
    } catch (err) {
      this.logger.warn(`Webhook signature verification failed: ${(err as Error).message}`);
      throw new BadRequestException('Invalid signature');
    }

    // Idempotency check
    const existing = await this.prisma.billingEvent.findUnique({
      where: { stripeEventId: event.id },
    });
    if (existing) {
      this.logger.debug(`Duplicate Stripe event skipped: ${event.id}`);
      return;
    }

    await this.prisma.billingEvent.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
        payloadJson: JSON.parse(JSON.stringify(event)),
        status: 'PENDING',
      },
    });

    try {
      await this.membership.processStripeEvent(event);
      await this.prisma.billingEvent.update({
        where: { stripeEventId: event.id },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
    } catch (err) {
      this.logger.error(`Failed to process event ${event.id}: ${(err as Error).message}`);
      await this.prisma.billingEvent.update({
        where: { stripeEventId: event.id },
        data: { status: 'FAILED' },
      });
    }
  }
}
