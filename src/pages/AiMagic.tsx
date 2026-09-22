import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { 
  Sparkles, 
  Wand2, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Send,
  RefreshCw,
  X,
  Eye,
  Settings2,
  Trash2,
  Plus,
  Loader2,
  ArrowRight,
  Palette,
  Image as ImageIcon,
  BrainCircuit,
  Lock,
  Save,
  Tag,
  HelpCircle,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { generateAiContent } from '../lib/ai';

// Professional card themes with high-vibrance accents
const CARD_THEMES = [
  { id: 'sunset', name: 'Cyber Sunset', font: 'font-serif', gradient: 'radial-gradient(circle at 30% 20%, #ff4e0066 0%, transparent 60%), radial-gradient(circle at 70% 80%, #3a1510dd 0%, transparent 60%)', bg: '#080402' },
  { id: 'neon', name: 'Neon Void', font: 'font-sans', gradient: 'radial-gradient(circle at 20% 30%, #4f46e555 0%, transparent 50%), radial-gradient(circle at 80% 70%, #7e22ce66 0%, transparent 50%)', bg: '#02041a' },
  { id: 'emerald', name: 'Hyper Green', font: 'font-mono', gradient: 'radial-gradient(circle at 40% 10%, #10b98155 0%, transparent 60%), radial-gradient(circle at 60% 90%, #064e3b77 0%, transparent 60%)', bg: '#010804' },
  { id: 'royal', name: 'Royal Velvet', font: 'font-serif', gradient: 'radial-gradient(circle at 10% 40%, #a855f755 0%, transparent 50%), radial-gradient(circle at 90% 60%, #4c1d9577 0%, transparent 50%)', bg: '#080414' },
  { id: 'gold', name: 'Liquid Gold', font: 'font-sans', gradient: 'radial-gradient(circle at 20% 20%, #f59e0b33 0%, transparent 60%), radial-gradient(circle at 80% 80%, #78350f55 0%, transparent 60%)', bg: '#080705' },
];

export const AiMagic: React.FC = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!authLoading && user && !isAdmin) {
      navigate('/dashboard');
    }
  }, [authLoading, user, isAdmin, navigate]);

  // Puzzle fields
  const [puzzleTitle, setPuzzleTitle] = useState('');
  const [puzzleType, setPuzzleType] = useState<'riddle' | 'brain_teaser' | 'logic_puzzle'>('riddle');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [tags, setTags] = useState('riddle, mystery');
  const [imageUrl, setImageUrl] = useState('');
  
  // Theme & states
  const [selectedTheme, setSelectedTheme] = useState(CARD_THEMES[0]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // AI Assisted Generator Handler
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      setError('Please tell the AI what topic or theme you want the puzzle on.');
      return;
    }

    setAiGenerating(true);
    setError('');
    setSuccess(false);

    try {
      const { data } = await generateAiContent(
        `Craft a complete and engaging ${puzzleType.replace('_', ' ')} puzzle based on the topic: "${aiPrompt}".
        Return the result exactly matching the structured JSON schema. Do not output markdown code blocks.`,
        {
          responseMimeType: "application/json",
          systemInstruction: `You are an elite creative puzzle master. Return a JSON object with this exact schema:
          {
            "title": "catchy title",
            "question": "riddle text / puzzle description",
            "answer": "correct answer / explanation",
            "tags": "tags, comma, separated",
            "suggested_difficulty": "easy" or "medium" or "hard"
          }`
        }
      );

      if (data) {
        setPuzzleTitle(data.title || 'The Cosmic Teaser');
        setQuestion(data.question || '');
        setAnswer(data.answer || '');
        setTags(data.tags || 'riddle, visual');
        if (data.suggested_difficulty === 'easy' || data.suggested_difficulty === 'medium' || data.suggested_difficulty === 'hard') {
          setDifficulty(data.suggested_difficulty);
        }
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error('AI returned blank structured data.');
      }
    } catch (err: any) {
      console.error('AI Puzzle Generation Error:', err);
      setError('Failed to generate puzzle dynamically. Fallback to manual mode or try typing a different prompt.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Attach cover image via upload (Base64 converting)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Lock and Save to the Vault
  const handleSaveToVault = async () => {
    if (!puzzleTitle.trim() || !question.trim() || !answer.trim()) {
      setError('Please provide a title, puzzle question description, and the correct answer/solution.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const session = await supabase.auth.getSession();
      await axios.post('/api/admin/vault', {
        title: puzzleTitle.trim(),
        type: 'puzzle',
        content: {
          puzzle_type: puzzleType,
          question: question.trim(),
          answer: answer.trim(),
        },
        difficulty: difficulty,
        tags: tags.trim(),
        image_url: imageUrl || null
      }, {
        headers: { Authorization: `Bearer ${session.data.session?.access_token}` }
      });

      setSuccess(true);
      // Reset inputs
      setPuzzleTitle('');
      setQuestion('');
      setAnswer('');
      setTags('riddle, mind-bender');
      setImageUrl('');
    } catch (err: any) {
      console.error('Save to Vault Error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save item to Vault.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-32">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all font-black text-xs uppercase tracking-widest cursor-pointer" onClick={() => navigate('/dashboard')}>
              <ChevronLeft className="w-4 h-4" /> Go Back
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 flex items-center gap-3">
              🧩 Cyber Puzzle Maker
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Repurpose your legacy AI magic drafts to build engaging riddles, cerebral logic teasers, and brain puzzles directly into the secure Vault.
            </p>
          </div>
          
          <Link to="/admin">
            <Button variant="outline" className="h-12 rounded-xl font-bold border-slate-200">
              <Settings2 className="w-5 h-5 mr-2" /> Admin Dashboard
            </Button>
          </Link>
        </div>

        {/* Central Layout columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form & AI Editor (LHS) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* AI Generator Draft Module */}
            <Card className="border border-indigo-150 rounded-3xl overflow-hidden shadow-sm">
              <CardHeader className="bg-indigo-50/50 p-6 space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                  <CardTitle className="text-indigo-950 text-lg font-black tracking-tight">AI Co-Pilot Puzzle Writer</CardTitle>
                </div>
                <CardDescription className="text-xs text-indigo-700/80 font-bold">
                  Just describe what kind of Riddle or logic puzzle you want, and let Gemini compile metadata!
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest pl-1">Prompt / Idea Detail</Label>
                  <Textarea 
                    placeholder="e.g. A lateral thinking mystery about a locked safe, or a classic riddle about fire/shadows..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="min-h-[85px] rounded-2xl border-indigo-100"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest pl-1">Target Format</Label>
                    <Select value={puzzleType} onValueChange={(val: any) => setPuzzleType(val)}>
                      <SelectTrigger className="rounded-xl h-11 border-indigo-100">
                        <SelectValue placeholder="Format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="riddle">Riddle</SelectItem>
                        <SelectItem value="brain_teaser">Brain Teaser</SelectItem>
                        <SelectItem value="logic_puzzle">Logic Puzzle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end">
                    <Button 
                      onClick={handleAiGenerate} 
                      disabled={aiGenerating}
                      className="w-full h-11 bg-indigo-700 hover:bg-indigo-800 text-white font-black rounded-xl"
                    >
                      {aiGenerating ? (
                        <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Assembling Brain-Teaser...</>
                      ) : (
                        <><Wand2 className="w-5 h-5 mr-2" />Spark AI Puzzle (Gemini)</>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manual Review, Metadata & Publisher Module */}
            <Card className="border rounded-3xl overflow-hidden shadow-xl">
              <CardHeader className="bg-slate-50 p-6">
                <CardTitle className="text-slate-900 text-lg font-black tracking-tight flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-slate-500" /> Refined Puzzle Specification
                </CardTitle>
                <CardDescription className="text-xs">
                  Fill in or check these fields before locking and publishing to your Vault.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-8 space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Teaser Title</Label>
                  <Input 
                    value={puzzleTitle}
                    onChange={(e) => setPuzzleTitle(e.target.value)}
                    placeholder="Enter eye-catching title..."
                    className="h-12 rounded-xl"
                  />
                </div>

                {/* Question */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Question / Riddle Detail</Label>
                  <Textarea 
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="The question, mystery statement or math logic prompt..."
                    className="min-h-[120px] rounded-2xl"
                  />
                </div>

                {/* Answer */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Correct Answer / Explanation</Label>
                  <Input 
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Provide the solution key or riddle trigger word..."
                    className="h-12 rounded-xl"
                  />
                </div>

                {/* Difficulty & Tags */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Difficulty level</Label>
                    <Select value={difficulty} onValueChange={(val: any) => setDifficulty(val)}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Tags (Comma Separated)</Label>
                    <Input 
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="e.g. math, riddle, lock, logic"
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                {/* Image upload */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Card Accent Cover Image (Optional)</Label>
                  <div className="flex flex-col md:flex-row items-stretch gap-4 pb-1">
                    <div className="flex-1">
                      <Input 
                        placeholder="Paste image URL..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-bold uppercase">Or</span>
                      <Label htmlFor="image-picker" className="h-12 px-6 flex items-center gap-2 border bg-white rounded-xl shadow-sm hover:bg-slate-50 font-bold transition-all cursor-pointer">
                        <ImageIcon className="w-5 h-5 text-slate-500" />
                        Upload File
                      </Label>
                      <input 
                        id="image-picker"
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl font-bold flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl font-black flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    🚀 Locked & Transpatched to secure Vault successfully!
                  </div>
                )}
              </CardContent>

              <CardFooter className="bg-slate-50 p-6 flex justify-end">
                <Button 
                  onClick={handleSaveToVault}
                  disabled={saving || !puzzleTitle || !question || !answer}
                  className="bg-green-700 hover:bg-green-800 text-white font-black h-14 rounded-2xl px-12 text-lg shadow-xl"
                >
                  {saving ? (
                    <><RefreshCw className="w-5 h-5 animate-spin mr-3" />Storing Vault Item...</>
                  ) : (
                    <><Save className="w-5 h-5 mr-3" />Save & Stream to Vault</>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Card Live Theme Preview (RHS) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="sticky top-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-indigo-600" /> Preview Card Canvas
                </h3>
                
                {/* Theme chooser */}
                <div className="flex gap-1">
                  {CARD_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme)}
                      className={`w-4 h-4 rounded-full border transition-all ${selectedTheme.id === theme.id ? 'ring-2 ring-indigo-600 ring-offset-2 scale-110' : 'opacity-60'}`}
                      style={{ background: theme.id === 'sunset' ? '#ff4e00' : theme.id === 'neon' ? '#4f46e5' : theme.id === 'emerald' ? '#10b981' : theme.id === 'royal' ? '#a855f7' : '#f59e0b' }}
                      title={theme.name}
                    />
                  ))}
                </div>
              </div>

              {/* Previews the Actual Card */}
              <div 
                className="w-full aspect-[3/4] rounded-[36px] bg-slate-950 p-8 shadow-2xl overflow-hidden relative flex flex-col justify-between transition-all duration-500 border border-white/5"
                style={{ 
                  background: selectedTheme.bg,
                  backgroundImage: selectedTheme.gradient 
                }}
              >
                {/* Top header badge indicators */}
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="font-mono text-[9px] tracking-widest text-white/50 border-white/10 uppercase">
                      {puzzleType}
                    </Badge>
                    <Badge className={`font-black text-[9px] tracking-wider uppercase border-none ${
                      difficulty === 'easy' ? 'bg-emerald-500/25 text-emerald-300' :
                      difficulty === 'medium' ? 'bg-amber-500/25 text-amber-300' : 'bg-red-500/25 text-red-300'
                    }`}>
                      {difficulty}
                    </Badge>
                  </div>
                  
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                    Live Accent PREVIEW
                  </span>
                </div>

                {/* Center Content details */}
                <div className="my-auto space-y-4 pt-10 relative z-10 flex-grow flex flex-col justify-center">
                  <h3 className={`text-2xl font-black text-white ${selectedTheme.font} leading-relaxed tracking-tight`}>
                    {puzzleTitle || 'Your Cyber Riddle Title'}
                  </h3>
                  
                  {imageUrl && (
                    <div className="w-full h-32 rounded-2xl overflow-hidden border border-white/10 my-1 bg-white/5 relative">
                      <img 
                        src={imageUrl} 
                        alt="Teaser Illustration preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <p className="text-white/80 font-medium text-sm leading-relaxed max-h-[160px] overflow-y-auto pr-2 scrollbar-thin">
                    {question || 'Select type, type custom question detail or generate with Gemini AI code elements.'}
                  </p>
                </div>

                {/* Bottom answer card trigger reveal */}
                <div className="pt-4 border-t border-white/5 mt-auto flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-1.5 text-white/40">
                    <Tag className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-bold truncate max-w-[180px]">{tags}</span>
                  </div>
                  
                  <div className="bg-white/10 border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-1 cursor-help hover:bg-white/15">
                    <HelpCircle className="w-3 h-3 text-white/80" />
                    <span className="text-[9px] font-bold text-white">Answer Revealed on Win</span>
                  </div>
                </div>

                {/* Subtle digital mesh accent block */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none opacity-20" />
              </div>

              {/* Detailed answers breakdown card preview */}
              {answer && (
                <div className="p-6 bg-slate-50 border rounded-3xl space-y-2">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 pl-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Answer / Solution Key
                  </p>
                  <p className="text-sm font-bold text-slate-900 leading-relaxed bg-white border border-slate-100 p-4 rounded-xl">
                    "{answer}"
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};
