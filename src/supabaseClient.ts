import { createClient } from '@supabase/supabase-js';
import { FeedPost } from './types';

// Read Vite environment variables
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Initialize actual Supabase client or null
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// --- SCHEMA DEFINITION GUIDE FOR USER ---
// If you configure Supabase, create a table named 'posts' with columns:
// id (text, primary key)
// author_name (text)
// author_avatar (text)
// author_role (text)
// content (text)
// media_url (text, nullable)
// media_type (text, nullable)
// likes (integer)
// shares (integer)
// comments_count (integer)
// timestamp (text)
// is_announcement (boolean)
// is_sponsored (boolean)
// sponsored_by (text, nullable)
// created_at (timestamp with time zone)

// --- RESILIENT FALLBACK DATABASE MANAGER ---
const LOCAL_STORAGE_KEY = 'quizoe_published_posts';

export async function fetchPublishedPosts(): Promise<FeedPost[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        // Map Supabase return to FeedPost type
        return data.map((item: any) => ({
          id: item.id || `sup_${item.created_at}`,
          authorName: item.author_name || 'Anonymous Creator',
          authorAvatar: item.author_avatar || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=150',
          authorRole: item.author_role || 'Creator',
          content: item.content || '',
          mediaUrl: item.media_url || undefined,
          mediaType: item.media_type || undefined,
          likes: Number(item.likes || 0),
          shares: Number(item.shares || 0),
          commentsCount: Number(item.comments_count || 0),
          isLiked: false,
          isBookmarked: false,
          isAnnouncement: !!item.is_announcement,
          isSponsored: !!item.is_sponsored,
          sponsoredBy: item.sponsored_by || undefined,
          timestamp: item.timestamp || 'Just now'
        }));
      }
    } catch (err) {
      console.warn('Supabase query failed or index missing. Falling back to local ledger:', err);
    }
  }

  // Fallback to localStorage if Supabase has empty results or is not integrated
  const localPosts = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (localPosts) {
    try {
      return JSON.parse(localPosts);
    } catch {
      return [];
    }
  }

  return [];
}

export async function createPublishedPost(post: Omit<FeedPost, 'likes' | 'shares' | 'commentsCount'>): Promise<FeedPost> {
  const fullPost: FeedPost = {
    ...post,
    likes: 0,
    shares: 0,
    commentsCount: 0,
    isLiked: false,
    isBookmarked: false
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('posts')
        .insert([{
          id: fullPost.id,
          author_name: fullPost.authorName,
          author_avatar: fullPost.authorAvatar,
          author_role: fullPost.authorRole,
          content: fullPost.content,
          media_url: fullPost.mediaUrl || null,
          media_type: fullPost.mediaType || null,
          likes: 0,
          shares: 0,
          comments_count: 0,
          is_announcement: !!fullPost.isAnnouncement,
          is_sponsored: !!fullPost.isSponsored,
          sponsored_by: fullPost.sponsoredBy || null,
          timestamp: fullPost.timestamp,
          created_at: new Date().toISOString()
        }]);

      if (!error) {
        console.log('Saved to Supabase: ', fullPost.id);
        // Also save to local memory layout
        const currentLocal = await fetchPublishedPosts();
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([fullPost, ...currentLocal]));
        return fullPost;
      } else {
        console.warn('Supabase insertion returned error:', error);
      }
    } catch (err) {
      console.warn('Failed inserting to Supabase. Appending locally:', err);
    }
  }

  // Backup write path
  const currentLocal = await fetchPublishedPosts();
  const updated = [fullPost, ...currentLocal];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  return fullPost;
}
