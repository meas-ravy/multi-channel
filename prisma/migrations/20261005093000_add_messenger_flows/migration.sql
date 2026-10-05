CREATE TABLE "messenger_flows" (
    "id" TEXT NOT NULL,
    "facebook_page_id" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "published" JSONB,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "messenger_flows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messenger_sessions" (
    "id" TEXT NOT NULL,
    "facebook_page_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "waiting_node_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "messenger_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "messenger_flows_facebook_page_id_key"
ON "messenger_flows"("facebook_page_id");

CREATE UNIQUE INDEX "messenger_sessions_facebook_page_id_sender_id_key"
ON "messenger_sessions"("facebook_page_id", "sender_id");

ALTER TABLE "messenger_flows"
ADD CONSTRAINT "messenger_flows_facebook_page_id_fkey"
FOREIGN KEY ("facebook_page_id") REFERENCES "facebook_pages"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messenger_sessions"
ADD CONSTRAINT "messenger_sessions_facebook_page_id_fkey"
FOREIGN KEY ("facebook_page_id") REFERENCES "facebook_pages"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
