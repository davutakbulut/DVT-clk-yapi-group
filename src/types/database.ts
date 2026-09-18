export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      about_content: {
        Row: {
          body: Json
          canonical_url: string | null
          created_at: string
          eyebrow: Json
          focus_keyword: Json
          id: string
          image_id: string | null
          key: string
          noindex: boolean
          og_image_id: string | null
          published_at: string | null
          published_locales: string[]
          seo_description: Json
          seo_title: Json
          stats: Json
          status: string
          title: Json
          translation_meta: Json
          updated_at: string
        }
        Insert: {
          body?: Json
          canonical_url?: string | null
          created_at?: string
          eyebrow?: Json
          focus_keyword?: Json
          id?: string
          image_id?: string | null
          key?: string
          noindex?: boolean
          og_image_id?: string | null
          published_at?: string | null
          published_locales?: string[]
          seo_description?: Json
          seo_title?: Json
          stats?: Json
          status?: string
          title?: Json
          translation_meta?: Json
          updated_at?: string
        }
        Update: {
          body?: Json
          canonical_url?: string | null
          created_at?: string
          eyebrow?: Json
          focus_keyword?: Json
          id?: string
          image_id?: string | null
          key?: string
          noindex?: boolean
          og_image_id?: string | null
          published_at?: string | null
          published_locales?: string[]
          seo_description?: Json
          seo_title?: Json
          stats?: Json
          status?: string
          title?: Json
          translation_meta?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "about_content_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "about_content_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          device: string
          element_text: string | null
          id: string
          occurred_at: string
          pageview_id: string | null
          path: string
          payload: Json
          selector: string | null
          session_id: string
          type: string
          x_pct: number | null
          y_pct: number | null
        }
        Insert: {
          created_at?: string
          device: string
          element_text?: string | null
          id?: string
          occurred_at?: string
          pageview_id?: string | null
          path: string
          payload?: Json
          selector?: string | null
          session_id: string
          type: string
          x_pct?: number | null
          y_pct?: number | null
        }
        Update: {
          created_at?: string
          device?: string
          element_text?: string | null
          id?: string
          occurred_at?: string
          pageview_id?: string | null
          path?: string
          payload?: Json
          selector?: string | null
          session_id?: string
          type?: string
          x_pct?: number | null
          y_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_pageview_id_fkey"
            columns: ["pageview_id"]
            isOneToOne: false
            referencedRelation: "analytics_pageviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_pageviews: {
        Row: {
          created_at: string
          duration_ms: number | null
          id: string
          locale: string | null
          max_scroll_pct: number | null
          path: string
          session_id: string
          viewed_at: string
          viewport_h: number | null
          viewport_w: number | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          locale?: string | null
          max_scroll_pct?: number | null
          path: string
          session_id: string
          viewed_at?: string
          viewport_h?: number | null
          viewport_w?: number | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          locale?: string | null
          max_scroll_pct?: number | null
          path?: string
          session_id?: string
          viewed_at?: string
          viewport_h?: number | null
          viewport_w?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_pageviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_sessions: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string
          device: string
          exit_path: string | null
          id: string
          ip_masked: string | null
          landing_path: string | null
          last_seen_at: string
          locale: string | null
          os: string | null
          pageview_count: number
          referrer_host: string | null
          referrer_kind: string
          started_at: string
          utm: Json
          visitor_hash: string
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device: string
          exit_path?: string | null
          id?: string
          ip_masked?: string | null
          landing_path?: string | null
          last_seen_at?: string
          locale?: string | null
          os?: string | null
          pageview_count?: number
          referrer_host?: string | null
          referrer_kind?: string
          started_at?: string
          utm?: Json
          visitor_hash: string
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device?: string
          exit_path?: string | null
          id?: string
          ip_masked?: string | null
          landing_path?: string | null
          last_seen_at?: string
          locale?: string | null
          os?: string | null
          pageview_count?: number
          referrer_host?: string | null
          referrer_kind?: string
          started_at?: string
          utm?: Json
          visitor_hash?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: Json
          focus_keyword: Json
          id: string
          is_active: boolean
          name: Json
          noindex: boolean
          og_image_id: string | null
          seo_description: Json
          seo_title: Json
          slug: Json
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: Json
          focus_keyword?: Json
          id?: string
          is_active?: boolean
          name: Json
          noindex?: boolean
          og_image_id?: string | null
          seo_description?: Json
          seo_title?: Json
          slug: Json
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: Json
          focus_keyword?: Json
          id?: string
          is_active?: boolean
          name?: Json
          noindex?: boolean
          og_image_id?: string | null
          seo_description?: Json
          seo_title?: Json
          slug?: Json
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_categories_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_tags: {
        Row: {
          created_at: string
          post_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          allow_comments: boolean
          author_id: string | null
          body: Json
          canonical_url: string | null
          category_id: string | null
          cover_image_id: string | null
          created_at: string
          excerpt: Json
          focus_keyword: Json
          id: string
          is_featured: boolean
          noindex: boolean
          og_image_id: string | null
          published_at: string | null
          published_locales: string[]
          reading_minutes: Json
          seo_description: Json
          seo_title: Json
          slug: Json
          status: string
          title: Json
          translation_meta: Json
          updated_at: string
        }
        Insert: {
          allow_comments?: boolean
          author_id?: string | null
          body?: Json
          canonical_url?: string | null
          category_id?: string | null
          cover_image_id?: string | null
          created_at?: string
          excerpt?: Json
          focus_keyword?: Json
          id?: string
          is_featured?: boolean
          noindex?: boolean
          og_image_id?: string | null
          published_at?: string | null
          published_locales?: string[]
          reading_minutes?: Json
          seo_description?: Json
          seo_title?: Json
          slug: Json
          status?: string
          title: Json
          translation_meta?: Json
          updated_at?: string
        }
        Update: {
          allow_comments?: boolean
          author_id?: string | null
          body?: Json
          canonical_url?: string | null
          category_id?: string | null
          cover_image_id?: string | null
          created_at?: string
          excerpt?: Json
          focus_keyword?: Json
          id?: string
          is_featured?: boolean
          noindex?: boolean
          og_image_id?: string | null
          published_at?: string | null
          published_locales?: string[]
          reading_minutes?: Json
          seo_description?: Json
          seo_title?: Json
          slug?: Json
          status?: string
          title?: Json
          translation_meta?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_fk"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_cover_image_id_fkey"
            columns: ["cover_image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string
          id: string
          name: Json
          slug: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: Json
          slug: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: Json
          slug?: Json
          updated_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_no: string | null
          created_at: string
          description: Json
          document_id: string | null
          id: string
          image_id: string | null
          issued_on: string | null
          issuer: string | null
          published_at: string | null
          published_locales: string[]
          sort_order: number | null
          status: string
          title: Json
          translation_meta: Json
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          certificate_no?: string | null
          created_at?: string
          description?: Json
          document_id?: string | null
          id?: string
          image_id?: string | null
          issued_on?: string | null
          issuer?: string | null
          published_at?: string | null
          published_locales?: string[]
          sort_order?: number | null
          status?: string
          title: Json
          translation_meta?: Json
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          certificate_no?: string | null
          created_at?: string
          description?: Json
          document_id?: string | null
          id?: string
          image_id?: string | null
          issued_on?: string | null
          issuer?: string | null
          published_at?: string | null
          published_locales?: string[]
          sort_order?: number | null
          status?: string
          title?: Json
          translation_meta?: Json
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_featured: boolean
          logo_id: string | null
          name: string
          sector: Json
          sort_order: number | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          logo_id?: string | null
          name: string
          sector?: Json
          sort_order?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          logo_id?: string | null
          name?: string
          sector?: Json
          sort_order?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_logo_id_fkey"
            columns: ["logo_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
        ]
      }
      configuration_items: {
        Row: {
          configuration_version_id: string
          created_at: string
          element_group: string
          id: string
          line_price: number | null
          panel_type_id: string | null
          piece_count: number | null
          profile_code_snapshot: string | null
          sort_order: number
          steel_profile_id: string | null
          total_area_m2: number | null
          total_length_m: number | null
          total_weight_kg: number | null
        }
        Insert: {
          configuration_version_id: string
          created_at?: string
          element_group: string
          id?: string
          line_price?: number | null
          panel_type_id?: string | null
          piece_count?: number | null
          profile_code_snapshot?: string | null
          sort_order?: number
          steel_profile_id?: string | null
          total_area_m2?: number | null
          total_length_m?: number | null
          total_weight_kg?: number | null
        }
        Update: {
          configuration_version_id?: string
          created_at?: string
          element_group?: string
          id?: string
          line_price?: number | null
          panel_type_id?: string | null
          piece_count?: number | null
          profile_code_snapshot?: string | null
          sort_order?: number
          steel_profile_id?: string | null
          total_area_m2?: number | null
          total_length_m?: number | null
          total_weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "configuration_items_configuration_version_id_fkey"
            columns: ["configuration_version_id"]
            isOneToOne: false
            referencedRelation: "configuration_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuration_items_panel_type_id_fkey"
            columns: ["panel_type_id"]
            isOneToOne: false
            referencedRelation: "panel_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuration_items_steel_profile_id_fkey"
            columns: ["steel_profile_id"]
            isOneToOne: false
            referencedRelation: "steel_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      configuration_versions: {
        Row: {
          configuration_id: string
          created_at: string
          estimated_price: number | null
          id: string
          note: string | null
          params: Json
          price_snapshot: Json
          tonnage_kg: number | null
          version: number
        }
        Insert: {
          configuration_id: string
          created_at?: string
          estimated_price?: number | null
          id?: string
          note?: string | null
          params: Json
          price_snapshot?: Json
          tonnage_kg?: number | null
          version: number
        }
        Update: {
          configuration_id?: string
          created_at?: string
          estimated_price?: number | null
          id?: string
          note?: string | null
          params?: Json
          price_snapshot?: Json
          tonnage_kg?: number | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "configuration_versions_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      configurations: {
        Row: {
          claimed_at: string | null
          created_at: string
          currency: string
          current_version: number
          estimated_price: number | null
          id: string
          ip_masked: string | null
          is_shared: boolean
          lead_id: string | null
          locale: string
          name: string
          owner_email: string | null
          params: Json
          public_token: string
          ref_code: string
          sale_id: string | null
          share_price: boolean
          status: string
          tonnage_kg: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          currency?: string
          current_version?: number
          estimated_price?: number | null
          id?: string
          ip_masked?: string | null
          is_shared?: boolean
          lead_id?: string | null
          locale?: string
          name?: string
          owner_email?: string | null
          params: Json
          public_token?: string
          ref_code?: string
          sale_id?: string | null
          share_price?: boolean
          status?: string
          tonnage_kg?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          currency?: string
          current_version?: number
          estimated_price?: number | null
          id?: string
          ip_masked?: string | null
          is_shared?: boolean
          lead_id?: string | null
          locale?: string
          name?: string
          owner_email?: string | null
          params?: Json
          public_token?: string
          ref_code?: string
          sale_id?: string | null
          share_price?: boolean
          status?: string
          tonnage_kg?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configurations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configurations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configurations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_without_cost"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configurations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      configurator_rules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      content_links: {
        Row: {
          created_at: string
          from_id: string
          from_type: string
          id: string
          relation: string
          sort_order: number
          to_id: string
          to_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_id: string
          from_type: string
          id?: string
          relation?: string
          sort_order?: number
          to_id: string
          to_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_id?: string
          from_type?: string
          id?: string
          relation?: string
          sort_order?: number
          to_id?: string
          to_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_revisions: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          note: string | null
          snapshot: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          note?: string | null
          snapshot: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          note?: string | null
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "content_revisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_heartbeats: {
        Row: {
          alerted_at: string | null
          created_at: string
          expected_interval_seconds: number
          id: string
          job_key: string
          last_duration_ms: number | null
          last_error: string | null
          last_run_at: string | null
          last_status: string | null
          updated_at: string
        }
        Insert: {
          alerted_at?: string | null
          created_at?: string
          expected_interval_seconds: number
          id?: string
          job_key: string
          last_duration_ms?: number | null
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          updated_at?: string
        }
        Update: {
          alerted_at?: string | null
          created_at?: string
          expected_interval_seconds?: number
          id?: string
          job_key?: string
          last_duration_ms?: number | null
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          anonymized_at: string | null
          city: string | null
          company_title: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          district: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          profile_id: string | null
          source: string
          tax_id: string | null
          tax_office: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          anonymized_at?: string | null
          city?: string | null
          company_title?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          source?: string
          tax_id?: string | null
          tax_office?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          anonymized_at?: string | null
          city?: string | null
          company_title?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          source?: string
          tax_id?: string | null
          tax_office?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_counters: {
        Row: {
          last_no: number
          prefix: string
          year: number
        }
        Insert: {
          last_no?: number
          prefix: string
          year: number
        }
        Update: {
          last_no?: number
          prefix?: string
          year?: number
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          provider: string
          provider_message_id: string | null
          queue_id: string | null
          related_id: string | null
          related_type: string | null
          status: string
          subject: string
          template_key: string | null
          to_email: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          provider: string
          provider_message_id?: string | null
          queue_id?: string | null
          related_id?: string | null
          related_type?: string | null
          status: string
          subject: string
          template_key?: string | null
          to_email: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          provider?: string
          provider_message_id?: string | null
          queue_id?: string | null
          related_id?: string | null
          related_type?: string | null
          status?: string
          subject?: string
          template_key?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "email_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          locale: string
          locked_at: string | null
          max_attempts: number
          next_attempt_at: string
          payload: Json
          priority: number
          related_id: string | null
          related_type: string | null
          status: string
          template_key: string
          to_email: string
          to_name: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          locale?: string
          locked_at?: string | null
          max_attempts?: number
          next_attempt_at?: string
          payload?: Json
          priority?: number
          related_id?: string | null
          related_type?: string | null
          status?: string
          template_key: string
          to_email: string
          to_name?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          locale?: string
          locked_at?: string | null
          max_attempts?: number
          next_attempt_at?: string
          payload?: Json
          priority?: number
          related_id?: string | null
          related_type?: string | null
          status?: string
          template_key?: string
          to_email?: string
          to_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: Json
          created_at: string
          id: string
          is_active: boolean
          key: string
          name: string
          subject: Json
          updated_at: string
          variables: Json
        }
        Insert: {
          body: Json
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          name: string
          subject: Json
          updated_at?: string
          variables?: Json
        }
        Update: {
          body?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          subject?: Json
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          affected_users: number
          code: string | null
          context: Json
          created_at: string
          fingerprint: string
          first_seen_at: string
          id: string
          ip_masked: string | null
          last_seen_at: string
          level: string
          message: string
          module: string
          occurrences: number
          path: string | null
          resolved_at: string | null
          resolved_by: string | null
          source: string
          stack: string | null
          status_code: number | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          affected_users?: number
          code?: string | null
          context?: Json
          created_at?: string
          fingerprint: string
          first_seen_at?: string
          id?: string
          ip_masked?: string | null
          last_seen_at?: string
          level?: string
          message: string
          module?: string
          occurrences?: number
          path?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          stack?: string | null
          status_code?: number | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          affected_users?: number
          code?: string | null
          context?: Json
          created_at?: string
          fingerprint?: string
          first_seen_at?: string
          id?: string
          ip_masked?: string | null
          last_seen_at?: string
          level?: string
          message?: string
          module?: string
          occurrences?: number
          path?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          stack?: string | null
          status_code?: number | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string
          currency: string
          fetched_at: string
          id: string
          rate: number
          rate_date: string
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          fetched_at?: string
          id?: string
          rate: number
          rate_date: string
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          fetched_at?: string
          id?: string
          rate?: number
          rate_date?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: Json
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          published_at: string | null
          published_locales: string[]
          question: Json
          sort_order: number
          status: string
          translation_meta: Json
          updated_at: string
        }
        Insert: {
          answer?: Json
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          published_at?: string | null
          published_locales?: string[]
          question: Json
          sort_order?: number
          status?: string
          translation_meta?: Json
          updated_at?: string
        }
        Update: {
          answer?: Json
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          published_at?: string | null
          published_locales?: string[]
          question?: Json
          sort_order?: number
          status?: string
          translation_meta?: Json
          updated_at?: string
        }
        Relationships: []
      }
      form_analytics: {
        Row: {
          abandon_count: number
          created_at: string
          day: string
          device: string
          error_count: number
          field_name: string
          focus_count: number
          form_key: string
          id: string
          total_time_ms: number
        }
        Insert: {
          abandon_count?: number
          created_at?: string
          day: string
          device: string
          error_count?: number
          field_name: string
          focus_count?: number
          form_key: string
          id?: string
          total_time_ms?: number
        }
        Update: {
          abandon_count?: number
          created_at?: string
          day?: string
          device?: string
          error_count?: number
          field_name?: string
          focus_count?: number
          form_key?: string
          id?: string
          total_time_ms?: number
        }
        Relationships: []
      }
      funnel_steps: {
        Row: {
          created_at: string
          funnel_id: string
          id: string
          match_type: string
          match_value: string
          name: string
          seq: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          funnel_id: string
          id?: string
          match_type: string
          match_value: string
          name: string
          seq: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          funnel_id?: string
          id?: string
          match_type?: string
          match_value?: string
          name?: string
          seq?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_steps_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      heatmap_aggregates: {
        Row: {
          bucket_x: number
          bucket_y: number
          created_at: string
          day: string
          device: string
          hits: number
          id: string
          kind: string
          path: string
        }
        Insert: {
          bucket_x: number
          bucket_y: number
          created_at?: string
          day: string
          device: string
          hits: number
          id?: string
          kind: string
          path: string
        }
        Update: {
          bucket_x?: number
          bucket_y?: number
          created_at?: string
          day?: string
          device?: string
          hits?: number
          id?: string
          kind?: string
          path?: string
        }
        Relationships: []
      }
      hero_media: {
        Row: {
          created_at: string
          cta_label: Json
          cta_path: string | null
          desktop_poster_id: string | null
          desktop_video_id: string | null
          duration_seconds: number | null
          headline: Json
          id: string
          is_active: boolean
          label: string
          mobile_poster_id: string | null
          mobile_video_id: string | null
          subheadline: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: Json
          cta_path?: string | null
          desktop_poster_id?: string | null
          desktop_video_id?: string | null
          duration_seconds?: number | null
          headline?: Json
          id?: string
          is_active?: boolean
          label: string
          mobile_poster_id?: string | null
          mobile_video_id?: string | null
          subheadline?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: Json
          cta_path?: string | null
          desktop_poster_id?: string | null
          desktop_video_id?: string | null
          duration_seconds?: number | null
          headline?: Json
          id?: string
          is_active?: boolean
          label?: string
          mobile_poster_id?: string | null
          mobile_video_id?: string | null
          subheadline?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hero_media_desktop_poster_id_fkey"
            columns: ["desktop_poster_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hero_media_desktop_video_id_fkey"
            columns: ["desktop_video_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hero_media_mobile_poster_id_fkey"
            columns: ["mobile_poster_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hero_media_mobile_video_id_fkey"
            columns: ["mobile_video_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          base_amount: number
          collectable_amount: number
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string
          due_date: string | null
          exchange_rate: number
          id: string
          invoice_no: string | null
          issue_date: string | null
          notes: string | null
          sale_id: string
          status: string
          total_amount: number
          type: string
          updated_at: string
          vat_amount: number
          vat_rate: number
          withholding_amount: number
          withholding_ratio: number | null
        }
        Insert: {
          base_amount: number
          collectable_amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id: string
          due_date?: string | null
          exchange_rate?: number
          id?: string
          invoice_no?: string | null
          issue_date?: string | null
          notes?: string | null
          sale_id: string
          status?: string
          total_amount: number
          type: string
          updated_at?: string
          vat_amount: number
          vat_rate?: number
          withholding_amount?: number
          withholding_ratio?: number | null
        }
        Update: {
          base_amount?: number
          collectable_amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string
          due_date?: string | null
          exchange_rate?: number
          id?: string
          invoice_no?: string | null
          issue_date?: string | null
          notes?: string | null
          sale_id?: string
          status?: string
          total_amount?: number
          type?: string
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          withholding_amount?: number
          withholding_ratio?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_without_cost"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          consent_kvkk_at: string
          cover_letter: string | null
          created_at: string
          cv_bucket: string
          cv_path: string | null
          email: string
          full_name: string
          id: string
          internal_notes: string | null
          job_posting_id: string | null
          locale: string
          phone: string | null
          retention_until: string
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          consent_kvkk_at: string
          cover_letter?: string | null
          created_at?: string
          cv_bucket?: string
          cv_path?: string | null
          email: string
          full_name: string
          id?: string
          internal_notes?: string | null
          job_posting_id?: string | null
          locale?: string
          phone?: string | null
          retention_until?: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          consent_kvkk_at?: string
          cover_letter?: string | null
          created_at?: string
          cv_bucket?: string
          cv_path?: string | null
          email?: string
          full_name?: string
          id?: string
          internal_notes?: string | null
          job_posting_id?: string | null
          locale?: string
          phone?: string | null
          retention_until?: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          application_deadline: string | null
          canonical_url: string | null
          created_at: string
          department: Json
          description: Json
          employment_type: string
          focus_keyword: Json
          id: string
          is_open: boolean
          location: Json
          noindex: boolean
          og_image_id: string | null
          published_at: string | null
          published_locales: string[]
          requirements: Json
          seo_description: Json
          seo_title: Json
          slug: Json
          status: string
          title: Json
          translation_meta: Json
          updated_at: string
        }
        Insert: {
          application_deadline?: string | null
          canonical_url?: string | null
          created_at?: string
          department?: Json
          description?: Json
          employment_type?: string
          focus_keyword?: Json
          id?: string
          is_open?: boolean
          location?: Json
          noindex?: boolean
          og_image_id?: string | null
          published_at?: string | null
          published_locales?: string[]
          requirements?: Json
          seo_description?: Json
          seo_title?: Json
          slug: Json
          status?: string
          title: Json
          translation_meta?: Json
          updated_at?: string
        }
        Update: {
          application_deadline?: string | null
          canonical_url?: string | null
          created_at?: string
          department?: Json
          description?: Json
          employment_type?: string
          focus_keyword?: Json
          id?: string
          is_open?: boolean
          location?: Json
          noindex?: boolean
          og_image_id?: string | null
          published_at?: string | null
          published_locales?: string[]
          requirements?: Json
          seo_description?: Json
          seo_title?: Json
          slug?: Json
          status?: string
          title?: Json
          translation_meta?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          lead_id: string
          mime_type: string
          size_bytes: number
          storage_bucket: string
          storage_path: string
          updated_at: string
          uploaded_by_visitor: boolean
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          lead_id: string
          mime_type: string
          size_bytes: number
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          uploaded_by_visitor?: boolean
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          lead_id?: string
          mime_type?: string
          size_bytes?: number
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          uploaded_by_visitor?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lead_attachments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_items: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          note: string | null
          product_id: string | null
          product_name_snapshot: string
          quantity: number
          sort_order: number
          stock_code_snapshot: string | null
          unit: string | null
          updated_at: string
          variant_id: string | null
          variant_label_snapshot: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          note?: string | null
          product_id?: string | null
          product_name_snapshot: string
          quantity: number
          sort_order?: number
          stock_code_snapshot?: string | null
          unit?: string | null
          updated_at?: string
          variant_id?: string | null
          variant_label_snapshot?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          note?: string | null
          product_id?: string | null
          product_name_snapshot?: string
          quantity?: number
          sort_order?: number
          stock_code_snapshot?: string | null
          unit?: string | null
          updated_at?: string
          variant_id?: string | null
          variant_label_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_items_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          is_pinned: boolean
          lead_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          lead_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          lead_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_replies: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          email_log_id: string | null
          id: string
          lead_id: string
          sent_at: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          email_log_id?: string | null
          id?: string
          lead_id: string
          sent_at?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          email_log_id?: string | null
          id?: string
          lead_id?: string
          sent_at?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_replies_email_log_fk"
            columns: ["email_log_id"]
            isOneToOne: false
            referencedRelation: "email_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_replies_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          anonymized_at: string | null
          assigned_to: string | null
          city: string | null
          company: string | null
          configuration_id: string | null
          consent_kvkk_at: string
          consent_marketing: boolean
          created_at: string
          customer_id: string | null
          email: string | null
          form_data: Json
          full_name: string
          id: string
          ip_masked: string | null
          locale: string
          lost_reason: string | null
          message: string | null
          page_url: string | null
          phone: string | null
          quoted_amount: number | null
          quoted_currency: string | null
          ref_no: string
          service_id: string | null
          source: string
          status: string
          subject: string | null
          updated_at: string
          user_id: string | null
          utm: Json
        }
        Insert: {
          anonymized_at?: string | null
          assigned_to?: string | null
          city?: string | null
          company?: string | null
          configuration_id?: string | null
          consent_kvkk_at: string
          consent_marketing?: boolean
          created_at?: string
          customer_id?: string | null
          email?: string | null
          form_data?: Json
          full_name: string
          id?: string
          ip_masked?: string | null
          locale?: string
          lost_reason?: string | null
          message?: string | null
          page_url?: string | null
          phone?: string | null
          quoted_amount?: number | null
          quoted_currency?: string | null
          ref_no: string
          service_id?: string | null
          source: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string | null
          utm?: Json
        }
        Update: {
          anonymized_at?: string | null
          assigned_to?: string | null
          city?: string | null
          company?: string | null
          configuration_id?: string | null
          consent_kvkk_at?: string
          consent_marketing?: boolean
          created_at?: string
          customer_id?: string | null
          email?: string | null
          form_data?: Json
          full_name?: string
          id?: string
          ip_masked?: string | null
          locale?: string
          lost_reason?: string | null
          message?: string | null
          page_url?: string | null
          phone?: string | null
          quoted_amount?: number | null
          quoted_currency?: string | null
          ref_no?: string
          service_id?: string | null
          source?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string | null
          utm?: Json
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_configuration_fk"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_customer_fk"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      material_price_history: {
        Row: {
          changed_by: string | null
          created_at: string
          currency: string
          id: string
          material_price_id: string
          unit_price: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          currency: string
          id?: string
          material_price_id: string
          unit_price: number
          valid_from: string
          valid_until: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          material_price_id?: string
          unit_price?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_price_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_price_history_material_price_id_fkey"
            columns: ["material_price_id"]
            isOneToOne: false
            referencedRelation: "material_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      material_prices: {
        Row: {
          category: string
          code: string
          created_at: string
          currency: string
          id: string
          name: Json
          note: string | null
          unit: string
          unit_price: number
          updated_at: string
          updated_by: string | null
          valid_from: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          currency?: string
          id?: string
          name: Json
          note?: string | null
          unit: string
          unit_price: number
          updated_at?: string
          updated_by?: string | null
          valid_from?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          currency?: string
          id?: string
          name?: Json
          note?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_prices_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_library: {
        Row: {
          alt: Json
          blur_data_url: string | null
          caption: Json
          created_at: string
          duration_ms: number | null
          file_name: string
          folder: string | null
          height: number | null
          id: string
          mime_type: string
          size_bytes: number
          storage_bucket: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          variants: Json
          width: number | null
        }
        Insert: {
          alt?: Json
          blur_data_url?: string | null
          caption?: Json
          created_at?: string
          duration_ms?: number | null
          file_name: string
          folder?: string | null
          height?: number | null
          id?: string
          mime_type: string
          size_bytes: number
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
          variants?: Json
          width?: number | null
        }
        Update: {
          alt?: Json
          blur_data_url?: string | null
          caption?: Json
          created_at?: string
          duration_ms?: number | null
          file_name?: string
          folder?: string | null
          height?: number | null
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
          variants?: Json
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_library_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          anchor: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          external_url: string | null
          header_slot: string | null
          icon: string | null
          id: string
          internal_path: string | null
          is_active: boolean
          is_cta: boolean
          label: Json
          link_type: string
          locales: string[]
          menu_id: string
          open_in_new_tab: boolean
          parent_id: string | null
          sort_order: number | null
          updated_at: string
          visibility: string
        }
        Insert: {
          anchor?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          external_url?: string | null
          header_slot?: string | null
          icon?: string | null
          id?: string
          internal_path?: string | null
          is_active?: boolean
          is_cta?: boolean
          label: Json
          link_type?: string
          locales?: string[]
          menu_id: string
          open_in_new_tab?: boolean
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          anchor?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          external_url?: string | null
          header_slot?: string | null
          icon?: string | null
          id?: string
          internal_path?: string | null
          is_active?: boolean
          is_cta?: boolean
          label?: Json
          link_type?: string
          locales?: string[]
          menu_id?: string
          open_in_new_tab?: boolean
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          title: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          title?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          title?: Json
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          confirm_token: string
          confirmed_at: string | null
          consent_at: string
          created_at: string
          email: string
          id: string
          ip_masked: string | null
          locale: string
          source: string | null
          status: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          confirm_token?: string
          confirmed_at?: string | null
          consent_at: string
          created_at?: string
          email: string
          id?: string
          ip_masked?: string | null
          locale?: string
          source?: string | null
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          confirm_token?: string
          confirmed_at?: string | null
          consent_at?: string
          created_at?: string
          email?: string
          id?: string
          ip_masked?: string | null
          locale?: string
          source?: string | null
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link_path: string | null
          payload: Json
          read_by: string[]
          target_role: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          link_path?: string | null
          payload?: Json
          read_by?: string[]
          target_role?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          link_path?: string | null
          payload?: Json
          read_by?: string[]
          target_role?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      panel_types: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          kg_per_m2: number | null
          material_price_id: string | null
          name: Json
          sort_order: number | null
          thickness_mm: number | null
          updated_at: string
          usage: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          kg_per_m2?: number | null
          material_price_id?: string | null
          name: Json
          sort_order?: number | null
          thickness_mm?: number | null
          updated_at?: string
          usage: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kg_per_m2?: number | null
          material_price_id?: string | null
          name?: Json
          sort_order?: number | null
          thickness_mm?: number | null
          updated_at?: string
          usage?: string
        }
        Relationships: [
          {
            foreignKeyName: "panel_types_material_price_id_fkey"
            columns: ["material_price_id"]
            isOneToOne: false
            referencedRelation: "material_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_schedules: {
        Row: {
          amount: number
          created_at: string
          description: string
          due_date: string
          id: string
          ratio_pct: number | null
          reminder_sent_at: string | null
          sale_id: string
          seq: number
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          due_date: string
          id?: string
          ratio_pct?: number | null
          reminder_sent_at?: string | null
          sale_id: string
          seq: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          ratio_pct?: number | null
          reminder_sent_at?: string | null
          sale_id?: string
          seq?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedules_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_without_cost"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          amount_try: number
          created_at: string
          currency: string
          exchange_rate: number
          id: string
          invoice_id: string | null
          method: string
          notes: string | null
          paid_on: string
          recorded_by: string | null
          reference: string | null
          sale_id: string
          schedule_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          amount_try: number
          created_at?: string
          currency?: string
          exchange_rate?: number
          id?: string
          invoice_id?: string | null
          method: string
          notes?: string | null
          paid_on: string
          recorded_by?: string | null
          reference?: string | null
          sale_id: string
          schedule_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_try?: number
          created_at?: string
          currency?: string
          exchange_rate?: number
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
          sale_id?: string
          schedule_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_without_cost"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "payment_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_email: string | null
          author_name: string
          body: string
          created_at: string
          id: string
          ip_masked: string | null
          locale: string
          moderated_at: string | null
          moderated_by: string | null
          parent_id: string | null
          post_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          author_email?: string | null
          author_name: string
          body: string
          created_at?: string
          id?: string
          ip_masked?: string | null
          locale?: string
          moderated_at?: string | null
          moderated_by?: string | null
          parent_id?: string | null
          post_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          author_email?: string | null
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          ip_masked?: string | null
          locale?: string
          moderated_at?: string | null
          moderated_by?: string | null
          parent_id?: string | null
          post_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "published_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          visitor_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          visitor_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          visitor_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      price_guide_rows: {
        Row: {
          created_at: string
          description: Json
          id: string
          material_price_id: string | null
          max_factor: number
          min_factor: number
          price_guide_id: string
          sort_order: number | null
          system_type: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: Json
          id?: string
          material_price_id?: string | null
          max_factor?: number
          min_factor?: number
          price_guide_id: string
          sort_order?: number | null
          system_type: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: Json
          id?: string
          material_price_id?: string | null
          max_factor?: number
          min_factor?: number
          price_guide_id?: string
          sort_order?: number | null
          system_type?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_guide_rows_material_price_fk"
            columns: ["material_price_id"]
            isOneToOne: false
            referencedRelation: "material_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_guide_rows_price_guide_id_fkey"
            columns: ["price_guide_id"]
            isOneToOne: false
            referencedRelation: "price_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      price_guides: {
        Row: {
          canonical_url: string | null
          created_at: string
          disclaimer: Json
          factors: Json
          focus_keyword: Json
          formula: Json
          id: string
          intro: Json
          noindex: boolean
          og_image_id: string | null
          prices_updated_at: string | null
          published_at: string | null
          published_locales: string[]
          quantity_presets: number[]
          quantity_unit: string
          seo_description: Json
          seo_title: Json
          service_id: string | null
          slug: Json
          sort_order: number | null
          stale_after_days: number
          status: string
          title: Json
          translation_meta: Json
          updated_at: string
          vat_included: boolean
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          disclaimer: Json
          factors?: Json
          focus_keyword?: Json
          formula?: Json
          id?: string
          intro?: Json
          noindex?: boolean
          og_image_id?: string | null
          prices_updated_at?: string | null
          published_at?: string | null
          published_locales?: string[]
          quantity_presets?: number[]
          quantity_unit?: string
          seo_description?: Json
          seo_title?: Json
          service_id?: string | null
          slug: Json
          sort_order?: number | null
          stale_after_days?: number
          status?: string
          title: Json
          translation_meta?: Json
          updated_at?: string
          vat_included?: boolean
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          disclaimer?: Json
          factors?: Json
          focus_keyword?: Json
          formula?: Json
          id?: string
          intro?: Json
          noindex?: boolean
          og_image_id?: string | null
          prices_updated_at?: string | null
          published_at?: string | null
          published_locales?: string[]
          quantity_presets?: number[]
          quantity_unit?: string
          seo_description?: Json
          seo_title?: Json
          service_id?: string | null
          slug?: Json
          sort_order?: number | null
          stale_after_days?: number
          status?: string
          title?: Json
          translation_meta?: Json
          updated_at?: string
          vat_included?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "price_guides_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_guides_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: Json
          focus_keyword: Json
          id: string
          image_id: string | null
          is_active: boolean
          name: Json
          noindex: boolean
          og_image_id: string | null
          parent_id: string | null
          seo_description: Json
          seo_title: Json
          slug: Json
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: Json
          focus_keyword?: Json
          id?: string
          image_id?: string | null
          is_active?: boolean
          name: Json
          noindex?: boolean
          og_image_id?: string | null
          parent_id?: string | null
          seo_description?: Json
          seo_title?: Json
          slug: Json
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: Json
          focus_keyword?: Json
          id?: string
          image_id?: string | null
          is_active?: boolean
          name?: Json
          noindex?: boolean
          og_image_id?: string | null
          parent_id?: string | null
          seo_description?: Json
          seo_title?: Json
          slug?: Json
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_documents: {
        Row: {
          created_at: string
          doc_type: string
          id: string
          locales: string[]
          media_id: string
          product_id: string
          sort_order: number | null
          title: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          id?: string
          locales?: string[]
          media_id: string
          product_id: string
          sort_order?: number | null
          title: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          id?: string
          locales?: string[]
          media_id?: string
          product_id?: string
          sort_order?: number | null
          title?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_documents_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_documents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: Json
          created_at: string
          id: string
          media_id: string
          product_id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          alt?: Json
          created_at?: string
          id?: string
          media_id: string
          product_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          alt?: Json
          created_at?: string
          id?: string
          media_id?: string
          product_id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_specs: {
        Row: {
          created_at: string
          group_name: Json
          id: string
          name: Json
          product_id: string
          sort_order: number | null
          unit: string | null
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          group_name?: Json
          id?: string
          name: Json
          product_id: string
          sort_order?: number | null
          unit?: string | null
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          group_name?: Json
          id?: string
          name?: Json
          product_id?: string
          sort_order?: number | null
          unit?: string | null
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "product_specs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          height_mm: number | null
          id: string
          is_active: boolean
          kg_per_m: number | null
          length_mm: number | null
          product_id: string
          size_label: string
          sort_order: number | null
          stock_code: string | null
          thickness_mm: number | null
          updated_at: string
          width_mm: number | null
        }
        Insert: {
          created_at?: string
          height_mm?: number | null
          id?: string
          is_active?: boolean
          kg_per_m?: number | null
          length_mm?: number | null
          product_id: string
          size_label: string
          sort_order?: number | null
          stock_code?: string | null
          thickness_mm?: number | null
          updated_at?: string
          width_mm?: number | null
        }
        Update: {
          created_at?: string
          height_mm?: number | null
          id?: string
          is_active?: boolean
          kg_per_m?: number | null
          length_mm?: number | null
          product_id?: string
          size_label?: string
          sort_order?: number | null
          stock_code?: string | null
          thickness_mm?: number | null
          updated_at?: string
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          canonical_url: string | null
          category_id: string | null
          cover_image_id: string | null
          created_at: string
          description: Json
          focus_keyword: Json
          id: string
          is_featured: boolean
          name: Json
          noindex: boolean
          og_image_id: string | null
          published_at: string | null
          published_locales: string[]
          seo_description: Json
          seo_title: Json
          service_id: string | null
          short_description: Json
          slug: Json
          sort_order: number | null
          status: string
          translation_meta: Json
          updated_at: string
          usage_areas: Json
        }
        Insert: {
          canonical_url?: string | null
          category_id?: string | null
          cover_image_id?: string | null
          created_at?: string
          description?: Json
          focus_keyword?: Json
          id?: string
          is_featured?: boolean
          name: Json
          noindex?: boolean
          og_image_id?: string | null
          published_at?: string | null
          published_locales?: string[]
          seo_description?: Json
          seo_title?: Json
          service_id?: string | null
          short_description?: Json
          slug: Json
          sort_order?: number | null
          status?: string
          translation_meta?: Json
          updated_at?: string
          usage_areas?: Json
        }
        Update: {
          canonical_url?: string | null
          category_id?: string | null
          cover_image_id?: string | null
          created_at?: string
          description?: Json
          focus_keyword?: Json
          id?: string
          is_featured?: boolean
          name?: Json
          noindex?: boolean
          og_image_id?: string | null
          published_at?: string | null
          published_locales?: string[]
          seo_description?: Json
          seo_title?: Json
          service_id?: string | null
          short_description?: Json
          slug?: Json
          sort_order?: number | null
          status?: string
          translation_meta?: Json
          updated_at?: string
          usage_areas?: Json
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_cover_image_id_fkey"
            columns: ["cover_image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_id: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          last_seen_at: string | null
          must_change_password: boolean
          notification_prefs: Json
          phone: string | null
          preferred_locale: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          last_seen_at?: string | null
          must_change_password?: boolean
          notification_prefs?: Json
          phone?: string | null
          preferred_locale?: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          must_change_password?: boolean
          notification_prefs?: Json
          phone?: string | null
          preferred_locale?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_avatar_fk"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
        ]
      }
      project_categories: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: Json
          focus_keyword: Json
          id: string
          is_active: boolean
          name: Json
          noindex: boolean
          og_image_id: string | null
          seo_description: Json
          seo_title: Json
          slug: Json
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: Json
          focus_keyword?: Json
          id?: string
          is_active?: boolean
          name: Json
          noindex?: boolean
          og_image_id?: string | null
          seo_description?: Json
          seo_title?: Json
          slug: Json
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: Json
          focus_keyword?: Json
          id?: string
          is_active?: boolean
          name?: Json
          noindex?: boolean
          og_image_id?: string | null
          seo_description?: Json
          seo_title?: Json
          slug?: Json
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_categories_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
        ]
      }
      project_category_relations: {
        Row: {
          category_id: string
          created_at: string
          project_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          project_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_category_relations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "project_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_category_relations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_images: {
        Row: {
          alt: Json
          caption: Json
          created_at: string
          id: string
          media_id: string
          project_id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          alt?: Json
          caption?: Json
          created_at?: string
          id?: string
          media_id: string
          project_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          alt?: Json
          caption?: Json
          created_at?: string
          id?: string
          media_id?: string
          project_id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_images_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          area_m2: number | null
          body: Json
          canonical_url: string | null
          client_id: string | null
          client_name: string | null
          completed_on: string | null
          cover_image_id: string | null
          created_at: string
          excerpt: Json
          focus_keyword: Json
          id: string
          is_featured: boolean
          location: Json
          noindex: boolean
          og_image_id: string | null
          published_at: string | null
          published_locales: string[]
          sale_id: string | null
          seo_description: Json
          seo_title: Json
          slug: Json
          sort_order: number | null
          started_on: string | null
          status: string
          title: Json
          tonnage: number | null
          translation_meta: Json
          updated_at: string
        }
        Insert: {
          area_m2?: number | null
          body?: Json
          canonical_url?: string | null
          client_id?: string | null
          client_name?: string | null
          completed_on?: string | null
          cover_image_id?: string | null
          created_at?: string
          excerpt?: Json
          focus_keyword?: Json
          id?: string
          is_featured?: boolean
          location?: Json
          noindex?: boolean
          og_image_id?: string | null
          published_at?: string | null
          published_locales?: string[]
          sale_id?: string | null
          seo_description?: Json
          seo_title?: Json
          slug: Json
          sort_order?: number | null
          started_on?: string | null
          status?: string
          title: Json
          tonnage?: number | null
          translation_meta?: Json
          updated_at?: string
        }
        Update: {
          area_m2?: number | null
          body?: Json
          canonical_url?: string | null
          client_id?: string | null
          client_name?: string | null
          completed_on?: string | null
          cover_image_id?: string | null
          created_at?: string
          excerpt?: Json
          focus_keyword?: Json
          id?: string
          is_featured?: boolean
          location?: Json
          noindex?: boolean
          og_image_id?: string | null
          published_at?: string | null
          published_locales?: string[]
          sale_id?: string | null
          seo_description?: Json
          seo_title?: Json
          slug?: Json
          sort_order?: number | null
          started_on?: string | null
          status?: string
          title?: Json
          tonnage?: number | null
          translation_meta?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_cover_image_id_fkey"
            columns: ["cover_image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_sale_fk"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_sale_fk"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_without_cost"
            referencedColumns: ["id"]
          },
        ]
      }
      redirects: {
        Row: {
          created_at: string
          created_by: string | null
          hit_count: number
          id: string
          is_active: boolean
          last_hit_at: string | null
          note: string | null
          source_path: string
          status_code: number
          target_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hit_count?: number
          id?: string
          is_active?: boolean
          last_hit_at?: string | null
          note?: string | null
          source_path: string
          status_code?: number
          target_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hit_count?: number
          id?: string
          is_active?: boolean
          last_hit_at?: string | null
          note?: string | null
          source_path?: string
          status_code?: number
          target_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "redirects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_sync_runs: {
        Row: {
          created_at: string
          error: string | null
          fetched_count: number
          finished_at: string | null
          id: string
          inserted_count: number
          started_at: string
          status: string
          updated_count: number
        }
        Insert: {
          created_at?: string
          error?: string | null
          fetched_count?: number
          finished_at?: string | null
          id?: string
          inserted_count?: number
          started_at?: string
          status?: string
          updated_count?: number
        }
        Update: {
          created_at?: string
          error?: string | null
          fetched_count?: number
          finished_at?: string | null
          id?: string
          inserted_count?: number
          started_at?: string
          status?: string
          updated_count?: number
        }
        Relationships: []
      }
      sale_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string | null
          id: string
          sale_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string | null
          id?: string
          sale_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string | null
          id?: string
          sale_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_expenses_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_expenses_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_without_cost"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          description: string
          id: string
          line_cost: number | null
          line_profit: number | null
          line_total: number
          product_id: string | null
          quantity: number
          sale_id: string
          service_id: string | null
          sort_order: number
          unit: string
          unit_cost: number | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          line_cost?: number | null
          line_profit?: number | null
          line_total: number
          product_id?: string | null
          quantity: number
          sale_id: string
          service_id?: string | null
          sort_order?: number
          unit: string
          unit_cost?: number | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          line_cost?: number | null
          line_profit?: number | null
          line_total?: number
          product_id?: string | null
          quantity?: number
          sale_id?: string
          service_id?: string | null
          sort_order?: number
          unit?: string
          unit_cost?: number | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_without_cost"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          assigned_to: string | null
          configuration_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string
          discount_amount: number
          discount_pct: number
          exchange_rate: number
          exchange_rate_date: string | null
          exchange_rate_source: string
          grand_total: number
          grand_total_try: number
          gross_profit: number | null
          id: string
          is_invoiced: boolean
          lead_id: string | null
          margin_pct: number | null
          notes: string | null
          project_id: string | null
          sale_date: string
          sale_no: string | null
          status: string
          subtotal: number
          total_cost: number | null
          updated_at: string
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          assigned_to?: string | null
          configuration_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id: string
          discount_amount?: number
          discount_pct?: number
          exchange_rate?: number
          exchange_rate_date?: string | null
          exchange_rate_source?: string
          grand_total?: number
          grand_total_try?: number
          gross_profit?: number | null
          id?: string
          is_invoiced?: boolean
          lead_id?: string | null
          margin_pct?: number | null
          notes?: string | null
          project_id?: string | null
          sale_date?: string
          sale_no?: string | null
          status?: string
          subtotal?: number
          total_cost?: number | null
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          assigned_to?: string | null
          configuration_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string
          discount_amount?: number
          discount_pct?: number
          exchange_rate?: number
          exchange_rate_date?: string | null
          exchange_rate_source?: string
          grand_total?: number
          grand_total_try?: number
          gross_profit?: number | null
          id?: string
          is_invoiced?: boolean
          lead_id?: string | null
          margin_pct?: number | null
          notes?: string | null
          project_id?: string | null
          sale_date?: string
          sale_no?: string | null
          status?: string
          subtotal?: number
          total_cost?: number | null
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_configuration_fk"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      scroll_depth_aggregates: {
        Row: {
          created_at: string
          day: string
          device: string
          id: string
          path: string
          reached_100: number
          reached_25: number
          reached_50: number
          reached_75: number
          views: number
        }
        Insert: {
          created_at?: string
          day: string
          device: string
          id?: string
          path: string
          reached_100?: number
          reached_25?: number
          reached_50?: number
          reached_75?: number
          views?: number
        }
        Update: {
          created_at?: string
          day?: string
          device?: string
          id?: string
          path?: string
          reached_100?: number
          reached_25?: number
          reached_50?: number
          reached_75?: number
          views?: number
        }
        Relationships: []
      }
      service_images: {
        Row: {
          alt: Json
          caption: Json
          created_at: string
          id: string
          media_id: string
          service_id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          alt?: Json
          caption?: Json
          created_at?: string
          id?: string
          media_id: string
          service_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          alt?: Json
          caption?: Json
          created_at?: string
          id?: string
          media_id?: string
          service_id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_images_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_images_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_projects: {
        Row: {
          created_at: string
          project_id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          service_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_projects_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          body: Json
          canonical_url: string | null
          cover_image_id: string | null
          created_at: string
          excerpt: Json
          focus_keyword: Json
          icon: string | null
          id: string
          is_featured: boolean
          noindex: boolean
          og_image_id: string | null
          process_steps: Json
          published_at: string | null
          published_locales: string[]
          seo_description: Json
          seo_title: Json
          slug: Json
          sort_order: number | null
          status: string
          title: Json
          translation_meta: Json
          updated_at: string
        }
        Insert: {
          body?: Json
          canonical_url?: string | null
          cover_image_id?: string | null
          created_at?: string
          excerpt?: Json
          focus_keyword?: Json
          icon?: string | null
          id?: string
          is_featured?: boolean
          noindex?: boolean
          og_image_id?: string | null
          process_steps?: Json
          published_at?: string | null
          published_locales?: string[]
          seo_description?: Json
          seo_title?: Json
          slug: Json
          sort_order?: number | null
          status?: string
          title: Json
          translation_meta?: Json
          updated_at?: string
        }
        Update: {
          body?: Json
          canonical_url?: string | null
          cover_image_id?: string | null
          created_at?: string
          excerpt?: Json
          focus_keyword?: Json
          icon?: string | null
          id?: string
          is_featured?: boolean
          noindex?: boolean
          og_image_id?: string | null
          process_steps?: Json
          published_at?: string | null
          published_locales?: string[]
          seo_description?: Json
          seo_title?: Json
          slug?: Json
          sort_order?: number | null
          status?: string
          title?: Json
          translation_meta?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_cover_image_id_fkey"
            columns: ["cover_image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      slug_history: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          locale: string
          old_slug: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          locale: string
          old_slug: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          locale?: string
          old_slug?: string
        }
        Relationships: []
      }
      solutions: {
        Row: {
          advantages: Json
          canonical_url: string | null
          comparison: Json
          cover_image_id: string | null
          created_at: string
          cta: Json
          focus_keyword: Json
          hero_summary: Json
          id: string
          noindex: boolean
          og_image_id: string | null
          problem: Json
          published_at: string | null
          published_locales: string[]
          seo_description: Json
          seo_title: Json
          service_id: string | null
          slug: Json
          sort_order: number | null
          status: string
          technical_basis: Json
          title: Json
          translation_meta: Json
          updated_at: string
        }
        Insert: {
          advantages?: Json
          canonical_url?: string | null
          comparison?: Json
          cover_image_id?: string | null
          created_at?: string
          cta?: Json
          focus_keyword?: Json
          hero_summary?: Json
          id?: string
          noindex?: boolean
          og_image_id?: string | null
          problem?: Json
          published_at?: string | null
          published_locales?: string[]
          seo_description?: Json
          seo_title?: Json
          service_id?: string | null
          slug: Json
          sort_order?: number | null
          status?: string
          technical_basis?: Json
          title: Json
          translation_meta?: Json
          updated_at?: string
        }
        Update: {
          advantages?: Json
          canonical_url?: string | null
          comparison?: Json
          cover_image_id?: string | null
          created_at?: string
          cta?: Json
          focus_keyword?: Json
          hero_summary?: Json
          id?: string
          noindex?: boolean
          og_image_id?: string | null
          problem?: Json
          published_at?: string | null
          published_locales?: string[]
          seo_description?: Json
          seo_title?: Json
          service_id?: string | null
          slug?: Json
          sort_order?: number | null
          status?: string
          technical_basis?: Json
          title?: Json
          translation_meta?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solutions_cover_image_id_fkey"
            columns: ["cover_image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solutions_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solutions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      static_pages: {
        Row: {
          auto_translate_disabled: boolean
          body: Json
          canonical_url: string | null
          created_at: string
          extra: Json
          focus_keyword: Json
          id: string
          kind: string
          noindex: boolean
          og_image_id: string | null
          page_key: string
          published_at: string | null
          published_locales: string[]
          seo_description: Json
          seo_title: Json
          slug: Json | null
          status: string
          title: Json
          translation_meta: Json
          updated_at: string
        }
        Insert: {
          auto_translate_disabled?: boolean
          body?: Json
          canonical_url?: string | null
          created_at?: string
          extra?: Json
          focus_keyword?: Json
          id?: string
          kind: string
          noindex?: boolean
          og_image_id?: string | null
          page_key: string
          published_at?: string | null
          published_locales?: string[]
          seo_description?: Json
          seo_title?: Json
          slug?: Json | null
          status?: string
          title: Json
          translation_meta?: Json
          updated_at?: string
        }
        Update: {
          auto_translate_disabled?: boolean
          body?: Json
          canonical_url?: string | null
          created_at?: string
          extra?: Json
          focus_keyword?: Json
          id?: string
          kind?: string
          noindex?: boolean
          og_image_id?: string | null
          page_key?: string
          published_at?: string | null
          published_locales?: string[]
          seo_description?: Json
          seo_title?: Json
          slug?: Json | null
          status?: string
          title?: Json
          translation_meta?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "static_pages_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
        ]
      }
      steel_profiles: {
        Row: {
          code: string
          created_at: string
          dimensions: Json
          family: string
          id: string
          is_active: boolean
          kg_per_m: number
          sort_order: number | null
          updated_at: string
          usage: string | null
        }
        Insert: {
          code: string
          created_at?: string
          dimensions?: Json
          family: string
          id?: string
          is_active?: boolean
          kg_per_m: number
          sort_order?: number | null
          updated_at?: string
          usage?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          dimensions?: Json
          family?: string
          id?: string
          is_active?: boolean
          kg_per_m?: number
          sort_order?: number | null
          updated_at?: string
          usage?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          bio: Json
          created_at: string
          email: string | null
          full_name: string
          id: string
          linkedin_url: string | null
          photo_id: string | null
          position: Json
          profile_id: string | null
          published_at: string | null
          published_locales: string[]
          sort_order: number | null
          status: string
          translation_meta: Json
          updated_at: string
        }
        Insert: {
          bio?: Json
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          linkedin_url?: string | null
          photo_id?: string | null
          position?: Json
          profile_id?: string | null
          published_at?: string | null
          published_locales?: string[]
          sort_order?: number | null
          status?: string
          translation_meta?: Json
          updated_at?: string
        }
        Update: {
          bio?: Json
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          linkedin_url?: string | null
          photo_id?: string | null
          position?: Json
          profile_id?: string | null
          published_at?: string | null
          published_locales?: string[]
          sort_order?: number | null
          status?: string
          translation_meta?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          author_name: string
          author_title: Json
          avatar_id: string | null
          avatar_url: string | null
          body: Json
          company: string | null
          consent_kvkk_at: string | null
          created_at: string
          external_id: string | null
          id: string
          ip_masked: string | null
          is_featured: boolean
          is_verified: boolean
          original_locale: string | null
          product_id: string | null
          project_id: string | null
          rating: number
          reviewed_on: string | null
          service_id: string | null
          sort_order: number | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          author_name: string
          author_title?: Json
          avatar_id?: string | null
          avatar_url?: string | null
          body?: Json
          company?: string | null
          consent_kvkk_at?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          ip_masked?: string | null
          is_featured?: boolean
          is_verified?: boolean
          original_locale?: string | null
          product_id?: string | null
          project_id?: string | null
          rating: number
          reviewed_on?: string | null
          service_id?: string | null
          sort_order?: number | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          author_title?: Json
          avatar_id?: string | null
          avatar_url?: string | null
          body?: Json
          company?: string | null
          consent_kvkk_at?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          ip_masked?: string | null
          is_featured?: boolean
          is_verified?: boolean
          original_locale?: string | null
          product_id?: string | null
          project_id?: string | null
          rating?: number
          reviewed_on?: string | null
          service_id?: string | null
          sort_order?: number | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      translation_glossary: {
        Row: {
          context: string
          created_at: string
          do_not_translate: boolean
          id: string
          is_case_sensitive: boolean
          term_en: string
          term_tr: string
          updated_at: string
        }
        Insert: {
          context?: string
          created_at?: string
          do_not_translate?: boolean
          id?: string
          is_case_sensitive?: boolean
          term_en: string
          term_tr: string
          updated_at?: string
        }
        Update: {
          context?: string
          created_at?: string
          do_not_translate?: boolean
          id?: string
          is_case_sensitive?: boolean
          term_en?: string
          term_tr?: string
          updated_at?: string
        }
        Relationships: []
      }
      ui_translations: {
        Row: {
          created_at: string
          id: string
          key: string
          locale: string
          namespace: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          locale: string
          namespace: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          locale?: string
          namespace?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "ui_translations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      web_vitals: {
        Row: {
          created_at: string
          device: string
          id: string
          metric: string
          path: string
          rating: string | null
          recorded_at: string
          session_id: string | null
          value: number
        }
        Insert: {
          created_at?: string
          device: string
          id?: string
          metric: string
          path: string
          rating?: string | null
          recorded_at?: string
          session_id?: string | null
          value: number
        }
        Update: {
          created_at?: string
          device?: string
          id?: string
          metric?: string
          path?: string
          rating?: string | null
          recorded_at?: string
          session_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "web_vitals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          created_at: string
          display_name: Json
          greeting: Json
          hidden_paths: string[]
          id: string
          is_enabled: boolean
          key: string
          message_templates: Json
          phone_e164: string | null
          reply_time: Json
          show_delay_seconds: number
          updated_at: string
          working_hours: Json
        }
        Insert: {
          created_at?: string
          display_name?: Json
          greeting?: Json
          hidden_paths?: string[]
          id?: string
          is_enabled?: boolean
          key?: string
          message_templates?: Json
          phone_e164?: string | null
          reply_time?: Json
          show_delay_seconds?: number
          updated_at?: string
          working_hours?: Json
        }
        Update: {
          created_at?: string
          display_name?: Json
          greeting?: Json
          hidden_paths?: string[]
          id?: string
          is_enabled?: boolean
          key?: string
          message_templates?: Json
          phone_e164?: string | null
          reply_time?: Json
          show_delay_seconds?: number
          updated_at?: string
          working_hours?: Json
        }
        Relationships: []
      }
    }
    Views: {
      published_comments: {
        Row: {
          author_name: string | null
          body: string | null
          created_at: string | null
          id: string | null
          locale: string | null
          parent_id: string | null
          post_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "published_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items_without_cost: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          line_total: number | null
          product_id: string | null
          quantity: number | null
          sale_id: string | null
          service_id: string | null
          sort_order: number | null
          unit: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          line_total?: number | null
          product_id?: string | null
          quantity?: number | null
          sale_id?: string | null
          service_id?: string | null
          sort_order?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          line_total?: number | null
          product_id?: string | null
          quantity?: number | null
          sale_id?: string | null
          service_id?: string | null
          sort_order?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_without_cost"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_without_cost: {
        Row: {
          assigned_to: string | null
          configuration_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string | null
          discount_amount: number | null
          discount_pct: number | null
          exchange_rate: number | null
          exchange_rate_date: string | null
          exchange_rate_source: string | null
          grand_total: number | null
          grand_total_try: number | null
          id: string | null
          is_invoiced: boolean | null
          lead_id: string | null
          notes: string | null
          project_id: string | null
          sale_date: string | null
          sale_no: string | null
          status: string | null
          subtotal: number | null
          updated_at: string | null
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          assigned_to?: string | null
          configuration_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          discount_pct?: number | null
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          exchange_rate_source?: string | null
          grand_total?: number | null
          grand_total_try?: number | null
          id?: string | null
          is_invoiced?: boolean | null
          lead_id?: string | null
          notes?: string | null
          project_id?: string | null
          sale_date?: string | null
          sale_no?: string | null
          status?: string | null
          subtotal?: number | null
          updated_at?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          assigned_to?: string | null
          configuration_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          discount_pct?: number | null
          exchange_rate?: number | null
          exchange_rate_date?: string | null
          exchange_rate_source?: string | null
          grand_total?: number | null
          grand_total_try?: number | null
          id?: string | null
          is_invoiced?: boolean | null
          lead_id?: string | null
          notes?: string | null
          project_id?: string | null
          sale_date?: string | null
          sale_no?: string | null
          status?: string | null
          subtotal?: number | null
          updated_at?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_configuration_fk"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      stale_cron_jobs: {
        Row: {
          expected_interval_seconds: number | null
          job_key: string | null
          last_run_at: string | null
          last_status: string | null
        }
        Insert: {
          expected_interval_seconds?: number | null
          job_key?: string | null
          last_run_at?: string | null
          last_status?: string | null
        }
        Update: {
          expected_interval_seconds?: number | null
          job_key?: string | null
          last_run_at?: string | null
          last_status?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_dashboard_counts: { Args: never; Returns: Json }
      aggregate_analytics_day: { Args: { p_day: string }; Returns: Json }
      anonymize_customer: { Args: { p_id: string }; Returns: undefined }
      create_customer_from_lead: {
        Args: { p_lead_id: string }
        Returns: string
      }
      create_sale_from_configuration: {
        Args: { p_configuration_id: string }
        Returns: string
      }
      create_sale_from_lead: { Args: { p_lead_id: string }; Returns: string }
      enqueue_test_email: {
        Args: { p_locale: string; p_template_key: string }
        Returns: string
      }
      evaluate_funnel: {
        Args: { p_from: string; p_funnel_id: string; p_to: string }
        Returns: Json
      }
      get_blog_post_by_slug: {
        Args: { p_locale: string; p_slug: string }
        Returns: Json
      }
      get_configuration_by_token: { Args: { p_token: string }; Returns: Json }
      get_price_guide_by_slug: {
        Args: { p_locale: string; p_slug: string }
        Returns: Json
      }
      get_product_by_slug: {
        Args: { p_locale: string; p_slug: string }
        Returns: Json
      }
      get_project_by_slug: {
        Args: { p_locale: string; p_slug: string }
        Returns: Json
      }
      get_service_by_slug: {
        Args: { p_locale: string; p_slug: string }
        Returns: Json
      }
      get_solution_by_slug: {
        Args: { p_locale: string; p_slug: string }
        Returns: Json
      }
      ingest_analytics: { Args: { p: Json }; Returns: Json }
      mark_notifications_read: { Args: { p_ids: string[] }; Returns: number }
      purge_expired_job_applications: {
        Args: never
        Returns: {
          cv_bucket: string
          cv_path: string
        }[]
      }
      purge_old_analytics: { Args: { p_keep_days?: number }; Returns: number }
      recalc_sale_payments: { Args: { p_sale_id: string }; Returns: undefined }
      record_redirect_hit: { Args: { p_path: string }; Returns: undefined }
      reorder_content: {
        Args: { p_ids: string[]; p_table: string }
        Returns: number
      }
      reorder_menu_items: { Args: { p_ids: string[] }; Returns: number }
      reply_lead: {
        Args: { p_body: string; p_lead_id: string; p_subject: string }
        Returns: string
      }
      report_error: { Args: { p: Json }; Returns: Json }
      resolve_old_slug: {
        Args: { p_entity_type: string; p_locale: string; p_old_slug: string }
        Returns: string
      }
      save_configuration: { Args: { p: Json }; Returns: Json }
      set_configuration_sharing: {
        Args: { p_share_price: boolean; p_token: string }
        Returns: boolean
      }
      submit_job_application: { Args: { p: Json }; Returns: Json }
      submit_lead: { Args: { p: Json }; Returns: Json }
      submit_testimonial: { Args: { p: Json }; Returns: Json }
      web_vitals_summary: {
        Args: { p_from: string; p_to: string }
        Returns: {
          good: number
          metric: string
          needs_improvement: number
          p75: number
          path: string
          poor: number
          samples: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
