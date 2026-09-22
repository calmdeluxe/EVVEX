/**
 * Capacitor and Offline Cache Utilities
 * Provides environment detection, fast local caching, and fallback catalog data
 * so the application launches instantly without waiting for remote servers.
 */

export const isCapacitorPlatform = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const cap = (window as any).Capacitor;
    if (cap?.isNativePlatform && typeof cap.isNativePlatform === 'function') {
      return Boolean(cap.isNativePlatform());
    }
    const platform = cap?.getPlatform ? cap.getPlatform() : '';
    if (platform === 'android' || platform === 'ios') return true;
    return window.location.protocol === 'capacitor:' || window.location.hostname === 'localhost' && Boolean((window as any).androidBridge);
  } catch (e) {
    return false;
  }
};

export const isCapacitor = isCapacitorPlatform();

// Bundled starter catalog for immediate offline launch
export const BUNDLED_OFFLINE_BOOKS = [
  {
    id: "offline-book-1",
    title: "The Art of Mindful Reading",
    author_name: "Dr. Elena Vance",
    description: "Discover the transformative power of slowing down and immersing yourself deeply into literature in a world full of digital noise.",
    cover_image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800&auto=format&fit=crop",
    thumbnail_url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400&auto=format&fit=crop",
    price: 0,
    is_published: 1,
    admin_note: "author:Dr. Elena Vance, genre:Mindfulness",
    created_at: new Date().toISOString()
  },
  {
    id: "offline-book-2",
    title: "Focus and Flow in the Modern Era",
    author_name: "Marcus Aurel",
    description: "Practical philosophies and cognitive frameworks for shielding your creative attention and mastering deep focus.",
    cover_image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800&auto=format&fit=crop",
    thumbnail_url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=400&auto=format&fit=crop",
    price: 0,
    is_published: 1,
    admin_note: "author:Marcus Aurel, genre:Philosophy",
    created_at: new Date().toISOString()
  },
  {
    id: "offline-book-3",
    title: "Quiet Pages: Solitude & Storytelling",
    author_name: "Sarah Jenkins",
    description: "A sanctuary of prose and quiet reflections on creativity, intentional living, and lifelong learning.",
    cover_image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=800&auto=format&fit=crop",
    thumbnail_url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=400&auto=format&fit=crop",
    price: 0,
    is_published: 1,
    admin_note: "author:Sarah Jenkins, genre:Literature",
    created_at: new Date().toISOString()
  }
];

export const getCachedLandingData = () => {
  try {
    const raw = localStorage.getItem("calmreader_landing_data_cache_local");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.featuredBooks) && parsed.featuredBooks.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("[OfflineCache] Failed to parse local landing cache:", e);
  }
  return {
    featuredBooks: BUNDLED_OFFLINE_BOOKS,
    blogs: [],
    videos: [],
    featuredTrivias: [],
    activePromo: null
  };
};

export const saveLandingDataToCache = (data: any) => {
  try {
    localStorage.setItem("calmreader_landing_data_cache_local", JSON.stringify(data));
    localStorage.setItem("calmreader_landing_data_cache_time", String(Date.now()));
  } catch (e) {
    console.warn("[OfflineCache] Failed to write landing cache:", e);
  }
};

/**
 * Race a promise against a timeout to prevent native Android offline hangs
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number, fallbackVal: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      resolve(fallbackVal);
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    return fallbackVal;
  }
}
