import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, UserCircle, Book, Award, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';

export const BrowseAuthors: React.FC = () => {
  const [authors, setAuthors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('id, username, full_name, avatar_url, bio, account_tier, is_premium')
          .eq('is_suspended', false)
          .or('is_premium.eq.true,account_tier.eq.author')
          .limit(20);
        
        setAuthors(data || []);
      } catch (err) {
        console.error("Error fetching authors:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuthors();
  }, []);

  const filteredAuthors = authors.filter(a => 
    (a.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (a.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-4 mb-20">
          <Badge className="bg-amber-100 text-amber-700 border-none px-4 py-1 font-black uppercase tracking-widest text-[10px]">Curators of Wisdom</Badge>
          <h1 className="text-5xl md:text-7xl font-serif font-black text-slate-900 tracking-tight">The Architects</h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">Meet the brilliant minds behind our most popular interactive experiences.</p>
        </div>

        <div className="relative max-w-xl mx-auto mb-20 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-amber-600 transition-colors" />
          <Input 
            placeholder="Search authors..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-16 pl-14 rounded-[28px] border-slate-200 bg-white shadow-xl shadow-slate-200/50 focus:border-amber-500 focus:ring-0 transition-all text-lg font-medium"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[4/5] bg-white rounded-[40px] animate-pulse" />
            ))}
          </div>
        ) : filteredAuthors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredAuthors.map(author => (
              <Card 
                key={author.id} 
                className="border-none shadow-none bg-white rounded-[48px] overflow-hidden group cursor-pointer hover:shadow-2xl hover:shadow-amber-900/10 transition-all duration-700 hover:-translate-y-2"
                onClick={() => navigate(`/author/${author.id}`)}
              >
                <CardContent className="p-8 text-center space-y-6">
                  <div className="mx-auto w-32 h-32 rounded-[40px] overflow-hidden bg-slate-100 ring-8 ring-slate-50 relative group-hover:ring-amber-50 transition-all">
                    {author.avatar_url ? (
                      <img src={author.avatar_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={author.full_name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-amber-600 text-white text-4xl font-black">
                        {(author.full_name || 'A')[0]}
                      </div>
                    )}
                    {author.is_premium && (
                      <div className="absolute bottom-1 right-1 bg-amber-500 rounded-full p-1.5 border-2 border-white shadow-lg">
                        <Award className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-amber-600 transition-colors">{author.full_name || author.username || 'Anonymous'}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{author.username ? `@${author.username}` : 'Resident Author'}</p>
                  </div>

                  <p className="text-slate-500 text-sm font-medium line-clamp-2 leading-relaxed">
                    {author.bio || "Exploring complex narratives through interactive card-based storytelling."}
                  </p>

                  <div className="pt-4 flex items-center justify-center gap-6 border-t border-slate-50 text-slate-400">
                    <div className="text-center">
                      <p className="text-sm font-black text-slate-900">12</p>
                      <p className="text-[8px] font-black uppercase tracking-widest">Books</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-slate-900">2.4k</p>
                      <p className="text-[8px] font-black uppercase tracking-widest">Readers</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[48px] border border-slate-100 italic font-medium text-slate-400">
            No authors found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
};
