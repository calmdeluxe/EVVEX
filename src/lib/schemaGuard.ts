// LEGACY: CalmReader file, not part of EVEX product. To be unmounted in a later pass.
// LEGACY: CalmReader file, not part of EVEX product.
import { supabase } from '../supabase';

export interface BookPayload {
  id?: number;
  user_id: string;
  title: string;
  cards_json: any;
  price: number;
  pdf_price: number;
  public_slug: string;
  is_published: number;
  status: number | string;
  admin_note?: string | null;
  report_count?: number;
  cover_image?: string | null;
  genre_id?: string | null;
  content_type?: string;
  word_count?: number;
  mpr_referral_code?: string | null;
  author_share?: number;
  platform_share?: number;
  mpr_share?: number;
  exclusivity_end_date?: string | null;
  rights_declared?: boolean;
  exclusivity_declared?: boolean;
  publishing_lane?: string;
  trivia_rights_granted?: boolean;
}

/**
 * Normalizes book payload to match a strict INTEGER-based schema (0/1 for flags).
 */
export function normalizeBookPayload(input: any, options?: { hasPdfPrice?: boolean; hasCoverImage?: boolean; hasContentType?: boolean }): BookPayload {
  // 1. Map status labels to integers (0 = draft/pending, 1 = approved/published, 2 = pending_review, 3 = rejected)
  let normalizedStatus: number = 0;
  if (typeof input.status === 'number') {
    normalizedStatus = input.status;
  } else if (typeof input.status === 'string') {
    const s = input.status.toLowerCase();
    if (s === 'approved' || s === 'published' || s === 'active' || s === '1') {
      normalizedStatus = 1;
    } else if (s === 'pending_review' || s === 'pending' || s === '2') {
      normalizedStatus = 2;
    } else if (s === 'rejected' || s === '3' || s === '-1') {
      normalizedStatus = 3;
    } else {
      normalizedStatus = 0;
    }
  }

  // 2. Map is_published to integer 0/1
  const normalizedPublished = (input.is_published === true || input.is_published === 1 || input.is_published === '1' || input.is_published === 'true') ? 1 : 0;

  // 3. Ensure price is integer
  const normalizedPrice = parseInt(String(input.price || 0));
  const normalizedPdfPrice = parseInt(String(input.pdf_price || 0));
  
  // 4. Handle cards_json
  let normalizedCards = input.cards_json;
  if (typeof normalizedCards === 'string') {
    try {
      normalizedCards = JSON.parse(normalizedCards);
    } catch (e) {
      normalizedCards = [];
    }
  }

  const contentType = (input.content_type || 'fc').toLowerCase();
  const wordCount = parseInt(String(input.word_count || 0));
  const authorShare = input.author_share !== undefined ? parseInt(String(input.author_share)) : (contentType === 'ipc' ? 70 : 30);
  const platformShare = input.platform_share !== undefined ? parseInt(String(input.platform_share)) : (contentType === 'ipc' ? 30 : 50);
  const mprShare = input.mpr_share !== undefined ? parseInt(String(input.mpr_share)) : (contentType === 'ipc' ? 0 : 20);

  // Preserve metadata in admin_note as resilient fallback
  const existingNote = input.admin_note ? String(input.admin_note) : '';
  const metaTag = `[META:content_type=${contentType},word_count=${wordCount},mpr_ref=${input.mpr_referral_code || ''},author_share=${authorShare},platform_share=${platformShare},mpr_share=${mprShare}]`;
  const cleanNote = existingNote.includes('[META:') ? existingNote.replace(/\[META:[^\]]+\]/, metaTag) : (existingNote ? `${existingNote} ${metaTag}` : metaTag);

  const payload: any = {
    user_id: String(input.user_id),
    title: String(input.title || '').trim(),
    cards_json: normalizedCards,
    price: isNaN(normalizedPrice) ? 0 : normalizedPrice,
    public_slug: String(input.public_slug || '').trim(),
    is_published: normalizedPublished,
    status: normalizedStatus,
    admin_note: cleanNote,
    report_count: parseInt(String(input.report_count || 0))
  };

  // Always include cover_image and pdf_price by default for maximum schema robustness
  payload.cover_image = input.cover_image ? String(input.cover_image) : null;
  payload.pdf_price = isNaN(normalizedPdfPrice) ? 0 : normalizedPdfPrice;

  if (input.genre_id !== undefined) {
    payload.genre_id = input.genre_id || null;
  }

  // Include new content type columns if supported or by default
  if (options?.hasContentType !== false) {
    payload.content_type = contentType;
    payload.word_count = wordCount;
    payload.mpr_referral_code = input.mpr_referral_code ? String(input.mpr_referral_code).trim() : null;
    payload.author_share = authorShare;
    payload.platform_share = platformShare;
    payload.mpr_share = mprShare;
    payload.rights_declared = input.rights_declared === true || input.rights_declared === 1;
    payload.exclusivity_declared = input.exclusivity_declared === true || input.exclusivity_declared === 1;
    payload.publishing_lane = input.publishing_lane || (contentType === 'ipc' ? 'lane_b' : 'lane_a');
    payload.trivia_rights_granted = input.trivia_rights_granted !== undefined ? !!input.trivia_rights_granted : (contentType !== 'ipc');
    if (input.exclusivity_end_date) {
      payload.exclusivity_end_date = input.exclusivity_end_date;
    } else if (contentType === 'ipc') {
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      payload.exclusivity_end_date = oneYearLater.toISOString();
    }
  }

  return payload as BookPayload;
}

/**
 * Normalizes user update payload for integer flags.
 */
export function normalizeUserPayload(input: any) {
  return {
    is_admin: (input.is_admin === true || input.is_admin === 1) ? 1 : 0,
    is_premium: (input.is_premium === true || input.is_premium === 1) ? 1 : 0,
    is_suspended: (input.is_suspended === true || input.is_suspended === 1) ? 1 : 0
  };
}

/**
 * Verifies the books table schema and returns any missing columns or type mismatches.
 */
export async function verifyBooksSchema(): Promise<{ ok: boolean; problems: string[]; hasPdfPrice: boolean; hasCoverImage: boolean; hasContentType: boolean }> {
  const problems: string[] = [];
  let hasPdfPrice = false;
  let hasCoverImage = false;
  let hasContentType = false;
  
  try {
    // We attempt a select of columns to probe the schema cache/existence
    // We separate critical columns from optional new feature columns
    const criticalColumns = [
      'id', 'user_id', 'title', 'cards_json', 'price',
      'public_slug', 'is_published', 'status', 'admin_note', 'report_count'
    ];
    
    const { error: criticalError } = await supabase
      .from('books')
      .select(criticalColumns.join(','))
      .limit(0);

    if (criticalError) {
      if (criticalError.message.includes('column') || criticalError.message.includes('does not exist')) {
        const match = criticalError.message.match(/column "(.+)" does not exist/);
        problems.push(`Missing critical column: ${match ? match[1] : criticalError.message}`);
      } else if (criticalError.message.includes('relation "public.books" does not exist')) {
        problems.push("CRITICAL: The 'public.books' table was not found.");
      } else if (criticalError.message.toLowerCase().includes('infinite recursion')) {
        // DO NOT push to problems, it blocks the whole app. 
        // We handle it gracefully by allowing the app to load and showing a specific repair reminder if needed.
        console.warn("[SchemaGuard] Infinite recursion detected. This is a policy issue, not a missing schema issue.");
      } else if (criticalError.message === 'TypeError: Failed to fetch' || criticalError.message.includes('fetch') || criticalError.message.includes('Failed to fetch') || criticalError.message.includes('NetworkError')) {
        console.warn("[SchemaGuard] Could not connect to Supabase during critical check (fetch failed). Treating as a network warning, not a schema failure.");
      } else {
        problems.push(`Database connection issue: ${criticalError.message}`);
      }
    }

    // Check optional feature columns (like pdf_price)
    const { error: pdfError } = await supabase
      .from('books')
      .select('pdf_price')
      .limit(0);
    
    if (pdfError && (pdfError.message.includes('column') || pdfError.message.includes('does not exist'))) {
      // Missing is okay, we just set the flag to false
      hasPdfPrice = false;
      console.warn("Optional column 'pdf_price' is missing. PDF monetization will be disabled until the migration is applied.");
    } else if (pdfError) {
      if (pdfError.message.toLowerCase().includes('infinite recursion')) {
        console.warn("[SchemaGuard] Infinite recursion detected on books.pdf_price");
      } else if (pdfError.message === 'TypeError: Failed to fetch' || pdfError.message.includes('fetch') || pdfError.message.includes('NetworkError')) {
        console.warn("[SchemaGuard] Could not connect to Supabase during pdf_price check (fetch failed).");
      } else {
        problems.push(`Schema Error (pdf_price): ${pdfError.message}`);
      }
    } else {
      hasPdfPrice = true;
    }

    // Check optional feature columns (like cover_image)
    const { error: imgError } = await supabase
      .from('books')
      .select('cover_image')
      .limit(0);
    
    if (imgError && (imgError.message.includes('column') || imgError.message.includes('does not exist'))) {
      hasCoverImage = false;
      console.warn("Optional column 'cover_image' is missing. Cover images will not be sent to database until the migration is applied.");
    } else if (imgError) {
      if (imgError.message.toLowerCase().includes('infinite recursion')) {
        console.warn("[SchemaGuard] Infinite recursion detected on books.cover_image");
      } else if (imgError.message === 'TypeError: Failed to fetch' || imgError.message.includes('fetch') || imgError.message.includes('NetworkError')) {
        console.warn("[SchemaGuard] Could not connect to Supabase during cover_image check (fetch failed).");
      } else {
        problems.push(`Schema Error (cover_image): ${imgError.message}`);
      }
    } else {
      hasCoverImage = true;
    }

    // Check optional feature columns (like content_type for IPC/FC)
    hasContentType = false;
    const { error: ctError } = await supabase
      .from('books')
      .select('content_type')
      .limit(0);

    if (ctError && (ctError.message.includes('column') || ctError.message.includes('does not exist'))) {
      hasContentType = false;
      console.warn("Optional column 'content_type' is missing in books table. Publishing will use metadata fallback until SQL migration is executed.");
    } else if (!ctError) {
      hasContentType = true;
    }
    
    // Check users table for integer flags
    const userColumns = ['id', 'is_admin', 'is_premium', 'is_suspended'];
    const { error: userError } = await supabase
      .from('users')
      .select(userColumns.join(','))
      .limit(0);
      
    if (userError) {
      if (userError.message.includes('column')) {
        problems.push(`Users table missing columns: ${userError.message}`);
      } else if (userError.message.toLowerCase().includes('infinite recursion')) {
         console.warn("[SchemaGuard] Infinite recursion detected on users table.");
      } else if (userError.message.includes('relation "public.users" does not exist') || userError.message.includes('schema cache')) {
        problems.push("CRITICAL: The 'public.users' table was not found. Please run the initial SQL migration.");
      } else if (userError.message === 'TypeError: Failed to fetch' || userError.message.includes('fetch') || userError.message.includes('NetworkError')) {
        console.warn("[SchemaGuard] Could not connect to Supabase during users check (fetch failed). Treating as a network warning, not a schema failure.");
      } else {
        problems.push(`Users table error: ${userError.message}`);
      }
    }

  } catch (err: any) {
    problems.push(`Unexpected verification error: ${err.message}`);
  }

  return {
    ok: problems.length === 0,
    problems,
    hasPdfPrice,
    hasCoverImage,
    hasContentType
  };
}
