// ============================================================
// Lingua Platform — Supabase Database Types
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
export type AssignmentType   = 'text' | 'audio' | 'video' | 'image' | 'pdf';
export type AssignmentStatus = 'submitted' | 'grading' | 'graded' | 'returned';
export type CourseLevel      = 'beginner' | 'intermediate' | 'advanced';

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

      // ── quiz_attempts（AI英語鬥每局紀錄）───────────────
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
          background_video_url: string | null;
          overlay_opacity: number;
          background_image_enabled: boolean;
          background_video_enabled: boolean;
          heading_text_color_light: string | null;
          heading_text_color_dark: string | null;
          home_quiz_intro_text: string | null;
          home_quiz_cta_text: string | null;
          home_quiz_result_background_image_url: string | null;
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
          background_video_url?: string | null;
          overlay_opacity?: number;
          background_image_enabled?: boolean;
          background_video_enabled?: boolean;
          heading_text_color_light?: string | null;
          heading_text_color_dark?: string | null;
          home_quiz_intro_text?: string | null;
          home_quiz_cta_text?: string | null;
          home_quiz_result_background_image_url?: string | null;
          features_student_image_url?: string | null;
          home_teachers_card_1_image_url?: string | null;
          home_teachers_card_2_image_url?: string | null;
          home_teachers_card_3_image_url?: string | null;
          marketing_theme_preset?: string;
          updated_at?: string;
        };
        Update: {
          background_image_url?: string | null;
          background_video_url?: string | null;
          overlay_opacity?: number;
          background_image_enabled?: boolean;
          background_video_enabled?: boolean;
          heading_text_color_light?: string | null;
          heading_text_color_dark?: string | null;
          home_quiz_intro_text?: string | null;
          home_quiz_cta_text?: string | null;
          home_quiz_result_background_image_url?: string | null;
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
export type Lesson        = Tables<'lessons'>;
export type Enrollment    = Tables<'enrollments'>;
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
  teacher: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>;
  category: Category | null;
}

export interface LessonWithProgress extends Lesson {
  progress: UserProgress | null;
}

export interface AssignmentWithStudent extends Assignment {
  student: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>;
  lesson:  Pick<Lesson,  'id' | 'title'>;
}

export interface CourseWithLessons extends CourseWithTeacher {
  lessons: LessonWithProgress[];
  is_enrolled: boolean;
}

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
