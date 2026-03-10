import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly stripe: StripeService,
  ) {}

  async processStripeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const telegramUserId = session.metadata?.telegram_user_id;
    if (!telegramUserId) {
      this.logger.warn(`checkout.session.completed missing telegram_user_id: ${session.id}`);
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { telegramUserId: BigInt(telegramUserId) },
    });
    if (!user) {
      this.logger.warn(`User not found for telegram_user_id: ${telegramUserId}`);
      return;
    }

    if (session.customer) {
      await this.prisma.stripeCustomer.upsert({
        where: { userId: user.id },
        update: { stripeCustomerId: session.customer as string },
        create: { userId: user.id, stripeCustomerId: session.customer as string },
      });
    }

    // Fetch and process subscription directly — handles race condition where
    // customer.subscription.created arrives before checkout.session.completed
    if (session.subscription) {
      const subscription = await this.stripe.client.subscriptions.retrieve(
        session.subscription as string,
      );
      await this.handleSubscriptionUpsert(subscription);
    }

    this.logger.log(`Checkout completed for user ${user.id}`);
  }

  private async handleSubscriptionUpsert(subscription: Stripe.Subscription): Promise<void> {
    const customer = await this.prisma.stripeCustomer.findUnique({
      where: { stripeCustomerId: subscription.customer as string },
      include: { user: true },
    });
    if (!customer) {
      this.logger.warn(`StripeCustomer not found for customer: ${subscription.customer}`);
      return;
    }

    const newStatus = this.mapStripeStatus(subscription.status);
    const existing = await this.prisma.subscription.findUnique({
      where: { userId: customer.userId },
    });
    const inactiveStatuses: SubscriptionStatus[] = [
      SubscriptionStatus.INACTIVE,
      SubscriptionStatus.CHECKOUT_STARTED,
      SubscriptionStatus.CANCELED,
    ];
    const wasInactive = !existing || inactiveStatuses.includes(existing.status);

    await this.prisma.subscription.upsert({
      where: { userId: customer.userId },
      update: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id ?? null,
        status: newStatus,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        lastStripeEventAt: new Date(),
      },
      create: {
        userId: customer.userId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id ?? null,
        status: newStatus,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        lastStripeEventAt: new Date(),
      },
    });

    if (newStatus === SubscriptionStatus.ACTIVE && wasInactive) {
      await this.notifications.sendSubscriptionActivated(customer.user);
    }

    this.logger.log(
      `Subscription ${subscription.id} → ${newStatus} for user ${customer.userId}`,
    );
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const customer = await this.prisma.stripeCustomer.findUnique({
      where: { stripeCustomerId: subscription.customer as string },
      include: { user: true },
    });
    if (!customer) return;

    await this.prisma.subscription.update({
      where: { userId: customer.userId },
      data: { status: SubscriptionStatus.CANCELED, lastStripeEventAt: new Date() },
    });

    await this.notifications.sendSubscriptionCanceled(customer.user);
    this.logger.log(`Subscription deleted for user ${customer.userId}`);
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.customer) return;

    const customer = await this.prisma.stripeCustomer.findUnique({
      where: { stripeCustomerId: invoice.customer as string },
    });
    if (!customer) return;

    await this.prisma.subscription.updateMany({
      where: {
        userId: customer.userId,
        status: { in: [SubscriptionStatus.PAST_DUE, SubscriptionStatus.GRACE_PERIOD] },
      },
      data: {
        status: SubscriptionStatus.ACTIVE,
        graceUntil: null,
        currentPeriodStart: new Date(invoice.period_start * 1000),
        currentPeriodEnd: new Date(invoice.period_end * 1000),
        lastStripeEventAt: new Date(),
      },
    });
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.customer) return;

    const customer = await this.prisma.stripeCustomer.findUnique({
      where: { stripeCustomerId: invoice.customer as string },
      include: { user: true },
    });
    if (!customer) return;

    await this.prisma.subscription.updateMany({
      where: { userId: customer.userId, status: SubscriptionStatus.ACTIVE },
      data: { status: SubscriptionStatus.PAST_DUE, lastStripeEventAt: new Date() },
    });

    await this.notifications.sendPaymentFailed(customer.user);
    this.logger.warn(`Payment failed for user ${customer.userId}`);
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case 'active':
      case 'trialing':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
      case 'unpaid':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
      case 'incomplete_expired':
      case 'paused':
        return SubscriptionStatus.CANCELED;
      case 'incomplete':
        return SubscriptionStatus.CHECKOUT_STARTED;
      default:
        return SubscriptionStatus.INACTIVE;
    }
  }
}
