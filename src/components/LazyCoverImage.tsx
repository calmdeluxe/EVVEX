// LEGACY: CalmReader file, not part of EVEX product. To be unmounted in a later pass.
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

interface LazyCoverImageProps {
  bookId: number | string;
  initialSrc?: string;
  className?: string;
  alt?: string;
  fallbackSrc?: string;
  onResolveCover?: (src: string | null) => void;
}

export const LazyCoverImage: React.FC<LazyCoverImageProps> = ({
  bookId,
  initialSrc,
  className = "w-full h-full object-cover",
  alt = "Cover image",
  fallbackSrc = "https://images.unsplash.com/photo-1543004218-ee141104975a?auto=format&fit=crop&q=80&w=800",
  onResolveCover
}) => {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Helper to resolve cover image path or full URL using 'media' bucket
    const resolveCoverUrl = (rawPath: string | null): string | null => {
      if (!rawPath) return null;
      if (rawPath.startsWith('http') || rawPath.startsWith('data:')) {
        return rawPath;
      }
      // If it is a relative storage path, resolve it from the 'media' bucket
      try {
        const { data } = supabase.storage.from('media').getPublicUrl(rawPath);
        return data?.publicUrl || rawPath;
      } catch (err) {
        console.warn("[LazyCoverImage] Error getting public URL from 'media' bucket:", err);
        return rawPath;
      }
    };

    if (initialSrc) {
      const resolved = resolveCoverUrl(initialSrc);
      setSrc(resolved);
      if (resolved) {
        onResolveCover?.(resolved);
      }
      setLoading(false);
      return;
    }

    if (!bookId) {
      setSrc(fallbackSrc);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchCover = async () => {
      try {
        const response = await fetch(`/api/books/${bookId}/cover`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted && data && data.cover_image) {
            const resolved = resolveCoverUrl(data.cover_image);
            setSrc(resolved);
            if (resolved) {
              onResolveCover?.(resolved);
            }
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("[LazyCoverImage] API fetch failed, trying direct Supabase fallback:", err);
      }

      // Live client-side fallback - queries standard Supabase directly
      try {
        const { data, error } = await supabase
          .from("books")
          .select("id, cover_image")
          .eq("id", bookId)
          .maybeSingle();

        if (isMounted && !error && data && data.cover_image) {
          const resolved = resolveCoverUrl(data.cover_image);
          setSrc(resolved);
          if (resolved) {
            onResolveCover?.(resolved);
          }
        }
      } catch (err) {
        console.error("[LazyCoverImage] Supabase fallback fetch failed for book:", bookId, err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCover();
    return () => {
      isMounted = false;
    };
  }, [bookId, initialSrc, fallbackSrc]);

  return (
    <img
      src={src || fallbackSrc}
      className={`${className} ${loading ? 'animate-pulse bg-slate-800' : ''}`}
      referrerPolicy="no-referrer"
      alt={alt}
      loading="lazy"
    />
  );
};
