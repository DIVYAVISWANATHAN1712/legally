import { supabase } from '@/integrations/supabase/client';

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const createConversation = async (
  userId: string,
  title: string = 'New Conversation',
  language: string = 'en'
): Promise<Conversation | null> => {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title, language })
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    return null;
  }
  return data;
};

export const getConversations = async (userId: string): Promise<Conversation[]> => {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
  return data || [];
};

export const getConversation = async (conversationId: string): Promise<Conversation | null> => {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching conversation:', error);
    return null;
  }
  return data;
};

export const updateConversationTitle = async (
  conversationId: string,
  title: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', conversationId);

  if (error) {
    console.error('Error updating conversation title:', error);
    return false;
  }
  return true;
};

export const deleteConversation = async (conversationId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  if (error) {
    console.error('Error deleting conversation:', error);
    return false;
  }
  return true;
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  return data as Message[] || [];
};

export const addMessage = async (
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<Message | null> => {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role, content })
    .select()
    .single();

  if (error) {
    console.error('Error adding message:', error);
    return null;
  }
  return data as Message;
};

// Generate a title from the first user message
export const generateConversationTitle = (firstMessage: string): string => {
  const maxLength = 50;
  const cleaned = firstMessage.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength).trim() + '...';
};
