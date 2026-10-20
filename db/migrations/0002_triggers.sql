-- K-116 · PostgreSQL tetikleyicilerinin MariaDB karşılığı. Üretici: scripts/mysql/gen-triggers.mts — elle düzenlemeyin.
-- migrate.mjs dosyayı tek çok-ifadeli sorgu olarak gönderir; DELIMITER gerekmez (BEGIN … END; sunucuda tek ifade olarak ayrışır).
-- Oturum: @app_uid (auth.uid), @app_role (user_role), @app_kind (service = güvenilir; boş = doğrudan bağlantı, güvenilir),
-- @app_import = 1 iken yan kayıt yazan tetikleyiciler (denetim, slug geçmişi, fiyat geçmişi, touch, profil) susar.
-- set_updated_at tetikleyicileri 0001'de ON UPDATE CURRENT_TIMESTAMP(6) olarak var.
SET NAMES utf8mb4;

CREATE TRIGGER blog_categories_record_slug_change_au AFTER UPDATE ON blog_categories FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) AND NOT (OLD.slug <=> NEW.slug) THEN
    IF JSON_VALUE(OLD.slug, '$.tr') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.tr') <=> JSON_VALUE(NEW.slug, '$.tr')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('blog_category', OLD.id, 'tr', JSON_VALUE(OLD.slug, '$.tr'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'blog_category' AND locale = 'tr' AND old_slug = JSON_VALUE(NEW.slug, '$.tr');
    IF JSON_VALUE(OLD.slug, '$.en') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.en') <=> JSON_VALUE(NEW.slug, '$.en')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('blog_category', OLD.id, 'en', JSON_VALUE(OLD.slug, '$.en'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'blog_category' AND locale = 'en' AND old_slug = JSON_VALUE(NEW.slug, '$.en');
  END IF;
END;

CREATE TRIGGER blog_categories_assign_sort_order_bi BEFORE INSERT ON blog_categories FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM blog_categories);
  END IF;
END;

CREATE TRIGGER blog_posts_record_slug_change_au AFTER UPDATE ON blog_posts FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) AND NOT (OLD.slug <=> NEW.slug) THEN
    IF JSON_VALUE(OLD.slug, '$.tr') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.tr') <=> JSON_VALUE(NEW.slug, '$.tr')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('blog_post', OLD.id, 'tr', JSON_VALUE(OLD.slug, '$.tr'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'blog_post' AND locale = 'tr' AND old_slug = JSON_VALUE(NEW.slug, '$.tr');
    IF JSON_VALUE(OLD.slug, '$.en') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.en') <=> JSON_VALUE(NEW.slug, '$.en')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('blog_post', OLD.id, 'en', JSON_VALUE(OLD.slug, '$.en'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'blog_post' AND locale = 'en' AND old_slug = JSON_VALUE(NEW.slug, '$.en');
  END IF;
END;

CREATE TRIGGER blog_tags_record_slug_change_au AFTER UPDATE ON blog_tags FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) AND NOT (OLD.slug <=> NEW.slug) THEN
    IF JSON_VALUE(OLD.slug, '$.tr') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.tr') <=> JSON_VALUE(NEW.slug, '$.tr')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('blog_tag', OLD.id, 'tr', JSON_VALUE(OLD.slug, '$.tr'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'blog_tag' AND locale = 'tr' AND old_slug = JSON_VALUE(NEW.slug, '$.tr');
    IF JSON_VALUE(OLD.slug, '$.en') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.en') <=> JSON_VALUE(NEW.slug, '$.en')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('blog_tag', OLD.id, 'en', JSON_VALUE(OLD.slug, '$.en'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'blog_tag' AND locale = 'en' AND old_slug = JSON_VALUE(NEW.slug, '$.en');
  END IF;
END;

CREATE TRIGGER certificates_assign_sort_order_bi BEFORE INSERT ON certificates FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM certificates);
  END IF;
END;

CREATE TRIGGER clients_assign_sort_order_bi BEFORE INSERT ON clients FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM clients);
  END IF;
END;

CREATE TRIGGER configurator_pages_record_slug_change_au AFTER UPDATE ON configurator_pages FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) AND NOT (OLD.slug <=> NEW.slug) THEN
    IF JSON_VALUE(OLD.slug, '$.tr') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.tr') <=> JSON_VALUE(NEW.slug, '$.tr')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('configurator_page', OLD.id, 'tr', JSON_VALUE(OLD.slug, '$.tr'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'configurator_page' AND locale = 'tr' AND old_slug = JSON_VALUE(NEW.slug, '$.tr');
    IF JSON_VALUE(OLD.slug, '$.en') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.en') <=> JSON_VALUE(NEW.slug, '$.en')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('configurator_page', OLD.id, 'en', JSON_VALUE(OLD.slug, '$.en'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'configurator_page' AND locale = 'en' AND old_slug = JSON_VALUE(NEW.slug, '$.en');
  END IF;
END;

CREATE TRIGGER configurator_pages_assign_sort_order_bi BEFORE INSERT ON configurator_pages FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM configurator_pages);
  END IF;
END;

CREATE TRIGGER customers_audit_row_ad AFTER DELETE ON customers FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'DELETE', 'customers', OLD.id, JSON_OBJECT('id', OLD.`id`, 'type', OLD.`type`, 'full_name', OLD.`full_name`, 'company_title', OLD.`company_title`, 'tax_office', OLD.`tax_office`, 'tax_id', OLD.`tax_id`, 'address', OLD.`address`, 'city', OLD.`city`, 'district', OLD.`district`, 'email', OLD.`email`, 'phone', OLD.`phone`, 'contact_person', OLD.`contact_person`, 'contact_phone', OLD.`contact_phone`, 'notes', OLD.`notes`, 'source', OLD.`source`, 'profile_id', OLD.`profile_id`, 'is_active', IF(OLD.`is_active` IS NULL, NULL, OLD.`is_active` IS TRUE), 'anonymized_at', DATE_FORMAT(OLD.`anonymized_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'marketing_consent', IF(OLD.`marketing_consent` IS NULL, NULL, OLD.`marketing_consent` IS TRUE), 'marketing_consent_at', DATE_FORMAT(OLD.`marketing_consent_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), NULL);
  END IF;
END;

CREATE TRIGGER customers_audit_row_ai AFTER INSERT ON customers FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'INSERT', 'customers', NEW.id, NULL, JSON_OBJECT('id', NEW.`id`, 'type', NEW.`type`, 'full_name', NEW.`full_name`, 'company_title', NEW.`company_title`, 'tax_office', NEW.`tax_office`, 'tax_id', NEW.`tax_id`, 'address', NEW.`address`, 'city', NEW.`city`, 'district', NEW.`district`, 'email', NEW.`email`, 'phone', NEW.`phone`, 'contact_person', NEW.`contact_person`, 'contact_phone', NEW.`contact_phone`, 'notes', NEW.`notes`, 'source', NEW.`source`, 'profile_id', NEW.`profile_id`, 'is_active', IF(NEW.`is_active` IS NULL, NULL, NEW.`is_active` IS TRUE), 'anonymized_at', DATE_FORMAT(NEW.`anonymized_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'marketing_consent', IF(NEW.`marketing_consent` IS NULL, NULL, NEW.`marketing_consent` IS TRUE), 'marketing_consent_at', DATE_FORMAT(NEW.`marketing_consent_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER customers_audit_row_au AFTER UPDATE ON customers FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'UPDATE', 'customers', NEW.id, JSON_OBJECT('id', OLD.`id`, 'type', OLD.`type`, 'full_name', OLD.`full_name`, 'company_title', OLD.`company_title`, 'tax_office', OLD.`tax_office`, 'tax_id', OLD.`tax_id`, 'address', OLD.`address`, 'city', OLD.`city`, 'district', OLD.`district`, 'email', OLD.`email`, 'phone', OLD.`phone`, 'contact_person', OLD.`contact_person`, 'contact_phone', OLD.`contact_phone`, 'notes', OLD.`notes`, 'source', OLD.`source`, 'profile_id', OLD.`profile_id`, 'is_active', IF(OLD.`is_active` IS NULL, NULL, OLD.`is_active` IS TRUE), 'anonymized_at', DATE_FORMAT(OLD.`anonymized_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'marketing_consent', IF(OLD.`marketing_consent` IS NULL, NULL, OLD.`marketing_consent` IS TRUE), 'marketing_consent_at', DATE_FORMAT(OLD.`marketing_consent_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), JSON_OBJECT('id', NEW.`id`, 'type', NEW.`type`, 'full_name', NEW.`full_name`, 'company_title', NEW.`company_title`, 'tax_office', NEW.`tax_office`, 'tax_id', NEW.`tax_id`, 'address', NEW.`address`, 'city', NEW.`city`, 'district', NEW.`district`, 'email', NEW.`email`, 'phone', NEW.`phone`, 'contact_person', NEW.`contact_person`, 'contact_phone', NEW.`contact_phone`, 'notes', NEW.`notes`, 'source', NEW.`source`, 'profile_id', NEW.`profile_id`, 'is_active', IF(NEW.`is_active` IS NULL, NULL, NEW.`is_active` IS TRUE), 'anonymized_at', DATE_FORMAT(NEW.`anonymized_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'marketing_consent', IF(NEW.`marketing_consent` IS NULL, NULL, NEW.`marketing_consent` IS TRUE), 'marketing_consent_at', DATE_FORMAT(NEW.`marketing_consent_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER email_templates_audit_row_ad AFTER DELETE ON email_templates FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'DELETE', 'email_templates', OLD.id, JSON_OBJECT('id', OLD.`id`, 'key', OLD.`key`, 'name', OLD.`name`, 'subject', JSON_EXTRACT(OLD.`subject`, '$'), 'body', JSON_EXTRACT(OLD.`body`, '$'), 'variables', JSON_EXTRACT(OLD.`variables`, '$'), 'is_active', IF(OLD.`is_active` IS NULL, NULL, OLD.`is_active` IS TRUE), 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), NULL);
  END IF;
END;

CREATE TRIGGER email_templates_audit_row_ai AFTER INSERT ON email_templates FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'INSERT', 'email_templates', NEW.id, NULL, JSON_OBJECT('id', NEW.`id`, 'key', NEW.`key`, 'name', NEW.`name`, 'subject', JSON_EXTRACT(NEW.`subject`, '$'), 'body', JSON_EXTRACT(NEW.`body`, '$'), 'variables', JSON_EXTRACT(NEW.`variables`, '$'), 'is_active', IF(NEW.`is_active` IS NULL, NULL, NEW.`is_active` IS TRUE), 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER email_templates_audit_row_au AFTER UPDATE ON email_templates FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'UPDATE', 'email_templates', NEW.id, JSON_OBJECT('id', OLD.`id`, 'key', OLD.`key`, 'name', OLD.`name`, 'subject', JSON_EXTRACT(OLD.`subject`, '$'), 'body', JSON_EXTRACT(OLD.`body`, '$'), 'variables', JSON_EXTRACT(OLD.`variables`, '$'), 'is_active', IF(OLD.`is_active` IS NULL, NULL, OLD.`is_active` IS TRUE), 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), JSON_OBJECT('id', NEW.`id`, 'key', NEW.`key`, 'name', NEW.`name`, 'subject', JSON_EXTRACT(NEW.`subject`, '$'), 'body', JSON_EXTRACT(NEW.`body`, '$'), 'variables', JSON_EXTRACT(NEW.`variables`, '$'), 'is_active', IF(NEW.`is_active` IS NULL, NULL, NEW.`is_active` IS TRUE), 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER field_videos_audit_row_ad AFTER DELETE ON field_videos FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'DELETE', 'field_videos', OLD.id, JSON_OBJECT('id', OLD.`id`, 'title', JSON_EXTRACT(OLD.`title`, '$'), 'caption', JSON_EXTRACT(OLD.`caption`, '$'), 'source', OLD.`source`, 'youtube_id', OLD.`youtube_id`, 'video_id', OLD.`video_id`, 'poster_id', OLD.`poster_id`, 'is_active', IF(OLD.`is_active` IS NULL, NULL, OLD.`is_active` IS TRUE), 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'sort_order', OLD.`sort_order`), NULL);
  END IF;
END;

CREATE TRIGGER field_videos_audit_row_ai AFTER INSERT ON field_videos FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'INSERT', 'field_videos', NEW.id, NULL, JSON_OBJECT('id', NEW.`id`, 'title', JSON_EXTRACT(NEW.`title`, '$'), 'caption', JSON_EXTRACT(NEW.`caption`, '$'), 'source', NEW.`source`, 'youtube_id', NEW.`youtube_id`, 'video_id', NEW.`video_id`, 'poster_id', NEW.`poster_id`, 'is_active', IF(NEW.`is_active` IS NULL, NULL, NEW.`is_active` IS TRUE), 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'sort_order', NEW.`sort_order`));
  END IF;
END;

CREATE TRIGGER field_videos_audit_row_au AFTER UPDATE ON field_videos FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'UPDATE', 'field_videos', NEW.id, JSON_OBJECT('id', OLD.`id`, 'title', JSON_EXTRACT(OLD.`title`, '$'), 'caption', JSON_EXTRACT(OLD.`caption`, '$'), 'source', OLD.`source`, 'youtube_id', OLD.`youtube_id`, 'video_id', OLD.`video_id`, 'poster_id', OLD.`poster_id`, 'is_active', IF(OLD.`is_active` IS NULL, NULL, OLD.`is_active` IS TRUE), 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'sort_order', OLD.`sort_order`), JSON_OBJECT('id', NEW.`id`, 'title', JSON_EXTRACT(NEW.`title`, '$'), 'caption', JSON_EXTRACT(NEW.`caption`, '$'), 'source', NEW.`source`, 'youtube_id', NEW.`youtube_id`, 'video_id', NEW.`video_id`, 'poster_id', NEW.`poster_id`, 'is_active', IF(NEW.`is_active` IS NULL, NULL, NEW.`is_active` IS TRUE), 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'sort_order', NEW.`sort_order`));
  END IF;
END;

CREATE TRIGGER field_videos_assign_sort_order_bi BEFORE INSERT ON field_videos FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM field_videos);
  END IF;
END;

CREATE TRIGGER invoices_audit_row_ad AFTER DELETE ON invoices FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'DELETE', 'invoices', OLD.id, JSON_OBJECT('id', OLD.`id`, 'invoice_no', OLD.`invoice_no`, 'sale_id', OLD.`sale_id`, 'customer_id', OLD.`customer_id`, 'type', OLD.`type`, 'status', OLD.`status`, 'issue_date', OLD.`issue_date`, 'due_date', OLD.`due_date`, 'currency', OLD.`currency`, 'exchange_rate', OLD.`exchange_rate`, 'base_amount', OLD.`base_amount`, 'vat_rate', OLD.`vat_rate`, 'vat_amount', OLD.`vat_amount`, 'total_amount', OLD.`total_amount`, 'withholding_ratio', OLD.`withholding_ratio`, 'withholding_amount', OLD.`withholding_amount`, 'collectable_amount', OLD.`collectable_amount`, 'notes', OLD.`notes`, 'created_by', OLD.`created_by`, 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), NULL);
  END IF;
END;

CREATE TRIGGER invoices_audit_row_ai AFTER INSERT ON invoices FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'INSERT', 'invoices', NEW.id, NULL, JSON_OBJECT('id', NEW.`id`, 'invoice_no', NEW.`invoice_no`, 'sale_id', NEW.`sale_id`, 'customer_id', NEW.`customer_id`, 'type', NEW.`type`, 'status', NEW.`status`, 'issue_date', NEW.`issue_date`, 'due_date', NEW.`due_date`, 'currency', NEW.`currency`, 'exchange_rate', NEW.`exchange_rate`, 'base_amount', NEW.`base_amount`, 'vat_rate', NEW.`vat_rate`, 'vat_amount', NEW.`vat_amount`, 'total_amount', NEW.`total_amount`, 'withholding_ratio', NEW.`withholding_ratio`, 'withholding_amount', NEW.`withholding_amount`, 'collectable_amount', NEW.`collectable_amount`, 'notes', NEW.`notes`, 'created_by', NEW.`created_by`, 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER invoices_audit_row_au AFTER UPDATE ON invoices FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'UPDATE', 'invoices', NEW.id, JSON_OBJECT('id', OLD.`id`, 'invoice_no', OLD.`invoice_no`, 'sale_id', OLD.`sale_id`, 'customer_id', OLD.`customer_id`, 'type', OLD.`type`, 'status', OLD.`status`, 'issue_date', OLD.`issue_date`, 'due_date', OLD.`due_date`, 'currency', OLD.`currency`, 'exchange_rate', OLD.`exchange_rate`, 'base_amount', OLD.`base_amount`, 'vat_rate', OLD.`vat_rate`, 'vat_amount', OLD.`vat_amount`, 'total_amount', OLD.`total_amount`, 'withholding_ratio', OLD.`withholding_ratio`, 'withholding_amount', OLD.`withholding_amount`, 'collectable_amount', OLD.`collectable_amount`, 'notes', OLD.`notes`, 'created_by', OLD.`created_by`, 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), JSON_OBJECT('id', NEW.`id`, 'invoice_no', NEW.`invoice_no`, 'sale_id', NEW.`sale_id`, 'customer_id', NEW.`customer_id`, 'type', NEW.`type`, 'status', NEW.`status`, 'issue_date', NEW.`issue_date`, 'due_date', NEW.`due_date`, 'currency', NEW.`currency`, 'exchange_rate', NEW.`exchange_rate`, 'base_amount', NEW.`base_amount`, 'vat_rate', NEW.`vat_rate`, 'vat_amount', NEW.`vat_amount`, 'total_amount', NEW.`total_amount`, 'withholding_ratio', NEW.`withholding_ratio`, 'withholding_amount', NEW.`withholding_amount`, 'collectable_amount', NEW.`collectable_amount`, 'notes', NEW.`notes`, 'created_by', NEW.`created_by`, 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER invoices_assign_proforma_no_bi BEFORE INSERT ON invoices FOR EACH ROW
BEGIN
  IF NEW.type = 'proforma' AND (NEW.invoice_no IS NULL OR NEW.invoice_no = '') THEN
  BEGIN
    DECLARE v_no INT;
    INSERT INTO document_counters (prefix, `year`, last_no) VALUES ('PRF', YEAR(COALESCE(NEW.issue_date, CURRENT_DATE)), 1) ON DUPLICATE KEY UPDATE last_no = last_no + 1;
    SELECT last_no INTO v_no FROM document_counters WHERE prefix = 'PRF' AND `year` = YEAR(COALESCE(NEW.issue_date, CURRENT_DATE));
    SET NEW.invoice_no = CONCAT('PRF-', YEAR(COALESCE(NEW.issue_date, CURRENT_DATE)), '-', LPAD(v_no, 4, '0'));
  END;
  END IF;
END;

CREATE TRIGGER job_postings_record_slug_change_au AFTER UPDATE ON job_postings FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) AND NOT (OLD.slug <=> NEW.slug) THEN
    IF JSON_VALUE(OLD.slug, '$.tr') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.tr') <=> JSON_VALUE(NEW.slug, '$.tr')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('job_posting', OLD.id, 'tr', JSON_VALUE(OLD.slug, '$.tr'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'job_posting' AND locale = 'tr' AND old_slug = JSON_VALUE(NEW.slug, '$.tr');
    IF JSON_VALUE(OLD.slug, '$.en') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.en') <=> JSON_VALUE(NEW.slug, '$.en')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('job_posting', OLD.id, 'en', JSON_VALUE(OLD.slug, '$.en'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'job_posting' AND locale = 'en' AND old_slug = JSON_VALUE(NEW.slug, '$.en');
  END IF;
END;

CREATE TRIGGER leads_assign_ref_no_bi BEFORE INSERT ON leads FOR EACH ROW
BEGIN
  IF NEW.ref_no IS NULL THEN
  BEGIN
    DECLARE v_no INT;
    INSERT INTO document_counters (prefix, `year`, last_no) VALUES ('TLP', YEAR(CURRENT_DATE), 1) ON DUPLICATE KEY UPDATE last_no = last_no + 1;
    SELECT last_no INTO v_no FROM document_counters WHERE prefix = 'TLP' AND `year` = YEAR(CURRENT_DATE);
    SET NEW.ref_no = CONCAT('TLP-', YEAR(CURRENT_DATE), '-', LPAD(v_no, 4, '0'));
  END;
  END IF;
END;

CREATE TRIGGER mail_campaign_templates_audit_row_ad AFTER DELETE ON mail_campaign_templates FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'DELETE', 'mail_campaign_templates', OLD.id, JSON_OBJECT('id', OLD.`id`, 'name', OLD.`name`, 'category', OLD.`category`, 'description', OLD.`description`, 'subject', JSON_EXTRACT(OLD.`subject`, '$'), 'preheader', JSON_EXTRACT(OLD.`preheader`, '$'), 'body', JSON_EXTRACT(OLD.`body`, '$'), 'cta_label', JSON_EXTRACT(OLD.`cta_label`, '$'), 'cta_url', JSON_EXTRACT(OLD.`cta_url`, '$'), 'sort_order', OLD.`sort_order`, 'is_active', IF(OLD.`is_active` IS NULL, NULL, OLD.`is_active` IS TRUE), 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), NULL);
  END IF;
END;

CREATE TRIGGER mail_campaign_templates_audit_row_ai AFTER INSERT ON mail_campaign_templates FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'INSERT', 'mail_campaign_templates', NEW.id, NULL, JSON_OBJECT('id', NEW.`id`, 'name', NEW.`name`, 'category', NEW.`category`, 'description', NEW.`description`, 'subject', JSON_EXTRACT(NEW.`subject`, '$'), 'preheader', JSON_EXTRACT(NEW.`preheader`, '$'), 'body', JSON_EXTRACT(NEW.`body`, '$'), 'cta_label', JSON_EXTRACT(NEW.`cta_label`, '$'), 'cta_url', JSON_EXTRACT(NEW.`cta_url`, '$'), 'sort_order', NEW.`sort_order`, 'is_active', IF(NEW.`is_active` IS NULL, NULL, NEW.`is_active` IS TRUE), 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER mail_campaign_templates_audit_row_au AFTER UPDATE ON mail_campaign_templates FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'UPDATE', 'mail_campaign_templates', NEW.id, JSON_OBJECT('id', OLD.`id`, 'name', OLD.`name`, 'category', OLD.`category`, 'description', OLD.`description`, 'subject', JSON_EXTRACT(OLD.`subject`, '$'), 'preheader', JSON_EXTRACT(OLD.`preheader`, '$'), 'body', JSON_EXTRACT(OLD.`body`, '$'), 'cta_label', JSON_EXTRACT(OLD.`cta_label`, '$'), 'cta_url', JSON_EXTRACT(OLD.`cta_url`, '$'), 'sort_order', OLD.`sort_order`, 'is_active', IF(OLD.`is_active` IS NULL, NULL, OLD.`is_active` IS TRUE), 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), JSON_OBJECT('id', NEW.`id`, 'name', NEW.`name`, 'category', NEW.`category`, 'description', NEW.`description`, 'subject', JSON_EXTRACT(NEW.`subject`, '$'), 'preheader', JSON_EXTRACT(NEW.`preheader`, '$'), 'body', JSON_EXTRACT(NEW.`body`, '$'), 'cta_label', JSON_EXTRACT(NEW.`cta_label`, '$'), 'cta_url', JSON_EXTRACT(NEW.`cta_url`, '$'), 'sort_order', NEW.`sort_order`, 'is_active', IF(NEW.`is_active` IS NULL, NULL, NEW.`is_active` IS TRUE), 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER mail_suppressions_audit_row_ad AFTER DELETE ON mail_suppressions FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'DELETE', 'mail_suppressions', OLD.id, JSON_OBJECT('id', OLD.`id`, 'email', OLD.`email`, 'reason', OLD.`reason`, 'campaign_id', OLD.`campaign_id`, 'note', OLD.`note`, 'created_by', OLD.`created_by`, 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), NULL);
  END IF;
END;

CREATE TRIGGER mail_suppressions_audit_row_ai AFTER INSERT ON mail_suppressions FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'INSERT', 'mail_suppressions', NEW.id, NULL, JSON_OBJECT('id', NEW.`id`, 'email', NEW.`email`, 'reason', NEW.`reason`, 'campaign_id', NEW.`campaign_id`, 'note', NEW.`note`, 'created_by', NEW.`created_by`, 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER mail_suppressions_audit_row_au AFTER UPDATE ON mail_suppressions FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'UPDATE', 'mail_suppressions', NEW.id, JSON_OBJECT('id', OLD.`id`, 'email', OLD.`email`, 'reason', OLD.`reason`, 'campaign_id', OLD.`campaign_id`, 'note', OLD.`note`, 'created_by', OLD.`created_by`, 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), JSON_OBJECT('id', NEW.`id`, 'email', NEW.`email`, 'reason', NEW.`reason`, 'campaign_id', NEW.`campaign_id`, 'note', NEW.`note`, 'created_by', NEW.`created_by`, 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER material_prices_audit_row_ad AFTER DELETE ON material_prices FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'DELETE', 'material_prices', OLD.id, JSON_OBJECT('id', OLD.`id`, 'code', OLD.`code`, 'name', JSON_EXTRACT(OLD.`name`, '$'), 'category', OLD.`category`, 'unit', OLD.`unit`, 'unit_price', OLD.`unit_price`, 'currency', OLD.`currency`, 'valid_from', OLD.`valid_from`, 'note', OLD.`note`, 'updated_by', OLD.`updated_by`, 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), NULL);
  END IF;
END;

CREATE TRIGGER material_prices_audit_row_ai AFTER INSERT ON material_prices FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'INSERT', 'material_prices', NEW.id, NULL, JSON_OBJECT('id', NEW.`id`, 'code', NEW.`code`, 'name', JSON_EXTRACT(NEW.`name`, '$'), 'category', NEW.`category`, 'unit', NEW.`unit`, 'unit_price', NEW.`unit_price`, 'currency', NEW.`currency`, 'valid_from', NEW.`valid_from`, 'note', NEW.`note`, 'updated_by', NEW.`updated_by`, 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER material_prices_audit_row_au AFTER UPDATE ON material_prices FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'UPDATE', 'material_prices', NEW.id, JSON_OBJECT('id', OLD.`id`, 'code', OLD.`code`, 'name', JSON_EXTRACT(OLD.`name`, '$'), 'category', OLD.`category`, 'unit', OLD.`unit`, 'unit_price', OLD.`unit_price`, 'currency', OLD.`currency`, 'valid_from', OLD.`valid_from`, 'note', OLD.`note`, 'updated_by', OLD.`updated_by`, 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), JSON_OBJECT('id', NEW.`id`, 'code', NEW.`code`, 'name', JSON_EXTRACT(NEW.`name`, '$'), 'category', NEW.`category`, 'unit', NEW.`unit`, 'unit_price', NEW.`unit_price`, 'currency', NEW.`currency`, 'valid_from', NEW.`valid_from`, 'note', NEW.`note`, 'updated_by', NEW.`updated_by`, 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER material_prices_touch_price_guide_au AFTER UPDATE ON material_prices FOR EACH ROW FOLLOWS material_prices_audit_row_au
BEGIN
  IF NOT (@app_import <=> 1) AND (NOT (OLD.`unit_price` <=> NEW.`unit_price`) OR NOT (OLD.`currency` <=> NEW.`currency`)) THEN
    UPDATE price_guides g SET prices_updated_at = CURRENT_TIMESTAMP(6)
     WHERE EXISTS (SELECT 1 FROM price_guide_rows r WHERE r.price_guide_id = g.id AND r.material_price_id = NEW.id);
  END IF;
END;

CREATE TRIGGER material_prices_history_bu BEFORE UPDATE ON material_prices FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) AND (NOT (OLD.`unit_price` <=> NEW.`unit_price`) OR NOT (OLD.`currency` <=> NEW.`currency`)) THEN
    INSERT INTO material_price_history (material_price_id, unit_price, currency, valid_from, valid_until, changed_by)
    VALUES (OLD.id, OLD.unit_price, OLD.currency, OLD.valid_from, CURRENT_DATE, (SELECT p.id FROM profiles p WHERE p.id = @app_uid));
    IF NEW.valid_from = OLD.valid_from THEN SET NEW.valid_from = CURRENT_DATE; END IF;
  END IF;
END;

CREATE TRIGGER menu_items_assign_sort_order_bi BEFORE INSERT ON menu_items FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM menu_items WHERE menu_id = NEW.menu_id AND parent_id <=> NEW.parent_id);
  END IF;
END;

CREATE TRIGGER panel_types_assign_sort_order_bi BEFORE INSERT ON panel_types FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM panel_types);
  END IF;
END;

CREATE TRIGGER payment_schedules_audit_row_ad AFTER DELETE ON payment_schedules FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'DELETE', 'payment_schedules', OLD.id, JSON_OBJECT('id', OLD.`id`, 'sale_id', OLD.`sale_id`, 'seq', OLD.`seq`, 'description', OLD.`description`, 'ratio_pct', OLD.`ratio_pct`, 'amount', OLD.`amount`, 'due_date', OLD.`due_date`, 'status', OLD.`status`, 'reminder_sent_at', DATE_FORMAT(OLD.`reminder_sent_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), NULL);
  END IF;
END;

CREATE TRIGGER payment_schedules_audit_row_ai AFTER INSERT ON payment_schedules FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'INSERT', 'payment_schedules', NEW.id, NULL, JSON_OBJECT('id', NEW.`id`, 'sale_id', NEW.`sale_id`, 'seq', NEW.`seq`, 'description', NEW.`description`, 'ratio_pct', NEW.`ratio_pct`, 'amount', NEW.`amount`, 'due_date', NEW.`due_date`, 'status', NEW.`status`, 'reminder_sent_at', DATE_FORMAT(NEW.`reminder_sent_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER payment_schedules_audit_row_au AFTER UPDATE ON payment_schedules FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'UPDATE', 'payment_schedules', NEW.id, JSON_OBJECT('id', OLD.`id`, 'sale_id', OLD.`sale_id`, 'seq', OLD.`seq`, 'description', OLD.`description`, 'ratio_pct', OLD.`ratio_pct`, 'amount', OLD.`amount`, 'due_date', OLD.`due_date`, 'status', OLD.`status`, 'reminder_sent_at', DATE_FORMAT(OLD.`reminder_sent_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), JSON_OBJECT('id', NEW.`id`, 'sale_id', NEW.`sale_id`, 'seq', NEW.`seq`, 'description', NEW.`description`, 'ratio_pct', NEW.`ratio_pct`, 'amount', NEW.`amount`, 'due_date', NEW.`due_date`, 'status', NEW.`status`, 'reminder_sent_at', DATE_FORMAT(NEW.`reminder_sent_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER payments_audit_row_ad AFTER DELETE ON payments FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'DELETE', 'payments', OLD.id, JSON_OBJECT('id', OLD.`id`, 'sale_id', OLD.`sale_id`, 'invoice_id', OLD.`invoice_id`, 'schedule_id', OLD.`schedule_id`, 'paid_on', OLD.`paid_on`, 'amount', OLD.`amount`, 'currency', OLD.`currency`, 'exchange_rate', OLD.`exchange_rate`, 'amount_try', OLD.`amount_try`, 'method', OLD.`method`, 'reference', OLD.`reference`, 'notes', OLD.`notes`, 'recorded_by', OLD.`recorded_by`, 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), NULL);
  END IF;
END;

CREATE TRIGGER payments_audit_row_ai AFTER INSERT ON payments FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'INSERT', 'payments', NEW.id, NULL, JSON_OBJECT('id', NEW.`id`, 'sale_id', NEW.`sale_id`, 'invoice_id', NEW.`invoice_id`, 'schedule_id', NEW.`schedule_id`, 'paid_on', NEW.`paid_on`, 'amount', NEW.`amount`, 'currency', NEW.`currency`, 'exchange_rate', NEW.`exchange_rate`, 'amount_try', NEW.`amount_try`, 'method', NEW.`method`, 'reference', NEW.`reference`, 'notes', NEW.`notes`, 'recorded_by', NEW.`recorded_by`, 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER payments_audit_row_au AFTER UPDATE ON payments FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'UPDATE', 'payments', NEW.id, JSON_OBJECT('id', OLD.`id`, 'sale_id', OLD.`sale_id`, 'invoice_id', OLD.`invoice_id`, 'schedule_id', OLD.`schedule_id`, 'paid_on', OLD.`paid_on`, 'amount', OLD.`amount`, 'currency', OLD.`currency`, 'exchange_rate', OLD.`exchange_rate`, 'amount_try', OLD.`amount_try`, 'method', OLD.`method`, 'reference', OLD.`reference`, 'notes', OLD.`notes`, 'recorded_by', OLD.`recorded_by`, 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), JSON_OBJECT('id', NEW.`id`, 'sale_id', NEW.`sale_id`, 'invoice_id', NEW.`invoice_id`, 'schedule_id', NEW.`schedule_id`, 'paid_on', NEW.`paid_on`, 'amount', NEW.`amount`, 'currency', NEW.`currency`, 'exchange_rate', NEW.`exchange_rate`, 'amount_try', NEW.`amount_try`, 'method', NEW.`method`, 'reference', NEW.`reference`, 'notes', NEW.`notes`, 'recorded_by', NEW.`recorded_by`, 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER post_comments_single_level_bi BEFORE INSERT ON post_comments FOR EACH ROW
BEGIN
  IF NEW.parent_id IS NOT NULL AND EXISTS (SELECT 1 FROM post_comments c WHERE c.id = NEW.parent_id AND (c.parent_id IS NOT NULL OR c.post_id <> NEW.post_id)) THEN
    SIGNAL SQLSTATE '23514' SET MESSAGE_TEXT = 'Yorum yanıtları tek seviyedir ve aynı yazıya ait olmalıdır';
  END IF;
END;

CREATE TRIGGER post_comments_single_level_bu BEFORE UPDATE ON post_comments FOR EACH ROW
BEGIN
  IF NEW.parent_id IS NOT NULL AND EXISTS (SELECT 1 FROM post_comments c WHERE c.id = NEW.parent_id AND (c.parent_id IS NOT NULL OR c.post_id <> NEW.post_id)) THEN
    SIGNAL SQLSTATE '23514' SET MESSAGE_TEXT = 'Yorum yanıtları tek seviyedir ve aynı yazıya ait olmalıdır';
  END IF;
END;

CREATE TRIGGER price_guide_rows_touch_price_guide_ad AFTER DELETE ON price_guide_rows FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    UPDATE price_guides SET prices_updated_at = CURRENT_TIMESTAMP(6) WHERE id = OLD.price_guide_id;
  END IF;
END;

CREATE TRIGGER price_guide_rows_touch_price_guide_ai AFTER INSERT ON price_guide_rows FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    UPDATE price_guides SET prices_updated_at = CURRENT_TIMESTAMP(6) WHERE id = NEW.price_guide_id;
  END IF;
END;

CREATE TRIGGER price_guide_rows_touch_price_guide_au AFTER UPDATE ON price_guide_rows FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    UPDATE price_guides SET prices_updated_at = CURRENT_TIMESTAMP(6) WHERE id = NEW.price_guide_id;
  END IF;
END;

CREATE TRIGGER price_guide_rows_assign_sort_order_bi BEFORE INSERT ON price_guide_rows FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM price_guide_rows WHERE `price_guide_id` <=> NEW.`price_guide_id`);
  END IF;
END;

CREATE TRIGGER price_guides_record_slug_change_au AFTER UPDATE ON price_guides FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) AND NOT (OLD.slug <=> NEW.slug) THEN
    IF JSON_VALUE(OLD.slug, '$.tr') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.tr') <=> JSON_VALUE(NEW.slug, '$.tr')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('price_guide', OLD.id, 'tr', JSON_VALUE(OLD.slug, '$.tr'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'price_guide' AND locale = 'tr' AND old_slug = JSON_VALUE(NEW.slug, '$.tr');
    IF JSON_VALUE(OLD.slug, '$.en') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.en') <=> JSON_VALUE(NEW.slug, '$.en')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('price_guide', OLD.id, 'en', JSON_VALUE(OLD.slug, '$.en'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'price_guide' AND locale = 'en' AND old_slug = JSON_VALUE(NEW.slug, '$.en');
  END IF;
END;

CREATE TRIGGER price_guides_assign_sort_order_bi BEFORE INSERT ON price_guides FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM price_guides);
  END IF;
END;

CREATE TRIGGER product_categories_record_slug_change_au AFTER UPDATE ON product_categories FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) AND NOT (OLD.slug <=> NEW.slug) THEN
    IF JSON_VALUE(OLD.slug, '$.tr') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.tr') <=> JSON_VALUE(NEW.slug, '$.tr')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('product_category', OLD.id, 'tr', JSON_VALUE(OLD.slug, '$.tr'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'product_category' AND locale = 'tr' AND old_slug = JSON_VALUE(NEW.slug, '$.tr');
    IF JSON_VALUE(OLD.slug, '$.en') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.en') <=> JSON_VALUE(NEW.slug, '$.en')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('product_category', OLD.id, 'en', JSON_VALUE(OLD.slug, '$.en'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'product_category' AND locale = 'en' AND old_slug = JSON_VALUE(NEW.slug, '$.en');
  END IF;
END;

CREATE TRIGGER product_categories_assign_sort_order_bi BEFORE INSERT ON product_categories FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM product_categories WHERE `parent_id` <=> NEW.`parent_id`);
  END IF;
END;

CREATE TRIGGER product_documents_assign_sort_order_bi BEFORE INSERT ON product_documents FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM product_documents WHERE `product_id` <=> NEW.`product_id`);
  END IF;
END;

CREATE TRIGGER product_images_assign_sort_order_bi BEFORE INSERT ON product_images FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM product_images WHERE `product_id` <=> NEW.`product_id`);
  END IF;
END;

CREATE TRIGGER product_specs_assign_sort_order_bi BEFORE INSERT ON product_specs FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM product_specs WHERE `product_id` <=> NEW.`product_id`);
  END IF;
END;

CREATE TRIGGER product_variants_assign_sort_order_bi BEFORE INSERT ON product_variants FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM product_variants WHERE `product_id` <=> NEW.`product_id`);
  END IF;
END;

CREATE TRIGGER products_record_slug_change_au AFTER UPDATE ON products FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) AND NOT (OLD.slug <=> NEW.slug) THEN
    IF JSON_VALUE(OLD.slug, '$.tr') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.tr') <=> JSON_VALUE(NEW.slug, '$.tr')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('product', OLD.id, 'tr', JSON_VALUE(OLD.slug, '$.tr'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'product' AND locale = 'tr' AND old_slug = JSON_VALUE(NEW.slug, '$.tr');
    IF JSON_VALUE(OLD.slug, '$.en') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.en') <=> JSON_VALUE(NEW.slug, '$.en')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('product', OLD.id, 'en', JSON_VALUE(OLD.slug, '$.en'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'product' AND locale = 'en' AND old_slug = JSON_VALUE(NEW.slug, '$.en');
  END IF;
END;

CREATE TRIGGER products_assign_sort_order_bi BEFORE INSERT ON products FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM products);
  END IF;
END;

CREATE TRIGGER profiles_audit_row_ad AFTER DELETE ON profiles FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'DELETE', 'profiles', OLD.id, JSON_OBJECT('id', OLD.`id`, 'full_name', OLD.`full_name`, 'phone', OLD.`phone`, 'avatar_id', OLD.`avatar_id`, 'role', OLD.`role`, 'is_active', IF(OLD.`is_active` IS NULL, NULL, OLD.`is_active` IS TRUE), 'must_change_password', IF(OLD.`must_change_password` IS NULL, NULL, OLD.`must_change_password` IS TRUE), 'preferred_locale', OLD.`preferred_locale`, 'notification_prefs', JSON_EXTRACT(OLD.`notification_prefs`, '$'), 'last_seen_at', DATE_FORMAT(OLD.`last_seen_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'saved_basket', JSON_EXTRACT(OLD.`saved_basket`, '$')), NULL);
  END IF;
END;

CREATE TRIGGER profiles_audit_row_ai AFTER INSERT ON profiles FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'INSERT', 'profiles', NEW.id, NULL, JSON_OBJECT('id', NEW.`id`, 'full_name', NEW.`full_name`, 'phone', NEW.`phone`, 'avatar_id', NEW.`avatar_id`, 'role', NEW.`role`, 'is_active', IF(NEW.`is_active` IS NULL, NULL, NEW.`is_active` IS TRUE), 'must_change_password', IF(NEW.`must_change_password` IS NULL, NULL, NEW.`must_change_password` IS TRUE), 'preferred_locale', NEW.`preferred_locale`, 'notification_prefs', JSON_EXTRACT(NEW.`notification_prefs`, '$'), 'last_seen_at', DATE_FORMAT(NEW.`last_seen_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'saved_basket', JSON_EXTRACT(NEW.`saved_basket`, '$')));
  END IF;
END;

CREATE TRIGGER profiles_audit_row_update_au AFTER UPDATE ON profiles FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) AND NOT (OLD.`id` <=> NEW.`id` AND OLD.`full_name` <=> NEW.`full_name` COLLATE utf8mb4_bin AND OLD.`phone` <=> NEW.`phone` COLLATE utf8mb4_bin AND OLD.`avatar_id` <=> NEW.`avatar_id` AND OLD.`role` <=> NEW.`role` COLLATE utf8mb4_bin AND OLD.`is_active` <=> NEW.`is_active` AND OLD.`must_change_password` <=> NEW.`must_change_password` AND OLD.`preferred_locale` <=> NEW.`preferred_locale` COLLATE utf8mb4_bin AND OLD.`notification_prefs` <=> NEW.`notification_prefs` AND OLD.`created_at` <=> NEW.`created_at`) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'UPDATE', 'profiles', NEW.id, JSON_OBJECT('id', OLD.`id`, 'full_name', OLD.`full_name`, 'phone', OLD.`phone`, 'avatar_id', OLD.`avatar_id`, 'role', OLD.`role`, 'is_active', IF(OLD.`is_active` IS NULL, NULL, OLD.`is_active` IS TRUE), 'must_change_password', IF(OLD.`must_change_password` IS NULL, NULL, OLD.`must_change_password` IS TRUE), 'preferred_locale', OLD.`preferred_locale`, 'notification_prefs', JSON_EXTRACT(OLD.`notification_prefs`, '$'), 'last_seen_at', DATE_FORMAT(OLD.`last_seen_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'saved_basket', JSON_EXTRACT(OLD.`saved_basket`, '$')), JSON_OBJECT('id', NEW.`id`, 'full_name', NEW.`full_name`, 'phone', NEW.`phone`, 'avatar_id', NEW.`avatar_id`, 'role', NEW.`role`, 'is_active', IF(NEW.`is_active` IS NULL, NULL, NEW.`is_active` IS TRUE), 'must_change_password', IF(NEW.`must_change_password` IS NULL, NULL, NEW.`must_change_password` IS TRUE), 'preferred_locale', NEW.`preferred_locale`, 'notification_prefs', JSON_EXTRACT(NEW.`notification_prefs`, '$'), 'last_seen_at', DATE_FORMAT(NEW.`last_seen_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'saved_basket', JSON_EXTRACT(NEW.`saved_basket`, '$')));
  END IF;
END;

CREATE TRIGGER profiles_guard_privileges_bu BEFORE UPDATE ON profiles FOR EACH ROW
BEGIN
  IF NOT (OLD.`role` <=> NEW.`role`) OR NOT (OLD.`is_active` <=> NEW.`is_active`) THEN
    IF NOT ((COALESCE(@app_kind, 'service') = 'service') OR COALESCE(@app_role IN ('super_admin'), FALSE)) THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Rol ve aktiflik yalnız super_admin tarafından değiştirilebilir';
    END IF;
    IF OLD.role = 'super_admin' AND OLD.is_active AND (NEW.role <> 'super_admin' OR NOT NEW.is_active)
       AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.role = 'super_admin' AND p.is_active AND p.id <> OLD.id) THEN
      SIGNAL SQLSTATE '23514' SET MESSAGE_TEXT = 'Son aktif super_admin devre dışı bırakılamaz';
    END IF;
  END IF;
END;

CREATE TRIGGER project_categories_record_slug_change_au AFTER UPDATE ON project_categories FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) AND NOT (OLD.slug <=> NEW.slug) THEN
    IF JSON_VALUE(OLD.slug, '$.tr') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.tr') <=> JSON_VALUE(NEW.slug, '$.tr')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('project_category', OLD.id, 'tr', JSON_VALUE(OLD.slug, '$.tr'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'project_category' AND locale = 'tr' AND old_slug = JSON_VALUE(NEW.slug, '$.tr');
    IF JSON_VALUE(OLD.slug, '$.en') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.en') <=> JSON_VALUE(NEW.slug, '$.en')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('project_category', OLD.id, 'en', JSON_VALUE(OLD.slug, '$.en'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'project_category' AND locale = 'en' AND old_slug = JSON_VALUE(NEW.slug, '$.en');
  END IF;
END;

CREATE TRIGGER project_categories_assign_sort_order_bi BEFORE INSERT ON project_categories FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM project_categories);
  END IF;
END;

CREATE TRIGGER project_images_assign_sort_order_bi BEFORE INSERT ON project_images FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM project_images WHERE `project_id` <=> NEW.`project_id`);
  END IF;
END;

CREATE TRIGGER projects_record_slug_change_au AFTER UPDATE ON projects FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) AND NOT (OLD.slug <=> NEW.slug) THEN
    IF JSON_VALUE(OLD.slug, '$.tr') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.tr') <=> JSON_VALUE(NEW.slug, '$.tr')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('project', OLD.id, 'tr', JSON_VALUE(OLD.slug, '$.tr'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'project' AND locale = 'tr' AND old_slug = JSON_VALUE(NEW.slug, '$.tr');
    IF JSON_VALUE(OLD.slug, '$.en') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.en') <=> JSON_VALUE(NEW.slug, '$.en')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('project', OLD.id, 'en', JSON_VALUE(OLD.slug, '$.en'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'project' AND locale = 'en' AND old_slug = JSON_VALUE(NEW.slug, '$.en');
  END IF;
END;

CREATE TRIGGER projects_assign_sort_order_bi BEFORE INSERT ON projects FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM projects);
  END IF;
END;

CREATE TRIGGER sale_expenses_audit_row_ad AFTER DELETE ON sale_expenses FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'DELETE', 'sale_expenses', OLD.id, JSON_OBJECT('id', OLD.`id`, 'sale_id', OLD.`sale_id`, 'category', OLD.`category`, 'description', OLD.`description`, 'amount', OLD.`amount`, 'expense_date', OLD.`expense_date`, 'sort_order', OLD.`sort_order`, 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), NULL);
  END IF;
END;

CREATE TRIGGER sale_expenses_audit_row_ai AFTER INSERT ON sale_expenses FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'INSERT', 'sale_expenses', NEW.id, NULL, JSON_OBJECT('id', NEW.`id`, 'sale_id', NEW.`sale_id`, 'category', NEW.`category`, 'description', NEW.`description`, 'amount', NEW.`amount`, 'expense_date', NEW.`expense_date`, 'sort_order', NEW.`sort_order`, 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER sale_expenses_audit_row_au AFTER UPDATE ON sale_expenses FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'UPDATE', 'sale_expenses', NEW.id, JSON_OBJECT('id', OLD.`id`, 'sale_id', OLD.`sale_id`, 'category', OLD.`category`, 'description', OLD.`description`, 'amount', OLD.`amount`, 'expense_date', OLD.`expense_date`, 'sort_order', OLD.`sort_order`, 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), JSON_OBJECT('id', NEW.`id`, 'sale_id', NEW.`sale_id`, 'category', NEW.`category`, 'description', NEW.`description`, 'amount', NEW.`amount`, 'expense_date', NEW.`expense_date`, 'sort_order', NEW.`sort_order`, 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER sale_items_audit_row_ad AFTER DELETE ON sale_items FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'DELETE', 'sale_items', OLD.id, JSON_OBJECT('id', OLD.`id`, 'sale_id', OLD.`sale_id`, 'service_id', OLD.`service_id`, 'product_id', OLD.`product_id`, 'description', OLD.`description`, 'quantity', OLD.`quantity`, 'unit', OLD.`unit`, 'unit_price', OLD.`unit_price`, 'line_total', OLD.`line_total`, 'unit_cost', OLD.`unit_cost`, 'line_cost', OLD.`line_cost`, 'line_profit', OLD.`line_profit`, 'sort_order', OLD.`sort_order`, 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), NULL);
  END IF;
END;

CREATE TRIGGER sale_items_audit_row_ai AFTER INSERT ON sale_items FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'INSERT', 'sale_items', NEW.id, NULL, JSON_OBJECT('id', NEW.`id`, 'sale_id', NEW.`sale_id`, 'service_id', NEW.`service_id`, 'product_id', NEW.`product_id`, 'description', NEW.`description`, 'quantity', NEW.`quantity`, 'unit', NEW.`unit`, 'unit_price', NEW.`unit_price`, 'line_total', NEW.`line_total`, 'unit_cost', NEW.`unit_cost`, 'line_cost', NEW.`line_cost`, 'line_profit', NEW.`line_profit`, 'sort_order', NEW.`sort_order`, 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER sale_items_audit_row_au AFTER UPDATE ON sale_items FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'UPDATE', 'sale_items', NEW.id, JSON_OBJECT('id', OLD.`id`, 'sale_id', OLD.`sale_id`, 'service_id', OLD.`service_id`, 'product_id', OLD.`product_id`, 'description', OLD.`description`, 'quantity', OLD.`quantity`, 'unit', OLD.`unit`, 'unit_price', OLD.`unit_price`, 'line_total', OLD.`line_total`, 'unit_cost', OLD.`unit_cost`, 'line_cost', OLD.`line_cost`, 'line_profit', OLD.`line_profit`, 'sort_order', OLD.`sort_order`, 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), JSON_OBJECT('id', NEW.`id`, 'sale_id', NEW.`sale_id`, 'service_id', NEW.`service_id`, 'product_id', NEW.`product_id`, 'description', NEW.`description`, 'quantity', NEW.`quantity`, 'unit', NEW.`unit`, 'unit_price', NEW.`unit_price`, 'line_total', NEW.`line_total`, 'unit_cost', NEW.`unit_cost`, 'line_cost', NEW.`line_cost`, 'line_profit', NEW.`line_profit`, 'sort_order', NEW.`sort_order`, 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER sale_items_guard_write_bd BEFORE DELETE ON sale_items FOR EACH ROW
BEGIN
  IF NOT ((COALESCE(@app_kind, 'service') = 'service') OR COALESCE(@app_role IN ('super_admin', 'admin'), FALSE)) THEN
    IF NOT COALESCE(@app_role IN ('sales'), FALSE) THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Satış kaydı yazma yetkiniz yok';
    END IF;
  END IF;
END;

CREATE TRIGGER sale_items_guard_write_bi BEFORE INSERT ON sale_items FOR EACH ROW
BEGIN
  IF NOT ((COALESCE(@app_kind, 'service') = 'service') OR COALESCE(@app_role IN ('super_admin', 'admin'), FALSE)) THEN
    IF NOT COALESCE(@app_role IN ('sales'), FALSE) THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Satış kaydı yazma yetkiniz yok';
    END IF;
    IF NEW.unit_cost IS NOT NULL THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Maliyet ve kâr alanlarını yalnız yönetici yazabilir (unit_cost)';
    END IF;
    IF NEW.line_cost IS NOT NULL THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Maliyet ve kâr alanlarını yalnız yönetici yazabilir (line_cost)';
    END IF;
    IF NEW.line_profit IS NOT NULL THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Maliyet ve kâr alanlarını yalnız yönetici yazabilir (line_profit)';
    END IF;
  END IF;
END;

CREATE TRIGGER sale_items_guard_write_bu BEFORE UPDATE ON sale_items FOR EACH ROW
BEGIN
  IF NOT ((COALESCE(@app_kind, 'service') = 'service') OR COALESCE(@app_role IN ('super_admin', 'admin'), FALSE)) THEN
    IF NOT COALESCE(@app_role IN ('sales'), FALSE) THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Satış kaydı yazma yetkiniz yok';
    END IF;
    IF NEW.unit_cost IS NOT NULL AND NOT (OLD.`unit_cost` <=> NEW.`unit_cost`) THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Maliyet ve kâr alanlarını yalnız yönetici yazabilir (unit_cost)';
    END IF;
    IF NEW.line_cost IS NOT NULL AND NOT (OLD.`line_cost` <=> NEW.`line_cost`) THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Maliyet ve kâr alanlarını yalnız yönetici yazabilir (line_cost)';
    END IF;
    IF NEW.line_profit IS NOT NULL AND NOT (OLD.`line_profit` <=> NEW.`line_profit`) THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Maliyet ve kâr alanlarını yalnız yönetici yazabilir (line_profit)';
    END IF;
  END IF;
END;

CREATE TRIGGER sales_audit_row_ad AFTER DELETE ON sales FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'DELETE', 'sales', OLD.id, JSON_OBJECT('id', OLD.`id`, 'sale_no', OLD.`sale_no`, 'customer_id', OLD.`customer_id`, 'lead_id', OLD.`lead_id`, 'configuration_id', OLD.`configuration_id`, 'project_id', OLD.`project_id`, 'sale_date', OLD.`sale_date`, 'status', OLD.`status`, 'currency', OLD.`currency`, 'exchange_rate', OLD.`exchange_rate`, 'exchange_rate_date', OLD.`exchange_rate_date`, 'exchange_rate_source', OLD.`exchange_rate_source`, 'subtotal', OLD.`subtotal`, 'discount_pct', OLD.`discount_pct`, 'discount_amount', OLD.`discount_amount`, 'is_invoiced', IF(OLD.`is_invoiced` IS NULL, NULL, OLD.`is_invoiced` IS TRUE), 'vat_rate', OLD.`vat_rate`, 'vat_amount', OLD.`vat_amount`, 'grand_total', OLD.`grand_total`, 'grand_total_try', OLD.`grand_total_try`, 'total_cost', OLD.`total_cost`, 'gross_profit', OLD.`gross_profit`, 'margin_pct', OLD.`margin_pct`, 'notes', OLD.`notes`, 'assigned_to', OLD.`assigned_to`, 'created_by', OLD.`created_by`, 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), NULL);
  END IF;
END;

CREATE TRIGGER sales_audit_row_ai AFTER INSERT ON sales FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'INSERT', 'sales', NEW.id, NULL, JSON_OBJECT('id', NEW.`id`, 'sale_no', NEW.`sale_no`, 'customer_id', NEW.`customer_id`, 'lead_id', NEW.`lead_id`, 'configuration_id', NEW.`configuration_id`, 'project_id', NEW.`project_id`, 'sale_date', NEW.`sale_date`, 'status', NEW.`status`, 'currency', NEW.`currency`, 'exchange_rate', NEW.`exchange_rate`, 'exchange_rate_date', NEW.`exchange_rate_date`, 'exchange_rate_source', NEW.`exchange_rate_source`, 'subtotal', NEW.`subtotal`, 'discount_pct', NEW.`discount_pct`, 'discount_amount', NEW.`discount_amount`, 'is_invoiced', IF(NEW.`is_invoiced` IS NULL, NULL, NEW.`is_invoiced` IS TRUE), 'vat_rate', NEW.`vat_rate`, 'vat_amount', NEW.`vat_amount`, 'grand_total', NEW.`grand_total`, 'grand_total_try', NEW.`grand_total_try`, 'total_cost', NEW.`total_cost`, 'gross_profit', NEW.`gross_profit`, 'margin_pct', NEW.`margin_pct`, 'notes', NEW.`notes`, 'assigned_to', NEW.`assigned_to`, 'created_by', NEW.`created_by`, 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER sales_audit_row_au AFTER UPDATE ON sales FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'UPDATE', 'sales', NEW.id, JSON_OBJECT('id', OLD.`id`, 'sale_no', OLD.`sale_no`, 'customer_id', OLD.`customer_id`, 'lead_id', OLD.`lead_id`, 'configuration_id', OLD.`configuration_id`, 'project_id', OLD.`project_id`, 'sale_date', OLD.`sale_date`, 'status', OLD.`status`, 'currency', OLD.`currency`, 'exchange_rate', OLD.`exchange_rate`, 'exchange_rate_date', OLD.`exchange_rate_date`, 'exchange_rate_source', OLD.`exchange_rate_source`, 'subtotal', OLD.`subtotal`, 'discount_pct', OLD.`discount_pct`, 'discount_amount', OLD.`discount_amount`, 'is_invoiced', IF(OLD.`is_invoiced` IS NULL, NULL, OLD.`is_invoiced` IS TRUE), 'vat_rate', OLD.`vat_rate`, 'vat_amount', OLD.`vat_amount`, 'grand_total', OLD.`grand_total`, 'grand_total_try', OLD.`grand_total_try`, 'total_cost', OLD.`total_cost`, 'gross_profit', OLD.`gross_profit`, 'margin_pct', OLD.`margin_pct`, 'notes', OLD.`notes`, 'assigned_to', OLD.`assigned_to`, 'created_by', OLD.`created_by`, 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), JSON_OBJECT('id', NEW.`id`, 'sale_no', NEW.`sale_no`, 'customer_id', NEW.`customer_id`, 'lead_id', NEW.`lead_id`, 'configuration_id', NEW.`configuration_id`, 'project_id', NEW.`project_id`, 'sale_date', NEW.`sale_date`, 'status', NEW.`status`, 'currency', NEW.`currency`, 'exchange_rate', NEW.`exchange_rate`, 'exchange_rate_date', NEW.`exchange_rate_date`, 'exchange_rate_source', NEW.`exchange_rate_source`, 'subtotal', NEW.`subtotal`, 'discount_pct', NEW.`discount_pct`, 'discount_amount', NEW.`discount_amount`, 'is_invoiced', IF(NEW.`is_invoiced` IS NULL, NULL, NEW.`is_invoiced` IS TRUE), 'vat_rate', NEW.`vat_rate`, 'vat_amount', NEW.`vat_amount`, 'grand_total', NEW.`grand_total`, 'grand_total_try', NEW.`grand_total_try`, 'total_cost', NEW.`total_cost`, 'gross_profit', NEW.`gross_profit`, 'margin_pct', NEW.`margin_pct`, 'notes', NEW.`notes`, 'assigned_to', NEW.`assigned_to`, 'created_by', NEW.`created_by`, 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER sales_guard_write_bd BEFORE DELETE ON sales FOR EACH ROW
BEGIN
  IF NOT ((COALESCE(@app_kind, 'service') = 'service') OR COALESCE(@app_role IN ('super_admin', 'admin'), FALSE)) THEN
    IF NOT COALESCE(@app_role IN ('sales'), FALSE) THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Satış kaydı yazma yetkiniz yok';
    END IF;
    SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Satış kaydını yalnız yönetici silebilir';
  END IF;
END;

CREATE TRIGGER sales_assign_no_bi BEFORE INSERT ON sales FOR EACH ROW
BEGIN
  IF NEW.sale_no IS NULL OR NEW.sale_no = '' THEN
  BEGIN
    DECLARE v_no INT;
    INSERT INTO document_counters (prefix, `year`, last_no) VALUES ('SAT', YEAR(NEW.sale_date), 1) ON DUPLICATE KEY UPDATE last_no = last_no + 1;
    SELECT last_no INTO v_no FROM document_counters WHERE prefix = 'SAT' AND `year` = YEAR(NEW.sale_date);
    SET NEW.sale_no = CONCAT('SAT-', YEAR(NEW.sale_date), '-', LPAD(v_no, 4, '0'));
  END;
  END IF;
END;

CREATE TRIGGER sales_guard_write_bi BEFORE INSERT ON sales FOR EACH ROW FOLLOWS sales_assign_no_bi
BEGIN
  IF NOT ((COALESCE(@app_kind, 'service') = 'service') OR COALESCE(@app_role IN ('super_admin', 'admin'), FALSE)) THEN
    IF NOT COALESCE(@app_role IN ('sales'), FALSE) THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Satış kaydı yazma yetkiniz yok';
    END IF;
    IF NEW.total_cost IS NOT NULL THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Maliyet ve kâr alanlarını yalnız yönetici yazabilir (total_cost)';
    END IF;
    IF NEW.gross_profit IS NOT NULL THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Maliyet ve kâr alanlarını yalnız yönetici yazabilir (gross_profit)';
    END IF;
    IF NEW.margin_pct IS NOT NULL THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Maliyet ve kâr alanlarını yalnız yönetici yazabilir (margin_pct)';
    END IF;
  END IF;
END;

CREATE TRIGGER sales_guard_write_bu BEFORE UPDATE ON sales FOR EACH ROW
BEGIN
  IF NOT ((COALESCE(@app_kind, 'service') = 'service') OR COALESCE(@app_role IN ('super_admin', 'admin'), FALSE)) THEN
    IF NOT COALESCE(@app_role IN ('sales'), FALSE) THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Satış kaydı yazma yetkiniz yok';
    END IF;
    IF NEW.total_cost IS NOT NULL AND NOT (OLD.`total_cost` <=> NEW.`total_cost`) THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Maliyet ve kâr alanlarını yalnız yönetici yazabilir (total_cost)';
    END IF;
    IF NEW.gross_profit IS NOT NULL AND NOT (OLD.`gross_profit` <=> NEW.`gross_profit`) THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Maliyet ve kâr alanlarını yalnız yönetici yazabilir (gross_profit)';
    END IF;
    IF NEW.margin_pct IS NOT NULL AND NOT (OLD.`margin_pct` <=> NEW.`margin_pct`) THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Maliyet ve kâr alanlarını yalnız yönetici yazabilir (margin_pct)';
    END IF;
  END IF;
END;

CREATE TRIGGER service_images_assign_sort_order_bi BEFORE INSERT ON service_images FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM service_images WHERE `service_id` <=> NEW.`service_id`);
  END IF;
END;

CREATE TRIGGER services_record_slug_change_au AFTER UPDATE ON services FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) AND NOT (OLD.slug <=> NEW.slug) THEN
    IF JSON_VALUE(OLD.slug, '$.tr') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.tr') <=> JSON_VALUE(NEW.slug, '$.tr')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('service', OLD.id, 'tr', JSON_VALUE(OLD.slug, '$.tr'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'service' AND locale = 'tr' AND old_slug = JSON_VALUE(NEW.slug, '$.tr');
    IF JSON_VALUE(OLD.slug, '$.en') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.en') <=> JSON_VALUE(NEW.slug, '$.en')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('service', OLD.id, 'en', JSON_VALUE(OLD.slug, '$.en'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'service' AND locale = 'en' AND old_slug = JSON_VALUE(NEW.slug, '$.en');
  END IF;
END;

CREATE TRIGGER services_assign_sort_order_bi BEFORE INSERT ON services FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM services);
  END IF;
END;

CREATE TRIGGER site_settings_audit_row_ad AFTER DELETE ON site_settings FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'DELETE', 'site_settings', OLD.id, JSON_OBJECT('id', OLD.`id`, 'key', OLD.`key`, 'value', JSON_EXTRACT(OLD.`value`, '$'), 'is_public', IF(OLD.`is_public` IS NULL, NULL, OLD.`is_public` IS TRUE), 'description', OLD.`description`, 'updated_by', OLD.`updated_by`, 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), NULL);
  END IF;
END;

CREATE TRIGGER site_settings_audit_row_ai AFTER INSERT ON site_settings FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'INSERT', 'site_settings', NEW.id, NULL, JSON_OBJECT('id', NEW.`id`, 'key', NEW.`key`, 'value', JSON_EXTRACT(NEW.`value`, '$'), 'is_public', IF(NEW.`is_public` IS NULL, NULL, NEW.`is_public` IS TRUE), 'description', NEW.`description`, 'updated_by', NEW.`updated_by`, 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER site_settings_audit_row_au AFTER UPDATE ON site_settings FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES ((SELECT p.id FROM profiles p WHERE p.id = @app_uid), 'UPDATE', 'site_settings', NEW.id, JSON_OBJECT('id', OLD.`id`, 'key', OLD.`key`, 'value', JSON_EXTRACT(OLD.`value`, '$'), 'is_public', IF(OLD.`is_public` IS NULL, NULL, OLD.`is_public` IS TRUE), 'description', OLD.`description`, 'updated_by', OLD.`updated_by`, 'created_at', DATE_FORMAT(OLD.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(OLD.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')), JSON_OBJECT('id', NEW.`id`, 'key', NEW.`key`, 'value', JSON_EXTRACT(NEW.`value`, '$'), 'is_public', IF(NEW.`is_public` IS NULL, NULL, NEW.`is_public` IS TRUE), 'description', NEW.`description`, 'updated_by', NEW.`updated_by`, 'created_at', DATE_FORMAT(NEW.`created_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'updated_at', DATE_FORMAT(NEW.`updated_at`, '%Y-%m-%dT%H:%i:%s.%f+00:00')));
  END IF;
END;

CREATE TRIGGER solutions_record_slug_change_au AFTER UPDATE ON solutions FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) AND NOT (OLD.slug <=> NEW.slug) THEN
    IF JSON_VALUE(OLD.slug, '$.tr') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.tr') <=> JSON_VALUE(NEW.slug, '$.tr')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('solution', OLD.id, 'tr', JSON_VALUE(OLD.slug, '$.tr'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'solution' AND locale = 'tr' AND old_slug = JSON_VALUE(NEW.slug, '$.tr');
    IF JSON_VALUE(OLD.slug, '$.en') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.en') <=> JSON_VALUE(NEW.slug, '$.en')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('solution', OLD.id, 'en', JSON_VALUE(OLD.slug, '$.en'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'solution' AND locale = 'en' AND old_slug = JSON_VALUE(NEW.slug, '$.en');
  END IF;
END;

CREATE TRIGGER solutions_assign_sort_order_bi BEFORE INSERT ON solutions FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM solutions);
  END IF;
END;

CREATE TRIGGER static_pages_record_slug_change_au AFTER UPDATE ON static_pages FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) AND NOT (OLD.slug <=> NEW.slug) THEN
    IF JSON_VALUE(OLD.slug, '$.tr') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.tr') <=> JSON_VALUE(NEW.slug, '$.tr')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('static_page', OLD.id, 'tr', JSON_VALUE(OLD.slug, '$.tr'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'static_page' AND locale = 'tr' AND old_slug = JSON_VALUE(NEW.slug, '$.tr');
    IF JSON_VALUE(OLD.slug, '$.en') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.en') <=> JSON_VALUE(NEW.slug, '$.en')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('static_page', OLD.id, 'en', JSON_VALUE(OLD.slug, '$.en'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = 'static_page' AND locale = 'en' AND old_slug = JSON_VALUE(NEW.slug, '$.en');
  END IF;
END;

CREATE TRIGGER steel_profiles_assign_sort_order_bi BEFORE INSERT ON steel_profiles FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM steel_profiles);
  END IF;
END;

CREATE TRIGGER team_members_assign_sort_order_bi BEFORE INSERT ON team_members FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM team_members);
  END IF;
END;

CREATE TRIGGER testimonials_assign_sort_order_bi BEFORE INSERT ON testimonials FOR EACH ROW
BEGIN
  IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM testimonials);
  END IF;
END;

CREATE TRIGGER users_on_auth_user_created_ai AFTER INSERT ON users FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) THEN
    INSERT INTO profiles (id, full_name) VALUES (NEW.id, NULLIF(JSON_VALUE(NEW.meta, '$.full_name'), '')) ON DUPLICATE KEY UPDATE id = id;
    IF NEW.email_confirmed_at IS NOT NULL AND NEW.email IS NOT NULL THEN
      UPDATE configurations SET user_id = NEW.id, owner_email = NULL, claimed_at = CURRENT_TIMESTAMP(6)
       WHERE user_id IS NULL AND owner_email = LOWER(NEW.email) COLLATE utf8mb4_bin;
    END IF;
  END IF;
END;

CREATE TRIGGER users_on_auth_user_confirmed_au AFTER UPDATE ON users FOR EACH ROW
BEGIN
  IF NOT (@app_import <=> 1) AND OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL AND NEW.email IS NOT NULL THEN
      UPDATE configurations SET user_id = NEW.id, owner_email = NULL, claimed_at = CURRENT_TIMESTAMP(6)
       WHERE user_id IS NULL AND owner_email = LOWER(NEW.email) COLLATE utf8mb4_bin;
  END IF;
END;
