import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  boolean,
  timestamp,
  serial,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  lineUserId: text('line_user_id').notNull().unique(),
  displayName: text('display_name'),
  dailyCalorieGoal: integer('daily_calorie_goal').default(2000).notNull(),
  weeklySweetDrinkQuota: integer('weekly_sweet_drink_quota').default(3).notNull(),
  dailySweetSnackKcalQuota: integer('daily_sweet_snack_kcal_quota').default(300).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const ingredientCategories = pgTable('ingredient_categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameTh: text('name_th').notNull(),
  colorHex: text('color_hex').default('#64748b').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
});

export const ingredients = pgTable('ingredients', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id')
    .references(() => ingredientCategories.id)
    .notNull(),
  nameTh: text('name_th').notNull().unique(),
  kcalPer100g: real('kcal_per_100g').notNull(),
  isDefault: boolean('is_default').default(true).notNull(),
});

export const presetDishes = pgTable('preset_dishes', {
  id: serial('id').primaryKey(),
  nameTh: text('name_th').notNull().unique(),
  aliases: text('aliases'),
  baseCookingKcal: real('base_cooking_kcal').default(80).notNull(),
  defaultTotalKcal: real('default_total_kcal').notNull(),
});

export const presetDishIngredients = pgTable('preset_dish_ingredients', {
  id: serial('id').primaryKey(),
  presetDishId: integer('preset_dish_id')
    .references(() => presetDishes.id, { onDelete: 'cascade' })
    .notNull(),
  ingredientId: integer('ingredient_id')
    .references(() => ingredients.id)
    .notNull(),
  defaultGrams: real('default_grams').notNull(),
});

export type EntryType = 'MAIN_DISH' | 'SWEET_DRINK' | 'SNACK';

export const mealLogs = pgTable(
  'meal_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    entryType: text('entry_type').$type<EntryType>().notNull(),
    title: text('title').notNull(),
    rawInput: text('raw_input'),
    portionMultiplier: real('portion_multiplier').default(1.0).notNull(),
    totalKcal: real('total_kcal').notNull(),
    sugarGrams: real('sugar_grams').default(0).notNull(),
    sweetnessLevel: integer('sweetness_level'),
    toppings: jsonb('toppings').$type<string[]>().default([]),
    snackCategory: text('snack_category'),
    loggedAt: timestamp('logged_at').defaultNow().notNull(),
  },
  (table) => [
    index('meal_logs_user_date_idx').on(table.userId, table.loggedAt),
    index('meal_logs_user_type_idx').on(table.userId, table.entryType),
  ]
);

export const mealLogIngredients = pgTable(
  'meal_log_ingredients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    mealLogId: uuid('meal_log_id')
      .references(() => mealLogs.id, { onDelete: 'cascade' })
      .notNull(),
    ingredientId: integer('ingredient_id').references(() => ingredients.id),
    categoryId: integer('category_id')
      .references(() => ingredientCategories.id)
      .notNull(),
    ingredientName: text('ingredient_name').notNull(),
    grams: real('grams').notNull(),
    kcal: real('kcal').notNull(),
  },
  (table) => [
    index('meal_log_ing_cat_idx').on(table.categoryId),
    index('meal_log_ing_meal_idx').on(table.mealLogId),
  ]
);

export const favoriteItems = pgTable('favorite_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  entryType: text('entry_type').$type<EntryType>().notNull(),
  title: text('title').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
});
