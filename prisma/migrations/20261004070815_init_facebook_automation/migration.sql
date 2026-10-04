-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('MESSAGE', 'COMMENT');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateTable
CREATE TABLE "facebook_pages" (
    "id" TEXT NOT NULL,
    "meta_page_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "access_token_encrypted" TEXT NOT NULL,
    "tasks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automations" (
    "id" TEXT NOT NULL,
    "facebook_page_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL,
    "keyword" TEXT NOT NULL,
    "reply_text" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "event_key" TEXT NOT NULL,
    "meta_page_id" TEXT NOT NULL,
    "facebook_page_id" TEXT,
    "event_type" "AutomationTrigger" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "error" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "facebook_pages_meta_page_id_key" ON "facebook_pages"("meta_page_id");

-- CreateIndex
CREATE INDEX "automations_facebook_page_id_trigger_is_active_idx" ON "automations"("facebook_page_id", "trigger", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_event_key_key" ON "webhook_events"("event_key");

-- CreateIndex
CREATE INDEX "webhook_events_meta_page_id_received_at_idx" ON "webhook_events"("meta_page_id", "received_at");

-- CreateIndex
CREATE INDEX "webhook_events_status_received_at_idx" ON "webhook_events"("status", "received_at");

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_facebook_page_id_fkey" FOREIGN KEY ("facebook_page_id") REFERENCES "facebook_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_facebook_page_id_fkey" FOREIGN KEY ("facebook_page_id") REFERENCES "facebook_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
