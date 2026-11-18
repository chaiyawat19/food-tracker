CREATE TABLE "favorite_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_type" text NOT NULL,
	"title" text NOT NULL,
	"payload" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredient_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_th" text NOT NULL,
	"color_hex" text DEFAULT '#64748b' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ingredient_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"name_th" text NOT NULL,
	"kcal_per_100g" real NOT NULL,
	"is_default" boolean DEFAULT true NOT NULL,
	CONSTRAINT "ingredients_name_th_unique" UNIQUE("name_th")
);
--> statement-breakpoint
CREATE TABLE "meal_log_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_log_id" uuid NOT NULL,
	"ingredient_id" integer,
	"category_id" integer NOT NULL,
	"ingredient_name" text NOT NULL,
	"grams" real NOT NULL,
	"kcal" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_type" text NOT NULL,
	"title" text NOT NULL,
	"raw_input" text,
	"portion_multiplier" real DEFAULT 1 NOT NULL,
	"total_kcal" real NOT NULL,
	"sugar_grams" real DEFAULT 0 NOT NULL,
	"sweetness_level" integer,
	"toppings" jsonb DEFAULT '[]'::jsonb,
	"snack_category" text,
	"logged_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preset_dish_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"preset_dish_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	"default_grams" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preset_dishes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_th" text NOT NULL,
	"aliases" text,
	"base_cooking_kcal" real DEFAULT 80 NOT NULL,
	"default_total_kcal" real NOT NULL,
	CONSTRAINT "preset_dishes_name_th_unique" UNIQUE("name_th")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_user_id" text NOT NULL,
	"display_name" text,
	"daily_calorie_goal" integer DEFAULT 2000 NOT NULL,
	"weekly_sweet_drink_quota" integer DEFAULT 3 NOT NULL,
	"daily_sweet_snack_kcal_quota" integer DEFAULT 300 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_line_user_id_unique" UNIQUE("line_user_id")
);
--> statement-breakpoint
ALTER TABLE "favorite_items" ADD CONSTRAINT "favorite_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_category_id_ingredient_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."ingredient_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_log_ingredients" ADD CONSTRAINT "meal_log_ingredients_meal_log_id_meal_logs_id_fk" FOREIGN KEY ("meal_log_id") REFERENCES "public"."meal_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_log_ingredients" ADD CONSTRAINT "meal_log_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_log_ingredients" ADD CONSTRAINT "meal_log_ingredients_category_id_ingredient_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."ingredient_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preset_dish_ingredients" ADD CONSTRAINT "preset_dish_ingredients_preset_dish_id_preset_dishes_id_fk" FOREIGN KEY ("preset_dish_id") REFERENCES "public"."preset_dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preset_dish_ingredients" ADD CONSTRAINT "preset_dish_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meal_log_ing_cat_idx" ON "meal_log_ingredients" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "meal_log_ing_meal_idx" ON "meal_log_ingredients" USING btree ("meal_log_id");--> statement-breakpoint
CREATE INDEX "meal_logs_user_date_idx" ON "meal_logs" USING btree ("user_id","logged_at");--> statement-breakpoint
CREATE INDEX "meal_logs_user_type_idx" ON "meal_logs" USING btree ("user_id","entry_type");