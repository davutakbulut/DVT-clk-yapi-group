// Üretici: scripts/mysql/gen-schema.mts — elle düzenlemeyin (K-116).
// Sütun türleri sonuç dönüşümü (JSON/boolean/sayı/tarih) için, yabancı anahtarlar gömülü ilişkiler için.
export type ColumnKind = 'uuid' | 'text' | 'json' | 'bool' | 'int' | 'num' | 'ts' | 'date';
export interface TableMeta {
  readonly pk: readonly string[];
  readonly cols: Readonly<Record<string, ColumnKind>>;
  readonly fks: readonly { readonly name: string; readonly cols: readonly string[]; readonly ref: string; readonly refCols: readonly string[] }[];
}
export const SCHEMA: Readonly<Record<string, TableMeta>> = {
 "about_content": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "key": "text",
   "eyebrow": "json",
   "title": "json",
   "body": "json",
   "image_id": "uuid",
   "stats": "json",
   "created_at": "ts",
   "updated_at": "ts",
   "status": "text",
   "published_locales": "json",
   "published_at": "ts",
   "translation_meta": "json",
   "seo_title": "json",
   "seo_description": "json",
   "og_image_id": "uuid",
   "canonical_url": "text",
   "noindex": "bool",
   "focus_keyword": "json"
  },
  "fks": [
   {
    "name": "about_content_image_id_fkey",
    "cols": [
     "image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "about_content_og_image_id_fkey",
    "cols": [
     "og_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "analytics_events": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "session_id": "uuid",
   "pageview_id": "uuid",
   "type": "text",
   "path": "text",
   "device": "text",
   "x_pct": "num",
   "y_pct": "num",
   "selector": "text",
   "element_text": "text",
   "payload": "json",
   "occurred_at": "ts",
   "created_at": "ts"
  },
  "fks": [
   {
    "name": "analytics_events_pageview_id_fkey",
    "cols": [
     "pageview_id"
    ],
    "ref": "analytics_pageviews",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "analytics_events_session_id_fkey",
    "cols": [
     "session_id"
    ],
    "ref": "analytics_sessions",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "analytics_pageviews": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "session_id": "uuid",
   "path": "text",
   "locale": "text",
   "viewed_at": "ts",
   "duration_ms": "int",
   "max_scroll_pct": "int",
   "viewport_w": "int",
   "viewport_h": "int",
   "created_at": "ts"
  },
  "fks": [
   {
    "name": "analytics_pageviews_session_id_fkey",
    "cols": [
     "session_id"
    ],
    "ref": "analytics_sessions",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "analytics_sessions": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "visitor_hash": "text",
   "started_at": "ts",
   "last_seen_at": "ts",
   "device": "text",
   "browser": "text",
   "os": "text",
   "country": "text",
   "locale": "text",
   "referrer_host": "text",
   "referrer_kind": "text",
   "utm": "json",
   "landing_path": "text",
   "exit_path": "text",
   "pageview_count": "int",
   "ip_masked": "text",
   "created_at": "ts"
  },
  "fks": []
 },
 "audit_logs": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "actor_id": "uuid",
   "action": "text",
   "table_name": "text",
   "row_id": "uuid",
   "old_data": "json",
   "new_data": "json",
   "created_at": "ts"
  },
  "fks": [
   {
    "name": "audit_logs_actor_id_fkey",
    "cols": [
     "actor_id"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "blog_categories": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "slug": "json",
   "name": "json",
   "description": "json",
   "is_active": "bool",
   "created_at": "ts",
   "updated_at": "ts",
   "seo_title": "json",
   "seo_description": "json",
   "og_image_id": "uuid",
   "canonical_url": "text",
   "noindex": "bool",
   "focus_keyword": "json",
   "sort_order": "int"
  },
  "fks": [
   {
    "name": "blog_categories_og_image_id_fkey",
    "cols": [
     "og_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "blog_post_tags": {
  "pk": [
   "post_id",
   "tag_id"
  ],
  "cols": {
   "post_id": "uuid",
   "tag_id": "uuid",
   "created_at": "ts"
  },
  "fks": [
   {
    "name": "blog_post_tags_post_id_fkey",
    "cols": [
     "post_id"
    ],
    "ref": "blog_posts",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "blog_post_tags_tag_id_fkey",
    "cols": [
     "tag_id"
    ],
    "ref": "blog_tags",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "blog_posts": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "slug": "json",
   "title": "json",
   "excerpt": "json",
   "body": "json",
   "cover_image_id": "uuid",
   "category_id": "uuid",
   "author_id": "uuid",
   "reading_minutes": "json",
   "is_featured": "bool",
   "allow_comments": "bool",
   "created_at": "ts",
   "updated_at": "ts",
   "status": "text",
   "published_locales": "json",
   "published_at": "ts",
   "translation_meta": "json",
   "seo_title": "json",
   "seo_description": "json",
   "og_image_id": "uuid",
   "canonical_url": "text",
   "noindex": "bool",
   "focus_keyword": "json"
  },
  "fks": [
   {
    "name": "blog_posts_author_fk",
    "cols": [
     "author_id"
    ],
    "ref": "team_members",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "blog_posts_category_id_fkey",
    "cols": [
     "category_id"
    ],
    "ref": "blog_categories",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "blog_posts_cover_image_id_fkey",
    "cols": [
     "cover_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "blog_posts_og_image_id_fkey",
    "cols": [
     "og_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "blog_tags": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "slug": "json",
   "name": "json",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": []
 },
 "certificates": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "title": "json",
   "issuer": "text",
   "certificate_no": "text",
   "description": "json",
   "image_id": "uuid",
   "document_id": "uuid",
   "issued_on": "date",
   "valid_until": "date",
   "created_at": "ts",
   "updated_at": "ts",
   "status": "text",
   "published_locales": "json",
   "published_at": "ts",
   "translation_meta": "json",
   "sort_order": "int"
  },
  "fks": [
   {
    "name": "certificates_document_id_fkey",
    "cols": [
     "document_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "certificates_image_id_fkey",
    "cols": [
     "image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "clients": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "name": "text",
   "logo_id": "uuid",
   "website_url": "text",
   "sector": "json",
   "is_featured": "bool",
   "is_active": "bool",
   "created_at": "ts",
   "updated_at": "ts",
   "sort_order": "int"
  },
  "fks": [
   {
    "name": "clients_logo_id_fkey",
    "cols": [
     "logo_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "configuration_items": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "configuration_version_id": "uuid",
   "element_group": "text",
   "steel_profile_id": "uuid",
   "panel_type_id": "uuid",
   "profile_code_snapshot": "text",
   "piece_count": "int",
   "total_length_m": "num",
   "total_area_m2": "num",
   "total_weight_kg": "num",
   "line_price": "num",
   "sort_order": "int",
   "created_at": "ts"
  },
  "fks": [
   {
    "name": "configuration_items_configuration_version_id_fkey",
    "cols": [
     "configuration_version_id"
    ],
    "ref": "configuration_versions",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "configuration_items_panel_type_id_fkey",
    "cols": [
     "panel_type_id"
    ],
    "ref": "panel_types",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "configuration_items_steel_profile_id_fkey",
    "cols": [
     "steel_profile_id"
    ],
    "ref": "steel_profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "configuration_versions": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "configuration_id": "uuid",
   "version": "int",
   "params": "json",
   "tonnage_kg": "num",
   "estimated_price": "num",
   "price_snapshot": "json",
   "note": "text",
   "created_at": "ts"
  },
  "fks": [
   {
    "name": "configuration_versions_configuration_id_fkey",
    "cols": [
     "configuration_id"
    ],
    "ref": "configurations",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "configurations": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "ref_code": "text",
   "name": "text",
   "user_id": "uuid",
   "public_token": "uuid",
   "owner_email": "text",
   "params": "json",
   "current_version": "int",
   "tonnage_kg": "num",
   "estimated_price": "num",
   "currency": "text",
   "status": "text",
   "lead_id": "uuid",
   "sale_id": "uuid",
   "is_shared": "bool",
   "share_price": "bool",
   "locale": "text",
   "ip_masked": "text",
   "claimed_at": "ts",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "configurations_lead_id_fkey",
    "cols": [
     "lead_id"
    ],
    "ref": "leads",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "configurations_sale_id_fkey",
    "cols": [
     "sale_id"
    ],
    "ref": "sales",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "configurations_user_id_fkey",
    "cols": [
     "user_id"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "configurator_pages": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "configurator_key": "text",
   "slug": "json",
   "title": "json",
   "hero_summary": "json",
   "body": "json",
   "benefits": "json",
   "steps": "json",
   "faqs": "json",
   "cta": "json",
   "cover_image_id": "uuid",
   "created_at": "ts",
   "updated_at": "ts",
   "status": "text",
   "published_locales": "json",
   "published_at": "ts",
   "translation_meta": "json",
   "seo_title": "json",
   "seo_description": "json",
   "og_image_id": "uuid",
   "canonical_url": "text",
   "noindex": "bool",
   "focus_keyword": "json",
   "sort_order": "int"
  },
  "fks": [
   {
    "name": "configurator_pages_cover_image_id_fkey",
    "cols": [
     "cover_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "configurator_pages_og_image_id_fkey",
    "cols": [
     "og_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "configurator_rules": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "key": "text",
   "value": "json",
   "description": "text",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": []
 },
 "content_links": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "from_type": "text",
   "from_id": "uuid",
   "to_type": "text",
   "to_id": "uuid",
   "relation": "text",
   "sort_order": "int",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": []
 },
 "content_revisions": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "entity_type": "text",
   "entity_id": "uuid",
   "snapshot": "json",
   "note": "text",
   "created_by": "uuid",
   "created_at": "ts"
  },
  "fks": [
   {
    "name": "content_revisions_created_by_fkey",
    "cols": [
     "created_by"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "cron_heartbeats": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "job_key": "text",
   "expected_interval_seconds": "int",
   "last_run_at": "ts",
   "last_status": "text",
   "last_error": "text",
   "last_duration_ms": "int",
   "alerted_at": "ts",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": []
 },
 "customers": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "type": "text",
   "full_name": "text",
   "company_title": "text",
   "tax_office": "text",
   "tax_id": "text",
   "address": "text",
   "city": "text",
   "district": "text",
   "email": "text",
   "phone": "text",
   "contact_person": "text",
   "contact_phone": "text",
   "notes": "text",
   "source": "text",
   "profile_id": "uuid",
   "is_active": "bool",
   "anonymized_at": "ts",
   "created_at": "ts",
   "updated_at": "ts",
   "marketing_consent": "bool",
   "marketing_consent_at": "ts"
  },
  "fks": [
   {
    "name": "customers_profile_id_fkey",
    "cols": [
     "profile_id"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "document_counters": {
  "pk": [
   "prefix",
   "year"
  ],
  "cols": {
   "prefix": "text",
   "year": "int",
   "last_no": "int"
  },
  "fks": []
 },
 "email_logs": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "queue_id": "uuid",
   "template_key": "text",
   "to_email": "text",
   "subject": "text",
   "provider": "text",
   "status": "text",
   "provider_message_id": "text",
   "error": "text",
   "related_type": "text",
   "related_id": "uuid",
   "created_at": "ts"
  },
  "fks": [
   {
    "name": "email_logs_queue_id_fkey",
    "cols": [
     "queue_id"
    ],
    "ref": "email_queue",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "email_queue": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "template_key": "text",
   "to_email": "text",
   "to_name": "text",
   "locale": "text",
   "payload": "json",
   "status": "text",
   "priority": "int",
   "attempts": "int",
   "max_attempts": "int",
   "next_attempt_at": "ts",
   "locked_at": "ts",
   "last_error": "text",
   "related_type": "text",
   "related_id": "uuid",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": []
 },
 "email_templates": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "key": "text",
   "name": "text",
   "subject": "json",
   "body": "json",
   "variables": "json",
   "is_active": "bool",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": []
 },
 "error_logs": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "fingerprint": "text",
   "module": "text",
   "source": "text",
   "level": "text",
   "code": "text",
   "message": "text",
   "stack": "text",
   "path": "text",
   "status_code": "int",
   "user_id": "uuid",
   "ip_masked": "text",
   "user_agent": "text",
   "context": "json",
   "occurrences": "int",
   "affected_users": "int",
   "first_seen_at": "ts",
   "last_seen_at": "ts",
   "resolved_at": "ts",
   "resolved_by": "uuid",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "error_logs_resolved_by_fkey",
    "cols": [
     "resolved_by"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "error_logs_user_id_fkey",
    "cols": [
     "user_id"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "exchange_rates": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "currency": "text",
   "rate_date": "date",
   "rate": "num",
   "source": "text",
   "fetched_at": "ts",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": []
 },
 "faqs": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "entity_type": "text",
   "entity_id": "uuid",
   "question": "json",
   "answer": "json",
   "created_at": "ts",
   "updated_at": "ts",
   "status": "text",
   "published_locales": "json",
   "published_at": "ts",
   "translation_meta": "json",
   "sort_order": "int"
  },
  "fks": []
 },
 "field_videos": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "title": "json",
   "caption": "json",
   "source": "text",
   "youtube_id": "text",
   "video_id": "uuid",
   "poster_id": "uuid",
   "is_active": "bool",
   "created_at": "ts",
   "updated_at": "ts",
   "sort_order": "int"
  },
  "fks": [
   {
    "name": "field_videos_poster_id_fkey",
    "cols": [
     "poster_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "field_videos_video_id_fkey",
    "cols": [
     "video_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "form_analytics": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "form_key": "text",
   "field_name": "text",
   "device": "text",
   "day": "date",
   "focus_count": "int",
   "abandon_count": "int",
   "error_count": "int",
   "total_time_ms": "int",
   "created_at": "ts"
  },
  "fks": []
 },
 "funnel_steps": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "funnel_id": "uuid",
   "seq": "int",
   "name": "text",
   "match_type": "text",
   "match_value": "text",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "funnel_steps_funnel_id_fkey",
    "cols": [
     "funnel_id"
    ],
    "ref": "funnels",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "funnels": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "name": "text",
   "description": "text",
   "is_active": "bool",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": []
 },
 "heatmap_aggregates": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "path": "text",
   "device": "text",
   "day": "date",
   "kind": "text",
   "bucket_x": "int",
   "bucket_y": "int",
   "hits": "int",
   "created_at": "ts"
  },
  "fks": []
 },
 "hero_media": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "label": "text",
   "desktop_video_id": "uuid",
   "mobile_video_id": "uuid",
   "desktop_poster_id": "uuid",
   "mobile_poster_id": "uuid",
   "duration_seconds": "num",
   "headline": "json",
   "subheadline": "json",
   "cta_label": "json",
   "cta_path": "text",
   "is_active": "bool",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "hero_media_desktop_poster_id_fkey",
    "cols": [
     "desktop_poster_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "hero_media_desktop_video_id_fkey",
    "cols": [
     "desktop_video_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "hero_media_mobile_poster_id_fkey",
    "cols": [
     "mobile_poster_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "hero_media_mobile_video_id_fkey",
    "cols": [
     "mobile_video_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "invoices": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "invoice_no": "text",
   "sale_id": "uuid",
   "customer_id": "uuid",
   "type": "text",
   "status": "text",
   "issue_date": "date",
   "due_date": "date",
   "currency": "text",
   "exchange_rate": "num",
   "base_amount": "num",
   "vat_rate": "num",
   "vat_amount": "num",
   "total_amount": "num",
   "withholding_ratio": "num",
   "withholding_amount": "num",
   "collectable_amount": "num",
   "notes": "text",
   "created_by": "uuid",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "invoices_created_by_fkey",
    "cols": [
     "created_by"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "invoices_customer_id_fkey",
    "cols": [
     "customer_id"
    ],
    "ref": "customers",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "invoices_sale_id_fkey",
    "cols": [
     "sale_id"
    ],
    "ref": "sales",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "job_applications": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "job_posting_id": "uuid",
   "full_name": "text",
   "email": "text",
   "phone": "text",
   "cover_letter": "text",
   "cv_bucket": "text",
   "cv_path": "text",
   "status": "text",
   "internal_notes": "text",
   "locale": "text",
   "consent_kvkk_at": "ts",
   "retention_until": "date",
   "reviewed_by": "uuid",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "job_applications_job_posting_id_fkey",
    "cols": [
     "job_posting_id"
    ],
    "ref": "job_postings",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "job_applications_reviewed_by_fkey",
    "cols": [
     "reviewed_by"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "job_postings": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "slug": "json",
   "title": "json",
   "department": "json",
   "location": "json",
   "employment_type": "text",
   "description": "json",
   "requirements": "json",
   "application_deadline": "date",
   "is_open": "bool",
   "created_at": "ts",
   "updated_at": "ts",
   "status": "text",
   "published_locales": "json",
   "published_at": "ts",
   "translation_meta": "json",
   "seo_title": "json",
   "seo_description": "json",
   "og_image_id": "uuid",
   "canonical_url": "text",
   "noindex": "bool",
   "focus_keyword": "json"
  },
  "fks": [
   {
    "name": "job_postings_og_image_id_fkey",
    "cols": [
     "og_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "lead_attachments": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "lead_id": "uuid",
   "storage_bucket": "text",
   "storage_path": "text",
   "file_name": "text",
   "mime_type": "text",
   "size_bytes": "int",
   "uploaded_by_visitor": "bool",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "lead_attachments_lead_id_fkey",
    "cols": [
     "lead_id"
    ],
    "ref": "leads",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "lead_items": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "lead_id": "uuid",
   "product_id": "uuid",
   "variant_id": "uuid",
   "product_name_snapshot": "text",
   "variant_label_snapshot": "text",
   "stock_code_snapshot": "text",
   "quantity": "num",
   "unit": "text",
   "note": "text",
   "sort_order": "int",
   "created_at": "ts",
   "updated_at": "ts",
   "attributes": "json"
  },
  "fks": [
   {
    "name": "lead_items_lead_id_fkey",
    "cols": [
     "lead_id"
    ],
    "ref": "leads",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "lead_items_product_id_fkey",
    "cols": [
     "product_id"
    ],
    "ref": "products",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "lead_items_variant_id_fkey",
    "cols": [
     "variant_id"
    ],
    "ref": "product_variants",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "lead_notes": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "lead_id": "uuid",
   "author_id": "uuid",
   "body": "text",
   "is_pinned": "bool",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "lead_notes_author_id_fkey",
    "cols": [
     "author_id"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "lead_notes_lead_id_fkey",
    "cols": [
     "lead_id"
    ],
    "ref": "leads",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "lead_replies": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "lead_id": "uuid",
   "author_id": "uuid",
   "subject": "text",
   "body": "text",
   "email_log_id": "uuid",
   "sent_at": "ts",
   "created_at": "ts",
   "updated_at": "ts",
   "direction": "text",
   "kind": "text"
  },
  "fks": [
   {
    "name": "lead_replies_author_id_fkey",
    "cols": [
     "author_id"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "lead_replies_email_log_fk",
    "cols": [
     "email_log_id"
    ],
    "ref": "email_logs",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "lead_replies_lead_id_fkey",
    "cols": [
     "lead_id"
    ],
    "ref": "leads",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "leads": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "ref_no": "text",
   "source": "text",
   "status": "text",
   "full_name": "text",
   "company": "text",
   "email": "text",
   "phone": "text",
   "city": "text",
   "subject": "text",
   "message": "text",
   "form_data": "json",
   "service_id": "uuid",
   "locale": "text",
   "user_id": "uuid",
   "customer_id": "uuid",
   "configuration_id": "uuid",
   "assigned_to": "uuid",
   "quoted_amount": "num",
   "quoted_currency": "text",
   "lost_reason": "text",
   "consent_kvkk_at": "ts",
   "consent_marketing": "bool",
   "utm": "json",
   "page_url": "text",
   "ip_masked": "text",
   "anonymized_at": "ts",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "leads_assigned_to_fkey",
    "cols": [
     "assigned_to"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "leads_configuration_fk",
    "cols": [
     "configuration_id"
    ],
    "ref": "configurations",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "leads_customer_fk",
    "cols": [
     "customer_id"
    ],
    "ref": "customers",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "leads_service_id_fkey",
    "cols": [
     "service_id"
    ],
    "ref": "services",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "leads_user_id_fkey",
    "cols": [
     "user_id"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "mail_campaign_recipients": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "campaign_id": "uuid",
   "email": "text",
   "full_name": "text",
   "company": "text",
   "source": "text",
   "status": "text",
   "error": "text",
   "token": "uuid",
   "locked_at": "ts",
   "sent_at": "ts",
   "unsubscribed_at": "ts",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "mail_campaign_recipients_campaign_id_fkey",
    "cols": [
     "campaign_id"
    ],
    "ref": "mail_campaigns",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "mail_campaign_templates": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "name": "text",
   "category": "text",
   "description": "text",
   "subject": "json",
   "preheader": "json",
   "body": "json",
   "cta_label": "json",
   "cta_url": "json",
   "sort_order": "int",
   "is_active": "bool",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": []
 },
 "mail_campaigns": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "name": "text",
   "locale": "text",
   "subject": "text",
   "preheader": "text",
   "body": "text",
   "cta_label": "text",
   "cta_url": "text",
   "audience": "json",
   "status": "text",
   "scheduled_at": "ts",
   "started_at": "ts",
   "finished_at": "ts",
   "created_by": "uuid",
   "started_by": "uuid",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "mail_campaigns_created_by_fkey",
    "cols": [
     "created_by"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "mail_campaigns_started_by_fkey",
    "cols": [
     "started_by"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "mail_suppressions": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "email": "text",
   "reason": "text",
   "campaign_id": "uuid",
   "note": "text",
   "created_by": "uuid",
   "created_at": "ts"
  },
  "fks": [
   {
    "name": "mail_suppressions_campaign_id_fkey",
    "cols": [
     "campaign_id"
    ],
    "ref": "mail_campaigns",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "mail_suppressions_created_by_fkey",
    "cols": [
     "created_by"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "material_price_history": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "material_price_id": "uuid",
   "unit_price": "num",
   "currency": "text",
   "valid_from": "date",
   "valid_until": "date",
   "changed_by": "uuid",
   "created_at": "ts"
  },
  "fks": [
   {
    "name": "material_price_history_changed_by_fkey",
    "cols": [
     "changed_by"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "material_price_history_material_price_id_fkey",
    "cols": [
     "material_price_id"
    ],
    "ref": "material_prices",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "material_prices": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "code": "text",
   "name": "json",
   "category": "text",
   "unit": "text",
   "unit_price": "num",
   "currency": "text",
   "valid_from": "date",
   "note": "text",
   "updated_by": "uuid",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "material_prices_updated_by_fkey",
    "cols": [
     "updated_by"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "media_library": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "storage_bucket": "text",
   "storage_path": "text",
   "file_name": "text",
   "mime_type": "text",
   "size_bytes": "int",
   "width": "int",
   "height": "int",
   "duration_ms": "int",
   "blur_data_url": "text",
   "alt": "json",
   "caption": "json",
   "folder": "text",
   "variants": "json",
   "uploaded_by": "uuid",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "media_library_uploaded_by_fkey",
    "cols": [
     "uploaded_by"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "menu_items": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "menu_id": "uuid",
   "parent_id": "uuid",
   "label": "json",
   "link_type": "text",
   "internal_path": "text",
   "entity_type": "text",
   "entity_id": "uuid",
   "external_url": "text",
   "anchor": "text",
   "header_slot": "text",
   "locales": "json",
   "visibility": "text",
   "is_cta": "bool",
   "open_in_new_tab": "bool",
   "icon": "text",
   "is_active": "bool",
   "created_at": "ts",
   "updated_at": "ts",
   "sort_order": "int"
  },
  "fks": [
   {
    "name": "menu_items_menu_id_fkey",
    "cols": [
     "menu_id"
    ],
    "ref": "menus",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "menu_items_parent_id_fkey",
    "cols": [
     "parent_id"
    ],
    "ref": "menu_items",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "menus": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "key": "text",
   "title": "json",
   "is_active": "bool",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": []
 },
 "newsletter_subscribers": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "email": "text",
   "locale": "text",
   "status": "text",
   "confirm_token": "uuid",
   "source": "text",
   "consent_at": "ts",
   "confirmed_at": "ts",
   "unsubscribed_at": "ts",
   "ip_masked": "text",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": []
 },
 "notifications": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "user_id": "uuid",
   "target_role": "text",
   "type": "text",
   "payload": "json",
   "link_path": "text",
   "read_by": "json",
   "created_at": "ts"
  },
  "fks": [
   {
    "name": "notifications_user_id_fkey",
    "cols": [
     "user_id"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "panel_types": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "code": "text",
   "name": "json",
   "usage": "text",
   "thickness_mm": "num",
   "kg_per_m2": "num",
   "material_price_id": "uuid",
   "is_active": "bool",
   "created_at": "ts",
   "updated_at": "ts",
   "sort_order": "int"
  },
  "fks": [
   {
    "name": "panel_types_material_price_id_fkey",
    "cols": [
     "material_price_id"
    ],
    "ref": "material_prices",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "payment_schedules": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "sale_id": "uuid",
   "seq": "int",
   "description": "text",
   "ratio_pct": "num",
   "amount": "num",
   "due_date": "date",
   "status": "text",
   "reminder_sent_at": "ts",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "payment_schedules_sale_id_fkey",
    "cols": [
     "sale_id"
    ],
    "ref": "sales",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "payments": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "sale_id": "uuid",
   "invoice_id": "uuid",
   "schedule_id": "uuid",
   "paid_on": "date",
   "amount": "num",
   "currency": "text",
   "exchange_rate": "num",
   "amount_try": "num",
   "method": "text",
   "reference": "text",
   "notes": "text",
   "recorded_by": "uuid",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "payments_invoice_id_fkey",
    "cols": [
     "invoice_id"
    ],
    "ref": "invoices",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "payments_recorded_by_fkey",
    "cols": [
     "recorded_by"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "payments_sale_id_fkey",
    "cols": [
     "sale_id"
    ],
    "ref": "sales",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "payments_schedule_id_fkey",
    "cols": [
     "schedule_id"
    ],
    "ref": "payment_schedules",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "post_comments": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "post_id": "uuid",
   "parent_id": "uuid",
   "user_id": "uuid",
   "author_name": "text",
   "author_email": "text",
   "body": "text",
   "status": "text",
   "locale": "text",
   "ip_masked": "text",
   "moderated_by": "uuid",
   "moderated_at": "ts",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "post_comments_moderated_by_fkey",
    "cols": [
     "moderated_by"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "post_comments_parent_id_fkey",
    "cols": [
     "parent_id"
    ],
    "ref": "post_comments",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "post_comments_post_id_fkey",
    "cols": [
     "post_id"
    ],
    "ref": "blog_posts",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "post_comments_user_id_fkey",
    "cols": [
     "user_id"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "post_likes": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "post_id": "uuid",
   "visitor_hash": "text",
   "created_at": "ts"
  },
  "fks": [
   {
    "name": "post_likes_post_id_fkey",
    "cols": [
     "post_id"
    ],
    "ref": "blog_posts",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "price_guide_rows": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "price_guide_id": "uuid",
   "system_type": "json",
   "description": "json",
   "material_price_id": "uuid",
   "min_factor": "num",
   "max_factor": "num",
   "created_at": "ts",
   "updated_at": "ts",
   "sort_order": "int"
  },
  "fks": [
   {
    "name": "price_guide_rows_material_price_fk",
    "cols": [
     "material_price_id"
    ],
    "ref": "material_prices",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "price_guide_rows_price_guide_id_fkey",
    "cols": [
     "price_guide_id"
    ],
    "ref": "price_guides",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "price_guides": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "slug": "json",
   "title": "json",
   "service_id": "uuid",
   "intro": "json",
   "factors": "json",
   "formula": "json",
   "disclaimer": "json",
   "quantity_unit": "text",
   "quantity_presets": "json",
   "vat_included": "bool",
   "prices_updated_at": "ts",
   "stale_after_days": "int",
   "created_at": "ts",
   "updated_at": "ts",
   "status": "text",
   "published_locales": "json",
   "published_at": "ts",
   "translation_meta": "json",
   "seo_title": "json",
   "seo_description": "json",
   "og_image_id": "uuid",
   "canonical_url": "text",
   "noindex": "bool",
   "focus_keyword": "json",
   "sort_order": "int"
  },
  "fks": [
   {
    "name": "price_guides_og_image_id_fkey",
    "cols": [
     "og_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "price_guides_service_id_fkey",
    "cols": [
     "service_id"
    ],
    "ref": "services",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "product_categories": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "slug": "json",
   "name": "json",
   "description": "json",
   "image_id": "uuid",
   "parent_id": "uuid",
   "is_active": "bool",
   "created_at": "ts",
   "updated_at": "ts",
   "seo_title": "json",
   "seo_description": "json",
   "og_image_id": "uuid",
   "canonical_url": "text",
   "noindex": "bool",
   "focus_keyword": "json",
   "sort_order": "int",
   "icon_key": "text"
  },
  "fks": [
   {
    "name": "product_categories_image_id_fkey",
    "cols": [
     "image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "product_categories_og_image_id_fkey",
    "cols": [
     "og_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "product_categories_parent_id_fkey",
    "cols": [
     "parent_id"
    ],
    "ref": "product_categories",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "product_documents": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "product_id": "uuid",
   "media_id": "uuid",
   "title": "json",
   "doc_type": "text",
   "locales": "json",
   "created_at": "ts",
   "updated_at": "ts",
   "sort_order": "int"
  },
  "fks": [
   {
    "name": "product_documents_media_id_fkey",
    "cols": [
     "media_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "product_documents_product_id_fkey",
    "cols": [
     "product_id"
    ],
    "ref": "products",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "product_images": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "product_id": "uuid",
   "media_id": "uuid",
   "alt": "json",
   "created_at": "ts",
   "updated_at": "ts",
   "sort_order": "int"
  },
  "fks": [
   {
    "name": "product_images_media_id_fkey",
    "cols": [
     "media_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "product_images_product_id_fkey",
    "cols": [
     "product_id"
    ],
    "ref": "products",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "product_specs": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "product_id": "uuid",
   "group_name": "json",
   "name": "json",
   "value": "json",
   "unit": "text",
   "created_at": "ts",
   "updated_at": "ts",
   "sort_order": "int"
  },
  "fks": [
   {
    "name": "product_specs_product_id_fkey",
    "cols": [
     "product_id"
    ],
    "ref": "products",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "product_variants": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "product_id": "uuid",
   "size_label": "text",
   "width_mm": "num",
   "height_mm": "num",
   "thickness_mm": "num",
   "length_mm": "num",
   "kg_per_m": "num",
   "stock_code": "text",
   "is_active": "bool",
   "created_at": "ts",
   "updated_at": "ts",
   "sort_order": "int",
   "variant_group": "json",
   "props": "json",
   "size_key": "text",
   "kg_per_m2": "num",
   "dims": "json"
  },
  "fks": [
   {
    "name": "product_variants_product_id_fkey",
    "cols": [
     "product_id"
    ],
    "ref": "products",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "products": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "slug": "json",
   "name": "json",
   "short_description": "json",
   "description": "json",
   "usage_areas": "json",
   "category_id": "uuid",
   "service_id": "uuid",
   "cover_image_id": "uuid",
   "is_featured": "bool",
   "created_at": "ts",
   "updated_at": "ts",
   "status": "text",
   "published_locales": "json",
   "published_at": "ts",
   "translation_meta": "json",
   "seo_title": "json",
   "seo_description": "json",
   "og_image_id": "uuid",
   "canonical_url": "text",
   "noindex": "bool",
   "focus_keyword": "json",
   "sort_order": "int",
   "options": "json",
   "facts": "json"
  },
  "fks": [
   {
    "name": "products_category_id_fkey",
    "cols": [
     "category_id"
    ],
    "ref": "product_categories",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "products_cover_image_id_fkey",
    "cols": [
     "cover_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "products_og_image_id_fkey",
    "cols": [
     "og_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "products_service_id_fkey",
    "cols": [
     "service_id"
    ],
    "ref": "services",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "profiles": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "full_name": "text",
   "phone": "text",
   "avatar_id": "uuid",
   "role": "text",
   "is_active": "bool",
   "must_change_password": "bool",
   "preferred_locale": "text",
   "notification_prefs": "json",
   "last_seen_at": "ts",
   "created_at": "ts",
   "updated_at": "ts",
   "saved_basket": "json"
  },
  "fks": [
   {
    "name": "profiles_avatar_fk",
    "cols": [
     "avatar_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "profiles_id_fkey",
    "cols": [
     "id"
    ],
    "ref": "users",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "project_categories": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "slug": "json",
   "name": "json",
   "description": "json",
   "is_active": "bool",
   "created_at": "ts",
   "updated_at": "ts",
   "seo_title": "json",
   "seo_description": "json",
   "og_image_id": "uuid",
   "canonical_url": "text",
   "noindex": "bool",
   "focus_keyword": "json",
   "sort_order": "int",
   "drawing_key": "text"
  },
  "fks": [
   {
    "name": "project_categories_og_image_id_fkey",
    "cols": [
     "og_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "project_category_relations": {
  "pk": [
   "project_id",
   "category_id"
  ],
  "cols": {
   "project_id": "uuid",
   "category_id": "uuid",
   "created_at": "ts"
  },
  "fks": [
   {
    "name": "project_category_relations_category_id_fkey",
    "cols": [
     "category_id"
    ],
    "ref": "project_categories",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "project_category_relations_project_id_fkey",
    "cols": [
     "project_id"
    ],
    "ref": "projects",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "project_images": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "project_id": "uuid",
   "media_id": "uuid",
   "alt": "json",
   "caption": "json",
   "created_at": "ts",
   "updated_at": "ts",
   "sort_order": "int"
  },
  "fks": [
   {
    "name": "project_images_media_id_fkey",
    "cols": [
     "media_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "project_images_project_id_fkey",
    "cols": [
     "project_id"
    ],
    "ref": "projects",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "projects": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "slug": "json",
   "title": "json",
   "excerpt": "json",
   "body": "json",
   "location": "json",
   "client_name": "text",
   "client_id": "uuid",
   "sale_id": "uuid",
   "area_m2": "num",
   "tonnage": "num",
   "started_on": "date",
   "completed_on": "date",
   "cover_image_id": "uuid",
   "is_featured": "bool",
   "created_at": "ts",
   "updated_at": "ts",
   "status": "text",
   "published_locales": "json",
   "published_at": "ts",
   "translation_meta": "json",
   "seo_title": "json",
   "seo_description": "json",
   "og_image_id": "uuid",
   "canonical_url": "text",
   "noindex": "bool",
   "focus_keyword": "json",
   "sort_order": "int",
   "phase": "text",
   "duration_label": "json",
   "year": "int",
   "drawing_key": "text"
  },
  "fks": [
   {
    "name": "projects_client_fk",
    "cols": [
     "client_id"
    ],
    "ref": "clients",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "projects_cover_image_id_fkey",
    "cols": [
     "cover_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "projects_og_image_id_fkey",
    "cols": [
     "og_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "projects_sale_fk",
    "cols": [
     "sale_id"
    ],
    "ref": "sales",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "redirects": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "source_path": "text",
   "target_path": "text",
   "status_code": "int",
   "is_active": "bool",
   "hit_count": "int",
   "last_hit_at": "ts",
   "note": "text",
   "created_by": "uuid",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "redirects_created_by_fkey",
    "cols": [
     "created_by"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "review_sync_runs": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "started_at": "ts",
   "finished_at": "ts",
   "status": "text",
   "fetched_count": "int",
   "inserted_count": "int",
   "updated_count": "int",
   "error": "text",
   "created_at": "ts"
  },
  "fks": []
 },
 "sale_expenses": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "sale_id": "uuid",
   "category": "text",
   "description": "text",
   "amount": "num",
   "expense_date": "date",
   "sort_order": "int",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "sale_expenses_sale_id_fkey",
    "cols": [
     "sale_id"
    ],
    "ref": "sales",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "sale_items": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "sale_id": "uuid",
   "service_id": "uuid",
   "product_id": "uuid",
   "description": "text",
   "quantity": "num",
   "unit": "text",
   "unit_price": "num",
   "line_total": "num",
   "unit_cost": "num",
   "line_cost": "num",
   "line_profit": "num",
   "sort_order": "int",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "sale_items_product_id_fkey",
    "cols": [
     "product_id"
    ],
    "ref": "products",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "sale_items_sale_id_fkey",
    "cols": [
     "sale_id"
    ],
    "ref": "sales",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "sale_items_service_id_fkey",
    "cols": [
     "service_id"
    ],
    "ref": "services",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "sales": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "sale_no": "text",
   "customer_id": "uuid",
   "lead_id": "uuid",
   "configuration_id": "uuid",
   "project_id": "uuid",
   "sale_date": "date",
   "status": "text",
   "currency": "text",
   "exchange_rate": "num",
   "exchange_rate_date": "date",
   "exchange_rate_source": "text",
   "subtotal": "num",
   "discount_pct": "num",
   "discount_amount": "num",
   "is_invoiced": "bool",
   "vat_rate": "num",
   "vat_amount": "num",
   "grand_total": "num",
   "grand_total_try": "num",
   "total_cost": "num",
   "gross_profit": "num",
   "margin_pct": "num",
   "notes": "text",
   "assigned_to": "uuid",
   "created_by": "uuid",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "sales_assigned_to_fkey",
    "cols": [
     "assigned_to"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "sales_configuration_fk",
    "cols": [
     "configuration_id"
    ],
    "ref": "configurations",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "sales_created_by_fkey",
    "cols": [
     "created_by"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "sales_customer_id_fkey",
    "cols": [
     "customer_id"
    ],
    "ref": "customers",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "sales_lead_id_fkey",
    "cols": [
     "lead_id"
    ],
    "ref": "leads",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "sales_project_id_fkey",
    "cols": [
     "project_id"
    ],
    "ref": "projects",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "scroll_depth_aggregates": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "path": "text",
   "device": "text",
   "day": "date",
   "views": "int",
   "reached_25": "int",
   "reached_50": "int",
   "reached_75": "int",
   "reached_100": "int",
   "created_at": "ts"
  },
  "fks": []
 },
 "service_images": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "service_id": "uuid",
   "media_id": "uuid",
   "alt": "json",
   "caption": "json",
   "created_at": "ts",
   "updated_at": "ts",
   "sort_order": "int"
  },
  "fks": [
   {
    "name": "service_images_media_id_fkey",
    "cols": [
     "media_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "service_images_service_id_fkey",
    "cols": [
     "service_id"
    ],
    "ref": "services",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "service_projects": {
  "pk": [
   "service_id",
   "project_id"
  ],
  "cols": {
   "service_id": "uuid",
   "project_id": "uuid",
   "created_at": "ts"
  },
  "fks": [
   {
    "name": "service_projects_project_id_fkey",
    "cols": [
     "project_id"
    ],
    "ref": "projects",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "service_projects_service_id_fkey",
    "cols": [
     "service_id"
    ],
    "ref": "services",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "services": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "slug": "json",
   "title": "json",
   "excerpt": "json",
   "body": "json",
   "process_steps": "json",
   "icon": "text",
   "cover_image_id": "uuid",
   "is_featured": "bool",
   "created_at": "ts",
   "updated_at": "ts",
   "status": "text",
   "published_locales": "json",
   "published_at": "ts",
   "translation_meta": "json",
   "seo_title": "json",
   "seo_description": "json",
   "og_image_id": "uuid",
   "canonical_url": "text",
   "noindex": "bool",
   "focus_keyword": "json",
   "sort_order": "int",
   "group_key": "text",
   "highlights": "json",
   "drawing_key": "text",
   "project_category_id": "uuid"
  },
  "fks": [
   {
    "name": "services_cover_image_id_fkey",
    "cols": [
     "cover_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "services_og_image_id_fkey",
    "cols": [
     "og_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "services_project_category_id_fkey",
    "cols": [
     "project_category_id"
    ],
    "ref": "project_categories",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "site_settings": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "key": "text",
   "value": "json",
   "is_public": "bool",
   "description": "text",
   "updated_by": "uuid",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "site_settings_updated_by_fkey",
    "cols": [
     "updated_by"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "slug_history": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "entity_type": "text",
   "entity_id": "uuid",
   "locale": "text",
   "old_slug": "text",
   "created_at": "ts"
  },
  "fks": []
 },
 "solutions": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "slug": "json",
   "title": "json",
   "service_id": "uuid",
   "hero_summary": "json",
   "problem": "json",
   "comparison": "json",
   "advantages": "json",
   "technical_basis": "json",
   "cta": "json",
   "cover_image_id": "uuid",
   "created_at": "ts",
   "updated_at": "ts",
   "status": "text",
   "published_locales": "json",
   "published_at": "ts",
   "translation_meta": "json",
   "seo_title": "json",
   "seo_description": "json",
   "og_image_id": "uuid",
   "canonical_url": "text",
   "noindex": "bool",
   "focus_keyword": "json",
   "sort_order": "int"
  },
  "fks": [
   {
    "name": "solutions_cover_image_id_fkey",
    "cols": [
     "cover_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "solutions_og_image_id_fkey",
    "cols": [
     "og_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "solutions_service_id_fkey",
    "cols": [
     "service_id"
    ],
    "ref": "services",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "static_pages": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "page_key": "text",
   "kind": "text",
   "slug": "json",
   "title": "json",
   "body": "json",
   "extra": "json",
   "auto_translate_disabled": "bool",
   "created_at": "ts",
   "updated_at": "ts",
   "status": "text",
   "published_locales": "json",
   "published_at": "ts",
   "translation_meta": "json",
   "seo_title": "json",
   "seo_description": "json",
   "og_image_id": "uuid",
   "canonical_url": "text",
   "noindex": "bool",
   "focus_keyword": "json"
  },
  "fks": [
   {
    "name": "static_pages_og_image_id_fkey",
    "cols": [
     "og_image_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "steel_profiles": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "code": "text",
   "family": "text",
   "kg_per_m": "num",
   "dimensions": "json",
   "usage": "text",
   "is_active": "bool",
   "created_at": "ts",
   "updated_at": "ts",
   "sort_order": "int",
   "label": "text",
   "kind": "text"
  },
  "fks": []
 },
 "team_members": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "full_name": "text",
   "position": "json",
   "bio": "json",
   "photo_id": "uuid",
   "email": "text",
   "linkedin_url": "text",
   "profile_id": "uuid",
   "created_at": "ts",
   "updated_at": "ts",
   "status": "text",
   "published_locales": "json",
   "published_at": "ts",
   "translation_meta": "json",
   "sort_order": "int"
  },
  "fks": [
   {
    "name": "team_members_photo_id_fkey",
    "cols": [
     "photo_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "team_members_profile_id_fkey",
    "cols": [
     "profile_id"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "testimonials": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "source": "text",
   "external_id": "text",
   "author_name": "text",
   "author_title": "json",
   "company": "text",
   "avatar_id": "uuid",
   "avatar_url": "text",
   "rating": "int",
   "body": "json",
   "original_locale": "text",
   "is_verified": "bool",
   "is_featured": "bool",
   "service_id": "uuid",
   "project_id": "uuid",
   "product_id": "uuid",
   "reviewed_on": "date",
   "status": "text",
   "created_at": "ts",
   "updated_at": "ts",
   "sort_order": "int",
   "consent_kvkk_at": "ts",
   "ip_masked": "text",
   "is_sample": "bool"
  },
  "fks": [
   {
    "name": "testimonials_avatar_id_fkey",
    "cols": [
     "avatar_id"
    ],
    "ref": "media_library",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "testimonials_product_id_fkey",
    "cols": [
     "product_id"
    ],
    "ref": "products",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "testimonials_project_id_fkey",
    "cols": [
     "project_id"
    ],
    "ref": "projects",
    "refCols": [
     "id"
    ]
   },
   {
    "name": "testimonials_service_id_fkey",
    "cols": [
     "service_id"
    ],
    "ref": "services",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "translation_glossary": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "term_tr": "text",
   "term_en": "text",
   "context": "text",
   "do_not_translate": "bool",
   "is_case_sensitive": "bool",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": []
 },
 "ui_translations": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "namespace": "text",
   "key": "text",
   "locale": "text",
   "value": "text",
   "updated_by": "uuid",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": [
   {
    "name": "ui_translations_updated_by_fkey",
    "cols": [
     "updated_by"
    ],
    "ref": "profiles",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "web_vitals": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "session_id": "uuid",
   "path": "text",
   "device": "text",
   "metric": "text",
   "value": "num",
   "rating": "text",
   "recorded_at": "ts",
   "created_at": "ts"
  },
  "fks": [
   {
    "name": "web_vitals_session_id_fkey",
    "cols": [
     "session_id"
    ],
    "ref": "analytics_sessions",
    "refCols": [
     "id"
    ]
   }
  ]
 },
 "whatsapp_settings": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "key": "text",
   "is_enabled": "bool",
   "phone_e164": "text",
   "display_name": "json",
   "greeting": "json",
   "reply_time": "json",
   "message_templates": "json",
   "working_hours": "json",
   "hidden_paths": "json",
   "show_delay_seconds": "int",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": []
 },
 "users": {
  "pk": [
   "id"
  ],
  "cols": {
   "id": "uuid",
   "email": "text",
   "password_hash": "text",
   "email_confirmed_at": "ts",
   "last_sign_in_at": "ts",
   "meta": "json",
   "created_at": "ts",
   "updated_at": "ts"
  },
  "fks": []
 }
};
