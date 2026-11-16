// Gerado a partir do schema Supabase (projeto "portfolio"). Regerar após migrations.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Rel extends unknown[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: Rel;
};

type AdminRow = { created_at: string; user_id: string };
type ContactMessageRow = {
  created_at: string;
  email: string;
  id: string;
  ip_hash: string | null;
  locale: string | null;
  message: string;
  name: string;
  project_type: string;
  read: boolean;
};
type ExperienceRow = {
  company: string;
  description: Json;
  end_date: string | null;
  id: string;
  role: Json;
  sort_order: number;
  start_date: string;
};
type ProfileRow = {
  available: boolean;
  avatar_url: string | null;
  bio: Json;
  email: string | null;
  full_name: string;
  id: number;
  location: string | null;
  resume_url: Json;
  role: Json;
  updated_at: string;
};
type ProjectImageRow = {
  alt: Json;
  id: string;
  project_id: string;
  sort_order: number;
  url: string;
};
type ProjectTechRow = { project_id: string; technology_id: string };
type ProjectRow = {
  created_at: string;
  demo_url: string | null;
  description: Json;
  featured: boolean;
  id: string;
  published: boolean;
  repo_url: string | null;
  slug: string;
  sort_order: number;
  summary: Json;
  thumbnail_url: string | null;
  title: Json;
  updated_at: string;
};
type SocialLinkRow = {
  created_at: string;
  id: string;
  label: string | null;
  platform: string;
  sort_order: number;
  url: string;
  visible: boolean;
};
type TechnologyRow = {
  category: string;
  color: string | null;
  created_at: string;
  description: Json;
  icon: string | null;
  id: string;
  name: string;
  show_in_stack: boolean;
  sort_order: number;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      admins: Table<AdminRow, Partial<AdminRow> & Pick<AdminRow, "user_id">>;
      contact_messages: Table<
        ContactMessageRow,
        Partial<ContactMessageRow> &
          Pick<ContactMessageRow, "name" | "email" | "project_type" | "message">
      >;
      experiences: Table<
        ExperienceRow,
        Partial<ExperienceRow> & Pick<ExperienceRow, "company" | "start_date">
      >;
      profile: Table<ProfileRow, Partial<ProfileRow>>;
      project_images: Table<
        ProjectImageRow,
        Partial<ProjectImageRow> & Pick<ProjectImageRow, "project_id" | "url">,
        [
          {
            foreignKeyName: "project_images_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ]
      >;
      project_technologies: Table<
        ProjectTechRow,
        ProjectTechRow,
        [
          {
            foreignKeyName: "project_technologies_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_technologies_technology_id_fkey";
            columns: ["technology_id"];
            isOneToOne: false;
            referencedRelation: "technologies";
            referencedColumns: ["id"];
          },
        ]
      >;
      projects: Table<ProjectRow, Partial<ProjectRow> & Pick<ProjectRow, "slug">>;
      social_links: Table<
        SocialLinkRow,
        Partial<SocialLinkRow> & Pick<SocialLinkRow, "platform" | "url">
      >;
      technologies: Table<
        TechnologyRow,
        Partial<TechnologyRow> & Pick<TechnologyRow, "name">
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      set_project_relations: {
        Args: { p_project_id: string; p_images: Json; p_technology_ids: string[] };
        Returns: undefined;
      };
      reorder_projects: {
        Args: { p_ids: string[] };
        Returns: undefined;
      };
      reorder_technologies: {
        Args: { p_ids: string[] };
        Returns: undefined;
      };
      reorder_links: {
        Args: { p_ids: string[] };
        Returns: undefined;
      };
      reorder_experiences: {
        Args: { p_ids: string[] };
        Returns: undefined;
      };
      submit_contact_message: {
        Args: {
          p_name: string;
          p_email: string;
          p_project_type: string;
          p_message: string;
          p_locale: string;
          p_ip_hash: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database["public"]["Tables"];
export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"];
export type TablesInsert<T extends keyof PublicTables> = PublicTables[T]["Insert"];
export type TablesUpdate<T extends keyof PublicTables> = PublicTables[T]["Update"];
