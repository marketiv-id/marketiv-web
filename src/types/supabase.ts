export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      ai_requests: {
        Row: {
          created_at: string;
          feature: string;
          id: string;
          prompt: string;
          response: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          feature: string;
          id?: string;
          prompt: string;
          response?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          feature?: string;
          id?: string;
          prompt?: string;
          response?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      appeals: {
        Row: {
          action_ref: string;
          created_at: string;
          deadline_at: string;
          decided_at: string | null;
          decision: string | null;
          evidence: string | null;
          id: string;
          reason: string;
          sla_decided_at: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          action_ref: string;
          created_at?: string;
          deadline_at: string;
          decided_at?: string | null;
          decision?: string | null;
          evidence?: string | null;
          id?: string;
          reason: string;
          sla_decided_at: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          action_ref?: string;
          created_at?: string;
          deadline_at?: string;
          decided_at?: string | null;
          decision?: string | null;
          evidence?: string | null;
          id?: string;
          reason?: string;
          sla_decided_at?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appeals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_assets: {
        Row: {
          campaign_id: string;
          created_at: string;
          file_name: string | null;
          file_url: string;
          id: string;
          source: string;
          type: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          campaign_id: string;
          created_at?: string;
          file_name?: string | null;
          file_url: string;
          id?: string;
          source: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          file_name?: string | null;
          file_url?: string;
          id?: string;
          source?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_briefs: {
        Row: {
          brief_detail: string | null;
          campaign_id: string;
          content_angle: string | null;
          created_at: string;
          cta: string | null;
          do_and_dont: Json | null;
          generated_by_ai: boolean;
          id: string;
          materials: NonNullable<Json>;
          objective: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          brief_detail?: string | null;
          campaign_id: string;
          content_angle?: string | null;
          created_at?: string;
          cta?: string | null;
          do_and_dont?: Json | null;
          generated_by_ai?: boolean;
          id?: string;
          materials?: NonNullable<Json>;
          objective?: string | null;
          updated_at?: string;
        };
        Update: {
          brief_detail?: string | null;
          campaign_id?: string;
          content_angle?: string | null;
          created_at?: string;
          cta?: string | null;
          do_and_dont?: Json | null;
          generated_by_ai?: boolean;
          id?: string;
          materials?: NonNullable<Json>;
          objective?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_briefs_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: true;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_claims: {
        Row: {
          campaign_id: string;
          claimed_at: string;
          created_at: string;
          creator_id: string;
          id: string;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          campaign_id: string;
          claimed_at?: string;
          created_at?: string;
          creator_id: string;
          id?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          campaign_id?: string;
          claimed_at?: string;
          created_at?: string;
          creator_id?: string;
          id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_claims_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_claims_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_submissions: {
        Row: {
          ai_disclosed: boolean;
          ai_generated: boolean;
          campaign_id: string;
          caption: string | null;
          claim_id: string;
          created_at: string;
          creator_credit: string | null;
          creator_id: string;
          engagement: number | null;
          fraud_score: number | null;
          fraud_status: string | null;
          id: string;
          platform: string;
          post_url: string;
          review_notes: string | null;
          status: string;
          updated_at: string;
          views: number;
          views_captured_at: string | null;
          views_count: number | null;
          views_final: boolean;
          views_source: string | null;
        };
        ComputedFields: never;
        Insert: {
          ai_disclosed?: boolean;
          ai_generated?: boolean;
          campaign_id: string;
          caption?: string | null;
          claim_id: string;
          created_at?: string;
          creator_credit?: string | null;
          creator_id: string;
          engagement?: number | null;
          fraud_score?: number | null;
          fraud_status?: string | null;
          id?: string;
          platform: string;
          post_url: string;
          review_notes?: string | null;
          status?: string;
          updated_at?: string;
          views?: number;
          views_captured_at?: string | null;
          views_count?: number | null;
          views_final?: boolean;
          views_source?: string | null;
        };
        Update: {
          ai_disclosed?: boolean;
          ai_generated?: boolean;
          campaign_id?: string;
          caption?: string | null;
          claim_id?: string;
          created_at?: string;
          creator_credit?: string | null;
          creator_id?: string;
          engagement?: number | null;
          fraud_score?: number | null;
          fraud_status?: string | null;
          id?: string;
          platform?: string;
          post_url?: string;
          review_notes?: string | null;
          status?: string;
          updated_at?: string;
          views?: number;
          views_captured_at?: string | null;
          views_count?: number | null;
          views_final?: boolean;
          views_source?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_submissions_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_submissions_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: true;
            referencedRelation: "campaign_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_submissions_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      campaigns: {
        Row: {
          budget: number;
          category: string;
          claim_limit: number;
          created_at: string;
          description: string | null;
          id: string;
          platforms: string[];
          published_at: string | null;
          remaining_budget: number;
          reward_per_1000_views: number;
          spent_amount: number;
          status: string;
          submission_days: number;
          thumbnail_url: string;
          title: string;
          total_claims: number;
          type: string;
          umkm_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          budget?: number;
          category: string;
          claim_limit?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          platforms?: string[];
          published_at?: string | null;
          remaining_budget?: number;
          reward_per_1000_views?: number;
          spent_amount?: number;
          status?: string;
          submission_days?: number;
          thumbnail_url?: string;
          title: string;
          total_claims?: number;
          type: string;
          umkm_id: string;
          updated_at?: string;
        };
        Update: {
          budget?: number;
          category?: string;
          claim_limit?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          platforms?: string[];
          published_at?: string | null;
          remaining_budget?: number;
          reward_per_1000_views?: number;
          spent_amount?: number;
          status?: string;
          submission_days?: number;
          thumbnail_url?: string;
          title?: string;
          total_claims?: number;
          type?: string;
          umkm_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_umkm_id_fkey";
            columns: ["umkm_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          creator_archived: boolean;
          creator_id: string;
          id: string;
          is_archived: boolean;
          last_message: string | null;
          last_message_at: string | null;
          offer_id: string | null;
          umkm_archived: boolean;
          umkm_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          creator_archived?: boolean;
          creator_id: string;
          id?: string;
          is_archived?: boolean;
          last_message?: string | null;
          last_message_at?: string | null;
          offer_id?: string | null;
          umkm_archived?: boolean;
          umkm_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          creator_archived?: boolean;
          creator_id?: string;
          id?: string;
          is_archived?: boolean;
          last_message?: string | null;
          last_message_at?: string | null;
          offer_id?: string | null;
          umkm_archived?: boolean;
          umkm_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_umkm_id_fkey";
            columns: ["umkm_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      creator_portfolios: {
        Row: {
          created_at: string;
          creator_id: string;
          description: string | null;
          id: string;
          portfolio_url: string | null;
          thumbnail_url: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          creator_id: string;
          description?: string | null;
          id?: string;
          portfolio_url?: string | null;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          creator_id?: string;
          description?: string | null;
          id?: string;
          portfolio_url?: string | null;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "creator_portfolios_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      creator_profiles: {
        Row: {
          avatar_url: string | null;
          banner_url: string | null;
          bio: string | null;
          city: string | null;
          created_at: string;
          display_name: string;
          id: string;
          is_profile_completed: boolean;
          niche: string | null;
          rating: number;
          total_followers: number;
          total_orders: number;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          banner_url?: string | null;
          bio?: string | null;
          city?: string | null;
          created_at?: string;
          display_name: string;
          id?: string;
          is_profile_completed?: boolean;
          niche?: string | null;
          rating?: number;
          total_followers?: number;
          total_orders?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          banner_url?: string | null;
          bio?: string | null;
          city?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          is_profile_completed?: boolean;
          niche?: string | null;
          rating?: number;
          total_followers?: number;
          total_orders?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "creator_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      creator_social_accounts: {
        Row: {
          created_at: string;
          creator_id: string;
          engagement_rate: number;
          followers: number;
          id: string;
          platform: string;
          updated_at: string;
          username: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          creator_id: string;
          engagement_rate?: number;
          followers?: number;
          id?: string;
          platform: string;
          updated_at?: string;
          username: string;
        };
        Update: {
          created_at?: string;
          creator_id?: string;
          engagement_rate?: number;
          followers?: number;
          id?: string;
          platform?: string;
          updated_at?: string;
          username?: string;
        };
        Relationships: [
          {
            foreignKeyName: "creator_social_accounts_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      deliverables: {
        Row: {
          ai_generated: boolean;
          created_at: string;
          creator_credit: string | null;
          file_id: string | null;
          file_url: string;
          id: string;
          notes: string | null;
          order_id: string;
          source: string;
          status: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          ai_generated?: boolean;
          created_at?: string;
          creator_credit?: string | null;
          file_id?: string | null;
          file_url: string;
          id?: string;
          notes?: string | null;
          order_id: string;
          source: string;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          ai_generated?: boolean;
          created_at?: string;
          creator_credit?: string | null;
          file_id?: string | null;
          file_url?: string;
          id?: string;
          notes?: string | null;
          order_id?: string;
          source?: string;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "deliverables_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      escrows: {
        Row: {
          amount: number;
          created_at: string;
          fee_rate: number;
          id: string;
          order_id: string;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount?: number;
          created_at?: string;
          fee_rate?: number;
          id?: string;
          order_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          fee_rate?: number;
          id?: string;
          order_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "escrows_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      fraud_checks: {
        Row: {
          created_at: string;
          id: string;
          reason: string | null;
          result: string;
          score: number;
          submission_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          reason?: string | null;
          result: string;
          score: number;
          submission_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reason?: string | null;
          result?: string;
          score?: number;
          submission_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fraud_checks_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "campaign_submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      legacy_user_map: {
        Row: {
          legacy_user_id: string;
          legacy_users_row_id: string | null;
          migrated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          legacy_user_id: string;
          legacy_users_row_id?: string | null;
          migrated_at?: string;
          user_id: string;
        };
        Update: {
          legacy_user_id?: string;
          legacy_users_row_id?: string | null;
          migrated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          content: string | null;
          conversation_id: string;
          created_at: string;
          id: string;
          message_type: string;
          offer_id: string | null;
          read_at: string | null;
          sender_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          content?: string | null;
          conversation_id: string;
          created_at?: string;
          id?: string;
          message_type?: string;
          offer_id?: string | null;
          read_at?: string | null;
          sender_id: string;
          updated_at?: string;
        };
        Update: {
          content?: string | null;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          message_type?: string;
          offer_id?: string | null;
          read_at?: string | null;
          sender_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          is_read: boolean;
          message: string;
          title: string;
          type: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          message: string;
          title: string;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          message?: string;
          title?: string;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      offers: {
        Row: {
          conversation_id: string;
          created_at: string;
          creator_id: string;
          deadline: string;
          description: string | null;
          id: string;
          package_id: string | null;
          package_name_snapshot: string | null;
          package_price_snapshot: number | null;
          price: number;
          revision_limit: number;
          status: string;
          title: string;
          umkm_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          conversation_id: string;
          created_at?: string;
          creator_id: string;
          deadline: string;
          description?: string | null;
          id?: string;
          package_id?: string | null;
          package_name_snapshot?: string | null;
          package_price_snapshot?: number | null;
          price?: number;
          revision_limit?: number;
          status?: string;
          title: string;
          umkm_id: string;
          updated_at?: string;
        };
        Update: {
          conversation_id?: string;
          created_at?: string;
          creator_id?: string;
          deadline?: string;
          description?: string | null;
          id?: string;
          package_id?: string | null;
          package_name_snapshot?: string | null;
          package_price_snapshot?: number | null;
          price?: number;
          revision_limit?: number;
          status?: string;
          title?: string;
          umkm_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offers_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_package_id_fkey";
            columns: ["package_id"];
            isOneToOne: false;
            referencedRelation: "rate_card_packages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_umkm_id_fkey";
            columns: ["umkm_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          amount: number;
          auto_approved: boolean;
          created_at: string;
          creator_id: string;
          id: string;
          offer_id: string | null;
          package_id: string | null;
          package_name_snapshot: string | null;
          package_price_snapshot: number | null;
          reminder_sent_at: string | null;
          review_deadline_at: string | null;
          revision_count: number;
          revision_limit: number;
          status: string;
          umkm_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount?: number;
          auto_approved?: boolean;
          created_at?: string;
          creator_id: string;
          id?: string;
          offer_id?: string | null;
          package_id?: string | null;
          package_name_snapshot?: string | null;
          package_price_snapshot?: number | null;
          reminder_sent_at?: string | null;
          review_deadline_at?: string | null;
          revision_count?: number;
          revision_limit?: number;
          status?: string;
          umkm_id: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          auto_approved?: boolean;
          created_at?: string;
          creator_id?: string;
          id?: string;
          offer_id?: string | null;
          package_id?: string | null;
          package_name_snapshot?: string | null;
          package_price_snapshot?: number | null;
          reminder_sent_at?: string | null;
          review_deadline_at?: string | null;
          revision_count?: number;
          revision_limit?: number;
          status?: string;
          umkm_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: true;
            referencedRelation: "offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_package_id_fkey";
            columns: ["package_id"];
            isOneToOne: false;
            referencedRelation: "rate_card_packages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_umkm_id_fkey";
            columns: ["umkm_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      otp_rate_limits: {
        Row: {
          count: number;
          created_at: string;
          email: string;
          id: string;
          ip: string;
          key: string;
          updated_at: string;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          count?: number;
          created_at?: string;
          email: string;
          id?: string;
          ip: string;
          key: string;
          updated_at?: string;
          window_start: string;
        };
        Update: {
          count?: number;
          created_at?: string;
          email?: string;
          id?: string;
          ip?: string;
          key?: string;
          updated_at?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          campaign_id: string | null;
          created_at: string;
          fee_amount: number;
          gateway: string;
          gateway_reference: string;
          id: string;
          order_id: string | null;
          order_payment_key: string | null;
          paid_at: string | null;
          purpose: string;
          redirect_url: string | null;
          snap_token: string | null;
          status: string;
          total_amount: number;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount?: number;
          campaign_id?: string | null;
          created_at?: string;
          fee_amount?: number;
          gateway?: string;
          gateway_reference: string;
          id?: string;
          order_id?: string | null;
          order_payment_key?: string | null;
          paid_at?: string | null;
          purpose: string;
          redirect_url?: string | null;
          snap_token?: string | null;
          status?: string;
          total_amount?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          campaign_id?: string | null;
          created_at?: string;
          fee_amount?: number;
          gateway?: string;
          gateway_reference?: string;
          id?: string;
          order_id?: string | null;
          order_payment_key?: string | null;
          paid_at?: string | null;
          purpose?: string;
          redirect_url?: string | null;
          snap_token?: string | null;
          status?: string;
          total_amount?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_card_packages: {
        Row: {
          created_at: string;
          delivery_days: number;
          description: string;
          id: string;
          name: string;
          output: string;
          price: number;
          rate_card_id: string;
          revision_limit: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          delivery_days: number;
          description: string;
          id?: string;
          name: string;
          output: string;
          price?: number;
          rate_card_id: string;
          revision_limit?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          delivery_days?: number;
          description?: string;
          id?: string;
          name?: string;
          output?: string;
          price?: number;
          rate_card_id?: string;
          revision_limit?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rate_card_packages_rate_card_id_fkey";
            columns: ["rate_card_id"];
            isOneToOne: false;
            referencedRelation: "rate_cards";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_cards: {
        Row: {
          created_at: string;
          creator_id: string;
          description: string | null;
          id: string;
          status: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          creator_id: string;
          description?: string | null;
          id?: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          creator_id?: string;
          description?: string | null;
          id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rate_cards_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ratecard_deliverable_validations: {
        Row: {
          created_at: string;
          deliverable_id: string;
          deliverable_version: number;
          evidence_url_snapshot: string;
          id: string;
          order_id: string;
          review_notes: string | null;
          reviewed_at: string;
          reviewed_by: string;
          source_snapshot: string;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          deliverable_id: string;
          deliverable_version: number;
          evidence_url_snapshot: string;
          id?: string;
          order_id: string;
          review_notes?: string | null;
          reviewed_at?: string;
          reviewed_by: string;
          source_snapshot: string;
          status: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deliverable_id?: string;
          deliverable_version?: number;
          evidence_url_snapshot?: string;
          id?: string;
          order_id?: string;
          review_notes?: string | null;
          reviewed_at?: string;
          reviewed_by?: string;
          source_snapshot?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ratecard_deliverable_validations_deliverable_id_fkey";
            columns: ["deliverable_id"];
            isOneToOne: true;
            referencedRelation: "deliverables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ratecard_deliverable_validations_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ratecard_deliverable_validations_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      revisions: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          order_id: string;
          requested_by: string;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          order_id: string;
          requested_by: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          order_id?: string;
          requested_by?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "revisions_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "revisions_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          reference_id: string | null;
          reference_type: string | null;
          status: string;
          type: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount?: number;
          created_at?: string;
          id?: string;
          reference_id?: string | null;
          reference_type?: string | null;
          status?: string;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          reference_id?: string | null;
          reference_type?: string | null;
          status?: string;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      umkm_profiles: {
        Row: {
          business_name: string;
          category: string;
          city: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_profile_completed: boolean;
          logo_url: string | null;
          tiktok: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          business_name: string;
          category?: string;
          city?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_profile_completed?: boolean;
          logo_url?: string | null;
          tiktok?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          business_name?: string;
          category?: string;
          city?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_profile_completed?: boolean;
          logo_url?: string | null;
          tiktok?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "umkm_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_files: {
        Row: {
          bucket_id: string;
          created_at: string;
          deleted_at: string | null;
          file_name: string;
          id: string;
          mime_type: string;
          size_bytes: number;
          status: string;
          storage_file_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          bucket_id: string;
          created_at?: string;
          deleted_at?: string | null;
          file_name: string;
          id?: string;
          mime_type: string;
          size_bytes: number;
          status?: string;
          storage_file_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          file_name?: string;
          id?: string;
          mime_type?: string;
          size_bytes?: number;
          status?: string;
          storage_file_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_files_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_storage_usage: {
        Row: {
          created_at: string;
          file_count: number;
          id: string;
          quota_bytes: number;
          updated_at: string;
          used_bytes: number;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          file_count?: number;
          id?: string;
          quota_bytes?: number;
          updated_at?: string;
          used_bytes?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          file_count?: number;
          id?: string;
          quota_bytes?: number;
          updated_at?: string;
          used_bytes?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_storage_usage_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          address: string | null;
          created_at: string;
          email: string;
          email_verified_at: string | null;
          id: string;
          kyc_status: string;
          kyc_verified_at: string | null;
          phone: string | null;
          role: string;
          status: string;
          suspended_at: string | null;
          tos_accepted_at: string | null;
          tos_version: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          created_at?: string;
          email: string;
          email_verified_at?: string | null;
          id: string;
          kyc_status?: string;
          kyc_verified_at?: string | null;
          phone?: string | null;
          role: string;
          status?: string;
          suspended_at?: string | null;
          tos_accepted_at?: string | null;
          tos_version?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          email?: string;
          email_verified_at?: string | null;
          id?: string;
          kyc_status?: string;
          kyc_verified_at?: string | null;
          phone?: string | null;
          role?: string;
          status?: string;
          suspended_at?: string | null;
          tos_accepted_at?: string | null;
          tos_version?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      wallets: {
        Row: {
          balance: number;
          created_at: string;
          id: string;
          pending_balance: number;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          balance?: number;
          created_at?: string;
          id?: string;
          pending_balance?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          balance?: number;
          created_at?: string;
          id?: string;
          pending_balance?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      withdrawals: {
        Row: {
          account_name: string;
          account_number: string;
          admin_note: string | null;
          amount: number;
          created_at: string;
          failure_reason: string | null;
          id: string;
          iris_reference: string | null;
          kyc_status: string | null;
          payout_method: string;
          processed_at: string | null;
          processed_by: string | null;
          processing_at: string | null;
          provider_name: string;
          requester_role: string | null;
          reversed_at: string | null;
          source_origin: string | null;
          status: string;
          transfer_reference: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          account_name: string;
          account_number: string;
          admin_note?: string | null;
          amount?: number;
          created_at?: string;
          failure_reason?: string | null;
          id?: string;
          iris_reference?: string | null;
          kyc_status?: string | null;
          payout_method: string;
          processed_at?: string | null;
          processed_by?: string | null;
          processing_at?: string | null;
          provider_name: string;
          requester_role?: string | null;
          reversed_at?: string | null;
          source_origin?: string | null;
          status?: string;
          transfer_reference?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          account_name?: string;
          account_number?: string;
          admin_note?: string | null;
          amount?: number;
          created_at?: string;
          failure_reason?: string | null;
          id?: string;
          iris_reference?: string | null;
          kyc_status?: string | null;
          payout_method?: string;
          processed_at?: string | null;
          processed_by?: string | null;
          processing_at?: string | null;
          provider_name?: string;
          requester_role?: string | null;
          reversed_at?: string | null;
          source_origin?: string | null;
          status?: string;
          transfer_reference?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "withdrawals_processed_by_fkey";
            columns: ["processed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "withdrawals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
