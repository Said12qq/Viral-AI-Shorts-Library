import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Download, 
  Lock, 
  Unlock, 
  Eye, 
  Clock, 
  Search, 
  Layers, 
  Sparkles, 
  TrendingUp, 
  Cpu, 
  Grid, 
  User, 
  CheckCircle, 
  AlertCircle, 
  BarChart2, 
  Settings, 
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  MousePointerClick,
  Info,
  Calendar,
  Vote,
  Compass,
  Zap,
  HelpCircle,
  Video
} from 'lucide-react';
import { VideoTemplate, Offer, AppStats } from './types';
import { videos as initialVideos } from './data/videos';

export default function App() {
  // Navigation & Page State
  const [activeTab, setActiveTab] = useState<'home' | 'library' | 'future' | 'pricing' | 'about' | 'admin'>('home');
  
  // Library State
  const [videosList, setVideosList] = useState<VideoTemplate[]>(initialVideos);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [unlockedVideoIds, setUnlockedVideoIds] = useState<string[]>([]);
  
  // Modals state
  const [previewVideo, setPreviewVideo] = useState<VideoTemplate | null>(null);
  const [unlockVideoItem, setUnlockVideoItem] = useState<VideoTemplate | null>(null);
  
  // Offer wall states
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [clickedOfferIds, setClickedOfferIds] = useState<string[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingStatusText, setPollingStatusText] = useState('Waiting for offer selection...');
  const [pollSuccess, setPollSuccess] = useState(false);
  
  // Client Metadata info (represented dynamically)
  const [clientIp, setClientIp] = useState('127.0.0.1');
  const [isTestMode, setIsTestMode] = useState(true);

  // Future Roadmap Voting State
  const [votes, setVotes] = useState<Record<string, number>>({
    'reddit-minecraft': 142,
    'finance-talking-anim': 98,
    'football-velocity-cap': 187,
    'gym-motivation-ai': 76,
    'scifi-voicebreak': 53,
  });
  const [hasVoted, setHasVoted] = useState<string[]>([]);

  // Admin stats state
  const [stats, setStats] = useState<AppStats | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  
  // Refs for timers
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch unlocked video IDs initially
  const fetchUnlockedStatuses = async () => {
    try {
      const res = await fetch('/api/unlocked-statuses');
      const data = await res.json();
      if (data.success && Array.isArray(data.unlocked)) {
        setUnlockedVideoIds(data.unlocked);
      }
    } catch (e) {
      console.error('Error fetching unlocked statuses', e);
    }
  };

  useEffect(() => {
    fetchUnlockedStatuses();
    
    // Quick probe to check if we can display client IP dynamically
    fetch('/api/offers?video_id=probe')
      .then(r => r.json())
      .then(d => {
        // Just extract client state if available
      })
      .catch(() => {});
  }, []);

  // Sync polling effect
  useEffect(() => {
    if (isPolling && unlockVideoItem) {
      setPollingStatusText('Verifying completion status... Link active.');
      // Poll every 15 seconds
      pollIntervalRef.current = setInterval(() => {
        checkLeadCompletion(false);
      }, 15000);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isPolling, unlockVideoItem]);

  // Load CPA offers
  const loadCPAOffers = async (videoId: string) => {
    setLoadingOffers(true);
    setOffers([]);
    try {
      const res = await fetch(`/api/offers?video_id=${encodeURIComponent(videoId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.offers)) {
        setOffers(data.offers);
      } else {
        setOffers([]);
      }
    } catch (e) {
      console.error('Failed to load offers', e);
    } finally {
      setLoadingOffers(false);
    }
  };

  // Open unlock panel
  const handleOpenUnlock = (video: VideoTemplate) => {
    setUnlockVideoItem(video);
    setClickedOfferIds([]);
    setIsPolling(false);
    setPollSuccess(false);
    setPollingStatusText('Ready. Click an offer below to start validation.');
    loadCPAOffers(video.id);
  };

  // Track offer click
  const handleOfferClick = async (offer: Offer) => {
    if (!unlockVideoItem) return;
    
    // Open offer URL in new window
    window.open(offer.url, '_blank', 'noopener,noreferrer');

    // Record click on server
    try {
      await fetch('/api/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: unlockVideoItem.id,
          offer_id: offer.anchor
        })
      });
    } catch (e) {
      console.error('Error tracking click on server', e);
    }

    // Add list
    if (!clickedOfferIds.includes(offer.campaign_id)) {
      setClickedOfferIds(prev => [...prev, offer.campaign_id]);
    }
    
    // Start polling lead status
    setIsPolling(true);
  };

  // Check lead completion
  const checkLeadCompletion = async (forceSimulated: boolean = false) => {
    if (!unlockVideoItem) return;

    setPollingStatusText('Connecting to secure verification gateway...');
    try {
      const testParam = (forceSimulated || isTestMode) ? '1' : '0';
      const response = await fetch('/api/check-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: unlockVideoItem.id,
          testing: testParam
        })
      });

      const data = await response.json();
      if (data.success && data.completed) {
        setPollSuccess(true);
        setIsPolling(false);
        setPollingStatusText('Success! Template fully unlocked for your IP.');
        // Refresh unlocked videos
        fetchUnlockedStatuses();
        
        // Auto-close modal after 2.5 seconds
        setTimeout(() => {
          setUnlockVideoItem(null);
        }, 25000);
      } else {
        setPollingStatusText('Verification pending. Please ensure you fully complete the offer tasks in the opened tab.');
      }
    } catch (e) {
      console.error('Check lead error', e);
      setPollingStatusText('Gateway busy. Continuing to monitor...');
    }
  };

  // Admin: Load Stats
  const loadAdminStats = async () => {
    setAdminLoading(true);
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to load admin stats', e);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin') {
      loadAdminStats();
    }
  }, [activeTab]);

  // Backdoor tool: bypass unlock
  const handleBackdoorUnlockAll = async () => {
    const confirmUnlock = window.confirm("Developer Sandbox Action:\n\nThis will bypass CPA requirements and unlock ALL video templates instantly for your session. Proceed?");
    if (!confirmUnlock) return;
    
    try {
      for (const video of videosList) {
        await fetch('/api/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_id: video.id })
        });
      }
      alert("All templates unlocked successfully! Refreshing status...");
      fetchUnlockedStatuses();
      if (activeTab === 'admin') {
        loadAdminStats();
      }
    } catch (err) {
      console.error('Backdoor failure', err);
    }
  };

  // Voting action
  const handleVote = (roadmapId: string) => {
    if (hasVoted.includes(roadmapId)) return;
    setVotes(prev => ({
      ...prev,
      [roadmapId]: prev[roadmapId] + 1
    }));
    setHasVoted(prev => [...prev, roadmapId]);
  };

  // Filter videos based on category & search query
  const filteredVideos = videosList.filter((video) => {
    const matchesCategory = selectedCategory === 'All' || video.category === selectedCategory;
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          video.viral_style.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col relative overflow-x-hidden">
      
      {/* Dynamic Animated Cinematic Lights */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] orange-glow pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[20%] left-[-10%] w-[650px] h-[650px] purple-glow pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '11s' }}></div>
      <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] radial-gradient(circle,rgba(255,107,44,0.06)_0%,transparent_70%) pointer-events-none -z-10 animate-glow-slow"></div>

      {/* Primary Navigation Navbar */}
      <nav id="navbar" className="sticky top-0 z-50 h-20 shrink-0 flex items-center justify-between px-6 md:px-12 glass border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('home')}>
          <div className="w-10 h-10 bg-gradient-to-tr from-[#FF6B2C] to-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,107,44,0.4)] transition-transform hover:scale-105">
            <Video className="text-black w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="text-xl md:text-2xl font-bold tracking-tighter">
            VIRAL<span className="text-[#FF6B2C] text-shadow-neon">AI</span>
            <span className="text-white/30 font-light text-xs tracking-wider uppercase ml-1.5 hidden sm:inline-block">Shorts</span>
          </span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
          <button 
            onClick={() => setActiveTab('home')}
            className={`transition-colors py-1 relative ${activeTab === 'home' ? 'text-white border-b-2 border-neon-orange' : 'text-zinc-400 hover:text-white'}`}
          >
            Home
          </button>
          <button 
            onClick={() => setActiveTab('library')}
            className={`transition-colors py-1 relative ${activeTab === 'library' ? 'text-white border-b-2 border-neon-orange' : 'text-zinc-400 hover:text-white'}`}
          >
            Library
          </button>
          <button 
            onClick={() => setActiveTab('future')}
            className={`transition-colors py-1 relative ${activeTab === 'future' ? 'text-white border-b-2 border-neon-orange' : 'text-zinc-400 hover:text-white'}`}
          >
            Future Hub 🗳️
          </button>
          <button 
            onClick={() => setActiveTab('pricing')}
            className={`transition-colors py-1 relative ${activeTab === 'pricing' ? 'text-white border-b-2 border-neon-orange' : 'text-zinc-400 hover:text-white'}`}
          >
            Pricing
          </button>
          <button 
            onClick={() => setActiveTab('about')}
            className={`transition-colors py-1 relative ${activeTab === 'about' ? 'text-white border-b-2 border-neon-orange' : 'text-zinc-400 hover:text-white'}`}
          >
            Why Us
          </button>
          <button 
            onClick={() => setActiveTab('admin')}
            className={`transition-colors py-1 relative ${activeTab === 'admin' ? 'text-[#FF6B2C] border-b-2 border-[#FF6B2C]' : 'text-zinc-400 hover:text-[#FF6B2C]'}`}
          >
            Admin Panel
          </button>
        </div>

        {/* Action Button */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setActiveTab('library')} 
            className="bg-[#FF6B2C] hover:bg-[#ff8046] text-black px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-bold shadow-[0_0_20px_rgba(255,107,44,0.35)] hover:scale-105 active:scale-95 transition-all flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 fill-black" />
            <span>Go Premium</span>
          </button>
        </div>
      </nav>

      {/* Mobile Page Navigation Pill-Bar */}
      <div className="md:hidden flex justify-around items-center py-3 bg-[#0d0d0d] border-b border-white/5 overflow-x-auto whitespace-nowrap text-xs gap-3 px-4">
        <button onClick={() => setActiveTab('home')} className={`px-2.5 py-1 rounded-full ${activeTab === 'home' ? 'bg-[#FF6B2C] text-black font-semibold' : 'text-zinc-400'}`}>Home</button>
        <button onClick={() => setActiveTab('library')} className={`px-2.5 py-1 rounded-full ${activeTab === 'library' ? 'bg-[#FF6B2C] text-black font-semibold' : 'text-zinc-400'}`}>Library</button>
        <button onClick={() => setActiveTab('future')} className={`px-2.5 py-1 rounded-full ${activeTab === 'future' ? 'bg-[#FF6B2C] text-black font-semibold' : 'text-zinc-400'}`}>Roadmap</button>
        <button onClick={() => setActiveTab('pricing')} className={`px-2.5 py-1 rounded-full ${activeTab === 'pricing' ? 'bg-[#FF6B2C] text-black font-semibold' : 'text-zinc-400'}`}>Pricing</button>
        <button onClick={() => setActiveTab('about')} className={`px-2.5 py-1 rounded-full ${activeTab === 'about' ? 'bg-[#FF6B2C] text-black font-semibold' : 'text-zinc-400'}`}>About</button>
        <button onClick={() => setActiveTab('admin')} className={`px-2.5 py-1 rounded-full ${activeTab === 'admin' ? 'bg-[#FF6B2C]/20 text-[#FF6B2C] font-semibold' : 'text-zinc-400'}`}>Admin</button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 relative">

        {/* 1. HOME VIEW */}
        {activeTab === 'home' && (
          <section id="home-view" className="space-y-20 animate-fadeIn">
            
            {/* Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-8">
              <div className="lg:col-span-7 space-y-6 text-left">
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-[#FF6B2C]/10 border border-white/10 text-xs font-semibold uppercase tracking-wider text-[#FF6B2C]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>The Ultimate Creator Asset Engine</span>
                </div>
                
                <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-zinc-400">
                  Create Viral AI Shorts <br className="hidden sm:inline" />
                  <span className="text-[#FF6B2C] text-shadow-neon italic font-light">Without</span> Starting From Zero
                </h1>
                
                <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
                  Browse ready-made AI short video templates, preview the fast-paced retention style you like, unlock immediate access by completing a rapid check, and download creator-ready raw files instantly.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <button 
                    onClick={() => setActiveTab('library')}
                    className="bg-[#FF6B2C] text-black px-8 py-4 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-[0_0_30px_rgba(255,107,44,0.3)] hover:scale-105 transition-transform cursor-pointer"
                  >
                    <Compass className="w-5 h-5 stroke-[2.5]" />
                    <span>Explore Viral Videos ({initialVideos.length})</span>
                  </button>
                  <a 
                    href="#how-it-works"
                    className="px-8 py-4 rounded-xl font-bold border border-white/10 hover:bg-white/5 transition-colors text-center inline-block"
                  >
                    How It Works
                  </a>
                </div>

                {/* Proof badges */}
                <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-white/5">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="text-emerald-500 w-5 h-5" />
                    <span className="text-zinc-300 text-xs font-medium">Verified Raw Links</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Zap className="text-yellow-500 w-5 h-5" />
                    <span className="text-zinc-300 text-xs font-medium">95%+ retention layout</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="text-purple-400 w-5 h-5" />
                    <span className="text-zinc-300 text-xs font-medium">Optimized for Reels / TikTok</span>
                  </div>
                </div>
              </div>

              {/* Floating Media Showcase */}
              <div className="lg:col-span-5 relative mt-6 lg:mt-0">
                <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-[#FF6B2C] blur-[40px] opacity-15 rounded-full"></div>
                
                {/* Visual Glass Bento Frame */}
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="glass p-2.5 rounded-2xl rotate-2 translate-y-6 hover:rotate-0 hover:scale-105 transition-all duration-300">
                    <div className="aspect-[9/16] bg-zinc-900 rounded-xl overflow-hidden relative">
                      <img 
                        src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80" 
                        className="w-full h-full object-cover opacity-70"
                        alt="Cyberpunk Template"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] uppercase font-bold text-[#FF6B2C]">
                        AI News
                      </div>
                      <div className="absolute bottom-3 left-3 text-left">
                        <p className="text-[10px] text-zinc-400 uppercase font-bold">Style #04</p>
                        <h4 className="text-xs font-bold text-white truncate">Futuristic Host</h4>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-80">
                        <div className="w-10 h-10 rounded-full bg-[#FF6B2C]/25 backdrop-blur flex items-center justify-center border border-[#FF6B2C]/50 text-[#FF6B2C]">
                          <Play className="w-5 h-5 fill-[#FF6B2C]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass p-2.5 rounded-2xl -rotate-2 -translate-y-4 hover:rotate-0 hover:scale-105 transition-all duration-300">
                    <div className="aspect-[9/16] bg-zinc-900 rounded-xl overflow-hidden relative">
                      <img 
                        src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80" 
                        className="w-full h-full object-cover opacity-70"
                        alt="Football Clip"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute top-2.5 left-2.5 bg-[#FF6B2C] text-black text-[9px] font-black rounded px-1.5 py-0.5 uppercase tracking-tighter shadow-md">
                        Trending
                      </div>
                      <div className="absolute bottom-3 left-3 text-left">
                        <p className="text-[10px] text-zinc-400 uppercase font-bold">Style #11</p>
                        <h4 className="text-xs font-bold text-white truncate">Velocity CR7</h4>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Micro elements */}
                <div className="absolute -left-6 bottom-4 glass px-4 py-2 rounded-xl flex items-center space-x-2 text-xs shadow-xl animate-bounce">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                  <span className="font-bold">842 Active Creators</span>
                </div>
              </div>
            </div>

            {/* Quick Benefits Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10">
              <div className="glass p-6 rounded-2xl relative overflow-hidden group hover:border-[#FF6B2C]/30 transition-all duration-300">
                <div className="absolute top-[-20%] right-[-20%] w-24 h-24 bg-[#FF6B2C]/10 rounded-full blur-xl pointer-events-none"></div>
                <div className="w-12 h-12 rounded-xl bg-[#FF6B2C]/10 border border-[#FF6B2C]/20 flex items-center justify-center mb-4 text-[#FF6B2C]">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">Pre-Made Raw Timelines</h3>
                <p className="text-zinc-400 text-sm">
                  Skip setting up keyframes and subtitles. Load our video files or project styles directly in CapCut or Premiere for instant output.
                </p>
              </div>

              <div className="glass p-6 rounded-2xl relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
                <div className="absolute top-[-20%] right-[-20%] w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none"></div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 text-purple-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">High-Retention Blueprints</h3>
                <p className="text-zinc-400 text-sm">
                  Templates are carefully cataloged from short videos with more than 1M+ views. Every font spacing, zoom effect, and transition is built to hijack attention.
                </p>
              </div>

              <div className="glass p-6 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
                <div className="absolute top-[-20%] right-[-20%] w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">Instant CPA Unlock System</h3>
                <p className="text-zinc-400 text-sm">
                  No payment card required. Complete a simple validation step like downloading a partner app or answering a quick survey to claim your unique link.
                </p>
              </div>
            </div>

            {/* How It Works Section */}
            <div id="how-it-works" className="py-12 border-t border-white/5 space-y-12 scroll-mt-24">
              <div className="text-center space-y-3">
                <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B2C]">Streamlined 3-Step Flow</span>
                <h2 className="text-3xl md:text-4xl font-black">How Creators Get Viral Assets</h2>
                <p className="text-zinc-400 text-sm max-w-lg mx-auto">
                  Get high-converting clips up and running within three minutes. No monthly platform subscriptions necessary.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                {/* Visual connectors for desktop step-by-step styling */}
                <div className="hidden md:block absolute top-12 left-[25%] right-[25%] h-[1px] bg-gradient-to-r from-[#FF6B2C]/40 to-purple-500/40 -z-10"></div>

                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#111] border-2 border-dashed border-[#FF6B2C] flex items-center justify-center text-xl font-bold text-[#FF6B2C]">
                    1
                  </div>
                  <h3 className="text-lg font-bold">Select Style & Preview</h3>
                  <p className="text-zinc-400 text-sm max-w-xs mx-auto">
                    Browse the video grid filtered by category. Check the real views and watch the preview to judge visual retention rate.
                  </p>
                </div>

                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#111] border-2 border-dashed border-purple-500 flex items-center justify-center text-xl font-bold text-purple-400">
                    2
                  </div>
                  <h3 className="text-lg font-bold">Unlocking the Link</h3>
                  <p className="text-zinc-400 text-sm max-w-xs mx-auto">
                    Click Unlock. Choose one verified promotional partner offer. Complete the action to trigger automatic link verification.
                  </p>
                </div>

                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#111] border-2 border-dashed border-emerald-500 flex items-center justify-center text-xl font-bold text-emerald-400">
                    3
                  </div>
                  <h3 className="text-lg font-bold">Download Instantly</h3>
                  <p className="text-zinc-400 text-sm max-w-xs mx-auto">
                    The lock badge turns into a glowing download link. Click to fetch the raw source files, high-res audio track, and overlays.
                  </p>
                </div>
              </div>
            </div>

            {/* Creator CTA Banner */}
            <div className="glass-premium p-8 md:p-12 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between text-left gap-8">
              <div className="absolute inset-0 bg-[#FF6B2C]/5 pointer-events-none -z-10"></div>
              <div className="space-y-3">
                <h3 className="text-2xl md:text-3xl font-bold">Ready to Hack the TikTok Algorithm?</h3>
                <p className="text-zinc-300 text-sm max-w-xl leading-relaxed">
                  Join hundreds of agency owners and video editors scaling accounts using our high-retention formats. Over 10M cumulative views generated this month.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab('library')}
                className="shrink-0 bg-white text-black hover:bg-zinc-200 px-8 py-4 rounded-xl font-bold flex items-center space-x-2 transition-transform hover:scale-105"
              >
                <span>Browse The Video Library</span>
                <ChevronRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

          </section>
        )}

        {/* 2. LIBRARY VIEW */}
        {activeTab === 'library' && (
          <section id="library-view" className="space-y-8 animate-fadeIn">
            
            {/* Library Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-white/5">
              <div className="text-left space-y-1">
                <div className="flex items-center space-x-2">
                  <h2 className="text-3xl font-black">Creator Asset Library</h2>
                  <span className="bg-gradient-to-r from-[#FF6B2C]/20 to-purple-500/20 border border-[#FF6B2C]/30 text-[#FF6B2C] text-xs font-bold px-2 py-0.5 rounded-full">
                    {unlockedVideoIds.length} Unlocked
                  </span>
                </div>
                <p className="text-zinc-400 text-sm">
                  Filter by retention format or search specifically for overlays and viral animation assets.
                </p>
              </div>

              {/* Developer Bypass Sandbox Utility Banner */}
              <div className="glass px-4 py-2.5 rounded-xl border border-[#FF6B2C]/20 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B2C] animate-ping shrink-0"></span>
                  <span className="text-zinc-300">
                    <strong className="text-white">Sandbox Controller:</strong> Toggle simulations or unlock everything
                  </span>
                </div>
                <button 
                  onClick={handleBackdoorUnlockAll}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold px-3 py-1 rounded-lg border border-white/10 transition-colors"
                >
                  Bypass All locks 🔓
                </button>
              </div>
            </div>

            {/* Filter Search Bar Container */}
            <div className="flex flex-col lg:flex-row gap-4">
              
              {/* Flexible Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Search templates (e.g. 'Ronaldo', 'talking apple', 'split screen', 'neon')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-950/85 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-[#FF6B2C]/50 transition-colors placeholder:text-zinc-600"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center space-x-1 sm:space-x-2 bg-zinc-950/85 p-1 border border-white/5 rounded-xl overflow-x-auto">
                {['All', 'AI Videos', 'Football Clips', 'Talking Objects', 'Viral Shorts'].map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === category 
                        ? 'bg-[#FF6B2C] text-black font-bold shadow-md shadow-neon-orange/10' 
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Videos Responsive Grid */}
            {filteredVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredVideos.map((video) => {
                  const unlocked = unlockedVideoIds.includes(video.id);

                  return (
                    <div 
                      key={video.id} 
                      className="glass group flex flex-col rounded-2xl overflow-hidden hover:border-[#FF6B2C]/30 transition-all duration-300 relative"
                    >
                      {/* Thumbnail frame */}
                      <div className="aspect-[3/4] bg-zinc-900 rounded-t-2xl overflow-hidden relative">
                        <img 
                          src={video.thumbnail_url} 
                          alt={video.title} 
                          className="w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                        {/* Top corner metrics info badge */}
                        <div className="absolute top-3 left-3 flex flex-col space-y-1">
                          <span className="bg-black/75 backdrop-blur-sm text-[9px] font-bold text-[#FF6B2C] px-2 py-0.5 rounded uppercase tracking-wider">
                            {video.category}
                          </span>
                        </div>

                        {/* Lock / Unlock Overlay label */}
                        <div className="absolute top-3 right-3">
                          {unlocked ? (
                            <span className="bg-emerald-500 text-black text-[9px] font-black rounded px-2 py-0.5 uppercase tracking-wide flex items-center space-x-1 shadow-md">
                              <Unlock className="w-2.5 h-2.5" />
                              <span>Unlocked</span>
                            </span>
                          ) : (
                            <span className="bg-black/75 backdrop-blur-sm text-[9px] font-black text-rose-400 border border-rose-500/30 rounded px-2 py-0.5 uppercase tracking-wide flex items-center space-x-1 shadow-md">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Locked</span>
                            </span>
                          )}
                        </div>

                        {/* Duration and views helper pills */}
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center text-[10px] text-zinc-300 font-medium">
                          <span className="bg-zinc-950/80 px-2 py-0.5 rounded flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-[#FF6B2C]" />
                            <span>{video.duration}</span>
                          </span>
                          <span className="bg-zinc-950/80 px-2 py-0.5 rounded flex items-center space-x-1">
                            <Eye className="w-3 h-3 text-[#FF6B2C]" />
                            <span>{video.views_badge}</span>
                          </span>
                        </div>

                        {/* Centered Trigger Action Overlay */}
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 space-y-3">
                          <button 
                            onClick={() => setPreviewVideo(video)}
                            className="bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg active:scale-95 transition-transform"
                          >
                            <Play className="w-3.5 h-3.5 fill-black" />
                            <span>Quick Preview</span>
                          </button>
                        </div>
                      </div>

                      {/* Video details body */}
                      <div className="p-4 flex-grow flex flex-col justify-between text-left space-y-3">
                        <div className="space-y-1.5">
                          <h3 className="font-bold text-sm leading-tight text-white group-hover:text-[#FF6B2C] transition-colors line-clamp-1">
                            {video.title}
                          </h3>
                          <p className="text-zinc-400 text-xs line-clamp-2 leading-relaxed">
                            {video.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-white/5 space-y-2">
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase font-semibold">
                            <span>Viral Layout:</span>
                            <span className="text-zinc-200 truncate max-w-[150px] font-bold">{video.viral_style}</span>
                          </div>

                          {unlocked ? (
                            <a 
                              href={`/api/download?video_id=${video.id}`}
                              target="_self"
                              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-colors shadow-lg shadow-emerald-500/10"
                            >
                              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Download Source Assets</span>
                            </a>
                          ) : (
                            <button 
                              onClick={() => handleOpenUnlock(video)}
                              className="w-full bg-[#FF6B2C]/10 border border-[#FF6B2C]/30 hover:bg-[#FF6B2C]/20 text-[#FF6B2C] font-black text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-colors"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Unlock To Download</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass p-12 text-center rounded-2xl max-w-md mx-auto space-y-4">
                <AlertCircle className="w-12 h-12 text-zinc-500 mx-auto" />
                <h3 className="text-lg font-bold">No Matching Templates Found</h3>
                <p className="text-zinc-400 text-xs">
                  We couldn't find any premium styles matching "{searchQuery}". Try editing the keyword search filters.
                </p>
                <button 
                  onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                  className="px-4 py-2 bg-[#FF6B2C] text-black text-xs font-bold rounded-lg"
                >
                  Reset Library Filters
                </button>
              </div>
            )}

            {/* Micro FAQ indicator */}
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-[#FF6B2C]" />
                <span>Need help with formats?CapCut mobile imports are 100% supported out of the box.</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider">
                Support Line: ouradasaid18@gmail.com
              </span>
            </div>

          </section>
        )}

        {/* 3. FUTURE/ROADMAP VIEW */}
        {activeTab === 'future' && (
          <section id="future-view" className="space-y-8 animate-fadeIn text-left max-w-4xl mx-auto">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-xs font-bold tracking-wide text-purple-400 rounded-full mb-2">
                <Vote className="w-3.5 h-3.5" />
                <span>Creator Content Voting Hub</span>
              </div>
              <h2 className="text-3xl font-black">Demand Upcoming Viral Formats</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                As a community-directed short-form library, we upload 5 new template styles weekly. Vote on what we should generate next to help power your creator workflow!
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { id: 'football-velocity-cap', title: 'Champions League Super Slow-Mo Velocity Zoom Cuts', desc: 'Slick high speed zoom templates paired with intense drum sync overlays for football video editors.', current: votes['football-velocity-cap'], tag: 'Football Clips' },
                { id: 'reddit-minecraft', title: 'Reddit TTS Narrator Stack with Clean Block Parkour', desc: 'Multi-screen split templates mapping AI narration, automated subtitles, and flawless movement.', current: votes['reddit-minecraft'], tag: 'Viral Shorts' },
                { id: 'finance-talking-anim', title: 'Live Animated Crypto Candles & Talking Sliced Coins', desc: 'Talking materials template featuring speaking Ether and Bitcoin symbols reacting on crypto chart slides.', current: votes['finance-talking-anim'], tag: 'Talking Objects' },
                { id: 'gym-motivation-ai', title: 'Aggressive Gym AI Motivation Overlay with Vintage Matte', desc: 'Washed-out cinema layout containing powerful AI voicetrack and epic font templates.', current: votes['gym-motivation-ai'], tag: 'AI Videos' },
                { id: 'scifi-voicebreak', title: 'Ethereal Sci-Fi Voicebreak Host Overlay template', desc: 'Virtual sci-fi host wearing reflective helmet with robotic frequency overlays.', current: votes['scifi-voicebreak'], tag: 'AI Videos' },
              ].map((item) => {
                const voted = hasVoted.includes(item.id);
                return (
                  <div key={item.id} className="glass p-5 rounded-2xl flex items-center justify-between gap-6 hover:border-[#FF6B2C]/20 transition-colors">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-white/5 text-[9px] text-[#FF6B2C] uppercase font-bold tracking-wider">
                          {item.tag}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white truncate">{item.title}</h4>
                      <p className="text-zinc-400 text-xs leading-relaxed line-clamp-1">{item.desc}</p>
                    </div>

                    <div className="text-right shrink-0 space-y-2">
                      <div className="text-xs text-zinc-400 font-medium">
                        <strong className="text-white text-base font-bold mr-1">{item.current}</strong> votes
                      </div>
                      
                      {voted ? (
                        <span className="inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-4 py-2 rounded-lg">
                          Voted! ✓
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleVote(item.id)}
                          className="bg-[#FF6B2C] hover:bg-[#ff8046] text-black font-black text-xs px-4 py-2 rounded-lg flex items-center space-x-1.5 hover:scale-105 active:scale-95 transition-all"
                        >
                          <Vote className="w-3.5 h-3.5" />
                          <span>Cast Vote</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-zinc-950 p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="text-[#FF6B2C] w-5 h-5" />
                <h4 className="font-bold text-sm">Have a custom format requests?</h4>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                If you have custom Google Drive references or link references of videos that generated millions of views that you want parsed into creator edit formats, email your reference with title guidelines and raw files to: 
                <strong className="text-white ml-1">ouradasaid18@gmail.com</strong>.
              </p>
            </div>
          </section>
        )}

        {/* 4. PRICING VIEW */}
        {activeTab === 'pricing' && (
          <section id="pricing-view" className="space-y-12 animate-fadeIn max-w-5xl mx-auto">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B2C]">Simple & Fair Licensing</span>
              <h2 className="text-3xl md:text-4xl font-black">Pricing That Fits Your Scale</h2>
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                No automatic credit card recurrings. Complete offers to unlock anything for free, or upgrade for bulk batch downloads.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Free Unlock Player */}
              <div className="glass p-6 rounded-2xl text-left flex flex-col justify-between space-y-6 relative border-white/5">
                <div className="space-y-3">
                  <h3 className="text-lg font-bold uppercase tracking-wider text-zinc-400">Standard Unlock</h3>
                  <div className="text-2xl font-black text-slate-100">$0 <span className="text-xs text-zinc-500 font-medium">/ complete offer</span></div>
                  <p className="text-zinc-400 text-xs">
                    Perfect for occasional independent creators pushing raw reels daily.
                  </p>
                  <ul className="space-y-2 pt-4 border-t border-white/5 text-xs text-zinc-300">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="text-emerald-500 w-4 h-4 shrink-0" />
                      <span>Unlock any template individually</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="text-emerald-500 w-4 h-4 shrink-0" />
                      <span>Access raw MP4 preview style</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="text-emerald-500 w-4 h-4 shrink-0" />
                      <span>Standard CPA network verification</span>
                    </li>
                  </ul>
                </div>
                <button 
                  onClick={() => setActiveTab('library')}
                  className="w-full bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white font-bold text-xs py-3 rounded-xl transition-colors"
                >
                  Start Unlocking Free
                </button>
              </div>

              {/* Creator Pro - Highlighted */}
              <div className="glass p-6 rounded-2xl text-left flex flex-col justify-between space-y-6 relative border-neon-orange/40 shadow-xl shadow-orange-500/5 bg-gradient-to-b from-[#FF6B2C]/5 via-transparent to-transparent">
                <div className="absolute top-3 right-3 bg-[#FF6B2C] text-black text-[9px] font-black rounded px-2.5 py-0.5 uppercase tracking-wide">
                  Popular
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-lg font-bold uppercase tracking-wider text-[#FF6B2C]">Creator Pro</h3>
                  <div className="text-2xl font-black text-white">$19 <span className="text-xs text-zinc-500 font-medium">/ one-time buy</span></div>
                  <p className="text-zinc-400 text-xs">
                    For active editors scaling multi-brand accounts requiring rapid templates bulk download.
                  </p>
                  <ul className="space-y-2 pt-4 border-t border-white/5 text-xs text-zinc-200">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="text-[#FF6B2C] w-4 h-4 shrink-0" />
                      <span>Instant unlock of all 840+ items</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="text-[#FF6B2C] w-4 h-4 shrink-0" />
                      <span>Raw assets batch downloads link</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="text-[#FF6B2C] w-4 h-4 shrink-0" />
                      <span>Exclusive CapCut timeline formats</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="text-[#FF6B2C] w-4 h-4 shrink-0" />
                      <span>Priority email support tickets</span>
                    </li>
                  </ul>
                </div>
                <button 
                  onClick={() => alert("Creator Pro Licensing:\n\nFor custom licensing or instant premium token requests, email our team at: ouradasaid18@gmail.com")}
                  className="w-full bg-[#FF6B2C] text-black font-black text-xs py-3 rounded-xl hover:scale-105 transition-transform"
                >
                  Buy Pro Token
                </button>
              </div>

              {/* Viral Agency Plan */}
              <div className="glass p-6 rounded-2xl text-left flex flex-col justify-between space-y-6 relative border-white/5">
                <div className="space-y-3">
                  <h3 className="text-lg font-bold uppercase tracking-wider text-purple-400">Viral Agency</h3>
                  <div className="text-2xl font-black text-white">$39 <span className="text-xs text-zinc-500 font-medium">/ one-time buy</span></div>
                  <p className="text-zinc-400 text-xs">
                    Built for production agencies running and outsourcing to 20+ custom editors.
                  </p>
                  <ul className="space-y-2 pt-4 border-t border-white/5 text-xs text-zinc-300">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="text-purple-400 w-4 h-4 shrink-0" />
                      <span>All templates unlocked + upcoming updates</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="text-purple-400 w-4 h-4 shrink-0" />
                      <span>Unlimited multi-user seats</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="text-purple-400 w-4 h-4 shrink-0" />
                      <span>High payout offer wall integrations</span>
                    </li>
                  </ul>
                </div>
                <button 
                  onClick={() => alert("Agency Pro Licensing:\n\nContact support at ouradasaid18@gmail.com for commercial seats and whitelabel solutions.")}
                  className="w-full bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white font-bold text-xs py-3 rounded-xl transition-colors"
                >
                  Contact Sales Team
                </button>
              </div>
            </div>
            
            <div className="text-center text-zinc-500 text-xs pt-4 flex items-center justify-center space-x-2">
              <ShieldCheck className="text-emerald-500 w-4 h-4" />
              <span>Payments secured. Refund guaranteed if any raw assets fails to load.</span>
            </div>
          </section>
        )}

        {/* 5. ABOUT VIEW */}
        {activeTab === 'about' && (
          <section id="about-view" className="space-y-8 animate-fadeIn text-left max-w-3xl mx-auto">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B2C]">Our Core Mission</span>
              <h2 className="text-3xl font-black">Hacking Attention Metrics Since 2024</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Short-form video is no longer about high budget cameras or beautiful color gradings. It is an algorithmic metrics game built on <strong>First-3-Second retention hooks</strong>, subtitle pacing, and clean, high-intensity sound cues.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="glass p-5 rounded-2xl space-y-2">
                <span className="font-bold text-white text-sm block">Why AI Talking Objects Outperform?</span>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Objects like an apple or coffee cup speaking with high-pitched cartoon voice tracks trigger instant novelty. Users stay focused, drastically escalating click-through rates.
                </p>
              </div>
              <div className="glass p-5 rounded-2xl space-y-2">
                <span className="font-bold text-white text-sm block">Split Screen Mind-Wash Gameplay</span>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Stacking a high-intensity Minecraft parkour track or GTA stunt beneath news or podcast reels doubles user processing, locking them to stay until the end of the voice loop.
                </p>
              </div>
            </div>

            <div className="glass p-6 rounded-3xl space-y-4">
              <h3 className="font-bold text-[#FF6B2C]">The Team Behind Viral AI Shorts Library</h3>
              <p className="text-zinc-300 text-xs leading-relaxed">
                We are a small, hyper-focused crew of conversion-rate optimization (CRO) specialists, motion designers and attention hackers based globally. We identify the highest-trending formats on TikTok/Instagram daily and translate them into ready-to-load CapCut & Premiere sequences.
              </p>
              <div className="pt-2 border-t border-white/5 flex justify-between text-[11px] text-zinc-500">
                <span>Contact: ouradasaid18@gmail.com</span>
                <span>Active Database: Firestore JSON Engine</span>
              </div>
            </div>
          </section>
        )}

        {/* 6. ADMIN VIEW */}
        {activeTab === 'admin' && (
          <section id="admin-view" className="space-y-8 animate-fadeIn text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div className="space-y-1">
                <h2 className="text-3xl font-black tracking-tight">System Performance Console</h2>
                <p className="text-zinc-400 text-sm">
                  Live traffic metrics, conversion-focused analytics, offer click-through triggers, and template unlock records.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button 
                  onClick={loadAdminStats}
                  className="bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${adminLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Metrics</span>
                </button>
              </div>
            </div>

            {/* Core Stats Bento Block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="glass p-5 rounded-2xl space-y-2 relative overflow-hidden">
                <div className="absolute top-4 right-4 text-zinc-600"><Compass className="w-5 h-5" /></div>
                <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Total Unique Visits</p>
                <div className="text-3xl font-black text-white">{stats?.totalVisits ?? '...'}</div>
                <p className="text-[10px] text-zinc-500">Page loads tracked on index routing</p>
              </div>

              <div className="glass p-5 rounded-2xl space-y-2 relative overflow-hidden">
                <div className="absolute top-4 right-4 text-zinc-600"><MousePointerClick className="w-5 h-5" /></div>
                <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Total Offer Clicks</p>
                <div className="text-3xl font-black text-white">{stats?.totalOfferClicks ?? '...'}</div>
                <p className="text-[10px] text-[#FF6B2C]">User redirection hits on CPA wall</p>
              </div>

              <div className="glass p-5 rounded-2xl space-y-2 relative overflow-hidden">
                <div className="absolute top-4 right-4 text-[#FF6B2C]"><ShieldCheck className="w-5 h-5 text-shadow-neon" /></div>
                <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Total Unlocks</p>
                <div className="text-3xl font-black text-[#FF6B2C] text-shadow-neon">{stats?.totalUnlocks ?? '...'}</div>
                <p className="text-[10px] text-zinc-500">Video download files released</p>
              </div>

              <div className="glass p-5 rounded-2xl space-y-2 relative overflow-hidden border-[#FF6B2C]/20 bg-gradient-to-tr from-[#FF6B2C]/5 to-transparent">
                <div className="absolute top-4 right-4 text-purple-400"><TrendingUp className="w-5 h-5" /></div>
                <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Unlock Rate (%)</p>
                <div className="text-3xl font-black text-white">{stats?.conversionRate ?? '...'}%</div>
                <p className="text-[10px] text-zinc-500">Unlock conversions per offer redirects</p>
              </div>
            </div>

            {/* Sandbox Global Backdoor Settings Config */}
            <div className="glass p-6 rounded-2xl border border-[#FF6B2C]/20 text-left space-y-4">
              <div className="flex items-center space-x-2">
                <Settings className="text-[#FF6B2C] w-5 h-5" />
                <h3 className="font-bold text-sm">CPA Offer Feed Integration & Testing Settings</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-medium">Testing Mode Toggle:</span>
                    <button 
                      onClick={() => {
                        setIsTestMode(!isTestMode);
                        alert(`Sandbox Update:\n\nTesting Mode is now set to ${!isTestMode ? 'ENABLED (Auto-unlock simulation active)' : 'DISABLED (Real check2.php responses verified)'}`);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-black tracking-wide text-[10px] uppercase transition-all ${
                        isTestMode 
                          ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/10' 
                          : 'bg-zinc-800 text-zinc-400 border border-white/5'
                      }`}
                    >
                      {isTestMode ? 'Enabled (Simulated)' : 'Disabled (Real Feed)'}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    When <strong className="text-white">Enabled</strong>, the lead checker route overrides CPA verification and unlocks videos immediately upon offer selection so you can test download files and views flawlessly.
                  </p>
                </div>

                <div className="space-y-1.5 bg-zinc-950 p-3.5 rounded-xl border border-white/5">
                  <span className="text-zinc-400 block font-bold text-[10px] uppercase tracking-wider mb-1">Active Credentials</span>
                  <div className="text-[10px] space-y-0.5 font-mono text-zinc-500">
                    <div>CPA_USER_ID = <span className="text-white">344483</span></div>
                    <div>CPA_PUBLIC_KEY = <span className="text-white">c1781d54af578f...</span></div>
                    <div>CPA_OFFERS_API_KEY = <span className="text-[#FF6B2C]">8d6662...9bc92eb31b</span></div>
                    <div>CPA_BASE_URL = <span className="text-white">cloudfront.net</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Logs (Unlocks & Clicks Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Recent Unlocks */}
              <div className="glass p-5 rounded-2xl space-y-4">
                <div className="flex items-center space-x-2 text-[#FF6B2C]">
                  <Unlock className="w-4 h-4 text-shadow-neon" />
                  <h3 className="font-bold text-sm">Recent Unlocks Activity Log</h3>
                </div>

                {stats && stats.recentUnlocks.length > 0 ? (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {stats.recentUnlocks.map((log, index) => (
                      <div key={index} className="bg-zinc-950 border border-white/5 p-3 rounded-lg flex items-center justify-between text-xs">
                        <div className="space-y-0.5 text-left min-w-0 flex-1 pr-4">
                          <h4 className="font-bold text-white truncate">{log.title}</h4>
                          <span className="text-[10px] text-zinc-500 font-mono">IP: {log.ip}</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-medium whitespace-nowrap bg-emerald-500/10 px-2 py-0.5 rounded">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-xs py-10 text-center">No video downloads unlocked yet.</p>
                )}
              </div>

              {/* Recent Offer Clicks */}
              <div className="glass p-5 rounded-2xl space-y-4">
                <div className="flex items-center space-x-2 text-purple-400">
                  <MousePointerClick className="w-4 h-4" />
                  <h3 className="font-bold text-sm">Recent CPA Offers Performance</h3>
                </div>

                {stats && stats.recentClicks.length > 0 ? (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {stats.recentClicks.map((log, index) => (
                      <div key={index} className="bg-zinc-950 border border-white/5 p-3 rounded-lg flex items-center justify-between text-xs">
                        <div className="space-y-0.5 text-left min-w-0 flex-1 pr-4">
                          <h4 className="font-bold text-white truncate">{log.title}</h4>
                          <span className="text-[10px] text-zinc-400 font-medium block truncate">Offer: {log.offer_title}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">IP: {log.ip}</span>
                        </div>
                        <span className="text-[10px] text-purple-400 font-medium whitespace-nowrap bg-purple-500/10 px-2 py-0.5 rounded">
                          {new Date(log.clicked_at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-xs py-10 text-center">No CPA offers clicked yet.</p>
                )}
              </div>
            </div>

            {/* Most Unlocked Videos ranking list */}
            <div className="glass p-5 rounded-2xl space-y-4 text-left">
              <div className="flex items-center space-x-2 text-emerald-400">
                <BarChart2 className="w-4 h-4" />
                <h3 className="font-bold text-sm">Top Demanded Creator Templates</h3>
              </div>
              {stats && stats.mostUnlockedVideos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.mostUnlockedVideos.map((log, index) => (
                    <div key={log.video_id} className="bg-zinc-950/80 p-3.5 rounded-xl border border-white/5 flex items-center justify-between">
                      <div className="flex items-center space-x-3 text-sm">
                        <span className="text-zinc-600 font-mono text-xl font-bold">#0{index + 1}</span>
                        <span className="text-zinc-200 font-bold truncate max-w-[200px] md:max-w-xs">{log.title}</span>
                      </div>
                      <span className="bg-[#FF6B2C]/10 text-[#FF6B2C] border border-[#FF6B2C]/20 text-xs font-black min-w-8 py-1 px-2.5 rounded-lg text-center">
                        {log.count} unlocks
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 text-xs py-6 text-center">No template rank data accumulated yet. Unlock standard clips in the Library to fuel telemetry.</p>
              )}
            </div>

          </section>
        )}

      </main>

      {/* FOOTER SECTION */}
      <footer className="mt-auto glass border-t border-white/5 py-12 px-6 md:px-12 text-zinc-500 text-xs bg-black/40 text-left">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <span className="text-lg font-bold tracking-tighter text-white">
              VIRAL<span className="text-[#FF6B2C] text-shadow-neon">AI</span>
            </span>
            <p className="text-zinc-500 max-w-xs leading-relaxed">
              Premium short-form video template library for algorithm retention exploitation. Powered by verified custom assets.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Navigation</h4>
            <div className="flex flex-col space-y-2">
              <button onClick={() => setActiveTab('home')} className="hover:text-white text-left transition-colors">Home Landing</button>
              <button onClick={() => setActiveTab('library')} className="hover:text-white text-left transition-colors">Templates Library</button>
              <button onClick={() => setActiveTab('future')} className="hover:text-white text-left transition-colors">Roadmap Voting</button>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Premium Licenses</h4>
            <div className="flex flex-col space-y-2">
              <button onClick={() => setActiveTab('pricing')} className="hover:text-white text-left transition-colors">Creator Pro Plan</button>
              <button onClick={() => setActiveTab('pricing')} className="hover:text-white text-left transition-colors">Agency licensing</button>
              <span className="text-zinc-600">No recurring billing</span>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider text-left">Legal and Support</h4>
            <p className="text-zinc-500 leading-relaxed text-left">
              Content creator tools. All preview media clips are loaded for educational styling references inside a sandbox. 
              <br className="my-1" />
              Email support: <strong className="text-zinc-300">ouradasaid18@gmail.com</strong>
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-600 gap-4">
          <span>© 12026 Viral AI Shorts Library. All rights reserved. Built with Next-to-Vite App framework.</span>
          <div className="flex space-x-4">
            <span className="hover:text-white cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer">SaaS Terms of Service</span>
          </div>
        </div>
      </footer>


      {/* MODAL 1: PREVIEW MODAL */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          {/* Modal Overlay Close backdrop */}
          <div className="absolute inset-0" onClick={() => setPreviewVideo(null)}></div>
          
          <div className="glass w-full max-w-2xl rounded-3xl overflow-hidden relative border border-white/10 z-10 text-left bg-[#080808] animate-zoomIn shadow-2xl">
            
            {/* Modal Title bar */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="bg-rose-500/15 text-rose-400 border border-rose-500/25 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                  {previewVideo.category}
                </span>
                <h3 className="font-bold text-base text-white truncate max-w-[300px] md:max-w-md">
                  {previewVideo.title}
                </h3>
              </div>
              <button 
                onClick={() => setPreviewVideo(null)}
                className="text-zinc-400 hover:text-white font-bold w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Video Preview Frame */}
            <div className="relative aspect-video bg-zinc-950 flex items-center justify-center border-b border-white/5">
              <video 
                src={previewVideo.preview_url}
                controls
                autoPlay
                className="w-full h-full object-contain"
                poster={previewVideo.thumbnail_url}
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Template Information Detail Summary */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-zinc-500 block">Category</span>
                  <span className="font-bold text-zinc-200">{previewVideo.category}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-zinc-500 block">Duration</span>
                  <span className="font-bold text-zinc-200">{previewVideo.duration}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-zinc-500 block">Style Format</span>
                  <span className="font-bold text-zinc-200">{previewVideo.viral_style}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-zinc-500 block">Views Potential</span>
                  <span className="font-bold text-emerald-400">{previewVideo.views_badge}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-zinc-500 text-xs block">Description & Script Tip:</span>
                <p className="text-zinc-300 text-xs leading-relaxed">
                  {previewVideo.description} Use high density visual captions and sync transition sounds directly on CapCut tracking layers to exploit algorithm flow.
                </p>
              </div>

              {/* Download Action Footer */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-white/5">
                <button 
                  onClick={() => setPreviewVideo(null)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-zinc-400 hover:text-white font-bold transition-all text-center"
                >
                  Close Preview
                </button>

                {unlockedVideoIds.includes(previewVideo.id) ? (
                  <a 
                    href={`/api/download?video_id=${previewVideo.id}`}
                    target="_self"
                    className="w-full sm:flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs py-3 rounded-xl flex items-center justify-center space-x-1.5 transition-colors shadow-lg shadow-emerald-500/10 text-center"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download Raw Assets</span>
                  </a>
                ) : (
                  <button 
                    onClick={() => {
                      setPreviewVideo(null);
                      handleOpenUnlock(previewVideo);
                    }}
                    className="w-full sm:flex-1 bg-[#FF6B2C] hover:bg-[#ff8046] text-black font-black text-xs py-3 rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-[0_0_20px_rgba(255,107,44,0.3)]"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Unlock Download access</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}


      {/* MODAL 2: LOCK VERIFICATION INTEGRATOR (OFFER WALL) */}
      {unlockVideoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          {/* Modal Overlay Close backdrop */}
          <div className="absolute inset-0" onClick={() => setUnlockVideoItem(null)}></div>
          
          <div className="glass w-full max-w-lg rounded-3xl border border-white/15 p-6 md:p-8 space-y-6 relative z-10 text-left bg-[#060606] shadow-2xl animate-zoomIn max-h-[90vh] overflow-y-auto">
            
            {/* Header branding details inside modal */}
            <div className="text-center space-y-2 relative">
              <button 
                onClick={() => setUnlockVideoItem(null)}
                className="absolute right-0 top-0 text-zinc-500 hover:text-white text-xs w-7 h-7 bg-white/5 rounded-full flex items-center justify-center"
              >
                ✕
              </button>

              <div className="w-14 h-14 bg-[#FF6B2C]/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-[#FF6B2C]/25 text-[#FF6B2C]">
                <Lock className="w-6 h-6 text-shadow-neon" />
              </div>
              
              <h2 className="text-xl md:text-2xl font-black text-white">Unlock Download Access</h2>
              <p className="text-zinc-400 text-xs leading-relaxed max-w-sm mx-auto">
                Complete one rapid sponsor offer below from our official verification feed to automatically release instant creator-ready assets.
              </p>
            </div>

            {/* Video Identity Preview */}
            <div className="p-3 bg-zinc-950 rounded-xl border border-white/5 flex items-center space-x-3 text-xs text-zinc-300">
              <img 
                src={unlockVideoItem.thumbnail_url} 
                className="w-12 h-16 object-cover rounded-lg" 
                alt="" 
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white truncate">{unlockVideoItem.title}</h4>
                <div className="flex items-center space-x-2 text-[10px] text-[#FF6B2C] font-semibold mt-1">
                  <span>{unlockVideoItem.category}</span>
                  <span>•</span>
                  <span>{unlockVideoItem.viral_style}</span>
                </div>
              </div>
            </div>

            {/* Dynamic CPA Offers Stack */}
            <div className="space-y-3">
              {loadingOffers ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-t-[#FF6B2C] border-zinc-800 animate-spin mx-auto"></div>
                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Syncing Premium Sponsors...</p>
                </div>
              ) : offers.length > 0 ? (
                <div className="space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">Select One Available Offer:</span>
                  {offers.map((offer) => {
                    const isClicked = clickedOfferIds.includes(offer.campaign_id);
                    return (
                      <div 
                        key={offer.campaign_id}
                        onClick={() => handleOfferClick(offer)}
                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between group cursor-pointer text-left ${
                          isClicked 
                            ? 'bg-[#FF6B2C]/5 border-[#FF6B2C]/25 hover:bg-[#FF6B2C]/10' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                        }`}
                      >
                        <div className="space-y-1 flex-1 pr-4 min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-[#FF6B2C] transition-colors truncate flex items-center space-x-1.5 animate-pulse">
                            <ExternalLink className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span>{offer.anchor}</span>
                          </div>
                          <div className="text-[10px] text-zinc-400 line-clamp-1">
                            {offer.conversion}
                          </div>
                        </div>

                        <button 
                          className={`shrink-0 text-[10px] font-black px-3.5 py-1.5 rounded-lg transition-colors uppercase ${
                            isClicked 
                              ? 'bg-zinc-800 text-[#FF6B2C] border border-[#FF6B2C]/25' 
                              : 'bg-[#FF6B2C] hover:bg-[#ff8046] text-black font-black'
                          }`}
                        >
                          {isClicked ? 'Restart' : 'START'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-zinc-900 rounded-xl text-center text-zinc-500 text-xs">
                  No localized advertiser offers available for your region. Try utilizing development testing bypass.
                </div>
              )}
            </div>

            {/* Simulated test button wrapper */}
            {isTestMode && (
              <div className="p-3 bg-[#FF6B2C]/10 rounded-xl border border-[#FF6B2C]/25 space-y-2 text-xs">
                <div className="font-bold text-white flex items-center space-x-1">
                  <ShieldCheck className="w-4 h-4 text-[#FF6B2C]" />
                  <span>Interactive Development Sandbox Bypass</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Excellent! Simulating offer completion is active. You can completely bypass redirect tracking and instantly check unlock statuses below with one click.
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => checkLeadCompletion(true)}
                    className="flex-1 bg-emerald-500 font-bold text-black py-1.5 rounded-lg hover:bg-emerald-600 transition-colors text-center text-[10px] uppercase"
                  >
                    Simulate Offer Completed ✅
                  </button>
                </div>
              </div>
            )}

            {/* Live Gateway Monitor Verification status */}
            <div className="pt-3 border-t border-white/5 text-center space-y-2">
              <div className="flex items-center justify-center space-x-2 text-[10px] uppercase tracking-wider font-extrabold">
                {isPolling ? (
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-ping"></span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-zinc-650"></span>
                )}
                <span className={pollSuccess ? 'text-emerald-400 text-shadow-neon' : isPolling ? 'text-yellow-400' : 'text-zinc-500'}>
                  {pollingStatusText}
                </span>
              </div>
              
              {isPolling && (
                <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#FF6B2C] h-full w-[60%] rounded-full animate-pulse transition-all" style={{ animationDuration: '1.5s' }}></div>
                </div>
              )}

              <p className="text-[9px] text-zinc-600">
                Polling updates every 15 seconds. Please do not close this window while offer completes.
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
