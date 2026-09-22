import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChevronLeft, Share2, CheckCircle2, Copy, ExternalLink, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { normalizeBookPayload, verifyBooksSchema } from '../lib/schemaGuard';
import { useAuth } from '../AuthContext';
import { getAppUrl } from '../lib/utils';

export const SellBook: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const [book, setBook] = useState<any>(null);
  const [price, setPrice] = useState('800');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);
  const [affiliateLink, setAffiliateLink] = useState('');
  const [generatingAffiliate, setGeneratingAffiliate] = useState(false);

  useEffect(() => {
    const fetchBook = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .single();
        
      if (data) {
        setBook(data);
        if (data.price) {
          setPrice(data.price.toString());
        } else {
          setPrice(isAdmin ? '500' : '800');
        }
        if (data.is_published) setPublished(true);
      }
      setLoading(false);
    };
    fetchBook();
  }, [id, isAdmin]);

  const handlePublish = async () => {
    if (!id || !book) return;
    const numPrice = parseInt(price) || 0;
    if (!isAdmin && numPrice > 0 && numPrice < 800) {
      alert('The minimum price for authors is ₦800. Please set a price of at least ₦800 or make it free (₦0).');
      return;
    }
    setSaving(true);
    try {
       // 0. Preflight Verification
      const { ok, problems, hasPdfPrice, hasCoverImage, hasContentType } = await verifyBooksSchema();
      if (!ok) {
        throw new Error(`Database Schema Mismatch: ${problems.join(', ')}. Please run SUPABASE_MIGRATION_3.md for a comprehensive fix.`);
      }

      const slug = book.public_slug || Math.random().toString(36).substring(2, 10);
      
      // 1. Construct raw data
      const rawData = {
        ...book,
        price: parseInt(price) || 0,
        is_published: true,
        public_slug: slug,
        user_id: profile?.id,
        status: 'approved',
        content_type: book.content_type || 'fc',
        author_share: book.content_type === 'ipc' ? 70 : 30,
        platform_share: book.content_type === 'ipc' ? 30 : 50,
        mpr_share: book.content_type === 'ipc' ? 0 : 20
      };

      // 2. Normalize
      const bookData = normalizeBookPayload(rawData, { hasPdfPrice, hasCoverImage, hasContentType });

      // 3. Save
      const { error } = await supabase
        .from('books')
        .update(bookData)
        .eq('id', id);
        
      if (error) throw error;
      setPublished(true);
      setBook({ ...book, ...bookData }); // Sync local state
    } catch (err: any) {
      console.error(err);
      alert(`Failed to publish: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = `${getAppUrl()}/book/${book?.public_slug}/buy`;

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    alert('Link copied to clipboard!');
  };

  const generateAffiliateLink = async () => {
    setGeneratingAffiliate(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await axios.post('/api/affiliate/generate', 
        { book_id: id },
        {
          headers: { 
            'Authorization': `Bearer ${session?.access_token}`
          }
        }
      );
      
      const data = response.data;
      if (data.affiliateLink) {
        setAffiliateLink(data.affiliateLink);
        alert('Affiliate link generated successfully!');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || err.message || 'Failed to generate link');
    } finally {
      setGeneratingAffiliate(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12 px-3 sm:px-4 w-full max-w-full overflow-x-hidden">
      <div className="page-container max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => {
          if (window.history.length > 2) {
            navigate(-1);
          } else {
            navigate('/dashboard');
          }
        }} className="flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Bookshelf</span>
        </Button>

        <Card className="shadow-xl border-t-4 border-t-green-700 w-full overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl">Sell Your Book</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Set a price and share your book with the world.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-4 sm:p-6">
            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg flex items-center gap-3 sm:gap-4">
              <div className="w-14 h-16 sm:w-16 sm:h-20 bg-gray-200 rounded flex items-center justify-center text-gray-400 shrink-0">
                <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base sm:text-lg truncate">{book.title}</h3>
                <p className="text-xs sm:text-sm text-gray-500">{book.cards_json?.length || 0} cards</p>
              </div>
            </div>

            {!published ? (
              <div className="space-y-6">
                 <div className="space-y-3">
                  <Label className="text-base sm:text-lg font-semibold">Choose a Price</Label>
                  <RadioGroup value={price || (isAdmin ? "500" : "800")} onValueChange={setPrice} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(isAdmin ? ['500', '1000', '2000', '5000'] : ['800', '1000', '2000', '5000']).map((p) => (
                      <div key={p}>
                        <RadioGroupItem value={p} id={`price-${p}`} className="peer sr-only" />
                        <Label
                          htmlFor={`price-${p}`}
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 sm:p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-700 [&:has([data-state=checked])]:border-green-700 cursor-pointer text-center"
                        >
                          <span className="text-lg sm:text-xl font-bold">₦{p}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
 
                {book?.content_type === 'ipc' ? (
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-indigo-900 text-sm">IPC Revenue Model (70/30)</h4>
                      <Badge className="bg-indigo-600 text-white text-[10px]">70% Author Royalty</Badge>
                    </div>
                    <p className="text-xs text-indigo-700 leading-relaxed">
                      As an Independent Premium Content title, you receive <span className="font-extrabold text-indigo-900">70% (₦{((parseInt(price) || 0) * 0.7).toLocaleString()})</span> of every sale. CalmReader retains 30% (with 5% reserved for your referring partner bonus).
                    </p>
                  </div>
                ) : (
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-emerald-900 text-sm">FC Revenue Model (30/50/20)</h4>
                      <Badge className="bg-emerald-700 text-white text-[10px]">30% Author Royalty</Badge>
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      You receive <span className="font-extrabold text-emerald-900">30% (₦{((parseInt(price) || 0) * 0.3).toLocaleString()})</span>. CalmReader retains 50%, and 20% (<span className="font-bold">₦{((parseInt(price) || 0) * 0.2).toLocaleString()}</span>) is shared directly with Marketing Partners (MPRs) who promote your book virally.
                    </p>
                  </div>
                )}

                <Button 
                  onClick={handlePublish} 
                  disabled={saving}
                  className="w-full bg-green-700 hover:bg-green-800 min-h-[44px] h-12 text-base font-bold"
                >
                  {saving ? 'Publishing...' : 'Publish for Sale'}
                </Button>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col items-center text-center py-4">
                  <div className="bg-green-100 p-3 rounded-full mb-4">
                    <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-green-700" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Book is Live!</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Your book is now available for purchase at ₦{book.price}.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Public Sales Link</Label>
                  <div className="flex gap-2">
                    <Input value={publicUrl} readOnly className="bg-gray-50 text-xs truncate" />
                    <Button variant="outline" size="icon" onClick={copyUrl} className="shrink-0">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-sm mb-1">Affiliate Marketing</h4>
                  <p className="text-xs text-gray-500 mb-3">Generate a unique link to track sales from your marketing efforts.</p>
                  {affiliateLink ? (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Your Affiliate Link</Label>
                      <div className="flex gap-2">
                        <Input value={affiliateLink} readOnly className="bg-green-50 text-xs truncate" />
                        <Button variant="outline" size="icon" onClick={() => {
                          navigator.clipboard.writeText(affiliateLink);
                          alert('Affiliate link copied!');
                        }} className="shrink-0">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full text-xs font-semibold h-10" 
                      onClick={generateAffiliateLink}
                      disabled={generatingAffiliate}
                    >
                      {generatingAffiliate ? 'Generating...' : 'Generate Affiliate Link'}
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" className="w-full sm:flex-1 h-11 text-xs font-bold" onClick={() => setPublished(false)}>
                      Change Price
                    </Button>
                    <Button className="w-full sm:flex-1 bg-green-700 hover:bg-green-800 h-11 text-xs font-bold" asChild>
                      <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                        <span>View Sales Page</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                  <Button variant="secondary" className="w-full h-11 text-xs font-bold" asChild>
                    <Link to={`/book/${book.public_slug}/read`} className="flex items-center justify-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>Preview Reader</span>
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
