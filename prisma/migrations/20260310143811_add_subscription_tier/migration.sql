-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('STANDARD', 'VIP');

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "tier" "SubscriptionTier" NOT NULL DEFAULT 'STANDARD';
