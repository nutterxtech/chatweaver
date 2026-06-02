export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          username: string;
          email: string;
          phone: string;
          password: string;
          profile_picture: string | null;
          cover_photo: string | null;
          is_admin: boolean;
          status: string | null;
          last_seen: string;
          friends: string[];
          friend_requests: string[];
          sent_requests: string[];
          created_at: string;
          updated_at: string;
          is_verified: boolean;
        };
        Insert: {
          id: string;
          name: string;
          username: string;
          email: string;
          phone: string;
          password?: string;
          profile_picture?: string | null;
          cover_photo?: string | null;
          is_admin?: boolean;
          status?: string | null;
          last_seen?: string;
          friends?: string[];
          friend_requests?: string[];
          sent_requests?: string[];
          created_at?: string;
          updated_at?: string;
          is_verified?: boolean;
        };
        Update: {
          name?: string;
          username?: string;
          profile_picture?: string | null;
          status?: string | null;
          last_seen?: string;
          friends?: string[];
          friend_requests?: string[];
          sent_requests?: string[];
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          participants: string[];
          last_message: string | null;
          last_message_at: string | null;
          unread_by: string[];
          is_admin_chat: boolean;
          is_group: boolean;
          group_name: string | null;
          group_photo: string | null;
          admin_id: string | null;
          invite_token: string | null;
          created_at: string;
          updated_at: string;
          disappearing_messages: Json | null;
        };
        Insert: {
          id?: string;
          participants: string[];
          last_message?: string | null;
          last_message_at?: string | null;
          unread_by?: string[];
          is_admin_chat?: boolean;
          is_group?: boolean;
          group_name?: string | null;
          group_photo?: string | null;
          admin_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          last_message?: string | null;
          last_message_at?: string | null;
          unread_by?: string[];
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string | null;
          is_system: boolean;
          reply_to: string | null;
          read_by: string[];
          created_at: string;
          updated_at: string;
          expires_at: string | null;
          audio_url: string | null;
          is_edited: boolean;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content?: string | null;
          is_system?: boolean;
          reply_to?: string | null;
          read_by?: string[];
          created_at?: string;
          updated_at?: string;
          audio_url?: string | null;
        };
        Update: {
          content?: string | null;
          read_by?: string[];
          is_edited?: boolean;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          sender_id: string;
          type: string;
          post_id: string | null;
          content: string | null;
          read: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          recipient_id: string;
          sender_id: string;
          type: string;
          content?: string | null;
          read?: boolean;
        };
        Update: {
          read?: boolean;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience aliases
export type DBUser = Database["public"]["Tables"]["users"]["Row"];
export type DBConversation = Database["public"]["Tables"]["conversations"]["Row"];
export type DBMessage = Database["public"]["Tables"]["messages"]["Row"];
