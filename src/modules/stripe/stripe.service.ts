import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  readonly client: Stripe;

  constructor(private readonly config: ConfigService) {
    this.client = new Stripe(this.config.get<string>('stripe.secretKey')!);
  }

  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return this.client.webhooks.constructEvent(
      rawBody,
      signature,
      this.config.get<string>('stripe.webhookSecret')!,
    );
  }
}
