// ============================================================
// Vint Platform — Supabase Database Types
// 由 schema.sql 手工對應，格式符合 Supabase 官方 Database 型別規範
// 可用 `supabase gen types typescript` 指令自動重新產生
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Enum types ───────────────────────────────────────────

export type UserRole         = 'student' | 'mentor' | 'admin';
export type MentorSpecialty  =
  | 'activity'
  | 'science'
  | 'language'
  | 'other'
  | 'technical';
/** 英語大冒險小編風格 */
export type QuizEditorPersonality = 'toxic' | 'gentle';
export type AssignmentType   = 'text' | 'audio' | 'video' | 'image' | 'pdf';
export type AssignmentStatus = 'submitted' | 'grading' | 'graded' | 'returned';
export type CourseLevel      = 'beginner' | 'intermediate' | 'advanced';
export type CourseQuizPlacement = 'after_lesson' | 'final_exam';
export type CourseQuizChoiceMode = 'three' | 'four';
export type CourseQuizStepKind = 'video_text' | 'question';
export type CourseQuizOverlayScope = 'fullscreen' | 'video';
export type CourseQuizPlayTheme = 'off' | 'magic_forest' | 'kindergarten';
export type CourseQuizInteractionMode = 'choice_grid' | 'vocabulary_drop';
export type CourseQuizVocabularyDisplay = 'character' | 'shape';

/** 英語測驗難度（questions.difficulty / user_quiz_scores.difficulty） */
export type QuizDifficultyLevel =
  | 'elementary'
  | 'junior'
  | 'college'
  | 'professor';

/**
 * Matches postgrest-js GenericRelationship. Empty tables must use this instead of
 * `Relationships: []` — literal `[]` infers `never[]` and breaks GenericSchema,
 * collapsing `.from()` insert types to `never`.
 */
export interface FKRelationship {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}

// ─── Database interface ───────────────────────────────────

export interface Database {
  /** 與 @supabase/ssr 的 Postgrest 版本推斷一致，有助於 `createServerClient<Database>()` 正確套用 schema */
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
  public: {
    Tables: {

      // ── profiles ──────────────────────────────────────
      profiles: {
        Row: {
          id:                string;
          role:              UserRole;
          display_name:      string;
          avatar_url:        string | null;
          bio:               string | null;
          mentor_specialty:  MentorSpecialty | null;
          quiz_editor_personality: QuizEditorPersonality | null;
          exp:               number;
          level:             number;
          streak_days:       number;
          last_active_at:    string | null;   // date → ISO string
          total_xp_earned:   number;
          stripe_customer_id: string | null;
          created_at:        string;
          updated_at:        string;
        };
        Insert: {
          id:                string;
          role?:             UserRole;
          display_name?:     string;
          avatar_url?:       string | null;
          bio?:              string | null;
          mentor_specialty?: MentorSpecialty | null;
          quiz_editor_personality?: QuizEditorPersonality | null;
          exp?:              number;
          level?:            number;
          streak_days?:      number;
          last_active_at?:   string | null;
          total_xp_earned?:  number;
          stripe_customer_id?: string | null;
          created_at?:       string;
          updated_at?:       string;
        };
        Update: {
          id?:               string;
          role?:             UserRole;
          display_name?:     string;
          avatar_url?:       string | null;
          bio?:              string | null;
          mentor_specialty?: MentorSpecialty | null;
          quiz_editor_personality?: QuizEditorPersonality | null;
          exp?:              number;
          level?:            number;
          streak_days?:      number;
          last_active_at?:   string | null;
          total_xp_earned?:  number;
          stripe_customer_id?: string | null;
          updated_at?:       string;
        };
        Relationships: FKRelationship[];
      };

      // ── categories ────────────────────────────────────
      categories: {
        Row: {
          id:         number;
          name:       string;
          slug:       string;
          created_at: string;
        };
        Insert: {
          id?:        number;
          name:       string;
          slug:       string;
          created_at?: string;
        };
        Update: {
          id?:   number;
          name?: string;
          slug?: string;
        };
        Relationships: FKRelationship[];
      };

      // ── courses ───────────────────────────────────────
      courses: {
        Row: {
          id:            string;
          teacher_id:    string;
          category_id:   number | null;
          title:         string;
          description:   string | null;
          thumbnail_url: string | null;
          level:         CourseLevel;
          price:         number;
          is_free:       boolean;
          is_published:  boolean;
          sub_basic_free: boolean;
          sub_pro_free:   boolean;
          lesson_count:  number;
          student_count: number;
          created_at:    string;
          updated_at:    string;
        };
        Insert: {
          id?:           string;
          teacher_id:    string;
          category_id?:  number | null;
          title:         string;
          description?:  string | null;
          thumbnail_url?: string | null;
          level?:        CourseLevel;
          price?:        number;
          is_free?:      boolean;
          is_published?: boolean;
          sub_basic_free?: boolean;
          sub_pro_free?:   boolean;
          lesson_count?: number;
          student_count?: number;
          created_at?:   string;
          updated_at?:   string;
        };
        Update: {
          id?:           string;
          teacher_id?:   string;
          category_id?:  number | null;
          title?:        string;
          description?:  string | null;
          thumbnail_url?: string | null;
          level?:        CourseLevel;
          price?:        number;
          is_free?:      boolean;
          is_published?: boolean;
          sub_basic_free?: boolean;
          sub_pro_free?:   boolean;
          updated_at?:   string;
        };
        Relationships: [
          {
            foreignKeyName: 'courses_teacher_id_fkey';
            columns: ['teacher_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'courses_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          }
        ];
      };

      // ── lessons ───────────────────────────────────────
      lessons: {
        Row: {
          id:              string;
          course_id:       string;
          title:           string;
          description:     string | null;
          sort_order:      number;
          cf_video_uid:    string | null;
          cf_thumbnail_url: string | null;
          duration_sec:    number;
          is_preview:      boolean;
          sub_basic_free:  boolean | null;
          sub_pro_free:    boolean | null;
          xp_reward:       number;
          created_at:      string;
          updated_at:      string;
        };
        Insert: {
          id?:             string;
          course_id:       string;
          title:           string;
          description?:    string | null;
          sort_order?:     number;
          cf_video_uid?:   string | null;
          cf_thumbnail_url?: string | null;
          duration_sec?:   number;
          is_preview?:     boolean;
          sub_basic_free?: boolean | null;
          sub_pro_free?:   boolean | null;
          xp_reward?:      number;
          created_at?:     string;
          updated_at?:     string;
        };
        Update: {
          id?:             string;
          course_id?:      string;
          title?:          string;
          description?:    string | null;
          sort_order?:     number;
          cf_video_uid?:   string | null;
          cf_thumbnail_url?: string | null;
          duration_sec?:   number;
          is_preview?:     boolean;
          sub_basic_free?: boolean | null;
          sub_pro_free?:   boolean | null;
          xp_reward?:      number;
          updated_at?:     string;
        };
        Relationships: [
          {
            foreignKeyName: 'lessons_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          }
        ];
      };

      // ── lesson_textbooks ──────────────────────────────
      lesson_textbooks: {
        Row: {
          id:                string;
          lesson_id:         string;
          title:             string;
          file_name:         string;
          file_url:          string;
          storage_path:      string;
          mime_type:         string | null;
          file_size_bytes:   number;
          sort_order:        number;
          page_start:        number | null;
          page_end:          number | null;
          source_page_count: number | null;
          created_at:        string;
          updated_at:        string;
        };
        Insert: {
          id?:                string;
          lesson_id:          string;
          title:              string;
          file_name:          string;
          file_url:           string;
          storage_path:       string;
          mime_type?:         string | null;
          file_size_bytes?:   number;
          sort_order?:        number;
          page_start?:        number | null;
          page_end?:          number | null;
          source_page_count?: number | null;
          created_at?:        string;
          updated_at?:        string;
        };
        Update: {
          title?:             string;
          file_name?:         string;
          file_url?:          string;
          storage_path?:      string;
          mime_type?:         string | null;
          file_size_bytes?:   number;
          sort_order?:        number;
          page_start?:        number | null;
          page_end?:          number | null;
          source_page_count?: number | null;
          updated_at?:        string;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_textbooks_lesson_id_fkey';
            columns: ['lesson_id'];
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          }
        ];
      };

      // ── lesson_timed_cues ───────────────────────────
      lesson_timed_cues: {
        Row: {
          id:               string;
          lesson_id:        string;
          trigger_at_sec:   number;
          cue_type:         'sentence' | 'multiple_choice' | 'text_input';
          payload:          Json;
          sort_order:       number;
          is_enabled:       boolean;
          created_at:       string;
          updated_at:       string;
        };
        Insert: {
          id?:              string;
          lesson_id:        string;
          trigger_at_sec:   number;
          cue_type:         'sentence' | 'multiple_choice' | 'text_input';
          payload:          Json;
          sort_order?:      number;
          is_enabled?:      boolean;
          created_at?:      string;
          updated_at?:      string;
        };
        Update: {
          trigger_at_sec?:  number;
          cue_type?:        'sentence' | 'multiple_choice' | 'text_input';
          payload?:         Json;
          sort_order?:      number;
          is_enabled?:      boolean;
          updated_at?:      string;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_timed_cues_lesson_id_fkey';
            columns: ['lesson_id'];
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          }
        ];
      };

      // ── lesson_cue_answers ────────────────────────────
      lesson_cue_answers: {
        Row: {
          user_id:     string;
          lesson_id:   string;
          cue_id:      string;
          answered_at: string;
        };
        Insert: {
          user_id:     string;
          lesson_id:   string;
          cue_id:      string;
          answered_at?: string;
        };
        Update: {
          answered_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_cue_answers_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_cue_answers_lesson_id_fkey';
            columns: ['lesson_id'];
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_cue_answers_cue_id_fkey';
            columns: ['cue_id'];
            referencedRelation: 'lesson_timed_cues';
            referencedColumns: ['id'];
          }
        ];
      };

      // ── course_quizzes ────────────────────────────────
      course_quizzes: {
        Row: {
          id:                          string;
          course_id:                   string;
          title:                       string;
          placement:                   CourseQuizPlacement;
          choice_mode:                 CourseQuizChoiceMode;
          play_theme:                  CourseQuizPlayTheme;
          interaction_mode:            CourseQuizInteractionMode;
          vocabulary_display:          CourseQuizVocabularyDisplay;
          shape_typeface_url:          string | null;
          after_lesson_id:             string | null;
          require_to_continue:         boolean;
          require_to_complete_course:  boolean;
          xp_reward:                   number;
          is_published:                boolean;
          sub_basic_free:              boolean | null;
          sub_pro_free:                boolean | null;
          sort_order:                  number;
          created_at:                  string;
          updated_at:                  string;
        };
        Insert: {
          id?:                         string;
          course_id:                   string;
          title?:                      string;
          placement?:                  CourseQuizPlacement;
          choice_mode?:                CourseQuizChoiceMode;
          play_theme?:                 CourseQuizPlayTheme;
          interaction_mode?:           CourseQuizInteractionMode;
          vocabulary_display?:         CourseQuizVocabularyDisplay;
          shape_typeface_url?:         string | null;
          after_lesson_id?:            string | null;
          require_to_continue?:        boolean;
          require_to_complete_course?: boolean;
          xp_reward?:                  number;
          is_published?:               boolean;
          sub_basic_free?:             boolean | null;
          sub_pro_free?:               boolean | null;
          sort_order?:                 number;
          created_at?:                 string;
          updated_at?:                 string;
        };
        Update: {
          title?:                      string;
          placement?:                  CourseQuizPlacement;
          choice_mode?:                CourseQuizChoiceMode;
          play_theme?:                 CourseQuizPlayTheme;
          interaction_mode?:           CourseQuizInteractionMode;
          vocabulary_display?:         CourseQuizVocabularyDisplay;
          shape_typeface_url?:         string | null;
          after_lesson_id?:            string | null;
          require_to_continue?:        boolean;
          require_to_complete_course?:  boolean;
          xp_reward?:                  number;
          is_published?:               boolean;
          sub_basic_free?:             boolean | null;
          sub_pro_free?:               boolean | null;
          sort_order?:                 number;
          updated_at?:                 string;
        };
        Relationships: [
          {
            foreignKeyName: 'course_quizzes_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'course_quizzes_after_lesson_id_fkey';
            columns: ['after_lesson_id'];
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          }
        ];
      };

      // ── course_quiz_questions ─────────────────────────
      course_quiz_questions: {
        Row: {
          id:              string;
          quiz_id:         string;
          sort_order:      number;
          question_text:       string;
          question_speech_text: string;
          options:             Json;
          correct_index:       number;
          explanation:         string | null;
          cf_video_uid:        string | null;
          cf_correct_video_uid: string | null;
          cf_wrong_video_uid:   string | null;
          question_audio_url:  string | null;
          option_audio_urls:   Json;
          option_image_urls:   Json;
          option_shape_glyphs: Json;
          vocabulary_display:  CourseQuizVocabularyDisplay;
          created_at:          string;
          updated_at:          string;
        };
        Insert: {
          id?:                 string;
          quiz_id:             string;
          sort_order?:         number;
          question_text:        string;
          question_speech_text?: string;
          options?:             Json;
          correct_index?:       number;
          explanation?:         string | null;
          cf_video_uid?:        string | null;
          cf_correct_video_uid?: string | null;
          cf_wrong_video_uid?:   string | null;
          question_audio_url?:  string | null;
          option_audio_urls?:   Json;
          option_image_urls?:   Json;
          option_shape_glyphs?: Json;
          vocabulary_display?:  CourseQuizVocabularyDisplay;
          created_at?:          string;
          updated_at?:          string;
        };
        Update: {
          sort_order?:          number;
          question_text?:       string;
          question_speech_text?: string;
          options?:             Json;
          correct_index?:      number;
          explanation?:        string | null;
          cf_video_uid?:       string | null;
          cf_correct_video_uid?: string | null;
          cf_wrong_video_uid?:   string | null;
          question_audio_url?: string | null;
          option_audio_urls?:  Json;
          option_image_urls?:  Json;
          option_shape_glyphs?: Json;
          vocabulary_display?:  CourseQuizVocabularyDisplay;
          updated_at?:         string;
        };
        Relationships: [
          {
            foreignKeyName: 'course_quiz_questions_quiz_id_fkey';
            columns: ['quiz_id'];
            referencedRelation: 'course_quizzes';
            referencedColumns: ['id'];
          }
        ];
      };

      // ── course_quiz_steps ───────────────────────────────
      course_quiz_steps: {
        Row: {
          id:              string;
          quiz_id:         string;
          sort_order:      number;
          step_kind:       CourseQuizStepKind;
          question_id:     string | null;
          text_content:    string | null;
          font_family:     string;
          font_size_px:    number;
          text_color:      string;
          text_align:      string;
          text_animation:  string;
          overlay_scope:   CourseQuizOverlayScope;
          created_at:      string;
          updated_at:      string;
        };
        Insert: {
          id?:             string;
          quiz_id:         string;
          sort_order?:     number;
          step_kind:       CourseQuizStepKind;
          question_id?:    string | null;
          text_content?:   string | null;
          font_family?:    string;
          font_size_px?:   number;
          text_color?:     string;
          text_align?:     string;
          text_animation?: string;
          overlay_scope?:  CourseQuizOverlayScope;
          created_at?:     string;
          updated_at?:     string;
        };
        Update: {
          sort_order?:     number;
          step_kind?:      CourseQuizStepKind;
          question_id?:    string | null;
          text_content?:   string | null;
          font_family?:    string;
          font_size_px?:   number;
          text_color?:     string;
          text_align?:     string;
          text_animation?: string;
          overlay_scope?:  CourseQuizOverlayScope;
          updated_at?:     string;
        };
        Relationships: [
          {
            foreignKeyName: 'course_quiz_steps_quiz_id_fkey';
            columns: ['quiz_id'];
            referencedRelation: 'course_quizzes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'course_quiz_steps_question_id_fkey';
            columns: ['question_id'];
            referencedRelation: 'course_quiz_questions';
            referencedColumns: ['id'];
          }
        ];
      };

      // ── user_course_quiz_progress ─────────────────────
      user_course_quiz_progress: {
        Row: {
          user_id:       string;
          quiz_id:       string;
          completed:     boolean;
          completed_at:  string | null;
          xp_granted:    boolean;
          created_at:    string;
          updated_at:    string;
        };
        Insert: {
          user_id:       string;
          quiz_id:       string;
          completed?:    boolean;
          completed_at?: string | null;
          xp_granted?:   boolean;
          created_at?:   string;
          updated_at?:   string;
        };
        Update: {
          completed?:    boolean;
          completed_at?: string | null;
          xp_granted?:   boolean;
          updated_at?:   string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_course_quiz_progress_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_course_quiz_progress_quiz_id_fkey';
            columns: ['quiz_id'];
            referencedRelation: 'course_quizzes';
            referencedColumns: ['id'];
          }
        ];
      };

      // ── enrollments ───────────────────────────────────
      enrollments: {
        Row: {
          id:                string;
          user_id:           string;
          course_id:         string;
          stripe_payment_id: string | null;
          enrolled_at:       string;
          expires_at:        string | null;
        };
        Insert: {
          id?:               string;
          user_id:           string;
          course_id:         string;
          stripe_payment_id?: string | null;
          enrolled_at?:      string;
          expires_at?:       string | null;
        };
        Update: {
          stripe_payment_id?: string | null;
          expires_at?:        string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'enrollments_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'enrollments_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          }
        ];
      };

      // ── subscription_plan_gifts ────────────────────────
      subscription_plan_gifts: {
        Row: {
          plan_code: string;
          shop_item_id: string;
          quantity: number;
          created_at: string;
        };
        Insert: {
          plan_code: string;
          shop_item_id: string;
          quantity?: number;
          created_at?: string;
        };
        Update: {
          plan_code?: string;
          shop_item_id?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'subscription_plan_gifts_plan_code_fkey';
            columns: ['plan_code'];
            referencedRelation: 'subscription_plans';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'subscription_plan_gifts_shop_item_id_fkey';
            columns: ['shop_item_id'];
            referencedRelation: 'shop_items';
            referencedColumns: ['id'];
          },
        ];
      };

      subscription_gift_deliveries: {
        Row: {
          id: string;
          user_id: string;
          plan_code: string;
          shop_item_id: string;
          stripe_subscription_id: string;
          delivered_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_code: string;
          shop_item_id: string;
          stripe_subscription_id: string;
          delivered_at?: string;
        };
        Update: {
          delivered_at?: string;
        };
        Relationships: [];
      };

      // ── subscription_plans ─────────────────────────────
      subscription_plans: {
        Row: {
          id: string;
          code: string;
          title: string;
          description: string;
          price_cents: number;
          currency: string;
          stripe_price_id: string | null;
          is_active: boolean;
          free_play_games: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          title: string;
          description?: string;
          price_cents?: number;
          currency?: string;
          stripe_price_id?: string | null;
          is_active?: boolean;
          free_play_games?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          title?: string;
          description?: string;
          price_cents?: number;
          currency?: string;
          stripe_price_id?: string | null;
          is_active?: boolean;
          free_play_games?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── shop_items ─────────────────────────────────────
      shop_items: {
        Row: {
          id: string;
          kind: string;
          title: string;
          description: string;
          price_cents: number;
          currency: string;
          stripe_price_id: string | null;
          stamina_amount: number | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kind: string;
          title: string;
          description?: string;
          price_cents?: number;
          currency?: string;
          stripe_price_id?: string | null;
          stamina_amount?: number | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          kind?: string;
          title?: string;
          description?: string;
          price_cents?: number;
          currency?: string;
          stripe_price_id?: string | null;
          stamina_amount?: number | null;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── user_subscriptions ─────────────────────────────
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_code: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: string;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_code: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: string;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: string;
          current_period_end?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_subscriptions_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      // ── user_purchases ──────────────────────────────────
      user_purchases: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          shop_item_id: string | null;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          amount_cents: number | null;
          currency: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: string;
          shop_item_id?: string | null;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          amount_cents?: number | null;
          currency?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          amount_cents?: number | null;
          currency?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_purchases_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_purchases_shop_item_id_fkey';
            columns: ['shop_item_id'];
            referencedRelation: 'shop_items';
            referencedColumns: ['id'];
          },
        ];
      };

      // ── stripe_events ────────────────────────────────────
      stripe_events: {
        Row: {
          id: string;
          type: string;
          created_at: string;
        };
        Insert: {
          id: string;
          type: string;
          created_at?: string;
        };
        Update: {
          type?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── profile_inbox_messages ─────────────────────────
      profile_inbox_messages: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          title: string;
          body: string;
          payload: Record<string, unknown>;
          read_at: string | null;
          claimed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: string;
          title: string;
          body?: string;
          payload?: Record<string, unknown>;
          read_at?: string | null;
          claimed_at?: string | null;
          created_at?: string;
        };
        Update: {
          kind?: string;
          title?: string;
          body?: string;
          payload?: Record<string, unknown>;
          read_at?: string | null;
          claimed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_inbox_messages_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      // ── user_game_stamina ────────────────────────────────
      user_game_stamina: {
        Row: {
          user_id: string;
          stamina: number;
          stamina_anchor: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          stamina?: number;
          stamina_anchor?: string;
          updated_at?: string;
        };
        Update: {
          stamina?: number;
          stamina_anchor?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_game_stamina_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      // ── user_progress ─────────────────────────────────
      user_progress: {
        Row: {
          id:              string;
          user_id:         string;
          lesson_id:       string;
          watched_seconds: number;
          completed:       boolean;
          completed_at:    string | null;
          xp_granted:      boolean;
          last_watched_at: string;
        };
        Insert: {
          id?:             string;
          user_id:         string;
          lesson_id:       string;
          watched_seconds?: number;
          completed?:      boolean;
          completed_at?:   string | null;
          xp_granted?:     boolean;
          last_watched_at?: string;
        };
        Update: {
          watched_seconds?: number;
          completed?:       boolean;
          completed_at?:    string | null;
          xp_granted?:      boolean;
          last_watched_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_progress_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_progress_lesson_id_fkey';
            columns: ['lesson_id'];
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          }
        ];
      };

      // ── assignments ───────────────────────────────────
      assignments: {
        Row: {
          id:           string;
          lesson_id:    string;
          student_id:   string;
          type:         AssignmentType;
          status:       AssignmentStatus;
          text_content: string | null;
          file_url:     string | null;
          file_name:    string | null;
          file_size:    number | null;
          file_mime:    string | null;
          grade:        number | null;
          feedback:     string | null;
          graded_by:    string | null;
          graded_at:    string | null;
          xp_awarded:   number;
          submitted_at: string;
          updated_at:   string;
        };
        Insert: {
          id?:          string;
          lesson_id:    string;
          student_id:   string;
          type:         AssignmentType;
          status?:      AssignmentStatus;
          text_content?: string | null;
          file_url?:    string | null;
          file_name?:   string | null;
          file_size?:   number | null;
          file_mime?:   string | null;
          grade?:       number | null;
          feedback?:    string | null;
          graded_by?:   string | null;
          graded_at?:   string | null;
          xp_awarded?:  number;
          submitted_at?: string;
          updated_at?:  string;
        };
        Update: {
          type?:        AssignmentType;
          status?:      AssignmentStatus;
          text_content?: string | null;
          file_url?:    string | null;
          file_name?:   string | null;
          file_size?:   number | null;
          file_mime?:   string | null;
          grade?:       number | null;
          feedback?:    string | null;
          graded_by?:   string | null;
          graded_at?:   string | null;
          xp_awarded?:  number;
          updated_at?:  string;
        };
        Relationships: [
          {
            foreignKeyName: 'assignments_lesson_id_fkey';
            columns: ['lesson_id'];
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assignments_student_id_fkey';
            columns: ['student_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assignments_graded_by_fkey';
            columns: ['graded_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      // ── badges ────────────────────────────────────────
      badges: {
        Row: {
          id:         string;
          user_id:    string;
          badge_key:  string;
          awarded_at: string;
        };
        Insert: {
          id?:        string;
          user_id:    string;
          badge_key:  string;
          awarded_at?: string;
        };
        Update: {
          badge_key?:  string;
          awarded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'badges_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      // ── questions（英語測驗題庫）──────────────────────
      questions: {
        Row: {
          id:              string;
          difficulty:      QuizDifficultyLevel;
          question_text:   string;
          options:         string[];
          correct_answer_old: 'A' | 'B' | 'C' | 'D';
          correct_index:   number;
          explanation:     string;
          created_at:      string | null;
        };
        Insert: {
          id?:             string;
          difficulty:      QuizDifficultyLevel;
          question_text:   string;
          options:         string[];
          correct_answer_old: 'A' | 'B' | 'C' | 'D';
          correct_index:   number;
          explanation:     string;
          created_at?:     string | null;
        };
        Update: {
          difficulty?:     QuizDifficultyLevel;
          question_text?:  string;
          options?:         string[];
          correct_answer_old?: 'A' | 'B' | 'C' | 'D';
          correct_index?:  number;
          explanation?:    string;
          created_at?:      string | null;
        };
        Relationships: FKRelationship[];
      };

      // ── vocabulary_words（Stage 2 生字庫）──────────────
      vocabulary_words: {
        Row: {
          id:          string;
          word:        string;
          grade_level: QuizDifficultyLevel;
          meaning_zh:  string | null;
          created_at:  string;
        };
        Insert: {
          id?:          string;
          word:        string;
          grade_level?: QuizDifficultyLevel;
          meaning_zh?:  string | null;
          created_at?:  string;
        };
        Update: {
          word?:        string;
          grade_level?: QuizDifficultyLevel;
          meaning_zh?:  string | null;
        };
        Relationships: FKRelationship[];
      };

      // ── user_quiz_scores（測驗各難度最高分）─────────────
      user_quiz_scores: {
        Row: {
          user_id:    string;
          difficulty: QuizDifficultyLevel;
          best_score: number;
          updated_at: string;
        };
        Insert: {
          user_id:    string;
          difficulty: QuizDifficultyLevel;
          best_score: number;
          updated_at?: string;
        };
        Update: {
          best_score?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_quiz_scores_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      // ── quiz_attempts（英語大冒險每局紀錄）───────────────
      quiz_attempts: {
        Row: {
          id:                   string;
          user_id:              string;
          difficulty:           QuizDifficultyLevel;
          score100:             number;
          total_questions:      number;
          correct_count:        number;
          total_answer_seconds: number;
          created_at:           string;
        };
        Insert: {
          id?:                   string;
          user_id:              string;
          difficulty:           QuizDifficultyLevel;
          score100:             number;
          total_questions:      number;
          correct_count:        number;
          total_answer_seconds: number;
          created_at?:          string;
        };
        Update: {
          score100?:             number;
          total_answer_seconds?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'quiz_attempts_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      // ── homepage_config（首頁背景設定，單列）──────────────
      homepage_config: {
        Row: {
          id: number;
          background_image_url: string | null;
          background_image_urls: Json;
          background_video_url: string | null;
          overlay_opacity: number;
          background_image_enabled: boolean;
          background_video_enabled: boolean;
          heading_text_color_light: string | null;
          heading_text_color_dark: string | null;
          home_quiz_intro_text: string | null;
          home_quiz_cta_text: string | null;
          home_quiz_result_background_image_url: string | null;
          quiz_stage_start_video_url: string | null;
          quiz_stage_complete_video_url: string | null;
          quiz_elementary_start_video_url: string | null;
          quiz_elementary_complete_video_url: string | null;
          quiz_junior_start_video_url: string | null;
          quiz_junior_complete_video_url: string | null;
          quiz_college_start_video_url: string | null;
          quiz_college_complete_video_url: string | null;
          quiz_professor_start_video_url: string | null;
          quiz_professor_complete_video_url: string | null;
          quiz_game_bgm_volume_pct: number;
          quiz_game_sfx_volume_pct: number;
          features_student_image_url: string | null;
          home_teachers_card_1_image_url: string | null;
          home_teachers_card_2_image_url: string | null;
          home_teachers_card_3_image_url: string | null;
          marketing_theme_preset: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          background_image_url?: string | null;
          background_image_urls?: Json;
          background_video_url?: string | null;
          overlay_opacity?: number;
          background_image_enabled?: boolean;
          background_video_enabled?: boolean;
          heading_text_color_light?: string | null;
          heading_text_color_dark?: string | null;
          home_quiz_intro_text?: string | null;
          home_quiz_cta_text?: string | null;
          home_quiz_result_background_image_url?: string | null;
          quiz_stage_start_video_url?: string | null;
          quiz_stage_complete_video_url?: string | null;
          quiz_elementary_start_video_url?: string | null;
          quiz_elementary_complete_video_url?: string | null;
          quiz_junior_start_video_url?: string | null;
          quiz_junior_complete_video_url?: string | null;
          quiz_college_start_video_url?: string | null;
          quiz_college_complete_video_url?: string | null;
          quiz_professor_start_video_url?: string | null;
          quiz_professor_complete_video_url?: string | null;
          quiz_game_bgm_volume_pct?: number;
          quiz_game_sfx_volume_pct?: number;
          features_student_image_url?: string | null;
          home_teachers_card_1_image_url?: string | null;
          home_teachers_card_2_image_url?: string | null;
          home_teachers_card_3_image_url?: string | null;
          marketing_theme_preset?: string;
          updated_at?: string;
        };
        Update: {
          background_image_url?: string | null;
          background_image_urls?: Json;
          background_video_url?: string | null;
          overlay_opacity?: number;
          background_image_enabled?: boolean;
          background_video_enabled?: boolean;
          heading_text_color_light?: string | null;
          heading_text_color_dark?: string | null;
          home_quiz_intro_text?: string | null;
          home_quiz_cta_text?: string | null;
          home_quiz_result_background_image_url?: string | null;
          quiz_stage_start_video_url?: string | null;
          quiz_stage_complete_video_url?: string | null;
          quiz_elementary_start_video_url?: string | null;
          quiz_elementary_complete_video_url?: string | null;
          quiz_junior_start_video_url?: string | null;
          quiz_junior_complete_video_url?: string | null;
          quiz_college_start_video_url?: string | null;
          quiz_college_complete_video_url?: string | null;
          quiz_professor_start_video_url?: string | null;
          quiz_professor_complete_video_url?: string | null;
          quiz_game_bgm_volume_pct?: number;
          quiz_game_sfx_volume_pct?: number;
          features_student_image_url?: string | null;
          home_teachers_card_1_image_url?: string | null;
          home_teachers_card_2_image_url?: string | null;
          home_teachers_card_3_image_url?: string | null;
          marketing_theme_preset?: string;
          updated_at?: string;
        };
        Relationships: FKRelationship[];
      };

      // ── comments ──────────────────────────────────────
      comments: {
        Row: {
          id:         string;
          lesson_id:  string;
          user_id:    string;
          parent_id:  string | null;
          content:    string;
          created_at: string;
        };
        Insert: {
          id?:        string;
          lesson_id:  string;
          user_id:    string;
          parent_id?: string | null;
          content:    string;
          created_at?: string;
        };
        Update: {
          content?:   string;
        };
        Relationships: [
          {
            foreignKeyName: 'comments_lesson_id_fkey';
            columns: ['lesson_id'];
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_parent_id_fkey';
            columns: ['parent_id'];
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          }
        ];
      };

    }; // Tables

    Views: {
      /**
       * 非可更新 View：只含 Row + Relationships（勿加 Insert/Update: never，否則不符合
       * Supabase GenericNonUpdatableView，會讓整個 Database 推斷崩潰成 never）
       */
      quiz_user_stats: {
        Row: {
          user_id:              string;
          difficulty:           QuizDifficultyLevel;
          games_played:         number;
          avg_score:            number;
          perfect_count:        number;
          total_answer_seconds: number;
        };
        Relationships: FKRelationship[];
      };
    };

    Functions: {
      grant_lesson_xp: {
        Args:    { p_user_id: string; p_lesson_id: string };
        Returns: void;
      };
      grant_course_quiz_xp: {
        Args:    { p_user_id: string; p_quiz_id: string };
        Returns: void;
      };
      update_streak: {
        Args:    { p_user_id: string };
        Returns: void;
      };
      is_admin: {
        /** 須可指派給 `Record<string, unknown>`，否則 `public` 無法 `extends GenericSchema`，所有 `.insert()` 會變成 `never` */
        Args:    Record<string, never>;
        Returns: boolean;
      };
      is_teacher_or_admin: {
        Args:    Record<string, never>;
        Returns: boolean;
      };
      is_enrolled: {
        Args:    { p_course_id: string };
        Returns: boolean;
      };
      quiz_user_stat_rank: {
        Args:    { p_difficulty: string; p_user_id: string };
        Returns: { user_rank: number | null; total_players: number }[];
      };
      record_quiz_session: {
        Args: {
          p_difficulty: string;
          p_correct_count: number;
          p_total_questions: number;
          p_total_answer_seconds: number;
        };
        Returns: Json;
      };
      get_game_stamina: {
        Args: Record<string, never>;
        Returns: Json;
      };
      spend_game_stamina: {
        Args: { p_amount: number };
        Returns: Json;
      };
      grant_game_stamina: {
        Args: { p_amount: number };
        Returns: Json;
      };
      begin_game_play_session: {
        Args: { p_difficulty: string; p_charge_kind: string };
        Returns: Json;
      };
      assert_game_play_session: {
        Args: { p_session_id: string; p_difficulty: string };
        Returns: Json;
      };
      consume_game_play_session: {
        Args: { p_session_id: string };
        Returns: Json;
      };
      issue_game_advance_grant: {
        Args: { p_target_difficulty: string; p_source_difficulty?: string | null };
        Returns: Json;
      };
    };

    Enums: {
      user_role:         UserRole;
      assignment_type:   AssignmentType;
      assignment_status: AssignmentStatus;
      course_level:      CourseLevel;
    };

    CompositeTypes: Record<string, never>;
  };
}

// ─── Convenience aliases (Row types) ──────────────────────

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Named row types
export type Profile       = Tables<'profiles'>;
export type Category      = Tables<'categories'>;
export type Course        = Tables<'courses'>;
export type Lesson           = Tables<'lessons'>;
export type LessonTextbook   = Tables<'lesson_textbooks'>;
export type LessonTimedCue   = Tables<'lesson_timed_cues'>;
export type CourseQuiz       = Tables<'course_quizzes'>;
export type CourseQuizQuestion = Tables<'course_quiz_questions'>;
export type CourseQuizStep = Tables<'course_quiz_steps'>;
export type UserCourseQuizProgress = Tables<'user_course_quiz_progress'>;
export type Enrollment       = Tables<'enrollments'>;
export type SubscriptionPlan = Tables<'subscription_plans'>;
export type ShopItem         = Tables<'shop_items'>;
export type UserSubscription = Tables<'user_subscriptions'>;
export type UserPurchase     = Tables<'user_purchases'>;
export type StripeEvent      = Tables<'stripe_events'>;
export type ProfileInboxMessage = Tables<'profile_inbox_messages'>;
export type UserGameStamina  = Tables<'user_game_stamina'>;
export type UserProgress  = Tables<'user_progress'>;
export type Assignment    = Tables<'assignments'>;
export type Badge         = Tables<'badges'>;
export type Comment         = Tables<'comments'>;
export type Question        = Tables<'questions'>;
export type UserQuizScore    = Tables<'user_quiz_scores'>;
export type QuizAttempt      = Tables<'quiz_attempts'>;
export type HomepageConfig   = Tables<'homepage_config'>;

// ─── Enriched / joined types ──────────────────────────────

export interface CourseWithTeacher extends Course {
  teacher: Pick<
    Profile,
    'id' | 'display_name' | 'avatar_url' | 'bio' | 'mentor_specialty'
  >;
  category: Category | null;
}

/** 課程總覽卡片（含是否已購／報名） */
export interface CourseCatalogItem extends CourseWithTeacher {
  is_enrolled: boolean;
}

export interface LessonWithProgress extends Lesson {
  progress: UserProgress | null;
}

export interface AssignmentWithStudent extends Assignment {
  student: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>;
  lesson:  Pick<Lesson,  'id' | 'title'>;
}

export interface CourseQuizWithProgress extends CourseQuiz {
  progress: UserCourseQuizProgress | null;
  question_count?: number;
}

export interface CourseWithLessons extends CourseWithTeacher {
  lessons: LessonWithProgress[];
  quizzes: CourseQuizWithProgress[];
  is_enrolled: boolean;
  /** 目前登入使用者的有效訂閱層級（未登入為 free） */
  subscription_tier: import('@/lib/profile/subscription-display').SubscriptionTier;
}

export type CourseRoadmapItem =
  | { kind: 'lesson'; lesson: LessonWithProgress; lessonIndex: number }
  | { kind: 'quiz'; quiz: CourseQuizWithProgress };

// ─── XP / Level helpers ───────────────────────────────────

/** XP needed to reach level n (triangular formula: n*(n-1)/2 * 100) */
export function xpForLevel(level: number): number {
  return Math.floor(((level - 1) * level) / 2) * 100;
}

/** Progress (0–1) within the current level */
export function levelProgress(exp: number, level: number): number {
  const current = xpForLevel(level);
  const next    = xpForLevel(level + 1);
  return Math.min((exp - current) / (next - current), 1);
}

/** XP remaining until next level */
export function xpToNextLevel(exp: number, level: number): number {
  return Math.max(xpForLevel(level + 1) - exp, 0);
}

// ─── Badge metadata ───────────────────────────────────────

export const BADGE_META: Record<string, { label: string; description: string; icon: string }> = {
  first_lesson:  { label: '初學者',   description: '完成第一堂課',          icon: '🎓' },
  streak_7:      { label: '一週連續', description: '連續學習 7 天',          icon: '🔥' },
  streak_30:     { label: '月度堅持', description: '連續學習 30 天',         icon: '💪' },
  perfect_hw:    { label: '滿分作業', description: '獲得 100 分作業',        icon: '⭐' },
  course_done:   { label: '課程完成', description: '完成一門完整課程',        icon: '🏆' },
  level_5:       { label: 'Lv.5',     description: '達到 5 級',              icon: '🥉' },
  level_10:      { label: 'Lv.10',    description: '達到 10 級',             icon: '🥈' },
  level_20:      { label: 'Lv.20',    description: '達到 20 級',             icon: '🥇' },
  level_30:      { label: '精英',     description: '達到 30 級',             icon: '💎' },
};
