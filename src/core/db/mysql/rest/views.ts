// PostgreSQL görünümlerinin karşılığı (K-116): tek tablo + açık sütunlar + koşul. Koşulda görünüm adı tablo takma adıdır.
// Görünümler RLS taşımaz (tanım sahibinin yetkisiyle çalışır); erişim koşulun kendisindedir. Kaynak: 0024 / 0029 / 0034 göçleri.
export interface ViewDef {
  readonly base: string;
  readonly columns: readonly string[];
  readonly where: string;
}

const SALES_ROLES = "@app_role IN ('super_admin', 'admin', 'sales', 'viewer')";

export const VIEWS: Readonly<Record<string, ViewDef>> = {
  published_comments: {
    base: 'post_comments',
    columns: ['id', 'post_id', 'parent_id', 'author_name', 'body', 'locale', 'created_at'],
    where:
      "published_comments.status = 'approved' AND EXISTS (SELECT 1 FROM blog_posts b WHERE b.id = published_comments.post_id AND b.status = 'published' AND (b.published_at IS NULL OR b.published_at <= UTC_TIMESTAMP(6)))",
  },
  // maliyet sütunları olmadan satış (K-60): satış rolü maliyeti görmez
  sales_without_cost: {
    base: 'sales',
    columns: ['id', 'sale_no', 'customer_id', 'lead_id', 'configuration_id', 'project_id', 'sale_date', 'status', 'currency', 'exchange_rate', 'exchange_rate_date', 'exchange_rate_source', 'subtotal', 'discount_pct', 'discount_amount', 'is_invoiced', 'vat_rate', 'vat_amount', 'grand_total', 'grand_total_try', 'notes', 'assigned_to', 'created_by', 'created_at', 'updated_at'],
    where: SALES_ROLES,
  },
  sale_items_without_cost: {
    base: 'sale_items',
    columns: ['id', 'sale_id', 'service_id', 'product_id', 'description', 'quantity', 'unit', 'unit_price', 'line_total', 'sort_order', 'created_at', 'updated_at'],
    where: SALES_ROLES,
  },
  stale_cron_jobs: {
    base: 'cron_heartbeats',
    columns: ['job_key', 'last_run_at', 'expected_interval_seconds', 'last_status'],
    where:
      "stale_cron_jobs.last_run_at IS NULL OR stale_cron_jobs.last_run_at < UTC_TIMESTAMP(6) - INTERVAL (stale_cron_jobs.expected_interval_seconds * 2) SECOND OR stale_cron_jobs.last_status = 'error'",
  },
};
