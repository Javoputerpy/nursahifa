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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          created_at: string
          id: string
          score: number
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          score: number
          total: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          score?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      scan_limits: {
        Row: {
          id: string
          user_id: string
          scan_date: string
          scan_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          scan_date?: string
          scan_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          scan_date?: string
          scan_count?: number
          created_at?: string
        }
        Relationships: []
      }
      scan_cache: {
        Row: {
          id: string
          image_hash: string
          words: any
          created_at: string
        }
        Insert: {
          id?: string
          image_hash: string
          words?: any
          created_at?: string
        }
        Update: {
          id?: string
          image_hash?: string
          words?: any
          created_at?: string
        }
        Relationships: []
      }
      review_history: {
        Row: {
          id: string
          interval_minutes: number
          rating: string
          reviewed_at: string
          user_id: string
          word_id: string
        }
        Insert: {
          id?: string
          interval_minutes: number
          rating: string
          reviewed_at?: string
          user_id: string
          word_id: string
        }
        Update: {
          id?: string
          interval_minutes?: number
          rating?: string
          reviewed_at?: string
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_history_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_feedback_map: {
        Row: {
          admin_message_id: number
          created_at: string
          user_chat_id: number
          user_message_id: number | null
        }
        Insert: {
          admin_message_id: number
          created_at?: string
          user_chat_id: number
          user_message_id?: number | null
        }
        Update: {
          admin_message_id?: number
          created_at?: string
          user_chat_id?: number
          user_message_id?: number | null
        }
        Relationships: []
      }
      telegram_link_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          token: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          token: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_user_modes: {
        Row: {
          chat_id: number
          mode: string
          updated_at: string
        }
        Insert: {
          chat_id: number
          mode?: string
          updated_at?: string
        }
        Update: {
          chat_id?: number
          mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          last_reminded_on: string | null
          reminder_hour: number
          reminder_minute: number
          reminders_enabled: boolean
          telegram_chat_id: number | null
          tz_offset_minutes: number
          updated_at: string
          user_id: string
          web_push_subscription: Json | null
        }
        Insert: {
          last_reminded_on?: string | null
          reminder_hour?: number
          reminder_minute?: number
          reminders_enabled?: boolean
          telegram_chat_id?: number | null
          tz_offset_minutes?: number
          updated_at?: string
          user_id: string
          web_push_subscription?: Json | null
        }
        Update: {
          last_reminded_on?: string | null
          reminder_hour?: number
          reminder_minute?: number
          reminders_enabled?: boolean
          telegram_chat_id?: number | null
          tz_offset_minutes?: number
          updated_at?: string
          user_id?: string
          web_push_subscription?: Json | null
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          current_streak: number
          last_review_date: string | null
          longest_streak: number
          today_date: string | null
          today_seconds: number
          total_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_review_date?: string | null
          longest_streak?: number
          today_date?: string | null
          today_seconds?: number
          total_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_review_date?: string | null
          longest_streak?: number
          today_date?: string | null
          today_seconds?: number
          total_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      words: {
        Row: {
          antonyms: string[] | null
          created_at: string
          example: string | null
          example_uz: string | null
          explanation: string | null
          id: string
          interval_minutes: number
          ipa: string | null
          is_favorite: boolean
          last_reviewed_at: string | null
          mastery_level: string
          next_review_at: string
          review_count: number
          status: string
          synonyms: string[] | null
          translation_uz: string | null
          user_id: string
          word: string
        }
        Insert: {
          antonyms?: string[] | null
          created_at?: string
          example?: string | null
          example_uz?: string | null
          explanation?: string | null
          id?: string
          interval_minutes?: number
          ipa?: string | null
          is_favorite?: boolean
          last_reviewed_at?: string | null
          mastery_level?: string
          next_review_at?: string
          review_count?: number
          status?: string
          synonyms?: string[] | null
          translation_uz?: string | null
          user_id: string
          word: string
        }
        Update: {
          antonyms?: string[] | null
          created_at?: string
          example?: string | null
          example_uz?: string | null
          explanation?: string | null
          id?: string
          interval_minutes?: number
          ipa?: string | null
          is_favorite?: boolean
          last_reviewed_at?: string | null
          mastery_level?: string
          next_review_at?: string
          review_count?: number
          status?: string
          synonyms?: string[] | null
          translation_uz?: string | null
          user_id?: string
          word?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      record_review_day: {
        Args: { _seconds?: number }
        Returns: {
          current_streak: number
          last_review_date: string | null
          longest_streak: number
          today_date: string | null
          today_seconds: number
          total_seconds: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_streaks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      increment_scan_count: {
        Args: Record<string, never>
        Returns: number
      }
      get_scan_count: {
        Args: Record<string, never>
        Returns: number
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
