// Üretici: scripts/mysql/gen-access.mts — elle düzenlemeyin (K-116).
// PostgreSQL RLS kurallarının MariaDB karşılığı. null = kural yok → yasak (RLS varsayılanı). 'TRUE' = koşulsuz.
// grants: tablo yetkisi (PostgreSQL GRANT); yoksa komut "permission denied" ile reddedilir. service aktörü ikisini de atlar.
export interface RoleAccess {
  readonly grants: readonly string[];
  readonly columnGrants?: Readonly<Record<string, readonly string[]>>;
  readonly select: string | null;
  readonly insert: string | null;
  readonly update: string | null;
  readonly updateCheck: string | null;
  readonly delete: string | null;
}
export const ACCESS: Readonly<Record<string, { readonly anon: RoleAccess; readonly user: RoleAccess }>> = {
 "about_content": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "analytics_events": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "(@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "analytics_pageviews": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "(@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "analytics_sessions": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "(@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "audit_logs": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "(@app_role IN ('super_admin', 'admin'))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "blog_categories": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "is_active",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(is_active) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "blog_post_tags": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "(EXISTS (SELECT 1 FROM blog_posts b WHERE (b.id = blog_post_tags.post_id) AND (((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6)))))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((EXISTS (SELECT 1 FROM blog_posts b WHERE (b.id = blog_post_tags.post_id) AND ((((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor'))))))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "blog_posts": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "blog_tags": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "true",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(true) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "certificates": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "clients": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "is_active",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(is_active) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "configuration_items": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT"
   ],
   "select": "(EXISTS (SELECT 1 FROM configuration_versions v WHERE (v.id = configuration_items.configuration_version_id) AND ((EXISTS (SELECT 1 FROM configurations c WHERE (c.id = v.configuration_id) AND (((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer')))))))))",
   "insert": "(EXISTS (SELECT 1 FROM configuration_versions v JOIN configurations c ON (c.id = v.configuration_id) WHERE ((v.id = configuration_items.configuration_version_id) AND (c.user_id = @app_uid)) AND ((EXISTS (SELECT 1 FROM configurations c WHERE (c.id = v.configuration_id) AND (((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))))))) AND (((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))))))",
   "update": "(EXISTS (SELECT 1 FROM configuration_versions v WHERE (v.id = configuration_items.configuration_version_id) AND ((EXISTS (SELECT 1 FROM configurations c WHERE (c.id = v.configuration_id) AND (((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer')))))))))",
   "updateCheck": "(EXISTS (SELECT 1 FROM configuration_versions v JOIN configurations c ON (c.id = v.configuration_id) WHERE ((v.id = configuration_items.configuration_version_id) AND (c.user_id = @app_uid)) AND ((EXISTS (SELECT 1 FROM configurations c WHERE (c.id = v.configuration_id) AND (((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))))))) AND (((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))))))",
   "delete": "(EXISTS (SELECT 1 FROM configuration_versions v WHERE (v.id = configuration_items.configuration_version_id) AND ((EXISTS (SELECT 1 FROM configurations c WHERE (c.id = v.configuration_id) AND (((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer')))))))))"
  }
 },
 "configuration_versions": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT"
   ],
   "select": "(EXISTS (SELECT 1 FROM configurations c WHERE (c.id = configuration_versions.configuration_id) AND (((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))))))",
   "insert": "(EXISTS (SELECT 1 FROM configurations c WHERE ((c.id = configuration_versions.configuration_id) AND (c.user_id = @app_uid)) AND (((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))))))",
   "update": "(EXISTS (SELECT 1 FROM configurations c WHERE (c.id = configuration_versions.configuration_id) AND (((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))))))",
   "updateCheck": "(EXISTS (SELECT 1 FROM configurations c WHERE ((c.id = configuration_versions.configuration_id) AND (c.user_id = @app_uid)) AND (((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))))))",
   "delete": "(EXISTS (SELECT 1 FROM configurations c WHERE (c.id = configuration_versions.configuration_id) AND (((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))))))"
  }
 },
 "configurations": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer')))",
   "insert": "(user_id = @app_uid)",
   "update": "((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'sales')))",
   "updateCheck": "((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'sales')))",
   "delete": "((@app_role IN ('super_admin', 'admin'))) OR ((user_id = @app_uid))"
  }
 },
 "configurator_pages": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "configurator_rules": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "true",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(true) OR ((@app_role IN ('super_admin', 'admin')))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "content_links": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "true",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(true) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "content_revisions": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "INSERT",
    "SELECT"
   ],
   "select": "(@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "cron_heartbeats": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "(@app_role IN ('super_admin', 'admin'))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "customers": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((@app_role IN ('super_admin', 'admin', 'sales', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'sales')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'sales'))"
  }
 },
 "document_counters": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "email_logs": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "email_queue": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "(@app_role IN ('super_admin', 'admin'))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "email_templates": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(@app_role IN ('super_admin', 'admin'))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "error_logs": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(@app_role IN ('super_admin', 'admin'))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "exchange_rates": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((@app_role IN ('super_admin', 'admin', 'sales', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin')))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "faqs": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "field_videos": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "is_active",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(is_active) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "form_analytics": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "(@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "funnel_steps": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin')))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "funnels": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin')))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "heatmap_aggregates": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "(@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "hero_media": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "is_active",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(is_active) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "invoices": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((@app_role IN ('super_admin', 'admin', 'sales', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin')))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "job_applications": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(@app_role IN ('super_admin', 'admin'))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "job_postings": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "lead_attachments": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((EXISTS (SELECT 1 FROM leads l WHERE ((l.id = lead_attachments.lead_id) AND (l.user_id = @app_uid)) AND (((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'sales'))))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'sales')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'sales'))"
  }
 },
 "lead_items": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((EXISTS (SELECT 1 FROM leads l WHERE ((l.id = lead_items.lead_id) AND (l.user_id = @app_uid)) AND (((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'sales'))))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'sales')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'sales'))"
  }
 },
 "lead_notes": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'sales')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'sales'))"
  }
 },
 "lead_replies": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((EXISTS (SELECT 1 FROM leads l WHERE ((l.id = lead_replies.lead_id) AND (l.user_id = @app_uid)) AND (((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'sales'))))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'sales')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'sales'))"
  }
 },
 "leads": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((user_id = @app_uid)) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'sales')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'sales'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'sales'))"
  }
 },
 "mail_campaign_recipients": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "(@app_role IN ('super_admin', 'admin'))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "mail_campaign_templates": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((@app_role IN ('super_admin', 'admin'))) OR ((@app_role IN ('super_admin', 'admin')))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "mail_campaigns": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "(@app_role IN ('super_admin', 'admin'))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "mail_suppressions": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "(@app_role IN ('super_admin', 'admin'))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "material_price_history": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "(@app_role IN ('super_admin', 'admin', 'sales', 'viewer'))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "material_prices": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((@app_uid IS NOT NULL)) OR ((@app_role IN ('super_admin', 'admin')))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "media_library": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "true",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(true) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "menu_items": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "is_active",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(is_active) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin')))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "menus": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "is_active",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(is_active) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin')))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "newsletter_subscribers": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((@app_role IN ('super_admin', 'admin', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin')))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "notifications": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "((user_id = @app_uid) OR (target_role = @app_role))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "panel_types": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "true",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(true) OR ((@app_role IN ('super_admin', 'admin')))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "payment_schedules": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((@app_role IN ('super_admin', 'admin', 'sales', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin')))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "payments": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((@app_role IN ('super_admin', 'admin', 'sales', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin')))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "post_comments": {
  "anon": {
   "grants": [],
   "columnGrants": {
    "INSERT": [
     "author_email",
     "author_name",
     "body",
     "ip_masked",
     "locale",
     "parent_id",
     "post_id",
     "user_id"
    ]
   },
   "select": null,
   "insert": "(TRUE AND (status = 'pending') AND ((user_id IS NULL) OR (user_id = @app_uid)) AND (EXISTS (SELECT 1 FROM blog_posts b WHERE ((b.id = post_comments.post_id) AND b.allow_comments AND (b.status = 'published') AND ((b.published_at IS NULL) OR (b.published_at <= UTC_TIMESTAMP(6)))) AND (((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))))))",
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "insert": "((@app_role IN ('super_admin', 'admin', 'editor'))) OR ((TRUE AND (status = 'pending') AND ((user_id IS NULL) OR (user_id = @app_uid)) AND (EXISTS (SELECT 1 FROM blog_posts b WHERE ((b.id = post_comments.post_id) AND b.allow_comments AND (b.status = 'published') AND ((b.published_at IS NULL) OR (b.published_at <= UTC_TIMESTAMP(6)))) AND ((((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor'))))))))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "post_likes": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "(@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "price_guide_rows": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "(EXISTS (SELECT 1 FROM price_guides g WHERE (g.id = price_guide_rows.price_guide_id) AND (((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6)))))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((EXISTS (SELECT 1 FROM price_guides g WHERE (g.id = price_guide_rows.price_guide_id) AND ((((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor'))))))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "price_guides": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "product_categories": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "is_active",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(is_active) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "product_documents": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "(EXISTS (SELECT 1 FROM products p WHERE (p.id = product_documents.product_id) AND (((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6)))))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((EXISTS (SELECT 1 FROM products p WHERE (p.id = product_documents.product_id) AND ((((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor'))))))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "product_images": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "(EXISTS (SELECT 1 FROM products p WHERE (p.id = product_images.product_id) AND (((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6)))))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((EXISTS (SELECT 1 FROM products p WHERE (p.id = product_images.product_id) AND ((((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor'))))))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "product_specs": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "(EXISTS (SELECT 1 FROM products p WHERE (p.id = product_specs.product_id) AND (((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6)))))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((EXISTS (SELECT 1 FROM products p WHERE (p.id = product_specs.product_id) AND ((((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor'))))))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "product_variants": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "(EXISTS (SELECT 1 FROM products p WHERE (p.id = product_variants.product_id) AND (((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6)))))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((EXISTS (SELECT 1 FROM products p WHERE (p.id = product_variants.product_id) AND ((((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor'))))))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "products": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "profiles": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT",
    "UPDATE"
   ],
   "select": "((@app_role IN ('super_admin', 'admin'))) OR ((id = @app_uid)) OR (((role <> 'member') AND (@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))))",
   "insert": null,
   "update": "((id = @app_uid)) OR ((@app_role IN ('super_admin')))",
   "updateCheck": "((id = @app_uid)) OR ((@app_role IN ('super_admin')))",
   "delete": null
  }
 },
 "project_categories": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "is_active",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(is_active) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "project_category_relations": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "(EXISTS (SELECT 1 FROM projects p WHERE (p.id = project_category_relations.project_id) AND (((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6)))))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((EXISTS (SELECT 1 FROM projects p WHERE (p.id = project_category_relations.project_id) AND ((((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor'))))))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "project_images": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "(EXISTS (SELECT 1 FROM projects p WHERE (p.id = project_images.project_id) AND (((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6)))))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((EXISTS (SELECT 1 FROM projects p WHERE (p.id = project_images.project_id) AND ((((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor'))))))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "projects": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "redirects": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "is_active",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(is_active) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "review_sync_runs": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin')))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "sale_expenses": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(@app_role IN ('super_admin', 'admin'))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "sale_items": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(@app_role IN ('super_admin', 'admin'))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "sales": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(@app_role IN ('super_admin', 'admin'))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "scroll_depth_aggregates": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "(@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "service_images": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "(EXISTS (SELECT 1 FROM services s WHERE (s.id = service_images.service_id) AND (((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6)))))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((EXISTS (SELECT 1 FROM services s WHERE (s.id = service_images.service_id) AND ((((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor'))))))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "service_projects": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "true",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(true) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "services": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "site_settings": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "is_public",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(is_public) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin')))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "slug_history": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "true",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(true) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "solutions": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "static_pages": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "steel_profiles": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "true",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(true) OR ((@app_role IN ('super_admin', 'admin')))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "team_members": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(((status = 'published') AND ((published_at IS NULL) OR (published_at <= UTC_TIMESTAMP(6))))) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "testimonials": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "(status = 'published')",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((status = 'published')) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "translation_glossary": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "ui_translations": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "true",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(true) OR ((@app_role IN ('super_admin', 'admin', 'editor')))",
   "insert": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "update": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin', 'editor'))",
   "delete": "(@app_role IN ('super_admin', 'admin', 'editor'))"
  }
 },
 "web_vitals": {
  "anon": {
   "grants": [],
   "select": null,
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "(@app_role IN ('super_admin', 'admin', 'editor', 'sales', 'viewer'))",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  }
 },
 "whatsapp_settings": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "is_enabled",
   "insert": null,
   "update": null,
   "updateCheck": null,
   "delete": null
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "(is_enabled) OR ((@app_role IN ('super_admin', 'admin', 'editor', 'viewer'))) OR ((@app_role IN ('super_admin', 'admin')))",
   "insert": "(@app_role IN ('super_admin', 'admin'))",
   "update": "(@app_role IN ('super_admin', 'admin'))",
   "updateCheck": "(@app_role IN ('super_admin', 'admin'))",
   "delete": "(@app_role IN ('super_admin', 'admin'))"
  }
 },
 "published_comments": {
  "anon": {
   "grants": [
    "SELECT"
   ],
   "select": "TRUE",
   "insert": "TRUE",
   "update": "TRUE",
   "updateCheck": "TRUE",
   "delete": "TRUE"
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "TRUE",
   "insert": "TRUE",
   "update": "TRUE",
   "updateCheck": "TRUE",
   "delete": "TRUE"
  }
 },
 "sale_items_without_cost": {
  "anon": {
   "grants": [],
   "select": "TRUE",
   "insert": "TRUE",
   "update": "TRUE",
   "updateCheck": "TRUE",
   "delete": "TRUE"
  },
  "user": {
   "grants": [
    "DELETE",
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "TRUE",
   "insert": "TRUE",
   "update": "TRUE",
   "updateCheck": "TRUE",
   "delete": "TRUE"
  }
 },
 "sales_without_cost": {
  "anon": {
   "grants": [],
   "select": "TRUE",
   "insert": "TRUE",
   "update": "TRUE",
   "updateCheck": "TRUE",
   "delete": "TRUE"
  },
  "user": {
   "grants": [
    "INSERT",
    "SELECT",
    "UPDATE"
   ],
   "select": "TRUE",
   "insert": "TRUE",
   "update": "TRUE",
   "updateCheck": "TRUE",
   "delete": "TRUE"
  }
 },
 "stale_cron_jobs": {
  "anon": {
   "grants": [],
   "select": "TRUE",
   "insert": "TRUE",
   "update": "TRUE",
   "updateCheck": "TRUE",
   "delete": "TRUE"
  },
  "user": {
   "grants": [
    "SELECT"
   ],
   "select": "TRUE",
   "insert": "TRUE",
   "update": "TRUE",
   "updateCheck": "TRUE",
   "delete": "TRUE"
  }
 }
};
