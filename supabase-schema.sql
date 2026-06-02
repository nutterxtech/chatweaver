-- ============================================================
-- WhatsChat - Supabase Database Schema
-- Run this entire script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vvuqeegvdabuolwzllia/sql/new
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  about TEXT DEFAULT 'Hey there! I am using WhatsChat.',
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  is_group BOOLEAN DEFAULT false,
  group_name TEXT,
  group_avatar_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message reads
CREATE TABLE IF NOT EXISTS public.message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Typing indicators
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, contact_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Profiles: any authenticated user can read all profiles; only owner can insert/update
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Conversations: only participants can see their conversations
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update" ON public.conversations;
CREATE POLICY "conversations_select" ON public.conversations FOR SELECT TO authenticated
  USING (id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()));
CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "conversations_update" ON public.conversations FOR UPDATE TO authenticated
  USING (id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()));

-- Conversation participants
DROP POLICY IF EXISTS "cp_select" ON public.conversation_participants;
DROP POLICY IF EXISTS "cp_insert" ON public.conversation_participants;
DROP POLICY IF EXISTS "cp_update" ON public.conversation_participants;
CREATE POLICY "cp_select" ON public.conversation_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "cp_insert" ON public.conversation_participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cp_update" ON public.conversation_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Messages
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_update" ON public.messages;
CREATE POLICY "messages_select" ON public.messages FOR SELECT TO authenticated
  USING (conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
  ));
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
  );
CREATE POLICY "messages_update" ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

-- Message reads
DROP POLICY IF EXISTS "reads_select" ON public.message_reads;
DROP POLICY IF EXISTS "reads_insert" ON public.message_reads;
CREATE POLICY "reads_select" ON public.message_reads FOR SELECT TO authenticated USING (true);
CREATE POLICY "reads_insert" ON public.message_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Typing indicators
DROP POLICY IF EXISTS "typing_select" ON public.typing_indicators;
DROP POLICY IF EXISTS "typing_insert" ON public.typing_indicators;
DROP POLICY IF EXISTS "typing_update" ON public.typing_indicators;
DROP POLICY IF EXISTS "typing_delete" ON public.typing_indicators;
CREATE POLICY "typing_select" ON public.typing_indicators FOR SELECT TO authenticated USING (true);
CREATE POLICY "typing_insert" ON public.typing_indicators FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "typing_update" ON public.typing_indicators FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "typing_delete" ON public.typing_indicators FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Contacts
DROP POLICY IF EXISTS "contacts_select" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete" ON public.contacts;
CREATE POLICY "contacts_select" ON public.contacts FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "contacts_insert" ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "contacts_delete" ON public.contacts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ============================================================
-- STORAGE BUCKET for chat media (images & files)
-- Run this separately if the bucket doesn't already exist:
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('chat-media', 'chat-media', true)
-- ON CONFLICT DO NOTHING;
--
-- CREATE POLICY "media_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-media');
-- CREATE POLICY "media_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-media');
-- CREATE POLICY "media_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);
