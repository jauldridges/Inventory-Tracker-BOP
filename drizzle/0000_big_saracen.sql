CREATE TABLE IF NOT EXISTS "alerts_sent" (
	"id" serial PRIMARY KEY NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"kind" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consumption_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"square_order_id" text NOT NULL,
	"square_line_item_uid" text NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unit" text DEFAULT 'each' NOT NULL,
	"current_stock" numeric(12, 3) DEFAULT '0' NOT NULL,
	"reorder_lead_days" integer DEFAULT 3 NOT NULL,
	"safety_stock_days" integer DEFAULT 2 NOT NULL,
	"reorder_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_items_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recipes" (
	"square_catalog_item_id" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"quantity_per_sale" numeric(12, 3) DEFAULT '1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipes_square_catalog_item_id_inventory_item_id_pk" PRIMARY KEY("square_catalog_item_id","inventory_item_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "square_catalog_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"square_variation_id" text NOT NULL,
	"square_item_id" text NOT NULL,
	"name" text NOT NULL,
	"variation_name" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"new_total" numeric(12, 3),
	"delta" numeric(12, 3),
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_state" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"last_order_sync_at" timestamp with time zone,
	"last_catalog_sync_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts_sent" ADD CONSTRAINT "alerts_sent_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consumption_log" ADD CONSTRAINT "consumption_log_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recipes" ADD CONSTRAINT "recipes_square_catalog_item_id_square_catalog_items_id_fk" FOREIGN KEY ("square_catalog_item_id") REFERENCES "public"."square_catalog_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recipes" ADD CONSTRAINT "recipes_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_item_kind_idx" ON "alerts_sent" USING btree ("inventory_item_id","kind","sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "consumption_order_line_item_unique" ON "consumption_log" USING btree ("square_order_id","square_line_item_uid","inventory_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consumption_occurred_idx" ON "consumption_log" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consumption_item_idx" ON "consumption_log" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "square_variation_unique" ON "square_catalog_items" USING btree ("square_variation_id");