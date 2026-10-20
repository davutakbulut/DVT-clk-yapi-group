-- K-116 · MariaDB şeması. Üretici: scripts/mysql/gen-schema.mts (PostgreSQL envanterinden). Elle düzenlemeyin — üreticiyi düzeltin.
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE users (
  id UUID NOT NULL DEFAULT UUID_v4(),
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NULL,
  email_confirmed_at DATETIME(6) NULL,
  last_sign_in_at DATETIME(6) NULL,
  meta JSON NOT NULL DEFAULT ('{}'),
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY users_email_uq (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE about_content (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `key` VARCHAR(255) NOT NULL DEFAULT 'main',
  `eyebrow` JSON NOT NULL DEFAULT ('{}'),
  `title` JSON NOT NULL DEFAULT ('{}'),
  `body` JSON NOT NULL DEFAULT ('{}'),
  `image_id` UUID NULL,
  `stats` JSON NOT NULL DEFAULT ('[]'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
  `published_locales` JSON NOT NULL DEFAULT ('[]'),
  `published_at` DATETIME(6) NULL,
  `translation_meta` JSON NOT NULL DEFAULT ('{}'),
  `seo_title` JSON NOT NULL DEFAULT ('{}'),
  `seo_description` JSON NOT NULL DEFAULT ('{}'),
  `og_image_id` UUID NULL,
  `canonical_url` MEDIUMTEXT NULL,
  `noindex` BOOLEAN NOT NULL DEFAULT FALSE,
  `focus_keyword` JSON NOT NULL DEFAULT ('{}'),
  PRIMARY KEY (`id`),
  UNIQUE KEY about_content_key_key (`key`),
  CONSTRAINT about_content_publishable CHECK (COALESCE((JSON_TYPE(published_locales) = 'ARRAY' AND JSON_LENGTH(published_locales) = JSON_CONTAINS(published_locales, '"tr"') + JSON_CONTAINS(published_locales, '"en"')) AND (NOT JSON_CONTAINS(published_locales, '"tr"') OR NULLIF(JSON_VALUE(title, '$.tr'), '') IS NOT NULL) AND (NOT JSON_CONTAINS(published_locales, '"en"') OR (NULLIF(JSON_VALUE(title, '$.en'), '') IS NOT NULL AND COALESCE(JSON_VALUE(translation_meta, '$.en.reviewed') IN ('1', 'true'), FALSE))), FALSE)),
  CONSTRAINT about_content_stats_check CHECK ((JSON_TYPE(stats) = 'ARRAY')),
  CONSTRAINT about_content_status_check CHECK ((status IN ('draft', 'published', 'archived'))),
  KEY about_content_status_idx (`status`, `published_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE analytics_events (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `session_id` UUID NOT NULL,
  `pageview_id` UUID NULL,
  `type` VARCHAR(255) NOT NULL,
  `path` VARCHAR(255) NOT NULL,
  `device` MEDIUMTEXT NOT NULL,
  `x_pct` DECIMAL(5,2) NULL,
  `y_pct` DECIMAL(5,2) NULL,
  `selector` MEDIUMTEXT NULL,
  `element_text` MEDIUMTEXT NULL,
  `payload` JSON NOT NULL DEFAULT ('{}'),
  `occurred_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT analytics_events_device_check CHECK ((device IN ('mobile', 'tablet', 'desktop'))),
  CONSTRAINT analytics_events_x_pct_check CHECK (((x_pct >= (0)) AND (x_pct <= (100)))),
  CONSTRAINT analytics_events_y_pct_check CHECK (((y_pct >= (0)) AND (y_pct <= (100)))),
  KEY analytics_events_occurred_idx (`occurred_at`),
  KEY analytics_events_type_path_idx (`type`, `path`, `occurred_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE analytics_pageviews (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `session_id` UUID NOT NULL,
  `path` VARCHAR(255) NOT NULL,
  `locale` MEDIUMTEXT NULL,
  `viewed_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `duration_ms` INT NULL,
  `max_scroll_pct` SMALLINT NULL,
  `viewport_w` INT NULL,
  `viewport_h` INT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT analytics_pageviews_duration_ms_check CHECK ((duration_ms >= 0)),
  CONSTRAINT analytics_pageviews_locale_check CHECK ((locale IN ('tr', 'en'))),
  CONSTRAINT analytics_pageviews_max_scroll_pct_check CHECK (((max_scroll_pct >= 0) AND (max_scroll_pct <= 100))),
  KEY analytics_pageviews_path_idx (`path`, `viewed_at`),
  KEY analytics_pageviews_session_idx (`session_id`, `viewed_at`),
  KEY analytics_pageviews_viewed_idx (`viewed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE analytics_sessions (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `visitor_hash` MEDIUMTEXT NOT NULL,
  `started_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `last_seen_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `device` MEDIUMTEXT NOT NULL,
  `browser` MEDIUMTEXT NULL,
  `os` MEDIUMTEXT NULL,
  `country` MEDIUMTEXT NULL,
  `locale` MEDIUMTEXT NULL,
  `referrer_host` MEDIUMTEXT NULL,
  `referrer_kind` VARCHAR(255) NOT NULL DEFAULT 'direct',
  `utm` JSON NOT NULL DEFAULT ('{}'),
  `landing_path` MEDIUMTEXT NULL,
  `exit_path` MEDIUMTEXT NULL,
  `pageview_count` INT NOT NULL DEFAULT 0,
  `ip_masked` MEDIUMTEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT analytics_sessions_device_check CHECK ((device IN ('mobile', 'tablet', 'desktop'))),
  CONSTRAINT analytics_sessions_locale_check CHECK ((locale IN ('tr', 'en'))),
  CONSTRAINT analytics_sessions_referrer_kind_check CHECK ((referrer_kind IN ('direct', 'search', 'social', 'ai', 'referral', 'ads', 'email'))),
  KEY analytics_sessions_referrer_idx (`referrer_kind`, `started_at`),
  KEY analytics_sessions_started_idx (`started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE audit_logs (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `actor_id` UUID NULL,
  `action` MEDIUMTEXT NOT NULL,
  `table_name` VARCHAR(255) NOT NULL,
  `row_id` UUID NULL,
  `old_data` JSON NULL,
  `new_data` JSON NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT audit_logs_action_check CHECK ((action IN ('INSERT', 'UPDATE', 'DELETE'))),
  KEY audit_logs_actor_idx (`actor_id`, `created_at` DESC),
  KEY audit_logs_table_row_idx (`table_name`, `row_id`, `created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE blog_categories (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `slug` JSON NOT NULL,
  `name` JSON NOT NULL,
  `description` JSON NOT NULL DEFAULT ('{}'),
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `seo_title` JSON NOT NULL DEFAULT ('{}'),
  `seo_description` JSON NOT NULL DEFAULT ('{}'),
  `og_image_id` UUID NULL,
  `canonical_url` MEDIUMTEXT NULL,
  `noindex` BOOLEAN NOT NULL DEFAULT FALSE,
  `focus_keyword` JSON NOT NULL DEFAULT ('{}'),
  `sort_order` INT NULL,
  slug_en VARCHAR(255) AS (JSON_VALUE(slug, '$.en')) STORED,
  slug_tr VARCHAR(255) AS (JSON_VALUE(slug, '$.tr')) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY blog_categories_sort_order_uq (`sort_order`),
  CONSTRAINT blog_categories_name_check CHECK ((NULLIF(JSON_VALUE(name, '$.tr'), '') IS NOT NULL)),
  CONSTRAINT blog_categories_slug_format CHECK (((slug IS NULL) OR COALESCE(JSON_TYPE(slug) = 'OBJECT' AND JSON_LENGTH(slug) = JSON_CONTAINS_PATH(slug, 'one', '$.tr') + JSON_CONTAINS_PATH(slug, 'one', '$.en') AND COALESCE(JSON_VALUE(slug, '$.tr') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.tr')) <= 80 AND JSON_VALUE(slug, '$.tr') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE) AND (JSON_VALUE(slug, '$.en') IS NULL OR COALESCE(JSON_VALUE(slug, '$.en') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.en')) <= 80 AND JSON_VALUE(slug, '$.en') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE)), FALSE))),
  UNIQUE KEY blog_categories_slug_en_uq (`slug_en`),
  UNIQUE KEY blog_categories_slug_tr_uq (`slug_tr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE blog_post_tags (
  `post_id` UUID NOT NULL,
  `tag_id` UUID NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`post_id`, `tag_id`),
  KEY blog_post_tags_tag_idx (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE blog_posts (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `slug` JSON NOT NULL,
  `title` JSON NOT NULL,
  `excerpt` JSON NOT NULL DEFAULT ('{}'),
  `body` JSON NOT NULL DEFAULT ('{}'),
  `cover_image_id` UUID NULL,
  `category_id` UUID NULL,
  `author_id` UUID NULL,
  `reading_minutes` JSON NOT NULL DEFAULT ('{}'),
  `is_featured` BOOLEAN NOT NULL DEFAULT FALSE,
  `allow_comments` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
  `published_locales` JSON NOT NULL DEFAULT ('[]'),
  `published_at` DATETIME(6) NULL,
  `translation_meta` JSON NOT NULL DEFAULT ('{}'),
  `seo_title` JSON NOT NULL DEFAULT ('{}'),
  `seo_description` JSON NOT NULL DEFAULT ('{}'),
  `og_image_id` UUID NULL,
  `canonical_url` MEDIUMTEXT NULL,
  `noindex` BOOLEAN NOT NULL DEFAULT FALSE,
  `focus_keyword` JSON NOT NULL DEFAULT ('{}'),
  slug_en VARCHAR(255) AS (JSON_VALUE(slug, '$.en')) STORED,
  slug_tr VARCHAR(255) AS (JSON_VALUE(slug, '$.tr')) STORED,
  PRIMARY KEY (`id`),
  CONSTRAINT blog_posts_publishable CHECK (COALESCE((JSON_TYPE(published_locales) = 'ARRAY' AND JSON_LENGTH(published_locales) = JSON_CONTAINS(published_locales, '"tr"') + JSON_CONTAINS(published_locales, '"en"')) AND (NOT JSON_CONTAINS(published_locales, '"tr"') OR NULLIF(JSON_VALUE(title, '$.tr'), '') IS NOT NULL) AND (NOT JSON_CONTAINS(published_locales, '"en"') OR (NULLIF(JSON_VALUE(title, '$.en'), '') IS NOT NULL AND (slug IS NULL OR JSON_VALUE(slug, '$.en') IS NOT NULL) AND COALESCE(JSON_VALUE(translation_meta, '$.en.reviewed') IN ('1', 'true'), FALSE))), FALSE)),
  CONSTRAINT blog_posts_slug_format CHECK (((slug IS NULL) OR COALESCE(JSON_TYPE(slug) = 'OBJECT' AND JSON_LENGTH(slug) = JSON_CONTAINS_PATH(slug, 'one', '$.tr') + JSON_CONTAINS_PATH(slug, 'one', '$.en') AND COALESCE(JSON_VALUE(slug, '$.tr') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.tr')) <= 80 AND JSON_VALUE(slug, '$.tr') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE) AND (JSON_VALUE(slug, '$.en') IS NULL OR COALESCE(JSON_VALUE(slug, '$.en') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.en')) <= 80 AND JSON_VALUE(slug, '$.en') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE)), FALSE))),
  CONSTRAINT blog_posts_status_check CHECK ((status IN ('draft', 'published', 'archived'))),
  KEY blog_posts_category_idx (`category_id`, `published_at` DESC),
  UNIQUE KEY blog_posts_slug_en_uq (`slug_en`),
  UNIQUE KEY blog_posts_slug_tr_uq (`slug_tr`),
  KEY blog_posts_status_idx (`status`, `published_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE blog_tags (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `slug` JSON NOT NULL,
  `name` JSON NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  slug_en VARCHAR(255) AS (JSON_VALUE(slug, '$.en')) STORED,
  slug_tr VARCHAR(255) AS (JSON_VALUE(slug, '$.tr')) STORED,
  PRIMARY KEY (`id`),
  CONSTRAINT blog_tags_name_check CHECK ((NULLIF(JSON_VALUE(name, '$.tr'), '') IS NOT NULL)),
  CONSTRAINT blog_tags_slug_format CHECK (((slug IS NULL) OR COALESCE(JSON_TYPE(slug) = 'OBJECT' AND JSON_LENGTH(slug) = JSON_CONTAINS_PATH(slug, 'one', '$.tr') + JSON_CONTAINS_PATH(slug, 'one', '$.en') AND COALESCE(JSON_VALUE(slug, '$.tr') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.tr')) <= 80 AND JSON_VALUE(slug, '$.tr') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE) AND (JSON_VALUE(slug, '$.en') IS NULL OR COALESCE(JSON_VALUE(slug, '$.en') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.en')) <= 80 AND JSON_VALUE(slug, '$.en') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE)), FALSE))),
  UNIQUE KEY blog_tags_slug_en_uq (`slug_en`),
  UNIQUE KEY blog_tags_slug_tr_uq (`slug_tr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE certificates (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `title` JSON NOT NULL,
  `issuer` MEDIUMTEXT NULL,
  `certificate_no` MEDIUMTEXT NULL,
  `description` JSON NOT NULL DEFAULT ('{}'),
  `image_id` UUID NULL,
  `document_id` UUID NULL,
  `issued_on` DATE NULL,
  `valid_until` DATE NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
  `published_locales` JSON NOT NULL DEFAULT ('[]'),
  `published_at` DATETIME(6) NULL,
  `translation_meta` JSON NOT NULL DEFAULT ('{}'),
  `sort_order` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY certificates_sort_order_uq (`sort_order`),
  CONSTRAINT certificates_check CHECK (((valid_until IS NULL) OR (issued_on IS NULL) OR (valid_until >= issued_on))),
  CONSTRAINT certificates_publishable CHECK (COALESCE((JSON_TYPE(published_locales) = 'ARRAY' AND JSON_LENGTH(published_locales) = JSON_CONTAINS(published_locales, '"tr"') + JSON_CONTAINS(published_locales, '"en"')) AND (NOT JSON_CONTAINS(published_locales, '"tr"') OR NULLIF(JSON_VALUE(title, '$.tr'), '') IS NOT NULL) AND (NOT JSON_CONTAINS(published_locales, '"en"') OR (NULLIF(JSON_VALUE(title, '$.en'), '') IS NOT NULL AND COALESCE(JSON_VALUE(translation_meta, '$.en.reviewed') IN ('1', 'true'), FALSE))), FALSE)),
  CONSTRAINT certificates_status_check CHECK ((status IN ('draft', 'published', 'archived'))),
  KEY certificates_status_idx (`status`, `published_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE clients (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `name` MEDIUMTEXT NOT NULL,
  `logo_id` UUID NULL,
  `website_url` MEDIUMTEXT NULL,
  `sector` JSON NOT NULL DEFAULT ('{}'),
  `is_featured` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `sort_order` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY clients_sort_order_uq (`sort_order`),
  CONSTRAINT clients_website_url_check CHECK (((website_url IS NULL) OR (website_url REGEXP '(?-i)^https?://')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE configuration_items (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `configuration_version_id` UUID NOT NULL,
  `element_group` MEDIUMTEXT NOT NULL,
  `steel_profile_id` UUID NULL,
  `panel_type_id` UUID NULL,
  `profile_code_snapshot` MEDIUMTEXT NULL,
  `piece_count` INT NULL,
  `total_length_m` DECIMAL(14,3) NULL,
  `total_area_m2` DECIMAL(14,3) NULL,
  `total_weight_kg` DECIMAL(14,3) NULL,
  `line_price` DECIMAL(14,2) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT configuration_items_piece_count_check CHECK ((piece_count > 0)),
  CONSTRAINT configuration_items_sizes CHECK (((char_length(element_group) <= 60) AND ((profile_code_snapshot IS NULL) OR (char_length(profile_code_snapshot) <= 100)))),
  CONSTRAINT configuration_items_total_area_m2_check CHECK ((total_area_m2 >= (0))),
  CONSTRAINT configuration_items_total_length_m_check CHECK ((total_length_m >= (0))),
  CONSTRAINT configuration_items_total_weight_kg_check CHECK ((total_weight_kg >= (0))),
  KEY configuration_items_version_idx (`configuration_version_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE configuration_versions (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `configuration_id` UUID NOT NULL,
  `version` INT NOT NULL,
  `params` JSON NOT NULL,
  `tonnage_kg` DECIMAL(14,3) NULL,
  `estimated_price` DECIMAL(14,2) NULL,
  `price_snapshot` JSON NOT NULL DEFAULT ('{}'),
  `note` MEDIUMTEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY configuration_versions_configuration_id_version_key (`configuration_id`, `version`),
  CONSTRAINT configuration_versions_version_check CHECK ((version > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE configurations (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `ref_code` VARCHAR(255) NOT NULL DEFAULT (SUBSTR(REPLACE(UUID_v4(), '-', ''), 1, 10)),
  `name` MEDIUMTEXT NOT NULL DEFAULT '',
  `user_id` UUID NULL,
  `public_token` UUID NOT NULL DEFAULT UUID_v4(),
  `owner_email` VARCHAR(255) NULL,
  `params` JSON NOT NULL,
  `current_version` INT NOT NULL DEFAULT 1,
  `tonnage_kg` DECIMAL(14,3) NULL,
  `estimated_price` DECIMAL(14,2) NULL,
  `currency` MEDIUMTEXT NOT NULL DEFAULT 'TRY',
  `status` MEDIUMTEXT NOT NULL DEFAULT 'saved',
  `lead_id` UUID NULL,
  `sale_id` UUID NULL,
  `is_shared` BOOLEAN NOT NULL DEFAULT FALSE,
  `share_price` BOOLEAN NOT NULL DEFAULT FALSE,
  `locale` MEDIUMTEXT NOT NULL DEFAULT 'tr',
  `ip_masked` MEDIUMTEXT NULL,
  `claimed_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY configurations_public_token_key (`public_token`),
  UNIQUE KEY configurations_ref_code_key (`ref_code`),
  CONSTRAINT configurations_check CHECK (((user_id IS NOT NULL) OR (owner_email IS NOT NULL))),
  CONSTRAINT configurations_currency_check CHECK ((currency IN ('TRY', 'USD', 'EUR'))),
  CONSTRAINT configurations_current_version_check CHECK ((current_version > 0)),
  CONSTRAINT configurations_estimated_price_check CHECK ((estimated_price >= (0))),
  CONSTRAINT configurations_locale_check CHECK ((locale IN ('tr', 'en'))),
  CONSTRAINT configurations_params_check CHECK ((JSON_TYPE(params) = 'OBJECT')),
  CONSTRAINT configurations_sizes CHECK (((LENGTH(params) <= 16384) AND (char_length(name) <= 120) AND ((owner_email IS NULL) OR (char_length(owner_email) <= 200)))),
  CONSTRAINT configurations_status_check CHECK ((status IN ('saved', 'converted_to_lead', 'converted_to_sale', 'archived'))),
  CONSTRAINT configurations_tonnage_kg_check CHECK ((tonnage_kg >= (0))),
  KEY configurations_owner_email_idx (`owner_email`),
  KEY configurations_user_idx (`user_id`, `updated_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE configurator_pages (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `configurator_key` VARCHAR(255) NOT NULL,
  `slug` JSON NOT NULL,
  `title` JSON NOT NULL,
  `hero_summary` JSON NOT NULL DEFAULT ('{}'),
  `body` JSON NOT NULL DEFAULT ('{}'),
  `benefits` JSON NOT NULL DEFAULT ('[]'),
  `steps` JSON NOT NULL DEFAULT ('[]'),
  `faqs` JSON NOT NULL DEFAULT ('[]'),
  `cta` JSON NOT NULL DEFAULT ('{}'),
  `cover_image_id` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
  `published_locales` JSON NOT NULL DEFAULT ('[]'),
  `published_at` DATETIME(6) NULL,
  `translation_meta` JSON NOT NULL DEFAULT ('{}'),
  `seo_title` JSON NOT NULL DEFAULT ('{}'),
  `seo_description` JSON NOT NULL DEFAULT ('{}'),
  `og_image_id` UUID NULL,
  `canonical_url` MEDIUMTEXT NULL,
  `noindex` BOOLEAN NOT NULL DEFAULT FALSE,
  `focus_keyword` JSON NOT NULL DEFAULT ('{}'),
  `sort_order` INT NULL,
  slug_en VARCHAR(255) AS (JSON_VALUE(slug, '$.en')) STORED,
  slug_tr VARCHAR(255) AS (JSON_VALUE(slug, '$.tr')) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY configurator_pages_configurator_key_key (`configurator_key`),
  UNIQUE KEY configurator_pages_sort_order_uq (`sort_order`),
  CONSTRAINT configurator_pages_benefits_check CHECK ((JSON_TYPE(benefits) = 'ARRAY')),
  CONSTRAINT configurator_pages_configurator_key_check CHECK ((configurator_key IN ('hall', 'multi_storey', 'cladding', 'mezzanine', 'fence', 'drywall'))),
  CONSTRAINT configurator_pages_faqs_check CHECK ((JSON_TYPE(faqs) = 'ARRAY')),
  CONSTRAINT configurator_pages_publishable CHECK (COALESCE((JSON_TYPE(published_locales) = 'ARRAY' AND JSON_LENGTH(published_locales) = JSON_CONTAINS(published_locales, '"tr"') + JSON_CONTAINS(published_locales, '"en"')) AND (NOT JSON_CONTAINS(published_locales, '"tr"') OR NULLIF(JSON_VALUE(title, '$.tr'), '') IS NOT NULL) AND (NOT JSON_CONTAINS(published_locales, '"en"') OR (NULLIF(JSON_VALUE(title, '$.en'), '') IS NOT NULL AND (slug IS NULL OR JSON_VALUE(slug, '$.en') IS NOT NULL) AND COALESCE(JSON_VALUE(translation_meta, '$.en.reviewed') IN ('1', 'true'), FALSE))), FALSE)),
  CONSTRAINT configurator_pages_sizes CHECK (((LENGTH(body) <= 65536) AND (LENGTH(faqs) <= 16384))),
  CONSTRAINT configurator_pages_slug_format CHECK (((slug IS NULL) OR COALESCE(JSON_TYPE(slug) = 'OBJECT' AND JSON_LENGTH(slug) = JSON_CONTAINS_PATH(slug, 'one', '$.tr') + JSON_CONTAINS_PATH(slug, 'one', '$.en') AND COALESCE(JSON_VALUE(slug, '$.tr') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.tr')) <= 80 AND JSON_VALUE(slug, '$.tr') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE) AND (JSON_VALUE(slug, '$.en') IS NULL OR COALESCE(JSON_VALUE(slug, '$.en') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.en')) <= 80 AND JSON_VALUE(slug, '$.en') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE)), FALSE))),
  CONSTRAINT configurator_pages_status_check CHECK ((status IN ('draft', 'published', 'archived'))),
  CONSTRAINT configurator_pages_steps_check CHECK ((JSON_TYPE(steps) = 'ARRAY')),
  UNIQUE KEY configurator_pages_slug_en_uq (`slug_en`),
  UNIQUE KEY configurator_pages_slug_tr_uq (`slug_tr`),
  KEY configurator_pages_status_idx (`status`, `published_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE configurator_rules (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `key` VARCHAR(255) NOT NULL,
  `value` JSON NOT NULL,
  `description` MEDIUMTEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY configurator_rules_key_key (`key`),
  CONSTRAINT configurator_rules_key_check CHECK ((`key` REGEXP '(?-i)^[a-z][a-z0-9_.]*$'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE content_links (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `from_type` VARCHAR(255) NOT NULL,
  `from_id` UUID NOT NULL,
  `to_type` VARCHAR(255) NOT NULL,
  `to_id` UUID NOT NULL,
  `relation` VARCHAR(255) NOT NULL DEFAULT 'related',
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY content_links_from_type_from_id_to_type_to_id_relation_key (`from_type`, `from_id`, `to_type`, `to_id`, `relation`),
  CONSTRAINT content_links_check CHECK (((NOT (from_type <=> to_type)) OR (NOT (from_id <=> to_id)))),
  CONSTRAINT content_links_from_type_check CHECK (from_type IN ('service','product','product_category','solution','price_guide','project','project_category','blog_post','static_page','job_posting','configurator_page')),
  CONSTRAINT content_links_to_type_check CHECK (to_type IN ('service','product','product_category','solution','price_guide','project','project_category','blog_post','static_page','job_posting','configurator_page')),
  KEY content_links_to_idx (`to_type`, `to_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE content_revisions (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `entity_type` VARCHAR(255) NOT NULL,
  `entity_id` UUID NOT NULL,
  `snapshot` JSON NOT NULL,
  `note` MEDIUMTEXT NULL,
  `created_by` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY content_revisions_entity_idx (`entity_type`, `entity_id`, `created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cron_heartbeats (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `job_key` VARCHAR(255) NOT NULL,
  `expected_interval_seconds` INT NOT NULL,
  `last_run_at` DATETIME(6) NULL,
  `last_status` MEDIUMTEXT NULL,
  `last_error` MEDIUMTEXT NULL,
  `last_duration_ms` INT NULL,
  `alerted_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY cron_heartbeats_job_key_key (`job_key`),
  CONSTRAINT cron_heartbeats_expected_interval_seconds_check CHECK ((expected_interval_seconds > 0)),
  CONSTRAINT cron_heartbeats_last_status_check CHECK ((last_status IN ('ok', 'error')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE customers (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `type` MEDIUMTEXT NOT NULL DEFAULT 'corporate',
  `full_name` MEDIUMTEXT NULL,
  `company_title` MEDIUMTEXT NULL,
  `tax_office` MEDIUMTEXT NULL,
  `tax_id` VARCHAR(255) NULL,
  `address` MEDIUMTEXT NULL,
  `city` MEDIUMTEXT NULL,
  `district` MEDIUMTEXT NULL,
  `email` MEDIUMTEXT NULL,
  `phone` MEDIUMTEXT NULL,
  `contact_person` MEDIUMTEXT NULL,
  `contact_phone` MEDIUMTEXT NULL,
  `notes` MEDIUMTEXT NULL,
  `source` MEDIUMTEXT NOT NULL DEFAULT 'manual',
  `profile_id` UUID NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `anonymized_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `marketing_consent` BOOLEAN NOT NULL DEFAULT FALSE,
  `marketing_consent_at` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT customers_check CHECK (((anonymized_at IS NOT NULL) OR (COALESCE(NULLIF(full_name, ''), NULLIF(company_title, '')) IS NOT NULL))),
  CONSTRAINT customers_source_check CHECK ((source IN ('lead', 'configurator', 'manual'))),
  CONSTRAINT customers_tax_id_check CHECK (((tax_id IS NULL) OR (tax_id REGEXP '(?-i)^\\d{10,11}$'))),
  CONSTRAINT customers_type_check CHECK ((type IN ('individual', 'corporate'))),
  KEY customers_tax_id_idx (`tax_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE document_counters (
  `prefix` VARCHAR(255) NOT NULL,
  `year` INT NOT NULL,
  `last_no` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`prefix`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE email_logs (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `queue_id` UUID NULL,
  `template_key` MEDIUMTEXT NULL,
  `to_email` MEDIUMTEXT NOT NULL,
  `subject` MEDIUMTEXT NOT NULL,
  `provider` MEDIUMTEXT NOT NULL,
  `status` MEDIUMTEXT NOT NULL,
  `provider_message_id` MEDIUMTEXT NULL,
  `error` MEDIUMTEXT NULL,
  `related_type` VARCHAR(255) NULL,
  `related_id` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT email_logs_provider_check CHECK ((provider IN ('resend', 'smtp'))),
  CONSTRAINT email_logs_status_check CHECK ((status IN ('sent', 'failed'))),
  KEY email_logs_created_idx (`created_at` DESC),
  KEY email_logs_related_idx (`related_type`, `related_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE email_queue (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `template_key` MEDIUMTEXT NOT NULL,
  `to_email` MEDIUMTEXT NOT NULL,
  `to_name` MEDIUMTEXT NULL,
  `locale` MEDIUMTEXT NOT NULL DEFAULT 'tr',
  `payload` JSON NOT NULL DEFAULT ('{}'),
  `status` MEDIUMTEXT NOT NULL DEFAULT 'pending',
  `priority` SMALLINT NOT NULL DEFAULT 5,
  `attempts` INT NOT NULL DEFAULT 0,
  `max_attempts` INT NOT NULL DEFAULT 5,
  `next_attempt_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `locked_at` DATETIME(6) NULL,
  `last_error` MEDIUMTEXT NULL,
  `related_type` MEDIUMTEXT NULL,
  `related_id` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT email_queue_locale_check CHECK ((locale IN ('tr', 'en'))),
  CONSTRAINT email_queue_max_attempts_check CHECK ((max_attempts > 0)),
  CONSTRAINT email_queue_priority_check CHECK (((priority >= 1) AND (priority <= 9))),
  CONSTRAINT email_queue_status_check CHECK ((status IN ('pending', 'processing', 'sent', 'failed', 'cancelled'))),
  KEY email_queue_due_idx (`priority`, `next_attempt_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE email_templates (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `key` VARCHAR(255) NOT NULL,
  `name` MEDIUMTEXT NOT NULL,
  `subject` JSON NOT NULL,
  `body` JSON NOT NULL,
  `variables` JSON NOT NULL DEFAULT ('[]'),
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY email_templates_key_key (`key`),
  CONSTRAINT email_templates_key_check CHECK ((`key` REGEXP '(?-i)^[a-z][a-z0-9_.]*$')),
  CONSTRAINT email_templates_subject_check CHECK ((NULLIF(JSON_VALUE(subject, '$.tr'), '') IS NOT NULL)),
  CONSTRAINT email_templates_variables_check CHECK ((JSON_TYPE(variables) = 'ARRAY'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE error_logs (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `fingerprint` VARCHAR(255) NOT NULL,
  `module` VARCHAR(255) NOT NULL DEFAULT 'unknown',
  `source` MEDIUMTEXT NOT NULL DEFAULT 'server',
  `level` MEDIUMTEXT NOT NULL DEFAULT 'error',
  `code` MEDIUMTEXT NULL,
  `message` MEDIUMTEXT NOT NULL,
  `stack` MEDIUMTEXT NULL,
  `path` MEDIUMTEXT NULL,
  `status_code` INT NULL,
  `user_id` UUID NULL,
  `ip_masked` MEDIUMTEXT NULL,
  `user_agent` MEDIUMTEXT NULL,
  `context` JSON NOT NULL DEFAULT ('{}'),
  `occurrences` INT NOT NULL DEFAULT 1,
  `affected_users` INT NOT NULL DEFAULT 0,
  `first_seen_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `last_seen_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `resolved_at` DATETIME(6) NULL,
  `resolved_by` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY error_logs_fingerprint_key (`fingerprint`),
  CONSTRAINT error_logs_level_check CHECK ((level IN ('warn', 'error', 'fatal'))),
  CONSTRAINT error_logs_source_check CHECK ((source IN ('server', 'client', 'edge', 'cron'))),
  KEY error_logs_module_idx (`module`, `last_seen_at` DESC),
  KEY error_logs_open_idx (`last_seen_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE exchange_rates (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `currency` VARCHAR(255) NOT NULL,
  `rate_date` DATE NOT NULL,
  `rate` DECIMAL(14,6) NOT NULL,
  `source` MEDIUMTEXT NOT NULL DEFAULT 'tcmb',
  `fetched_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY exchange_rates_currency_rate_date_key (`currency`, `rate_date`),
  CONSTRAINT exchange_rates_currency_check CHECK ((currency IN ('USD', 'EUR'))),
  CONSTRAINT exchange_rates_rate_check CHECK ((rate > (0))),
  CONSTRAINT exchange_rates_source_check CHECK ((source IN ('tcmb', 'manual'))),
  KEY exchange_rates_latest_idx (`currency`, `rate_date` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE faqs (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `entity_type` VARCHAR(255) NULL,
  `entity_id` UUID NULL,
  `question` JSON NOT NULL,
  `answer` JSON NOT NULL DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
  `published_locales` JSON NOT NULL DEFAULT ('[]'),
  `published_at` DATETIME(6) NULL,
  `translation_meta` JSON NOT NULL DEFAULT ('{}'),
  `sort_order` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  CONSTRAINT faqs_check CHECK (((entity_type IS NULL) = (entity_id IS NULL))),
  CONSTRAINT faqs_entity_type_check CHECK (((entity_type IS NULL) OR entity_type IN ('service','product','product_category','solution','price_guide','project','project_category','blog_post','static_page','job_posting','configurator_page'))),
  CONSTRAINT faqs_publishable CHECK (COALESCE((JSON_TYPE(published_locales) = 'ARRAY' AND JSON_LENGTH(published_locales) = JSON_CONTAINS(published_locales, '"tr"') + JSON_CONTAINS(published_locales, '"en"')) AND (NOT JSON_CONTAINS(published_locales, '"tr"') OR NULLIF(JSON_VALUE(question, '$.tr'), '') IS NOT NULL) AND (NOT JSON_CONTAINS(published_locales, '"en"') OR (NULLIF(JSON_VALUE(question, '$.en'), '') IS NOT NULL AND COALESCE(JSON_VALUE(translation_meta, '$.en.reviewed') IN ('1', 'true'), FALSE))), FALSE)),
  CONSTRAINT faqs_status_check CHECK ((status IN ('draft', 'published', 'archived'))),
  KEY faqs_entity_idx (`entity_type`, `entity_id`),
  KEY faqs_status_idx (`status`, `published_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE field_videos (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `title` JSON NOT NULL,
  `caption` JSON NOT NULL DEFAULT ('{}'),
  `source` MEDIUMTEXT NOT NULL,
  `youtube_id` MEDIUMTEXT NULL,
  `video_id` UUID NULL,
  `poster_id` UUID NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `sort_order` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY field_videos_sort_order_uq (`sort_order`),
  CONSTRAINT field_videos_check CHECK ((((source = 'youtube') AND (youtube_id IS NOT NULL) AND (video_id IS NULL)) OR ((source = 'upload') AND (video_id IS NOT NULL) AND (youtube_id IS NULL)))),
  CONSTRAINT field_videos_source_check CHECK ((source IN ('youtube', 'upload'))),
  CONSTRAINT field_videos_title_check CHECK ((NULLIF(JSON_VALUE(title, '$.tr'), '') IS NOT NULL)),
  CONSTRAINT field_videos_youtube_id_check CHECK (((youtube_id IS NULL) OR (youtube_id REGEXP '(?-i)^[A-Za-z0-9_-]{11}$')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE form_analytics (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `form_key` VARCHAR(255) NOT NULL,
  `field_name` VARCHAR(255) NOT NULL,
  `device` VARCHAR(255) NOT NULL,
  `day` DATE NOT NULL,
  `focus_count` INT NOT NULL DEFAULT 0,
  `abandon_count` INT NOT NULL DEFAULT 0,
  `error_count` INT NOT NULL DEFAULT 0,
  `total_time_ms` BIGINT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY form_analytics_form_key_field_name_device_day_key (`form_key`, `field_name`, `device`, `day`),
  CONSTRAINT form_analytics_device_check CHECK ((device IN ('mobile', 'tablet', 'desktop')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE funnel_steps (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `funnel_id` UUID NOT NULL,
  `seq` INT NOT NULL,
  `name` MEDIUMTEXT NOT NULL,
  `match_type` MEDIUMTEXT NOT NULL,
  `match_value` MEDIUMTEXT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY funnel_steps_funnel_id_seq_key (`funnel_id`, `seq`),
  CONSTRAINT funnel_steps_match_type_check CHECK ((match_type IN ('path', 'path_prefix', 'event'))),
  CONSTRAINT funnel_steps_seq_check CHECK ((seq > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE funnels (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `name` MEDIUMTEXT NOT NULL,
  `description` MEDIUMTEXT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE heatmap_aggregates (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `path` VARCHAR(255) NOT NULL,
  `device` VARCHAR(255) NOT NULL,
  `day` DATE NOT NULL,
  `kind` VARCHAR(255) NOT NULL,
  `bucket_x` SMALLINT NOT NULL,
  `bucket_y` INT NOT NULL,
  `hits` INT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY heatmap_aggregates_path_device_day_kind_bucket_x_bucket_y_key (`path`, `device`, `day`, `kind`, `bucket_x`, `bucket_y`),
  CONSTRAINT heatmap_aggregates_bucket_x_check CHECK (((bucket_x >= 0) AND (bucket_x <= 99))),
  CONSTRAINT heatmap_aggregates_bucket_y_check CHECK ((bucket_y >= 0)),
  CONSTRAINT heatmap_aggregates_device_check CHECK ((device IN ('mobile', 'tablet', 'desktop'))),
  CONSTRAINT heatmap_aggregates_hits_check CHECK ((hits > 0)),
  CONSTRAINT heatmap_aggregates_kind_check CHECK ((kind IN ('click', 'rage_click', 'dead_click', 'attention')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE hero_media (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `label` MEDIUMTEXT NOT NULL,
  `desktop_video_id` UUID NULL,
  `mobile_video_id` UUID NULL,
  `desktop_poster_id` UUID NULL,
  `mobile_poster_id` UUID NULL,
  `duration_seconds` DECIMAL(5,2) NULL,
  `headline` JSON NOT NULL DEFAULT ('{}'),
  `subheadline` JSON NOT NULL DEFAULT ('{}'),
  `cta_label` JSON NOT NULL DEFAULT ('{}'),
  `cta_path` MEDIUMTEXT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  is_active_uq_flag TINYINT AS (IF(`is_active`, 1, NULL)) STORED,
  PRIMARY KEY (`id`),
  CONSTRAINT hero_media_duration_seconds_check CHECK ((duration_seconds > (0))),
  UNIQUE KEY hero_media_single_active_uq (is_active_uq_flag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE invoices (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `invoice_no` VARCHAR(255) NULL,
  `sale_id` UUID NOT NULL,
  `customer_id` UUID NOT NULL,
  `type` MEDIUMTEXT NOT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT 'not_issued',
  `issue_date` DATE NULL,
  `due_date` DATE NULL,
  `currency` MEDIUMTEXT NOT NULL DEFAULT 'TRY',
  `exchange_rate` DECIMAL(14,6) NOT NULL DEFAULT 1,
  `base_amount` DECIMAL(14,2) NOT NULL,
  `vat_rate` DECIMAL(5,4) NOT NULL DEFAULT 0.20,
  `vat_amount` DECIMAL(14,2) NOT NULL,
  `total_amount` DECIMAL(14,2) NOT NULL,
  `withholding_ratio` DECIMAL(3,2) NULL,
  `withholding_amount` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `collectable_amount` DECIMAL(14,2) NOT NULL,
  `notes` MEDIUMTEXT NULL,
  `created_by` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY invoices_invoice_no_key (`invoice_no`),
  CONSTRAINT invoices_base_amount_check CHECK ((base_amount >= (0))),
  CONSTRAINT invoices_check CHECK ((vat_amount = round((base_amount * vat_rate), 2))),
  CONSTRAINT invoices_check1 CHECK ((total_amount = (base_amount + vat_amount))),
  CONSTRAINT invoices_check2 CHECK ((withholding_amount = round((vat_amount * COALESCE(withholding_ratio, (0))), 2))),
  CONSTRAINT invoices_check3 CHECK ((collectable_amount = (total_amount - withholding_amount))),
  CONSTRAINT invoices_check4 CHECK (((status = 'not_issued') OR ((invoice_no IS NOT NULL) AND (issue_date IS NOT NULL)) OR (type = 'proforma'))),
  CONSTRAINT invoices_currency_check CHECK ((currency IN ('TRY', 'USD', 'EUR'))),
  CONSTRAINT invoices_exchange_rate_check CHECK ((exchange_rate > (0))),
  CONSTRAINT invoices_status_check CHECK ((status IN ('not_issued', 'issued', 'sent', 'paid', 'partially_paid', 'cancelled'))),
  CONSTRAINT invoices_type_check CHECK ((type IN ('e_invoice', 'e_archive', 'proforma'))),
  CONSTRAINT invoices_vat_rate_check CHECK (((vat_rate >= (0)) AND (vat_rate <= (1)))),
  CONSTRAINT invoices_withholding_ratio_check CHECK ((withholding_ratio IN (0.2, 0.3, 0.4, 0.5, 0.7, 0.9, 1.0))),
  KEY invoices_sale_idx (`sale_id`),
  KEY invoices_status_idx (`status`, `due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE job_applications (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `job_posting_id` UUID NULL,
  `full_name` MEDIUMTEXT NOT NULL,
  `email` MEDIUMTEXT NOT NULL,
  `phone` MEDIUMTEXT NULL,
  `cover_letter` MEDIUMTEXT NULL,
  `cv_bucket` MEDIUMTEXT NOT NULL DEFAULT 'private-documents',
  `cv_path` MEDIUMTEXT NULL,
  `status` MEDIUMTEXT NOT NULL DEFAULT 'new',
  `internal_notes` MEDIUMTEXT NULL,
  `locale` MEDIUMTEXT NOT NULL DEFAULT 'tr',
  `consent_kvkk_at` DATETIME(6) NOT NULL,
  `retention_until` DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL 365 DAY),
  `reviewed_by` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT job_applications_locale_check CHECK ((locale IN ('tr', 'en'))),
  CONSTRAINT job_applications_status_check CHECK ((status IN ('new', 'reviewing', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'))),
  KEY job_applications_posting_idx (`job_posting_id`, `created_at` DESC),
  KEY job_applications_retention_idx (`retention_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE job_postings (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `slug` JSON NOT NULL,
  `title` JSON NOT NULL,
  `department` JSON NOT NULL DEFAULT ('{}'),
  `location` JSON NOT NULL DEFAULT ('{}'),
  `employment_type` MEDIUMTEXT NOT NULL DEFAULT 'full_time',
  `description` JSON NOT NULL DEFAULT ('{}'),
  `requirements` JSON NOT NULL DEFAULT ('{}'),
  `application_deadline` DATE NULL,
  `is_open` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
  `published_locales` JSON NOT NULL DEFAULT ('[]'),
  `published_at` DATETIME(6) NULL,
  `translation_meta` JSON NOT NULL DEFAULT ('{}'),
  `seo_title` JSON NOT NULL DEFAULT ('{}'),
  `seo_description` JSON NOT NULL DEFAULT ('{}'),
  `og_image_id` UUID NULL,
  `canonical_url` MEDIUMTEXT NULL,
  `noindex` BOOLEAN NOT NULL DEFAULT FALSE,
  `focus_keyword` JSON NOT NULL DEFAULT ('{}'),
  slug_en VARCHAR(255) AS (JSON_VALUE(slug, '$.en')) STORED,
  slug_tr VARCHAR(255) AS (JSON_VALUE(slug, '$.tr')) STORED,
  PRIMARY KEY (`id`),
  CONSTRAINT job_postings_employment_type_check CHECK ((employment_type IN ('full_time', 'part_time', 'contract', 'internship'))),
  CONSTRAINT job_postings_publishable CHECK (COALESCE((JSON_TYPE(published_locales) = 'ARRAY' AND JSON_LENGTH(published_locales) = JSON_CONTAINS(published_locales, '"tr"') + JSON_CONTAINS(published_locales, '"en"')) AND (NOT JSON_CONTAINS(published_locales, '"tr"') OR NULLIF(JSON_VALUE(title, '$.tr'), '') IS NOT NULL) AND (NOT JSON_CONTAINS(published_locales, '"en"') OR (NULLIF(JSON_VALUE(title, '$.en'), '') IS NOT NULL AND (slug IS NULL OR JSON_VALUE(slug, '$.en') IS NOT NULL) AND COALESCE(JSON_VALUE(translation_meta, '$.en.reviewed') IN ('1', 'true'), FALSE))), FALSE)),
  CONSTRAINT job_postings_slug_format CHECK (((slug IS NULL) OR COALESCE(JSON_TYPE(slug) = 'OBJECT' AND JSON_LENGTH(slug) = JSON_CONTAINS_PATH(slug, 'one', '$.tr') + JSON_CONTAINS_PATH(slug, 'one', '$.en') AND COALESCE(JSON_VALUE(slug, '$.tr') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.tr')) <= 80 AND JSON_VALUE(slug, '$.tr') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE) AND (JSON_VALUE(slug, '$.en') IS NULL OR COALESCE(JSON_VALUE(slug, '$.en') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.en')) <= 80 AND JSON_VALUE(slug, '$.en') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE)), FALSE))),
  CONSTRAINT job_postings_status_check CHECK ((status IN ('draft', 'published', 'archived'))),
  UNIQUE KEY job_postings_slug_en_uq (`slug_en`),
  UNIQUE KEY job_postings_slug_tr_uq (`slug_tr`),
  KEY job_postings_status_idx (`status`, `published_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE lead_attachments (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `lead_id` UUID NOT NULL,
  `storage_bucket` VARCHAR(255) NOT NULL DEFAULT 'private-documents',
  `storage_path` VARCHAR(255) NOT NULL,
  `file_name` MEDIUMTEXT NOT NULL,
  `mime_type` MEDIUMTEXT NOT NULL,
  `size_bytes` BIGINT NOT NULL,
  `uploaded_by_visitor` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY lead_attachments_storage_bucket_storage_path_key (`storage_bucket`, `storage_path`),
  CONSTRAINT lead_attachments_size_bytes_check CHECK ((size_bytes >= 0)),
  KEY lead_attachments_lead_idx (`lead_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE lead_items (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `lead_id` UUID NOT NULL,
  `product_id` UUID NULL,
  `variant_id` UUID NULL,
  `product_name_snapshot` MEDIUMTEXT NOT NULL,
  `variant_label_snapshot` MEDIUMTEXT NULL,
  `stock_code_snapshot` MEDIUMTEXT NULL,
  `quantity` DECIMAL(14,3) NOT NULL,
  `unit` MEDIUMTEXT NULL,
  `note` MEDIUMTEXT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `attributes` JSON NOT NULL DEFAULT ('{}'),
  PRIMARY KEY (`id`),
  CONSTRAINT lead_items_quantity_check CHECK ((quantity > (0))),
  KEY lead_items_lead_idx (`lead_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE lead_notes (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `lead_id` UUID NOT NULL,
  `author_id` UUID NULL,
  `body` MEDIUMTEXT NOT NULL,
  `is_pinned` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY lead_notes_lead_idx (`lead_id`, `created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE lead_replies (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `lead_id` UUID NOT NULL,
  `author_id` UUID NULL,
  `subject` MEDIUMTEXT NOT NULL,
  `body` MEDIUMTEXT NOT NULL,
  `email_log_id` UUID NULL,
  `sent_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `direction` MEDIUMTEXT NOT NULL DEFAULT 'outbound',
  `kind` MEDIUMTEXT NOT NULL DEFAULT 'reply',
  PRIMARY KEY (`id`),
  CONSTRAINT lead_replies_direction_check CHECK ((direction IN ('outbound', 'inbound'))),
  CONSTRAINT lead_replies_kind_check CHECK ((kind IN ('reply', 'revision_request', 'cancel_request'))),
  KEY lead_replies_lead_idx (`lead_id`, `created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE leads (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `ref_no` VARCHAR(255) NOT NULL,
  `source` MEDIUMTEXT NOT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT 'new',
  `full_name` MEDIUMTEXT NOT NULL,
  `company` MEDIUMTEXT NULL,
  `email` MEDIUMTEXT NULL,
  `phone` MEDIUMTEXT NULL,
  `city` MEDIUMTEXT NULL,
  `subject` MEDIUMTEXT NULL,
  `message` MEDIUMTEXT NULL,
  `form_data` JSON NOT NULL DEFAULT ('{}'),
  `service_id` UUID NULL,
  `locale` MEDIUMTEXT NOT NULL DEFAULT 'tr',
  `user_id` UUID NULL,
  `customer_id` UUID NULL,
  `configuration_id` UUID NULL,
  `assigned_to` UUID NULL,
  `quoted_amount` DECIMAL(14,2) NULL,
  `quoted_currency` MEDIUMTEXT NULL,
  `lost_reason` MEDIUMTEXT NULL,
  `consent_kvkk_at` DATETIME(6) NOT NULL,
  `consent_marketing` BOOLEAN NOT NULL DEFAULT FALSE,
  `utm` JSON NOT NULL DEFAULT ('{}'),
  `page_url` MEDIUMTEXT NULL,
  `ip_masked` MEDIUMTEXT NULL,
  `anonymized_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  email_lower VARCHAR(255) AS (LOWER(email)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY leads_ref_no_key (`ref_no`),
  CONSTRAINT leads_check CHECK (((email IS NOT NULL) OR (phone IS NOT NULL) OR (anonymized_at IS NOT NULL))),
  CONSTRAINT leads_locale_check CHECK ((locale IN ('tr', 'en'))),
  CONSTRAINT leads_quoted_amount_check CHECK ((quoted_amount >= (0))),
  CONSTRAINT leads_quoted_currency_check CHECK ((quoted_currency IN ('TRY', 'USD', 'EUR'))),
  CONSTRAINT leads_source_check CHECK ((source IN ('contact_form', 'quote_form', 'quote_basket', 'configurator', 'whatsapp', 'phone', 'manual'))),
  CONSTRAINT leads_status_check CHECK ((status IN ('new', 'in_review', 'quoted', 'won', 'lost'))),
  KEY leads_assigned_idx (`assigned_to`, `status`),
  KEY leads_email_lower_unclaimed_idx (`email_lower`),
  KEY leads_status_idx (`status`, `created_at` DESC),
  KEY leads_user_idx (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE mail_campaign_recipients (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `campaign_id` UUID NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `full_name` MEDIUMTEXT NULL,
  `company` MEDIUMTEXT NULL,
  `source` MEDIUMTEXT NOT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT 'pending',
  `error` MEDIUMTEXT NULL,
  `token` UUID NOT NULL DEFAULT UUID_v4(),
  `locked_at` DATETIME(6) NULL,
  `sent_at` DATETIME(6) NULL,
  `unsubscribed_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY mail_campaign_recipients_campaign_id_email_key (`campaign_id`, `email`),
  UNIQUE KEY mail_campaign_recipients_token_key (`token`),
  CONSTRAINT mail_campaign_recipients_company_check CHECK (((company IS NULL) OR (char_length(company) <= 200))),
  CONSTRAINT mail_campaign_recipients_email_check CHECK (((email = lower(email)) AND (char_length(email) <= 254))),
  CONSTRAINT mail_campaign_recipients_error_check CHECK (((error IS NULL) OR (char_length(error) <= 500))),
  CONSTRAINT mail_campaign_recipients_full_name_check CHECK (((full_name IS NULL) OR (char_length(full_name) <= 160))),
  CONSTRAINT mail_campaign_recipients_source_check CHECK ((source IN ('customer', 'lead', 'manual'))),
  CONSTRAINT mail_campaign_recipients_status_check CHECK ((status IN ('pending', 'sending', 'sent', 'failed', 'skipped'))),
  KEY mail_campaign_recipients_status_idx (`campaign_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE mail_campaign_templates (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `name` MEDIUMTEXT NOT NULL,
  `category` VARCHAR(255) NOT NULL,
  `description` MEDIUMTEXT NOT NULL DEFAULT '',
  `subject` JSON NOT NULL DEFAULT ('{}'),
  `preheader` JSON NOT NULL DEFAULT ('{}'),
  `body` JSON NOT NULL DEFAULT ('{}'),
  `cta_label` JSON NOT NULL DEFAULT ('{}'),
  `cta_url` JSON NOT NULL DEFAULT ('{}'),
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT mail_campaign_templates_body_check CHECK ((JSON_TYPE(body) = 'OBJECT')),
  CONSTRAINT mail_campaign_templates_category_check CHECK ((category IN ('announcement', 'product', 'pricing', 'followup', 'event', 'greeting', 'relationship', 'operations'))),
  CONSTRAINT mail_campaign_templates_cta_https CHECK (((COALESCE(JSON_VALUE(cta_url, '$.tr'), '') REGEXP '(?-i)^(https://[^\\s]+)?$') AND (COALESCE(JSON_VALUE(cta_url, '$.en'), '') REGEXP '(?-i)^(https://[^\\s]+)?$'))),
  CONSTRAINT mail_campaign_templates_cta_label_check CHECK ((JSON_TYPE(cta_label) = 'OBJECT')),
  CONSTRAINT mail_campaign_templates_cta_url_check CHECK ((JSON_TYPE(cta_url) = 'OBJECT')),
  CONSTRAINT mail_campaign_templates_description_check CHECK ((char_length(description) <= 300)),
  CONSTRAINT mail_campaign_templates_name_check CHECK (((char_length(TRIM(name)) >= 2) AND (char_length(TRIM(name)) <= 120))),
  CONSTRAINT mail_campaign_templates_preheader_check CHECK ((JSON_TYPE(preheader) = 'OBJECT')),
  CONSTRAINT mail_campaign_templates_sizes CHECK (((LENGTH(body) <= 65536) AND (LENGTH(subject) <= 2048) AND (LENGTH(preheader) <= 2048) AND (LENGTH(cta_label) <= 1024) AND (LENGTH(cta_url) <= 2048))),
  CONSTRAINT mail_campaign_templates_subject_check CHECK ((JSON_TYPE(subject) = 'OBJECT')),
  CONSTRAINT mail_campaign_templates_subject_tr CHECK ((NULLIF(TRIM(JSON_VALUE(subject, '$.tr')), '') IS NOT NULL)),
  KEY mail_campaign_templates_order_idx (`category`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE mail_campaigns (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `name` MEDIUMTEXT NOT NULL,
  `locale` MEDIUMTEXT NOT NULL DEFAULT 'tr',
  `subject` MEDIUMTEXT NOT NULL DEFAULT '',
  `preheader` MEDIUMTEXT NOT NULL DEFAULT '',
  `body` MEDIUMTEXT NOT NULL DEFAULT '',
  `cta_label` MEDIUMTEXT NOT NULL DEFAULT '',
  `cta_url` MEDIUMTEXT NOT NULL DEFAULT '',
  `audience` JSON NOT NULL DEFAULT ('{}'),
  `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
  `scheduled_at` DATETIME(6) NULL,
  `started_at` DATETIME(6) NULL,
  `finished_at` DATETIME(6) NULL,
  `created_by` UUID NULL,
  `started_by` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT mail_campaigns_audience_check CHECK (((JSON_TYPE(audience) = 'OBJECT') AND (LENGTH(audience) <= 262144))),
  CONSTRAINT mail_campaigns_body_check CHECK ((char_length(body) <= 20000)),
  CONSTRAINT mail_campaigns_cta_label_check CHECK ((char_length(cta_label) <= 80)),
  CONSTRAINT mail_campaigns_cta_url_check CHECK (((cta_url = '') OR ((cta_url REGEXP '(?-i)^https://[^\\s]+$') AND (char_length(cta_url) <= 500)))),
  CONSTRAINT mail_campaigns_locale_check CHECK ((locale IN ('tr', 'en'))),
  CONSTRAINT mail_campaigns_name_check CHECK (((char_length(TRIM(name)) >= 2) AND (char_length(TRIM(name)) <= 120))),
  CONSTRAINT mail_campaigns_preheader_check CHECK ((char_length(preheader) <= 200)),
  CONSTRAINT mail_campaigns_status_check CHECK ((status IN ('draft', 'scheduled', 'sending', 'paused', 'sent', 'cancelled'))),
  CONSTRAINT mail_campaigns_subject_check CHECK ((char_length(subject) <= 200)),
  KEY mail_campaigns_status_idx (`status`, `scheduled_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE mail_suppressions (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `email` VARCHAR(255) NOT NULL,
  `reason` MEDIUMTEXT NOT NULL,
  `campaign_id` UUID NULL,
  `note` MEDIUMTEXT NULL,
  `created_by` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY mail_suppressions_email_key (`email`),
  CONSTRAINT mail_suppressions_email_check CHECK (((email = lower(email)) AND (char_length(email) <= 254))),
  CONSTRAINT mail_suppressions_note_check CHECK (((note IS NULL) OR (char_length(note) <= 300))),
  CONSTRAINT mail_suppressions_reason_check CHECK ((reason IN ('unsubscribed', 'bounced', 'complaint', 'manual')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE material_price_history (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `material_price_id` UUID NOT NULL,
  `unit_price` DECIMAL(14,4) NOT NULL,
  `currency` MEDIUMTEXT NOT NULL,
  `valid_from` DATE NOT NULL,
  `valid_until` DATE NOT NULL,
  `changed_by` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY material_price_history_idx (`material_price_id`, `valid_until` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE material_prices (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `code` VARCHAR(255) NOT NULL,
  `name` JSON NOT NULL,
  `category` MEDIUMTEXT NOT NULL,
  `unit` MEDIUMTEXT NOT NULL,
  `unit_price` DECIMAL(14,4) NOT NULL,
  `currency` MEDIUMTEXT NOT NULL DEFAULT 'TRY',
  `valid_from` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `note` MEDIUMTEXT NULL,
  `updated_by` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY material_prices_code_key (`code`),
  CONSTRAINT material_prices_category_check CHECK ((category IN ('steel', 'panel', 'labor', 'fastener', 'coating', 'other'))),
  CONSTRAINT material_prices_currency_check CHECK ((currency IN ('TRY', 'USD', 'EUR'))),
  CONSTRAINT material_prices_name_check CHECK ((NULLIF(JSON_VALUE(name, '$.tr'), '') IS NOT NULL)),
  CONSTRAINT material_prices_unit_check CHECK ((unit IN ('kg', 'ton', 'm2', 'm', 'piece', 'hour'))),
  CONSTRAINT material_prices_unit_price_check CHECK ((unit_price >= (0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE media_library (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `storage_bucket` VARCHAR(255) NOT NULL DEFAULT 'media',
  `storage_path` VARCHAR(255) NOT NULL,
  `file_name` MEDIUMTEXT NOT NULL,
  `mime_type` MEDIUMTEXT NOT NULL,
  `size_bytes` BIGINT NOT NULL,
  `width` INT NULL,
  `height` INT NULL,
  `duration_ms` INT NULL,
  `blur_data_url` MEDIUMTEXT NULL,
  `alt` JSON NOT NULL DEFAULT ('{}'),
  `caption` JSON NOT NULL DEFAULT ('{}'),
  `folder` VARCHAR(255) NULL,
  `variants` JSON NOT NULL DEFAULT ('{}'),
  `uploaded_by` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY media_library_storage_bucket_storage_path_key (`storage_bucket`, `storage_path`),
  CONSTRAINT media_library_size_bytes_check CHECK ((size_bytes >= 0)),
  KEY media_library_folder_idx (`folder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE menu_items (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `menu_id` UUID NOT NULL,
  `parent_id` UUID NULL,
  `label` JSON NOT NULL,
  `link_type` MEDIUMTEXT NOT NULL DEFAULT 'internal',
  `internal_path` MEDIUMTEXT NULL,
  `entity_type` MEDIUMTEXT NULL,
  `entity_id` UUID NULL,
  `external_url` MEDIUMTEXT NULL,
  `anchor` MEDIUMTEXT NULL,
  `header_slot` MEDIUMTEXT NULL,
  `locales` JSON NOT NULL DEFAULT ('["tr","en"]'),
  `visibility` MEDIUMTEXT NOT NULL DEFAULT 'all',
  `is_cta` BOOLEAN NOT NULL DEFAULT FALSE,
  `open_in_new_tab` BOOLEAN NOT NULL DEFAULT FALSE,
  `icon` MEDIUMTEXT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `sort_order` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY menu_items_sort_order_uq (`menu_id`, `parent_id`, `sort_order`),
  CONSTRAINT menu_items_check CHECK (
CASE link_type
    WHEN 'internal' THEN (internal_path IS NOT NULL)
    WHEN 'entity' THEN ((entity_type IS NOT NULL) AND (entity_id IS NOT NULL))
    WHEN 'external' THEN (external_url REGEXP '(?-i)^https?://')
    WHEN 'anchor' THEN (anchor IS NOT NULL)
    ELSE true
END),
  CONSTRAINT menu_items_header_slot_check CHECK ((header_slot IN ('left', 'right'))),
  CONSTRAINT menu_items_label_check CHECK ((NULLIF(JSON_VALUE(label, '$.tr'), '') IS NOT NULL)),
  CONSTRAINT menu_items_link_type_check CHECK ((link_type IN ('internal', 'entity', 'external', 'anchor', 'none'))),
  CONSTRAINT menu_items_locales_check CHECK ((JSON_TYPE(locales) = 'ARRAY' AND JSON_LENGTH(locales) = JSON_CONTAINS(locales, '"tr"') + JSON_CONTAINS(locales, '"en"'))),
  CONSTRAINT menu_items_visibility_check CHECK ((visibility IN ('all', 'guest', 'member', 'staff'))),
  KEY menu_items_menu_idx (`menu_id`, `parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE menus (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `key` VARCHAR(255) NOT NULL,
  `title` JSON NOT NULL DEFAULT ('{}'),
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY menus_key_key (`key`),
  CONSTRAINT menus_key_check CHECK ((`key` IN ('header', 'footer_primary', 'footer_legal', 'mobile_extra', 'account')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE newsletter_subscribers (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `email` VARCHAR(255) NOT NULL,
  `locale` MEDIUMTEXT NOT NULL DEFAULT 'tr',
  `status` MEDIUMTEXT NOT NULL DEFAULT 'pending',
  `confirm_token` UUID NOT NULL DEFAULT UUID_v4(),
  `source` MEDIUMTEXT NULL,
  `consent_at` DATETIME(6) NOT NULL,
  `confirmed_at` DATETIME(6) NULL,
  `unsubscribed_at` DATETIME(6) NULL,
  `ip_masked` MEDIUMTEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY newsletter_subscribers_email_key (`email`),
  CONSTRAINT newsletter_subscribers_email_check CHECK (((email = lower(email)) AND (email REGEXP '(?-i)^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'))),
  CONSTRAINT newsletter_subscribers_locale_check CHECK ((locale IN ('tr', 'en'))),
  CONSTRAINT newsletter_subscribers_status_check CHECK ((status IN ('pending', 'subscribed', 'unsubscribed', 'bounced')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE notifications (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `user_id` UUID NULL,
  `target_role` VARCHAR(255) NULL,
  `type` MEDIUMTEXT NOT NULL,
  `payload` JSON NOT NULL DEFAULT ('{}'),
  `link_path` MEDIUMTEXT NULL,
  `read_by` JSON NOT NULL DEFAULT ('[]'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT notifications_check CHECK (((user_id IS NOT NULL) OR (target_role IS NOT NULL))),
  CONSTRAINT notifications_target_role_check CHECK ((target_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))),
  KEY notifications_role_idx (`target_role`, `created_at` DESC),
  KEY notifications_user_idx (`user_id`, `created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE panel_types (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `code` VARCHAR(255) NOT NULL,
  `name` JSON NOT NULL,
  `usage` MEDIUMTEXT NOT NULL,
  `thickness_mm` DECIMAL(6,2) NULL,
  `kg_per_m2` DECIMAL(8,3) NULL,
  `material_price_id` UUID NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `sort_order` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY panel_types_code_key (`code`),
  UNIQUE KEY panel_types_sort_order_uq (`sort_order`),
  CONSTRAINT panel_types_kg_per_m2_check CHECK ((kg_per_m2 > (0))),
  CONSTRAINT panel_types_name_check CHECK ((NULLIF(JSON_VALUE(name, '$.tr'), '') IS NOT NULL)),
  CONSTRAINT panel_types_thickness_mm_check CHECK ((thickness_mm > (0))),
  CONSTRAINT panel_types_usage_check CHECK ((`usage` IN ('roof', 'wall')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE payment_schedules (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `sale_id` UUID NOT NULL,
  `seq` INT NOT NULL,
  `description` MEDIUMTEXT NOT NULL,
  `ratio_pct` DECIMAL(5,2) NULL,
  `amount` DECIMAL(14,2) NOT NULL,
  `due_date` DATE NOT NULL,
  `status` MEDIUMTEXT NOT NULL DEFAULT 'pending',
  `reminder_sent_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY payment_schedules_sale_id_seq_key (`sale_id`, `seq`),
  CONSTRAINT payment_schedules_amount_check CHECK ((amount > (0))),
  CONSTRAINT payment_schedules_ratio_pct_check CHECK (((ratio_pct > (0)) AND (ratio_pct <= (100)))),
  CONSTRAINT payment_schedules_seq_check CHECK ((seq > 0)),
  CONSTRAINT payment_schedules_status_check CHECK ((status IN ('pending', 'paid', 'partially_paid', 'cancelled'))),
  KEY payment_schedules_due_idx (`due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE payments (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `sale_id` UUID NOT NULL,
  `invoice_id` UUID NULL,
  `schedule_id` UUID NULL,
  `paid_on` DATE NOT NULL,
  `amount` DECIMAL(14,2) NOT NULL,
  `currency` MEDIUMTEXT NOT NULL DEFAULT 'TRY',
  `exchange_rate` DECIMAL(14,6) NOT NULL DEFAULT 1,
  `amount_try` DECIMAL(16,2) NOT NULL,
  `method` MEDIUMTEXT NOT NULL,
  `reference` MEDIUMTEXT NULL,
  `notes` MEDIUMTEXT NULL,
  `recorded_by` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT payments_amount_check CHECK ((amount > (0))),
  CONSTRAINT payments_check CHECK ((amount_try = round((amount * exchange_rate), 2))),
  CONSTRAINT payments_currency_check CHECK ((currency IN ('TRY', 'USD', 'EUR'))),
  CONSTRAINT payments_exchange_rate_check CHECK ((exchange_rate > (0))),
  CONSTRAINT payments_method_check CHECK ((method IN ('bank_transfer', 'cash', 'check', 'credit_card', 'other'))),
  KEY payments_sale_idx (`sale_id`, `paid_on` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE post_comments (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `post_id` UUID NOT NULL,
  `parent_id` UUID NULL,
  `user_id` UUID NULL,
  `author_name` MEDIUMTEXT NOT NULL,
  `author_email` MEDIUMTEXT NULL,
  `body` MEDIUMTEXT NOT NULL,
  `status` MEDIUMTEXT NOT NULL DEFAULT 'pending',
  `locale` MEDIUMTEXT NOT NULL DEFAULT 'tr',
  `ip_masked` MEDIUMTEXT NULL,
  `moderated_by` UUID NULL,
  `moderated_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT post_comments_author_len CHECK (((char_length(author_name) <= 80) AND ((author_email IS NULL) OR (char_length(author_email) <= 200)) AND ((ip_masked IS NULL) OR (char_length(ip_masked) <= 64)))),
  CONSTRAINT post_comments_body_check CHECK (((length(body) >= 2) AND (length(body) <= 4000))),
  CONSTRAINT post_comments_locale_check CHECK ((locale IN ('tr', 'en'))),
  CONSTRAINT post_comments_status_check CHECK ((status IN ('pending', 'approved', 'rejected', 'spam'))),
  KEY post_comments_pending_idx (`created_at`),
  KEY post_comments_post_idx (`post_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE post_likes (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `post_id` UUID NOT NULL,
  `visitor_hash` VARCHAR(255) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY post_likes_post_id_visitor_hash_key (`post_id`, `visitor_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE price_guide_rows (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `price_guide_id` UUID NOT NULL,
  `system_type` JSON NOT NULL,
  `description` JSON NOT NULL DEFAULT ('{}'),
  `material_price_id` UUID NULL,
  `min_factor` DECIMAL(6,4) NOT NULL DEFAULT 1,
  `max_factor` DECIMAL(6,4) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `sort_order` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY price_guide_rows_sort_order_uq (`price_guide_id`, `sort_order`),
  CONSTRAINT price_guide_rows_check CHECK ((max_factor >= min_factor)),
  CONSTRAINT price_guide_rows_min_factor_check CHECK ((min_factor > (0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE price_guides (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `slug` JSON NOT NULL,
  `title` JSON NOT NULL,
  `service_id` UUID NULL,
  `intro` JSON NOT NULL DEFAULT ('{}'),
  `factors` JSON NOT NULL DEFAULT ('{}'),
  `formula` JSON NOT NULL DEFAULT ('{}'),
  `disclaimer` JSON NOT NULL,
  `quantity_unit` MEDIUMTEXT NOT NULL DEFAULT 'ton',
  `quantity_presets` JSON NOT NULL DEFAULT ('["50","100","200"]'),
  `vat_included` BOOLEAN NOT NULL DEFAULT FALSE,
  `prices_updated_at` DATETIME(6) NULL,
  `stale_after_days` INT NOT NULL DEFAULT 90,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
  `published_locales` JSON NOT NULL DEFAULT ('[]'),
  `published_at` DATETIME(6) NULL,
  `translation_meta` JSON NOT NULL DEFAULT ('{}'),
  `seo_title` JSON NOT NULL DEFAULT ('{}'),
  `seo_description` JSON NOT NULL DEFAULT ('{}'),
  `og_image_id` UUID NULL,
  `canonical_url` MEDIUMTEXT NULL,
  `noindex` BOOLEAN NOT NULL DEFAULT FALSE,
  `focus_keyword` JSON NOT NULL DEFAULT ('{}'),
  `sort_order` INT NULL,
  slug_en VARCHAR(255) AS (JSON_VALUE(slug, '$.en')) STORED,
  slug_tr VARCHAR(255) AS (JSON_VALUE(slug, '$.tr')) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY price_guides_sort_order_uq (`sort_order`),
  CONSTRAINT price_guides_disclaimer_check CHECK ((NULLIF(JSON_VALUE(disclaimer, '$.tr'), '') IS NOT NULL)),
  CONSTRAINT price_guides_publishable CHECK (COALESCE((JSON_TYPE(published_locales) = 'ARRAY' AND JSON_LENGTH(published_locales) = JSON_CONTAINS(published_locales, '"tr"') + JSON_CONTAINS(published_locales, '"en"')) AND (NOT JSON_CONTAINS(published_locales, '"tr"') OR NULLIF(JSON_VALUE(title, '$.tr'), '') IS NOT NULL) AND (NOT JSON_CONTAINS(published_locales, '"en"') OR (NULLIF(JSON_VALUE(title, '$.en'), '') IS NOT NULL AND (slug IS NULL OR JSON_VALUE(slug, '$.en') IS NOT NULL) AND COALESCE(JSON_VALUE(translation_meta, '$.en.reviewed') IN ('1', 'true'), FALSE))), FALSE)),
  CONSTRAINT price_guides_slug_format CHECK (((slug IS NULL) OR COALESCE(JSON_TYPE(slug) = 'OBJECT' AND JSON_LENGTH(slug) = JSON_CONTAINS_PATH(slug, 'one', '$.tr') + JSON_CONTAINS_PATH(slug, 'one', '$.en') AND COALESCE(JSON_VALUE(slug, '$.tr') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.tr')) <= 80 AND JSON_VALUE(slug, '$.tr') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE) AND (JSON_VALUE(slug, '$.en') IS NULL OR COALESCE(JSON_VALUE(slug, '$.en') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.en')) <= 80 AND JSON_VALUE(slug, '$.en') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE)), FALSE))),
  CONSTRAINT price_guides_stale_after_days_check CHECK ((stale_after_days > 0)),
  CONSTRAINT price_guides_status_check CHECK ((status IN ('draft', 'published', 'archived'))),
  UNIQUE KEY price_guides_slug_en_uq (`slug_en`),
  UNIQUE KEY price_guides_slug_tr_uq (`slug_tr`),
  KEY price_guides_status_idx (`status`, `published_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE product_categories (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `slug` JSON NOT NULL,
  `name` JSON NOT NULL,
  `description` JSON NOT NULL DEFAULT ('{}'),
  `image_id` UUID NULL,
  `parent_id` UUID NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `seo_title` JSON NOT NULL DEFAULT ('{}'),
  `seo_description` JSON NOT NULL DEFAULT ('{}'),
  `og_image_id` UUID NULL,
  `canonical_url` MEDIUMTEXT NULL,
  `noindex` BOOLEAN NOT NULL DEFAULT FALSE,
  `focus_keyword` JSON NOT NULL DEFAULT ('{}'),
  `sort_order` INT NULL,
  `icon_key` MEDIUMTEXT NULL,
  slug_en VARCHAR(255) AS (JSON_VALUE(slug, '$.en')) STORED,
  slug_tr VARCHAR(255) AS (JSON_VALUE(slug, '$.tr')) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY product_categories_sort_order_uq (`parent_id`, `sort_order`),
  CONSTRAINT product_categories_check CHECK ((NOT (parent_id <=> id))),
  CONSTRAINT product_categories_icon_key_check CHECK ((icon_key IS NULL OR icon_key IN ('profile','sheet','rebar','panel','insulation','board','drywall','wall','cement','generic'))),
  CONSTRAINT product_categories_name_check CHECK ((NULLIF(JSON_VALUE(name, '$.tr'), '') IS NOT NULL)),
  CONSTRAINT product_categories_slug_format CHECK (((slug IS NULL) OR COALESCE(JSON_TYPE(slug) = 'OBJECT' AND JSON_LENGTH(slug) = JSON_CONTAINS_PATH(slug, 'one', '$.tr') + JSON_CONTAINS_PATH(slug, 'one', '$.en') AND COALESCE(JSON_VALUE(slug, '$.tr') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.tr')) <= 80 AND JSON_VALUE(slug, '$.tr') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE) AND (JSON_VALUE(slug, '$.en') IS NULL OR COALESCE(JSON_VALUE(slug, '$.en') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.en')) <= 80 AND JSON_VALUE(slug, '$.en') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE)), FALSE))),
  UNIQUE KEY product_categories_slug_en_uq (`slug_en`),
  UNIQUE KEY product_categories_slug_tr_uq (`slug_tr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE product_documents (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `product_id` UUID NOT NULL,
  `media_id` UUID NOT NULL,
  `title` JSON NOT NULL,
  `doc_type` MEDIUMTEXT NOT NULL,
  `locales` JSON NOT NULL DEFAULT ('["tr"]'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `sort_order` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY product_documents_sort_order_uq (`product_id`, `sort_order`),
  CONSTRAINT product_documents_doc_type_check CHECK ((doc_type IN ('datasheet', 'certificate', 'installation_guide', 'other'))),
  CONSTRAINT product_documents_locales_check CHECK ((JSON_TYPE(locales) = 'ARRAY' AND JSON_LENGTH(locales) = JSON_CONTAINS(locales, '"tr"') + JSON_CONTAINS(locales, '"en"'))),
  CONSTRAINT product_documents_title_check CHECK ((NULLIF(JSON_VALUE(title, '$.tr'), '') IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE product_images (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `product_id` UUID NOT NULL,
  `media_id` UUID NOT NULL,
  `alt` JSON NOT NULL DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `sort_order` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY product_images_sort_order_uq (`product_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE product_specs (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `product_id` UUID NOT NULL,
  `group_name` JSON NOT NULL DEFAULT ('{}'),
  `name` JSON NOT NULL,
  `value` JSON NOT NULL,
  `unit` MEDIUMTEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `sort_order` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY product_specs_sort_order_uq (`product_id`, `sort_order`),
  CONSTRAINT product_specs_name_check CHECK ((NULLIF(JSON_VALUE(name, '$.tr'), '') IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE product_variants (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `product_id` UUID NOT NULL,
  `size_label` MEDIUMTEXT NOT NULL,
  `width_mm` DECIMAL(8,2) NULL,
  `height_mm` DECIMAL(8,2) NULL,
  `thickness_mm` DECIMAL(6,2) NULL,
  `length_mm` DECIMAL(10,2) NULL,
  `kg_per_m` DECIMAL(10,3) NULL,
  `stock_code` VARCHAR(255) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `sort_order` INT NULL,
  `variant_group` JSON NOT NULL DEFAULT ('{}'),
  `props` JSON NOT NULL DEFAULT ('{}'),
  `size_key` MEDIUMTEXT NULL,
  `kg_per_m2` DECIMAL(10,3) NULL,
  `dims` JSON NOT NULL DEFAULT ('{}'),
  variant_group_tr VARCHAR(255) AS (JSON_VALUE(variant_group, '$.tr')) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY product_variants_sort_order_uq (`product_id`, `sort_order`),
  UNIQUE KEY product_variants_stock_code_key (`stock_code`),
  CONSTRAINT product_variants_height_mm_check CHECK ((height_mm > (0))),
  CONSTRAINT product_variants_kg_per_m2_check CHECK (((kg_per_m2 IS NULL) OR (kg_per_m2 > (0)))),
  CONSTRAINT product_variants_kg_per_m_check CHECK ((kg_per_m > (0))),
  CONSTRAINT product_variants_length_mm_check CHECK ((length_mm > (0))),
  CONSTRAINT product_variants_thickness_mm_check CHECK ((thickness_mm > (0))),
  CONSTRAINT product_variants_width_mm_check CHECK ((width_mm > (0))),
  KEY product_variants_product_group_idx (`product_id`, `variant_group_tr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE products (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `slug` JSON NOT NULL,
  `name` JSON NOT NULL,
  `short_description` JSON NOT NULL DEFAULT ('{}'),
  `description` JSON NOT NULL DEFAULT ('{}'),
  `usage_areas` JSON NOT NULL DEFAULT ('{}'),
  `category_id` UUID NULL,
  `service_id` UUID NULL,
  `cover_image_id` UUID NULL,
  `is_featured` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
  `published_locales` JSON NOT NULL DEFAULT ('[]'),
  `published_at` DATETIME(6) NULL,
  `translation_meta` JSON NOT NULL DEFAULT ('{}'),
  `seo_title` JSON NOT NULL DEFAULT ('{}'),
  `seo_description` JSON NOT NULL DEFAULT ('{}'),
  `og_image_id` UUID NULL,
  `canonical_url` MEDIUMTEXT NULL,
  `noindex` BOOLEAN NOT NULL DEFAULT FALSE,
  `focus_keyword` JSON NOT NULL DEFAULT ('{}'),
  `sort_order` INT NULL,
  `options` JSON NOT NULL DEFAULT ('{}'),
  `facts` JSON NOT NULL DEFAULT ('[]'),
  slug_en VARCHAR(255) AS (JSON_VALUE(slug, '$.en')) STORED,
  slug_tr VARCHAR(255) AS (JSON_VALUE(slug, '$.tr')) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY products_sort_order_uq (`sort_order`),
  CONSTRAINT products_publishable CHECK (COALESCE((JSON_TYPE(published_locales) = 'ARRAY' AND JSON_LENGTH(published_locales) = JSON_CONTAINS(published_locales, '"tr"') + JSON_CONTAINS(published_locales, '"en"')) AND (NOT JSON_CONTAINS(published_locales, '"tr"') OR NULLIF(JSON_VALUE(name, '$.tr'), '') IS NOT NULL) AND (NOT JSON_CONTAINS(published_locales, '"en"') OR (NULLIF(JSON_VALUE(name, '$.en'), '') IS NOT NULL AND (slug IS NULL OR JSON_VALUE(slug, '$.en') IS NOT NULL) AND COALESCE(JSON_VALUE(translation_meta, '$.en.reviewed') IN ('1', 'true'), FALSE))), FALSE)),
  CONSTRAINT products_slug_format CHECK (((slug IS NULL) OR COALESCE(JSON_TYPE(slug) = 'OBJECT' AND JSON_LENGTH(slug) = JSON_CONTAINS_PATH(slug, 'one', '$.tr') + JSON_CONTAINS_PATH(slug, 'one', '$.en') AND COALESCE(JSON_VALUE(slug, '$.tr') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.tr')) <= 80 AND JSON_VALUE(slug, '$.tr') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE) AND (JSON_VALUE(slug, '$.en') IS NULL OR COALESCE(JSON_VALUE(slug, '$.en') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.en')) <= 80 AND JSON_VALUE(slug, '$.en') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE)), FALSE))),
  CONSTRAINT products_status_check CHECK ((status IN ('draft', 'published', 'archived'))),
  KEY products_category_idx (`category_id`, `sort_order`),
  UNIQUE KEY products_slug_en_uq (`slug_en`),
  UNIQUE KEY products_slug_tr_uq (`slug_tr`),
  KEY products_status_idx (`status`, `published_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE profiles (
  `id` UUID NOT NULL,
  `full_name` MEDIUMTEXT NULL,
  `phone` MEDIUMTEXT NULL,
  `avatar_id` UUID NULL,
  `role` VARCHAR(255) NOT NULL DEFAULT 'member',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `must_change_password` BOOLEAN NOT NULL DEFAULT FALSE,
  `preferred_locale` MEDIUMTEXT NOT NULL DEFAULT 'tr',
  `notification_prefs` JSON NOT NULL DEFAULT ('{}'),
  `last_seen_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `saved_basket` JSON NOT NULL DEFAULT ('[]'),
  PRIMARY KEY (`id`),
  CONSTRAINT profiles_preferred_locale_check CHECK ((preferred_locale IN ('tr', 'en'))),
  CONSTRAINT profiles_role_check CHECK ((role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer', 'member'))),
  CONSTRAINT profiles_saved_basket_check CHECK ((JSON_TYPE(saved_basket) = 'ARRAY')),
  CONSTRAINT profiles_sizes CHECK (((LENGTH(saved_basket) <= 16384) AND ((full_name IS NULL) OR (char_length(full_name) <= 120)) AND ((phone IS NULL) OR (char_length(phone) <= 32)) AND (LENGTH(notification_prefs) <= 4096))),
  KEY profiles_role_idx (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE project_categories (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `slug` JSON NOT NULL,
  `name` JSON NOT NULL,
  `description` JSON NOT NULL DEFAULT ('{}'),
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `seo_title` JSON NOT NULL DEFAULT ('{}'),
  `seo_description` JSON NOT NULL DEFAULT ('{}'),
  `og_image_id` UUID NULL,
  `canonical_url` MEDIUMTEXT NULL,
  `noindex` BOOLEAN NOT NULL DEFAULT FALSE,
  `focus_keyword` JSON NOT NULL DEFAULT ('{}'),
  `sort_order` INT NULL,
  `drawing_key` MEDIUMTEXT NULL,
  slug_en VARCHAR(255) AS (JSON_VALUE(slug, '$.en')) STORED,
  slug_tr VARCHAR(255) AS (JSON_VALUE(slug, '$.tr')) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY project_categories_sort_order_uq (`sort_order`),
  CONSTRAINT project_categories_drawing_key_check CHECK ((drawing_key IS NULL OR drawing_key IN ('konut','cati','kentsel','endustri','betonarme','epoksi','alcipan','tadilat','peyzaj','proje'))),
  CONSTRAINT project_categories_name_check CHECK ((NULLIF(JSON_VALUE(name, '$.tr'), '') IS NOT NULL)),
  CONSTRAINT project_categories_slug_format CHECK (((slug IS NULL) OR COALESCE(JSON_TYPE(slug) = 'OBJECT' AND JSON_LENGTH(slug) = JSON_CONTAINS_PATH(slug, 'one', '$.tr') + JSON_CONTAINS_PATH(slug, 'one', '$.en') AND COALESCE(JSON_VALUE(slug, '$.tr') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.tr')) <= 80 AND JSON_VALUE(slug, '$.tr') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE) AND (JSON_VALUE(slug, '$.en') IS NULL OR COALESCE(JSON_VALUE(slug, '$.en') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.en')) <= 80 AND JSON_VALUE(slug, '$.en') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE)), FALSE))),
  UNIQUE KEY project_categories_slug_en_uq (`slug_en`),
  UNIQUE KEY project_categories_slug_tr_uq (`slug_tr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE project_category_relations (
  `project_id` UUID NOT NULL,
  `category_id` UUID NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`project_id`, `category_id`),
  KEY project_category_relations_category_idx (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE project_images (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `project_id` UUID NOT NULL,
  `media_id` UUID NOT NULL,
  `alt` JSON NOT NULL DEFAULT ('{}'),
  `caption` JSON NOT NULL DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `sort_order` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY project_images_sort_order_uq (`project_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE projects (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `slug` JSON NOT NULL,
  `title` JSON NOT NULL,
  `excerpt` JSON NOT NULL DEFAULT ('{}'),
  `body` JSON NOT NULL DEFAULT ('{}'),
  `location` JSON NOT NULL DEFAULT ('{}'),
  `client_name` MEDIUMTEXT NULL,
  `client_id` UUID NULL,
  `sale_id` UUID NULL,
  `area_m2` DECIMAL(12,2) NULL,
  `tonnage` DECIMAL(12,3) NULL,
  `started_on` DATE NULL,
  `completed_on` DATE NULL,
  `cover_image_id` UUID NULL,
  `is_featured` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
  `published_locales` JSON NOT NULL DEFAULT ('[]'),
  `published_at` DATETIME(6) NULL,
  `translation_meta` JSON NOT NULL DEFAULT ('{}'),
  `seo_title` JSON NOT NULL DEFAULT ('{}'),
  `seo_description` JSON NOT NULL DEFAULT ('{}'),
  `og_image_id` UUID NULL,
  `canonical_url` MEDIUMTEXT NULL,
  `noindex` BOOLEAN NOT NULL DEFAULT FALSE,
  `focus_keyword` JSON NOT NULL DEFAULT ('{}'),
  `sort_order` INT NULL,
  `phase` VARCHAR(255) NOT NULL DEFAULT 'completed',
  `duration_label` JSON NOT NULL DEFAULT ('{}'),
  `year` INT NULL,
  `drawing_key` MEDIUMTEXT NULL,
  slug_en VARCHAR(255) AS (JSON_VALUE(slug, '$.en')) STORED,
  slug_tr VARCHAR(255) AS (JSON_VALUE(slug, '$.tr')) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY projects_sort_order_uq (`sort_order`),
  CONSTRAINT projects_area_m2_check CHECK ((area_m2 > (0))),
  CONSTRAINT projects_check CHECK (((completed_on IS NULL) OR (started_on IS NULL) OR (completed_on >= started_on))),
  CONSTRAINT projects_drawing_key_check CHECK ((drawing_key IS NULL OR drawing_key IN ('konut','cati','kentsel','endustri','betonarme','epoksi','alcipan','tadilat','peyzaj','proje'))),
  CONSTRAINT projects_duration_label_check CHECK ((JSON_TYPE(duration_label) = 'OBJECT')),
  CONSTRAINT projects_phase_check CHECK ((phase IN ('completed', 'ongoing', 'design'))),
  CONSTRAINT projects_publishable CHECK (COALESCE((JSON_TYPE(published_locales) = 'ARRAY' AND JSON_LENGTH(published_locales) = JSON_CONTAINS(published_locales, '"tr"') + JSON_CONTAINS(published_locales, '"en"')) AND (NOT JSON_CONTAINS(published_locales, '"tr"') OR NULLIF(JSON_VALUE(title, '$.tr'), '') IS NOT NULL) AND (NOT JSON_CONTAINS(published_locales, '"en"') OR (NULLIF(JSON_VALUE(title, '$.en'), '') IS NOT NULL AND (slug IS NULL OR JSON_VALUE(slug, '$.en') IS NOT NULL) AND COALESCE(JSON_VALUE(translation_meta, '$.en.reviewed') IN ('1', 'true'), FALSE))), FALSE)),
  CONSTRAINT projects_slug_format CHECK (((slug IS NULL) OR COALESCE(JSON_TYPE(slug) = 'OBJECT' AND JSON_LENGTH(slug) = JSON_CONTAINS_PATH(slug, 'one', '$.tr') + JSON_CONTAINS_PATH(slug, 'one', '$.en') AND COALESCE(JSON_VALUE(slug, '$.tr') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.tr')) <= 80 AND JSON_VALUE(slug, '$.tr') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE) AND (JSON_VALUE(slug, '$.en') IS NULL OR COALESCE(JSON_VALUE(slug, '$.en') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.en')) <= 80 AND JSON_VALUE(slug, '$.en') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE)), FALSE))),
  CONSTRAINT projects_status_check CHECK ((status IN ('draft', 'published', 'archived'))),
  CONSTRAINT projects_tonnage_check CHECK ((tonnage > (0))),
  CONSTRAINT projects_year_check CHECK (((year IS NULL) OR ((year >= 1990) AND (year <= 2100)))),
  KEY projects_featured_idx (`sort_order`),
  KEY projects_phase_idx (`phase`),
  UNIQUE KEY projects_slug_en_uq (`slug_en`),
  UNIQUE KEY projects_slug_tr_uq (`slug_tr`),
  KEY projects_status_idx (`status`, `published_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE redirects (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `source_path` VARCHAR(255) NOT NULL,
  `target_path` MEDIUMTEXT NULL,
  `status_code` INT NOT NULL DEFAULT 301,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `hit_count` BIGINT NOT NULL DEFAULT 0,
  `last_hit_at` DATETIME(6) NULL,
  `note` MEDIUMTEXT NULL,
  `created_by` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY redirects_source_path_key (`source_path`),
  CONSTRAINT redirects_check CHECK (((status_code = 410) OR (target_path IS NOT NULL))),
  CONSTRAINT redirects_check1 CHECK ((NOT (target_path <=> source_path))),
  CONSTRAINT redirects_source_path_check CHECK ((source_path REGEXP '(?-i)^/')),
  CONSTRAINT redirects_status_code_check CHECK ((status_code IN (301, 302, 307, 308, 410)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE review_sync_runs (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `started_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `finished_at` DATETIME(6) NULL,
  `status` MEDIUMTEXT NOT NULL DEFAULT 'running',
  `fetched_count` INT NOT NULL DEFAULT 0,
  `inserted_count` INT NOT NULL DEFAULT 0,
  `updated_count` INT NOT NULL DEFAULT 0,
  `error` MEDIUMTEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT review_sync_runs_status_check CHECK ((status IN ('running', 'success', 'partial', 'failed')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE sale_expenses (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `sale_id` UUID NOT NULL,
  `category` MEDIUMTEXT NOT NULL,
  `description` MEDIUMTEXT NULL,
  `amount` DECIMAL(14,2) NOT NULL,
  `expense_date` DATE NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT sale_expenses_amount_check CHECK ((amount >= (0))),
  CONSTRAINT sale_expenses_category_check CHECK ((category IN ('shipping', 'labor', 'equipment', 'travel', 'subcontractor', 'other'))),
  KEY sale_expenses_sale_idx (`sale_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE sale_items (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `sale_id` UUID NOT NULL,
  `service_id` UUID NULL,
  `product_id` UUID NULL,
  `description` MEDIUMTEXT NOT NULL,
  `quantity` DECIMAL(14,3) NOT NULL,
  `unit` MEDIUMTEXT NOT NULL,
  `unit_price` DECIMAL(14,2) NOT NULL,
  `line_total` DECIMAL(14,2) NOT NULL,
  `unit_cost` DECIMAL(14,2) NULL,
  `line_cost` DECIMAL(14,2) NULL,
  `line_profit` DECIMAL(14,2) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT sale_items_check CHECK ((line_total = round((quantity * unit_price), 2))),
  CONSTRAINT sale_items_check1 CHECK (((line_profit IS NULL) OR (line_profit = (line_total - line_cost)))),
  CONSTRAINT sale_items_quantity_check CHECK ((quantity > (0))),
  CONSTRAINT sale_items_unit_cost_check CHECK ((unit_cost >= (0))),
  CONSTRAINT sale_items_unit_price_check CHECK ((unit_price >= (0))),
  KEY sale_items_sale_idx (`sale_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE sales (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `sale_no` VARCHAR(255) NULL,
  `customer_id` UUID NOT NULL,
  `lead_id` UUID NULL,
  `configuration_id` UUID NULL,
  `project_id` UUID NULL,
  `sale_date` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
  `currency` MEDIUMTEXT NOT NULL DEFAULT 'TRY',
  `exchange_rate` DECIMAL(14,6) NOT NULL DEFAULT 1,
  `exchange_rate_date` DATE NULL,
  `exchange_rate_source` MEDIUMTEXT NOT NULL DEFAULT 'tcmb',
  `subtotal` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `discount_pct` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `discount_amount` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `is_invoiced` BOOLEAN NOT NULL DEFAULT TRUE,
  `vat_rate` DECIMAL(5,4) NOT NULL DEFAULT 0.20,
  `vat_amount` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `grand_total` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `grand_total_try` DECIMAL(16,2) NOT NULL DEFAULT 0,
  `total_cost` DECIMAL(14,2) NULL,
  `gross_profit` DECIMAL(14,2) NULL,
  `margin_pct` DECIMAL(7,2) NULL,
  `notes` MEDIUMTEXT NULL,
  `assigned_to` UUID NULL,
  `created_by` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY sales_sale_no_key (`sale_no`),
  CONSTRAINT sales_check CHECK (((currency <> 'TRY') OR (exchange_rate = (1)))),
  CONSTRAINT sales_check1 CHECK ((discount_amount <= subtotal)),
  CONSTRAINT sales_check2 CHECK ((grand_total = ((subtotal - discount_amount) + vat_amount))),
  CONSTRAINT sales_check3 CHECK ((grand_total_try = round((grand_total * exchange_rate), 2))),
  CONSTRAINT sales_check4 CHECK (((gross_profit IS NULL) OR (gross_profit = ((subtotal - discount_amount) - total_cost)))),
  CONSTRAINT sales_currency_check CHECK ((currency IN ('TRY', 'USD', 'EUR'))),
  CONSTRAINT sales_discount_amount_check CHECK ((discount_amount >= (0))),
  CONSTRAINT sales_discount_pct_check CHECK (((discount_pct >= (0)) AND (discount_pct <= (100)))),
  CONSTRAINT sales_exchange_rate_check CHECK ((exchange_rate > (0))),
  CONSTRAINT sales_exchange_rate_source_check CHECK ((exchange_rate_source IN ('tcmb', 'manual'))),
  CONSTRAINT sales_sale_no_present CHECK (((sale_no IS NOT NULL) AND (sale_no <> ''))),
  CONSTRAINT sales_status_check CHECK ((status IN ('draft', 'confirmed', 'in_progress', 'completed', 'cancelled'))),
  CONSTRAINT sales_subtotal_check CHECK ((subtotal >= (0))),
  CONSTRAINT sales_total_cost_check CHECK ((total_cost >= (0))),
  CONSTRAINT sales_vat_amount_check CHECK ((vat_amount >= (0))),
  CONSTRAINT sales_vat_rate_check CHECK (((vat_rate >= (0)) AND (vat_rate <= (1)))),
  KEY sales_customer_idx (`customer_id`, `sale_date` DESC),
  KEY sales_status_idx (`status`, `sale_date` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE scroll_depth_aggregates (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `path` VARCHAR(255) NOT NULL,
  `device` VARCHAR(255) NOT NULL,
  `day` DATE NOT NULL,
  `views` INT NOT NULL DEFAULT 0,
  `reached_25` INT NOT NULL DEFAULT 0,
  `reached_50` INT NOT NULL DEFAULT 0,
  `reached_75` INT NOT NULL DEFAULT 0,
  `reached_100` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY scroll_depth_aggregates_path_device_day_key (`path`, `device`, `day`),
  CONSTRAINT scroll_depth_aggregates_device_check CHECK ((device IN ('mobile', 'tablet', 'desktop')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE service_images (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `service_id` UUID NOT NULL,
  `media_id` UUID NOT NULL,
  `alt` JSON NOT NULL DEFAULT ('{}'),
  `caption` JSON NOT NULL DEFAULT ('{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `sort_order` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY service_images_sort_order_uq (`service_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE service_projects (
  `service_id` UUID NOT NULL,
  `project_id` UUID NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`service_id`, `project_id`),
  KEY service_projects_project_idx (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE services (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `slug` JSON NOT NULL,
  `title` JSON NOT NULL,
  `excerpt` JSON NOT NULL DEFAULT ('{}'),
  `body` JSON NOT NULL DEFAULT ('{}'),
  `process_steps` JSON NOT NULL DEFAULT ('[]'),
  `icon` MEDIUMTEXT NULL,
  `cover_image_id` UUID NULL,
  `is_featured` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
  `published_locales` JSON NOT NULL DEFAULT ('[]'),
  `published_at` DATETIME(6) NULL,
  `translation_meta` JSON NOT NULL DEFAULT ('{}'),
  `seo_title` JSON NOT NULL DEFAULT ('{}'),
  `seo_description` JSON NOT NULL DEFAULT ('{}'),
  `og_image_id` UUID NULL,
  `canonical_url` MEDIUMTEXT NULL,
  `noindex` BOOLEAN NOT NULL DEFAULT FALSE,
  `focus_keyword` JSON NOT NULL DEFAULT ('{}'),
  `sort_order` INT NULL,
  `group_key` VARCHAR(255) NOT NULL DEFAULT 'steel',
  `highlights` JSON NOT NULL DEFAULT ('{}'),
  `drawing_key` MEDIUMTEXT NULL,
  `project_category_id` UUID NULL,
  slug_en VARCHAR(255) AS (JSON_VALUE(slug, '$.en')) STORED,
  slug_tr VARCHAR(255) AS (JSON_VALUE(slug, '$.tr')) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY services_sort_order_uq (`sort_order`),
  CONSTRAINT services_drawing_key_check CHECK ((drawing_key IS NULL OR drawing_key IN ('konut','cati','kentsel','endustri','betonarme','epoksi','alcipan','tadilat','peyzaj','proje'))),
  CONSTRAINT services_group_key_check CHECK ((group_key IN ('steel', 'engineering', 'construction'))),
  CONSTRAINT services_highlights_check CHECK (((JSON_TYPE(highlights) = 'OBJECT') AND (LENGTH(highlights) <= 8192))),
  CONSTRAINT services_process_steps_check CHECK ((JSON_TYPE(process_steps) = 'ARRAY')),
  CONSTRAINT services_publishable CHECK (COALESCE((JSON_TYPE(published_locales) = 'ARRAY' AND JSON_LENGTH(published_locales) = JSON_CONTAINS(published_locales, '"tr"') + JSON_CONTAINS(published_locales, '"en"')) AND (NOT JSON_CONTAINS(published_locales, '"tr"') OR NULLIF(JSON_VALUE(title, '$.tr'), '') IS NOT NULL) AND (NOT JSON_CONTAINS(published_locales, '"en"') OR (NULLIF(JSON_VALUE(title, '$.en'), '') IS NOT NULL AND (slug IS NULL OR JSON_VALUE(slug, '$.en') IS NOT NULL) AND COALESCE(JSON_VALUE(translation_meta, '$.en.reviewed') IN ('1', 'true'), FALSE))), FALSE)),
  CONSTRAINT services_slug_format CHECK (((slug IS NULL) OR COALESCE(JSON_TYPE(slug) = 'OBJECT' AND JSON_LENGTH(slug) = JSON_CONTAINS_PATH(slug, 'one', '$.tr') + JSON_CONTAINS_PATH(slug, 'one', '$.en') AND COALESCE(JSON_VALUE(slug, '$.tr') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.tr')) <= 80 AND JSON_VALUE(slug, '$.tr') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE) AND (JSON_VALUE(slug, '$.en') IS NULL OR COALESCE(JSON_VALUE(slug, '$.en') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.en')) <= 80 AND JSON_VALUE(slug, '$.en') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE)), FALSE))),
  CONSTRAINT services_status_check CHECK ((status IN ('draft', 'published', 'archived'))),
  KEY services_group_idx (`group_key`, `sort_order`),
  UNIQUE KEY services_slug_en_uq (`slug_en`),
  UNIQUE KEY services_slug_tr_uq (`slug_tr`),
  KEY services_status_idx (`status`, `published_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE site_settings (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `key` VARCHAR(255) NOT NULL,
  `value` JSON NOT NULL DEFAULT ('null'),
  `is_public` BOOLEAN NOT NULL DEFAULT FALSE,
  `description` MEDIUMTEXT NULL,
  `updated_by` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY site_settings_key_key (`key`),
  CONSTRAINT site_settings_key_check CHECK ((`key` REGEXP '(?-i)^[a-z][a-z0-9_.]*$'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE slug_history (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `entity_type` VARCHAR(255) NOT NULL,
  `entity_id` UUID NOT NULL,
  `locale` VARCHAR(255) NOT NULL,
  `old_slug` VARCHAR(255) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY slug_history_entity_type_locale_old_slug_key (`entity_type`, `locale`, `old_slug`),
  CONSTRAINT slug_history_locale_check CHECK ((locale IN ('tr', 'en'))),
  KEY slug_history_entity_idx (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE solutions (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `slug` JSON NOT NULL,
  `title` JSON NOT NULL,
  `service_id` UUID NULL,
  `hero_summary` JSON NOT NULL DEFAULT ('{}'),
  `problem` JSON NOT NULL DEFAULT ('{}'),
  `comparison` JSON NOT NULL DEFAULT ('{}'),
  `advantages` JSON NOT NULL DEFAULT ('[]'),
  `technical_basis` JSON NOT NULL DEFAULT ('{}'),
  `cta` JSON NOT NULL DEFAULT ('{}'),
  `cover_image_id` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
  `published_locales` JSON NOT NULL DEFAULT ('[]'),
  `published_at` DATETIME(6) NULL,
  `translation_meta` JSON NOT NULL DEFAULT ('{}'),
  `seo_title` JSON NOT NULL DEFAULT ('{}'),
  `seo_description` JSON NOT NULL DEFAULT ('{}'),
  `og_image_id` UUID NULL,
  `canonical_url` MEDIUMTEXT NULL,
  `noindex` BOOLEAN NOT NULL DEFAULT FALSE,
  `focus_keyword` JSON NOT NULL DEFAULT ('{}'),
  `sort_order` INT NULL,
  slug_en VARCHAR(255) AS (JSON_VALUE(slug, '$.en')) STORED,
  slug_tr VARCHAR(255) AS (JSON_VALUE(slug, '$.tr')) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY solutions_sort_order_uq (`sort_order`),
  CONSTRAINT solutions_advantages_check CHECK ((JSON_TYPE(advantages) = 'ARRAY')),
  CONSTRAINT solutions_publishable CHECK (COALESCE((JSON_TYPE(published_locales) = 'ARRAY' AND JSON_LENGTH(published_locales) = JSON_CONTAINS(published_locales, '"tr"') + JSON_CONTAINS(published_locales, '"en"')) AND (NOT JSON_CONTAINS(published_locales, '"tr"') OR NULLIF(JSON_VALUE(title, '$.tr'), '') IS NOT NULL) AND (NOT JSON_CONTAINS(published_locales, '"en"') OR (NULLIF(JSON_VALUE(title, '$.en'), '') IS NOT NULL AND (slug IS NULL OR JSON_VALUE(slug, '$.en') IS NOT NULL) AND COALESCE(JSON_VALUE(translation_meta, '$.en.reviewed') IN ('1', 'true'), FALSE))), FALSE)),
  CONSTRAINT solutions_slug_format CHECK (((slug IS NULL) OR COALESCE(JSON_TYPE(slug) = 'OBJECT' AND JSON_LENGTH(slug) = JSON_CONTAINS_PATH(slug, 'one', '$.tr') + JSON_CONTAINS_PATH(slug, 'one', '$.en') AND COALESCE(JSON_VALUE(slug, '$.tr') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.tr')) <= 80 AND JSON_VALUE(slug, '$.tr') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE) AND (JSON_VALUE(slug, '$.en') IS NULL OR COALESCE(JSON_VALUE(slug, '$.en') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.en')) <= 80 AND JSON_VALUE(slug, '$.en') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE)), FALSE))),
  CONSTRAINT solutions_status_check CHECK ((status IN ('draft', 'published', 'archived'))),
  UNIQUE KEY solutions_slug_en_uq (`slug_en`),
  UNIQUE KEY solutions_slug_tr_uq (`slug_tr`),
  KEY solutions_status_idx (`status`, `published_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE static_pages (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `page_key` VARCHAR(255) NOT NULL,
  `kind` MEDIUMTEXT NOT NULL,
  `slug` JSON NULL,
  `title` JSON NOT NULL,
  `body` JSON NOT NULL DEFAULT ('{}'),
  `extra` JSON NOT NULL DEFAULT ('{}'),
  `auto_translate_disabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
  `published_locales` JSON NOT NULL DEFAULT ('[]'),
  `published_at` DATETIME(6) NULL,
  `translation_meta` JSON NOT NULL DEFAULT ('{}'),
  `seo_title` JSON NOT NULL DEFAULT ('{}'),
  `seo_description` JSON NOT NULL DEFAULT ('{}'),
  `og_image_id` UUID NULL,
  `canonical_url` MEDIUMTEXT NULL,
  `noindex` BOOLEAN NOT NULL DEFAULT FALSE,
  `focus_keyword` JSON NOT NULL DEFAULT ('{}'),
  slug_en VARCHAR(255) AS (JSON_VALUE(slug, '$.en')) STORED,
  slug_tr VARCHAR(255) AS (JSON_VALUE(slug, '$.tr')) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY static_pages_page_key_key (`page_key`),
  CONSTRAINT static_pages_check CHECK (((kind <> 'legal') OR auto_translate_disabled)),
  CONSTRAINT static_pages_check1 CHECK (((kind IN ('legal', 'generic')) = (slug IS NOT NULL))),
  CONSTRAINT static_pages_kind_check CHECK ((kind IN ('legal', 'error', 'system', 'generic'))),
  CONSTRAINT static_pages_page_key_check CHECK ((page_key REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$')),
  CONSTRAINT static_pages_publishable CHECK (COALESCE((JSON_TYPE(published_locales) = 'ARRAY' AND JSON_LENGTH(published_locales) = JSON_CONTAINS(published_locales, '"tr"') + JSON_CONTAINS(published_locales, '"en"')) AND (NOT JSON_CONTAINS(published_locales, '"tr"') OR NULLIF(JSON_VALUE(title, '$.tr'), '') IS NOT NULL) AND (NOT JSON_CONTAINS(published_locales, '"en"') OR (NULLIF(JSON_VALUE(title, '$.en'), '') IS NOT NULL AND (slug IS NULL OR JSON_VALUE(slug, '$.en') IS NOT NULL) AND COALESCE(JSON_VALUE(translation_meta, '$.en.reviewed') IN ('1', 'true'), FALSE))), FALSE)),
  CONSTRAINT static_pages_slug_format CHECK (((slug IS NULL) OR COALESCE(JSON_TYPE(slug) = 'OBJECT' AND JSON_LENGTH(slug) = JSON_CONTAINS_PATH(slug, 'one', '$.tr') + JSON_CONTAINS_PATH(slug, 'one', '$.en') AND COALESCE(JSON_VALUE(slug, '$.tr') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.tr')) <= 80 AND JSON_VALUE(slug, '$.tr') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE) AND (JSON_VALUE(slug, '$.en') IS NULL OR COALESCE(JSON_VALUE(slug, '$.en') REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(JSON_VALUE(slug, '$.en')) <= 80 AND JSON_VALUE(slug, '$.en') NOT IN ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'), FALSE)), FALSE))),
  CONSTRAINT static_pages_status_check CHECK ((status IN ('draft', 'published', 'archived'))),
  UNIQUE KEY static_pages_slug_en_uq (`slug_en`),
  UNIQUE KEY static_pages_slug_tr_uq (`slug_tr`),
  KEY static_pages_status_idx (`status`, `published_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE steel_profiles (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `code` VARCHAR(255) NOT NULL,
  `family` VARCHAR(255) NOT NULL,
  `kg_per_m` DECIMAL(10,3) NOT NULL,
  `dimensions` JSON NOT NULL DEFAULT ('{}'),
  `usage` MEDIUMTEXT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `sort_order` INT NULL,
  `label` MEDIUMTEXT NOT NULL,
  `kind` MEDIUMTEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY steel_profiles_code_key (`code`),
  UNIQUE KEY steel_profiles_sort_order_uq (`sort_order`),
  CONSTRAINT steel_profiles_kg_per_m_check CHECK ((kg_per_m > (0))),
  CONSTRAINT steel_profiles_kind_check CHECK ((kind IN ('I', 'U', 'C', 'L', 'RHS', 'CHS', 'FL'))),
  CONSTRAINT steel_profiles_usage_check CHECK ((`usage` IN ('column', 'beam', 'rafter', 'purlin', 'girt', 'bracing', 'wind_column', 'other'))),
  KEY steel_profiles_family_idx (`family`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE team_members (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `full_name` MEDIUMTEXT NOT NULL,
  `position` JSON NOT NULL DEFAULT ('{}'),
  `bio` JSON NOT NULL DEFAULT ('{}'),
  `photo_id` UUID NULL,
  `email` MEDIUMTEXT NULL,
  `linkedin_url` MEDIUMTEXT NULL,
  `profile_id` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
  `published_locales` JSON NOT NULL DEFAULT ('[]'),
  `published_at` DATETIME(6) NULL,
  `translation_meta` JSON NOT NULL DEFAULT ('{}'),
  `sort_order` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY team_members_sort_order_uq (`sort_order`),
  CONSTRAINT team_members_linkedin_url_check CHECK (((linkedin_url IS NULL) OR (linkedin_url REGEXP '(?-i)^https://'))),
  CONSTRAINT team_members_publishable CHECK (COALESCE((JSON_TYPE(published_locales) = 'ARRAY' AND JSON_LENGTH(published_locales) = JSON_CONTAINS(published_locales, '"tr"') + JSON_CONTAINS(published_locales, '"en"')) AND (NOT JSON_CONTAINS(published_locales, '"tr"') OR NULLIF(JSON_VALUE(`position`, '$.tr'), '') IS NOT NULL) AND (NOT JSON_CONTAINS(published_locales, '"en"') OR (NULLIF(JSON_VALUE(`position`, '$.en'), '') IS NOT NULL AND COALESCE(JSON_VALUE(translation_meta, '$.en.reviewed') IN ('1', 'true'), FALSE))), FALSE)),
  CONSTRAINT team_members_status_check CHECK ((status IN ('draft', 'published', 'archived'))),
  KEY team_members_status_idx (`status`, `published_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE testimonials (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `source` VARCHAR(255) NOT NULL DEFAULT 'manual',
  `external_id` VARCHAR(255) NULL,
  `author_name` MEDIUMTEXT NOT NULL,
  `author_title` JSON NOT NULL DEFAULT ('{}'),
  `company` MEDIUMTEXT NULL,
  `avatar_id` UUID NULL,
  `avatar_url` MEDIUMTEXT NULL,
  `rating` SMALLINT NOT NULL,
  `body` JSON NOT NULL DEFAULT ('{}'),
  `original_locale` MEDIUMTEXT NULL,
  `is_verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_featured` BOOLEAN NOT NULL DEFAULT FALSE,
  `service_id` UUID NULL,
  `project_id` UUID NULL,
  `product_id` UUID NULL,
  `reviewed_on` DATE NULL,
  `status` MEDIUMTEXT NOT NULL DEFAULT 'pending',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `sort_order` INT NULL,
  `consent_kvkk_at` DATETIME(6) NULL,
  `ip_masked` MEDIUMTEXT NULL,
  `is_sample` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`id`),
  UNIQUE KEY testimonials_sort_order_uq (`sort_order`),
  CONSTRAINT testimonials_check CHECK (((source = 'google') = (external_id IS NOT NULL))),
  CONSTRAINT testimonials_original_locale_check CHECK ((original_locale IN ('tr', 'en'))),
  CONSTRAINT testimonials_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
  CONSTRAINT testimonials_sample_manual_only CHECK (((NOT is_sample) OR (source = 'manual'))),
  CONSTRAINT testimonials_source_check CHECK ((source IN ('manual', 'google', 'visitor'))),
  CONSTRAINT testimonials_status_check CHECK ((status IN ('pending', 'published', 'rejected', 'archived'))),
  UNIQUE KEY testimonials_external_uq (`source`, `external_id`),
  KEY testimonials_published_idx (`is_featured` DESC, `reviewed_on` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE translation_glossary (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `term_tr` VARCHAR(255) NOT NULL,
  `term_en` MEDIUMTEXT NOT NULL,
  `context` VARCHAR(255) NOT NULL DEFAULT '',
  `do_not_translate` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_case_sensitive` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY translation_glossary_term_tr_context_key (`term_tr`, `context`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE ui_translations (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `namespace` VARCHAR(255) NOT NULL,
  `key` VARCHAR(255) NOT NULL,
  `locale` VARCHAR(255) NOT NULL,
  `value` MEDIUMTEXT NOT NULL,
  `updated_by` UUID NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY ui_translations_namespace_key_locale_key (`namespace`, `key`, `locale`),
  CONSTRAINT ui_translations_locale_check CHECK ((locale IN ('tr', 'en')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE web_vitals (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `session_id` UUID NULL,
  `path` VARCHAR(255) NOT NULL,
  `device` MEDIUMTEXT NOT NULL,
  `metric` VARCHAR(255) NOT NULL,
  `value` DECIMAL(12,4) NOT NULL,
  `rating` MEDIUMTEXT NULL,
  `recorded_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT web_vitals_device_check CHECK ((device IN ('mobile', 'tablet', 'desktop'))),
  CONSTRAINT web_vitals_metric_check CHECK ((metric IN ('LCP', 'CLS', 'INP', 'TTFB', 'FCP'))),
  CONSTRAINT web_vitals_rating_check CHECK ((rating IN ('good', 'needs_improvement', 'poor'))),
  CONSTRAINT web_vitals_value_check CHECK ((value >= (0))),
  KEY web_vitals_path_idx (`path`, `metric`, `recorded_at`),
  KEY web_vitals_recorded_idx (`recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE whatsapp_settings (
  `id` UUID NOT NULL DEFAULT UUID_v4(),
  `key` VARCHAR(255) NOT NULL DEFAULT 'main',
  `is_enabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `phone_e164` MEDIUMTEXT NULL,
  `display_name` JSON NOT NULL DEFAULT ('{}'),
  `greeting` JSON NOT NULL DEFAULT ('{}'),
  `reply_time` JSON NOT NULL DEFAULT ('{}'),
  `message_templates` JSON NOT NULL DEFAULT ('{}'),
  `working_hours` JSON NOT NULL DEFAULT ('{}'),
  `hidden_paths` JSON NOT NULL DEFAULT ('[]'),
  `show_delay_seconds` INT NOT NULL DEFAULT 3,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY whatsapp_settings_key_key (`key`),
  CONSTRAINT whatsapp_settings_check CHECK (((NOT is_enabled) OR (phone_e164 IS NOT NULL))),
  CONSTRAINT whatsapp_settings_phone_e164_check CHECK (((phone_e164 IS NULL) OR (phone_e164 REGEXP '(?-i)^\\+[1-9]\\d{7,14}$'))),
  CONSTRAINT whatsapp_settings_show_delay_seconds_check CHECK ((show_delay_seconds >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Yabancı anahtarlar (tablolar oluştuktan sonra)
ALTER TABLE about_content ADD CONSTRAINT about_content_image_id_fkey FOREIGN KEY (`image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE about_content ADD CONSTRAINT about_content_og_image_id_fkey FOREIGN KEY (`og_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE analytics_events ADD CONSTRAINT analytics_events_pageview_id_fkey FOREIGN KEY (`pageview_id`) REFERENCES analytics_pageviews (`id`) ON DELETE CASCADE;
ALTER TABLE analytics_events ADD CONSTRAINT analytics_events_session_id_fkey FOREIGN KEY (`session_id`) REFERENCES analytics_sessions (`id`) ON DELETE CASCADE;
ALTER TABLE analytics_pageviews ADD CONSTRAINT analytics_pageviews_session_id_fkey FOREIGN KEY (`session_id`) REFERENCES analytics_sessions (`id`) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (`actor_id`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE blog_categories ADD CONSTRAINT blog_categories_og_image_id_fkey FOREIGN KEY (`og_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE blog_post_tags ADD CONSTRAINT blog_post_tags_post_id_fkey FOREIGN KEY (`post_id`) REFERENCES blog_posts (`id`) ON DELETE CASCADE;
ALTER TABLE blog_post_tags ADD CONSTRAINT blog_post_tags_tag_id_fkey FOREIGN KEY (`tag_id`) REFERENCES blog_tags (`id`) ON DELETE CASCADE;
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_author_fk FOREIGN KEY (`author_id`) REFERENCES team_members (`id`) ON DELETE SET NULL;
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_category_id_fkey FOREIGN KEY (`category_id`) REFERENCES blog_categories (`id`) ON DELETE SET NULL;
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_cover_image_id_fkey FOREIGN KEY (`cover_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_og_image_id_fkey FOREIGN KEY (`og_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE certificates ADD CONSTRAINT certificates_document_id_fkey FOREIGN KEY (`document_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE certificates ADD CONSTRAINT certificates_image_id_fkey FOREIGN KEY (`image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE clients ADD CONSTRAINT clients_logo_id_fkey FOREIGN KEY (`logo_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE configuration_items ADD CONSTRAINT configuration_items_configuration_version_id_fkey FOREIGN KEY (`configuration_version_id`) REFERENCES configuration_versions (`id`) ON DELETE CASCADE;
ALTER TABLE configuration_items ADD CONSTRAINT configuration_items_panel_type_id_fkey FOREIGN KEY (`panel_type_id`) REFERENCES panel_types (`id`) ON DELETE SET NULL;
ALTER TABLE configuration_items ADD CONSTRAINT configuration_items_steel_profile_id_fkey FOREIGN KEY (`steel_profile_id`) REFERENCES steel_profiles (`id`) ON DELETE SET NULL;
ALTER TABLE configuration_versions ADD CONSTRAINT configuration_versions_configuration_id_fkey FOREIGN KEY (`configuration_id`) REFERENCES configurations (`id`) ON DELETE CASCADE;
ALTER TABLE configurations ADD CONSTRAINT configurations_lead_id_fkey FOREIGN KEY (`lead_id`) REFERENCES leads (`id`) ON DELETE SET NULL;
ALTER TABLE configurations ADD CONSTRAINT configurations_sale_id_fkey FOREIGN KEY (`sale_id`) REFERENCES sales (`id`) ON DELETE SET NULL;
ALTER TABLE configurations ADD CONSTRAINT configurations_user_id_fkey FOREIGN KEY (`user_id`) REFERENCES profiles (`id`) ON DELETE CASCADE;
ALTER TABLE configurator_pages ADD CONSTRAINT configurator_pages_cover_image_id_fkey FOREIGN KEY (`cover_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE configurator_pages ADD CONSTRAINT configurator_pages_og_image_id_fkey FOREIGN KEY (`og_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE content_revisions ADD CONSTRAINT content_revisions_created_by_fkey FOREIGN KEY (`created_by`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE customers ADD CONSTRAINT customers_profile_id_fkey FOREIGN KEY (`profile_id`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE email_logs ADD CONSTRAINT email_logs_queue_id_fkey FOREIGN KEY (`queue_id`) REFERENCES email_queue (`id`) ON DELETE SET NULL;
ALTER TABLE error_logs ADD CONSTRAINT error_logs_resolved_by_fkey FOREIGN KEY (`resolved_by`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE error_logs ADD CONSTRAINT error_logs_user_id_fkey FOREIGN KEY (`user_id`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE field_videos ADD CONSTRAINT field_videos_poster_id_fkey FOREIGN KEY (`poster_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE field_videos ADD CONSTRAINT field_videos_video_id_fkey FOREIGN KEY (`video_id`) REFERENCES media_library (`id`) ON DELETE RESTRICT;
ALTER TABLE funnel_steps ADD CONSTRAINT funnel_steps_funnel_id_fkey FOREIGN KEY (`funnel_id`) REFERENCES funnels (`id`) ON DELETE CASCADE;
ALTER TABLE hero_media ADD CONSTRAINT hero_media_desktop_poster_id_fkey FOREIGN KEY (`desktop_poster_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE hero_media ADD CONSTRAINT hero_media_desktop_video_id_fkey FOREIGN KEY (`desktop_video_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE hero_media ADD CONSTRAINT hero_media_mobile_poster_id_fkey FOREIGN KEY (`mobile_poster_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE hero_media ADD CONSTRAINT hero_media_mobile_video_id_fkey FOREIGN KEY (`mobile_video_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE invoices ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (`created_by`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE invoices ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (`customer_id`) REFERENCES customers (`id`) ON DELETE RESTRICT;
ALTER TABLE invoices ADD CONSTRAINT invoices_sale_id_fkey FOREIGN KEY (`sale_id`) REFERENCES sales (`id`) ON DELETE RESTRICT;
ALTER TABLE job_applications ADD CONSTRAINT job_applications_job_posting_id_fkey FOREIGN KEY (`job_posting_id`) REFERENCES job_postings (`id`) ON DELETE SET NULL;
ALTER TABLE job_applications ADD CONSTRAINT job_applications_reviewed_by_fkey FOREIGN KEY (`reviewed_by`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE job_postings ADD CONSTRAINT job_postings_og_image_id_fkey FOREIGN KEY (`og_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE lead_attachments ADD CONSTRAINT lead_attachments_lead_id_fkey FOREIGN KEY (`lead_id`) REFERENCES leads (`id`) ON DELETE CASCADE;
ALTER TABLE lead_items ADD CONSTRAINT lead_items_lead_id_fkey FOREIGN KEY (`lead_id`) REFERENCES leads (`id`) ON DELETE CASCADE;
ALTER TABLE lead_items ADD CONSTRAINT lead_items_product_id_fkey FOREIGN KEY (`product_id`) REFERENCES products (`id`) ON DELETE SET NULL;
ALTER TABLE lead_items ADD CONSTRAINT lead_items_variant_id_fkey FOREIGN KEY (`variant_id`) REFERENCES product_variants (`id`) ON DELETE SET NULL;
ALTER TABLE lead_notes ADD CONSTRAINT lead_notes_author_id_fkey FOREIGN KEY (`author_id`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE lead_notes ADD CONSTRAINT lead_notes_lead_id_fkey FOREIGN KEY (`lead_id`) REFERENCES leads (`id`) ON DELETE CASCADE;
ALTER TABLE lead_replies ADD CONSTRAINT lead_replies_author_id_fkey FOREIGN KEY (`author_id`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE lead_replies ADD CONSTRAINT lead_replies_email_log_fk FOREIGN KEY (`email_log_id`) REFERENCES email_logs (`id`) ON DELETE SET NULL;
ALTER TABLE lead_replies ADD CONSTRAINT lead_replies_lead_id_fkey FOREIGN KEY (`lead_id`) REFERENCES leads (`id`) ON DELETE CASCADE;
ALTER TABLE leads ADD CONSTRAINT leads_assigned_to_fkey FOREIGN KEY (`assigned_to`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE leads ADD CONSTRAINT leads_configuration_fk FOREIGN KEY (`configuration_id`) REFERENCES configurations (`id`) ON DELETE SET NULL;
ALTER TABLE leads ADD CONSTRAINT leads_customer_fk FOREIGN KEY (`customer_id`) REFERENCES customers (`id`) ON DELETE SET NULL;
ALTER TABLE leads ADD CONSTRAINT leads_service_id_fkey FOREIGN KEY (`service_id`) REFERENCES services (`id`) ON DELETE SET NULL;
ALTER TABLE leads ADD CONSTRAINT leads_user_id_fkey FOREIGN KEY (`user_id`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE mail_campaign_recipients ADD CONSTRAINT mail_campaign_recipients_campaign_id_fkey FOREIGN KEY (`campaign_id`) REFERENCES mail_campaigns (`id`) ON DELETE CASCADE;
ALTER TABLE mail_campaigns ADD CONSTRAINT mail_campaigns_created_by_fkey FOREIGN KEY (`created_by`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE mail_campaigns ADD CONSTRAINT mail_campaigns_started_by_fkey FOREIGN KEY (`started_by`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE mail_suppressions ADD CONSTRAINT mail_suppressions_campaign_id_fkey FOREIGN KEY (`campaign_id`) REFERENCES mail_campaigns (`id`) ON DELETE SET NULL;
ALTER TABLE mail_suppressions ADD CONSTRAINT mail_suppressions_created_by_fkey FOREIGN KEY (`created_by`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE material_price_history ADD CONSTRAINT material_price_history_changed_by_fkey FOREIGN KEY (`changed_by`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE material_price_history ADD CONSTRAINT material_price_history_material_price_id_fkey FOREIGN KEY (`material_price_id`) REFERENCES material_prices (`id`) ON DELETE CASCADE;
ALTER TABLE material_prices ADD CONSTRAINT material_prices_updated_by_fkey FOREIGN KEY (`updated_by`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE media_library ADD CONSTRAINT media_library_uploaded_by_fkey FOREIGN KEY (`uploaded_by`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE menu_items ADD CONSTRAINT menu_items_menu_id_fkey FOREIGN KEY (`menu_id`) REFERENCES menus (`id`) ON DELETE CASCADE;
ALTER TABLE menu_items ADD CONSTRAINT menu_items_parent_id_fkey FOREIGN KEY (`parent_id`) REFERENCES menu_items (`id`) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (`user_id`) REFERENCES profiles (`id`) ON DELETE CASCADE;
ALTER TABLE panel_types ADD CONSTRAINT panel_types_material_price_id_fkey FOREIGN KEY (`material_price_id`) REFERENCES material_prices (`id`) ON DELETE SET NULL;
ALTER TABLE payment_schedules ADD CONSTRAINT payment_schedules_sale_id_fkey FOREIGN KEY (`sale_id`) REFERENCES sales (`id`) ON DELETE CASCADE;
ALTER TABLE payments ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (`invoice_id`) REFERENCES invoices (`id`) ON DELETE SET NULL;
ALTER TABLE payments ADD CONSTRAINT payments_recorded_by_fkey FOREIGN KEY (`recorded_by`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE payments ADD CONSTRAINT payments_sale_id_fkey FOREIGN KEY (`sale_id`) REFERENCES sales (`id`) ON DELETE RESTRICT;
ALTER TABLE payments ADD CONSTRAINT payments_schedule_id_fkey FOREIGN KEY (`schedule_id`) REFERENCES payment_schedules (`id`) ON DELETE SET NULL;
ALTER TABLE post_comments ADD CONSTRAINT post_comments_moderated_by_fkey FOREIGN KEY (`moderated_by`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE post_comments ADD CONSTRAINT post_comments_parent_id_fkey FOREIGN KEY (`parent_id`) REFERENCES post_comments (`id`) ON DELETE CASCADE;
ALTER TABLE post_comments ADD CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (`post_id`) REFERENCES blog_posts (`id`) ON DELETE CASCADE;
ALTER TABLE post_comments ADD CONSTRAINT post_comments_user_id_fkey FOREIGN KEY (`user_id`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE post_likes ADD CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (`post_id`) REFERENCES blog_posts (`id`) ON DELETE CASCADE;
ALTER TABLE price_guide_rows ADD CONSTRAINT price_guide_rows_material_price_fk FOREIGN KEY (`material_price_id`) REFERENCES material_prices (`id`) ON DELETE SET NULL;
ALTER TABLE price_guide_rows ADD CONSTRAINT price_guide_rows_price_guide_id_fkey FOREIGN KEY (`price_guide_id`) REFERENCES price_guides (`id`) ON DELETE CASCADE;
ALTER TABLE price_guides ADD CONSTRAINT price_guides_og_image_id_fkey FOREIGN KEY (`og_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE price_guides ADD CONSTRAINT price_guides_service_id_fkey FOREIGN KEY (`service_id`) REFERENCES services (`id`) ON DELETE SET NULL;
ALTER TABLE product_categories ADD CONSTRAINT product_categories_image_id_fkey FOREIGN KEY (`image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE product_categories ADD CONSTRAINT product_categories_og_image_id_fkey FOREIGN KEY (`og_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE product_categories ADD CONSTRAINT product_categories_parent_id_fkey FOREIGN KEY (`parent_id`) REFERENCES product_categories (`id`) ON DELETE RESTRICT;
ALTER TABLE product_documents ADD CONSTRAINT product_documents_media_id_fkey FOREIGN KEY (`media_id`) REFERENCES media_library (`id`) ON DELETE CASCADE;
ALTER TABLE product_documents ADD CONSTRAINT product_documents_product_id_fkey FOREIGN KEY (`product_id`) REFERENCES products (`id`) ON DELETE CASCADE;
ALTER TABLE product_images ADD CONSTRAINT product_images_media_id_fkey FOREIGN KEY (`media_id`) REFERENCES media_library (`id`) ON DELETE CASCADE;
ALTER TABLE product_images ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (`product_id`) REFERENCES products (`id`) ON DELETE CASCADE;
ALTER TABLE product_specs ADD CONSTRAINT product_specs_product_id_fkey FOREIGN KEY (`product_id`) REFERENCES products (`id`) ON DELETE CASCADE;
ALTER TABLE product_variants ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (`product_id`) REFERENCES products (`id`) ON DELETE CASCADE;
ALTER TABLE products ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (`category_id`) REFERENCES product_categories (`id`) ON DELETE SET NULL;
ALTER TABLE products ADD CONSTRAINT products_cover_image_id_fkey FOREIGN KEY (`cover_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE products ADD CONSTRAINT products_og_image_id_fkey FOREIGN KEY (`og_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE products ADD CONSTRAINT products_service_id_fkey FOREIGN KEY (`service_id`) REFERENCES services (`id`) ON DELETE SET NULL;
ALTER TABLE profiles ADD CONSTRAINT profiles_avatar_fk FOREIGN KEY (`avatar_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (`id`) REFERENCES users (`id`) ON DELETE CASCADE;
ALTER TABLE project_categories ADD CONSTRAINT project_categories_og_image_id_fkey FOREIGN KEY (`og_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE project_category_relations ADD CONSTRAINT project_category_relations_category_id_fkey FOREIGN KEY (`category_id`) REFERENCES project_categories (`id`) ON DELETE CASCADE;
ALTER TABLE project_category_relations ADD CONSTRAINT project_category_relations_project_id_fkey FOREIGN KEY (`project_id`) REFERENCES projects (`id`) ON DELETE CASCADE;
ALTER TABLE project_images ADD CONSTRAINT project_images_media_id_fkey FOREIGN KEY (`media_id`) REFERENCES media_library (`id`) ON DELETE CASCADE;
ALTER TABLE project_images ADD CONSTRAINT project_images_project_id_fkey FOREIGN KEY (`project_id`) REFERENCES projects (`id`) ON DELETE CASCADE;
ALTER TABLE projects ADD CONSTRAINT projects_client_fk FOREIGN KEY (`client_id`) REFERENCES clients (`id`) ON DELETE SET NULL;
ALTER TABLE projects ADD CONSTRAINT projects_cover_image_id_fkey FOREIGN KEY (`cover_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE projects ADD CONSTRAINT projects_og_image_id_fkey FOREIGN KEY (`og_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE projects ADD CONSTRAINT projects_sale_fk FOREIGN KEY (`sale_id`) REFERENCES sales (`id`) ON DELETE SET NULL;
ALTER TABLE redirects ADD CONSTRAINT redirects_created_by_fkey FOREIGN KEY (`created_by`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE sale_expenses ADD CONSTRAINT sale_expenses_sale_id_fkey FOREIGN KEY (`sale_id`) REFERENCES sales (`id`) ON DELETE CASCADE;
ALTER TABLE sale_items ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (`product_id`) REFERENCES products (`id`) ON DELETE SET NULL;
ALTER TABLE sale_items ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (`sale_id`) REFERENCES sales (`id`) ON DELETE CASCADE;
ALTER TABLE sale_items ADD CONSTRAINT sale_items_service_id_fkey FOREIGN KEY (`service_id`) REFERENCES services (`id`) ON DELETE SET NULL;
ALTER TABLE sales ADD CONSTRAINT sales_assigned_to_fkey FOREIGN KEY (`assigned_to`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE sales ADD CONSTRAINT sales_configuration_fk FOREIGN KEY (`configuration_id`) REFERENCES configurations (`id`) ON DELETE SET NULL;
ALTER TABLE sales ADD CONSTRAINT sales_created_by_fkey FOREIGN KEY (`created_by`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE sales ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (`customer_id`) REFERENCES customers (`id`) ON DELETE RESTRICT;
ALTER TABLE sales ADD CONSTRAINT sales_lead_id_fkey FOREIGN KEY (`lead_id`) REFERENCES leads (`id`) ON DELETE SET NULL;
ALTER TABLE sales ADD CONSTRAINT sales_project_id_fkey FOREIGN KEY (`project_id`) REFERENCES projects (`id`) ON DELETE SET NULL;
ALTER TABLE service_images ADD CONSTRAINT service_images_media_id_fkey FOREIGN KEY (`media_id`) REFERENCES media_library (`id`) ON DELETE CASCADE;
ALTER TABLE service_images ADD CONSTRAINT service_images_service_id_fkey FOREIGN KEY (`service_id`) REFERENCES services (`id`) ON DELETE CASCADE;
ALTER TABLE service_projects ADD CONSTRAINT service_projects_project_id_fkey FOREIGN KEY (`project_id`) REFERENCES projects (`id`) ON DELETE CASCADE;
ALTER TABLE service_projects ADD CONSTRAINT service_projects_service_id_fkey FOREIGN KEY (`service_id`) REFERENCES services (`id`) ON DELETE CASCADE;
ALTER TABLE services ADD CONSTRAINT services_cover_image_id_fkey FOREIGN KEY (`cover_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE services ADD CONSTRAINT services_og_image_id_fkey FOREIGN KEY (`og_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE services ADD CONSTRAINT services_project_category_id_fkey FOREIGN KEY (`project_category_id`) REFERENCES project_categories (`id`) ON DELETE SET NULL;
ALTER TABLE site_settings ADD CONSTRAINT site_settings_updated_by_fkey FOREIGN KEY (`updated_by`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE solutions ADD CONSTRAINT solutions_cover_image_id_fkey FOREIGN KEY (`cover_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE solutions ADD CONSTRAINT solutions_og_image_id_fkey FOREIGN KEY (`og_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE solutions ADD CONSTRAINT solutions_service_id_fkey FOREIGN KEY (`service_id`) REFERENCES services (`id`) ON DELETE SET NULL;
ALTER TABLE static_pages ADD CONSTRAINT static_pages_og_image_id_fkey FOREIGN KEY (`og_image_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE team_members ADD CONSTRAINT team_members_photo_id_fkey FOREIGN KEY (`photo_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE team_members ADD CONSTRAINT team_members_profile_id_fkey FOREIGN KEY (`profile_id`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE testimonials ADD CONSTRAINT testimonials_avatar_id_fkey FOREIGN KEY (`avatar_id`) REFERENCES media_library (`id`) ON DELETE SET NULL;
ALTER TABLE testimonials ADD CONSTRAINT testimonials_product_id_fkey FOREIGN KEY (`product_id`) REFERENCES products (`id`) ON DELETE SET NULL;
ALTER TABLE testimonials ADD CONSTRAINT testimonials_project_id_fkey FOREIGN KEY (`project_id`) REFERENCES projects (`id`) ON DELETE SET NULL;
ALTER TABLE testimonials ADD CONSTRAINT testimonials_service_id_fkey FOREIGN KEY (`service_id`) REFERENCES services (`id`) ON DELETE SET NULL;
ALTER TABLE ui_translations ADD CONSTRAINT ui_translations_updated_by_fkey FOREIGN KEY (`updated_by`) REFERENCES profiles (`id`) ON DELETE SET NULL;
ALTER TABLE web_vitals ADD CONSTRAINT web_vitals_session_id_fkey FOREIGN KEY (`session_id`) REFERENCES analytics_sessions (`id`) ON DELETE CASCADE;
