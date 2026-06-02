export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          phone: string;
          display_name: string;
          avatar_url: string | null;
          about: string | null;
          is_online: boolean;
          last_seen: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          phone: string;
          display_name: string;
          avatar_url?: string | null;
          about?: string | null;
          is_online?: boolean;
          last_seen?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          phone?: string;
          display_name?: string;
          avatar_url?: string | null;
          about?: string | null;
          is_online?: boolean;
          last_seen?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          is_group: boolean;
          group_name: string | null;
          group_avatar_url: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          is_group?: boolean;
          group_name?: string | null;
          group_avatar_url?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          is_group?: boolean;
          group_name?: string | null;
          group_avatar_url?: string | null;
          updated_at?: string;
        };
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          joined_at: string;
          last_read_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          joined_at?: string;
          last_read_at?: string | null;
        };
        Update: {
          last_read_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string | null;
          message_type: "text" | "image" | "file" | "audio";
          file_url: string | null;
          file_name: string | null;
          file_size: number | null;
          reply_to_id: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content?: string | null;
          message_type?: "text" | "image" | "file" | "audio";
          file_url?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          reply_to_id?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string | null;
          is_deleted?: boolean;
          updated_at?: string;
        };
      };
      message_reads: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          read_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          read_at?: string;
        };
        Update: Record<string, never>;
      };
      typing_indicators: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          updated_at?: string;
        };
        Update: {
          updated_at?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string;
          nickname: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id: string;
          nickname?: string | null;
          created_at?: string;
        };
        Update: {
          nickname?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
