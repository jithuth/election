"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard state
  // Analytics State
  const [visitorLogs, setVisitorLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('channels'); 
  const [channels, setChannels] = useState([]);
  const [chatCount, setChatCount] = useState(0);
  const [simulatedViewers, setSimulatedViewers] = useState(0);

  const [settings, setSettings] = useState({
    min_viewers: 1000,
    max_viewers: 5000,
    header_ad: '',
    sidebar_ad: ''
  });

  // New Channel State
  const [newChannel, setNewChannel] = useState({ name: '', youtube_id: '', state: 'Kerala', is_active: true });
  // Edit Channel State
  const [editingChannel, setEditingChannel] = useState(null);

  // Scraper State
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState('');
  const [autoScrape, setAutoScrape] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  // Load autoScrape state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('autoScrapeActive');
    if (saved === 'true') {
      setAutoScrape(true);
    }
  }, []);

  // Save autoScrape state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('autoScrapeActive', autoScrape);
  }, [autoScrape]);

  const runScraper = async () => {
    setScraping(true);
    setScrapeStatus('Scraping in progress...');
    try {
      const res = await fetch('/api/admin/elections/scrape-now', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setScrapeStatus(`Success! Updated ${data.updated} constituencies.`);
      } else {
        setScrapeStatus('Error: ' + data.error);
      }
    } catch (e) {
      setScrapeStatus('Failed to run scraper.');
    }
    setScraping(false);
  };

  // Auto-scraper countdown logic
  useEffect(() => {
    let timer;
    if (autoScrape) {
      if (timeLeft > 0) {
        timer = setInterval(() => {
          setTimeLeft(prev => prev - 1);
        }, 1000);
      } else {
        runScraper();
        setTimeLeft(300);
      }
    } else {
      setTimeLeft(300); // Reset if stopped
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoScrape, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Simulated live chart updates
  useEffect(() => {
    if (activeTab === 'analytics') {
      const interval = setInterval(() => {
        setSimulatedViewers(settings.min_viewers + Math.floor(Math.random() * (settings.max_viewers - settings.min_viewers)));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTab, settings]);

  // Check auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
      if (session) fetchData();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchData();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoginError(error.message);
    }
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Fetch Data for Admin
  const fetchData = async () => {
    // Fetch channels
    const { data: chData, error: chErr } = await supabase.from('channels').select('*').order('created_at', { ascending: true });
    if (chErr) {
      console.error("Channels fetch error:", chErr);
      alert("Error loading channels: " + chErr.message);
    } else if (chData) {
      setChannels(chData);
    }

    // Fetch settings
    const { data: stData, error: stErr } = await supabase.from('site_settings').select('*').eq('id', 'global').single();
    if (stErr && stErr.code !== 'PGRST116') { // PGRST116 is 'row not found'
      console.error("Settings fetch error:", stErr);
    } else if (stData) {
      setSettings(stData);
    }

    // Fetch chat count
    const { count, error: countErr } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true });
    if (count !== null) setChatCount(count);

    // Fetch visitor logs
    const { data: logsData } = await supabase.from('visitor_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (logsData) setVisitorLogs(logsData);
  };

  // Live Polling for Analytics
  useEffect(() => {
    if (activeTab === 'analytics') {
      const interval = setInterval(fetchData, 10000); // Poll every 10s for "Live" feel
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Channel Actions
  const toggleChannelStatus = async (id, currentStatus) => {
    const { error } = await supabase.from('channels').update({ is_active: !currentStatus }).eq('id', id);
    if (!error) fetchData();
  };

  const deleteChannel = async (id) => {
    if (window.confirm("Are you sure you want to delete this channel?")) {
      const { error } = await supabase.from('channels').delete().eq('id', id);
      if (error) {
        alert('Error deleting channel: ' + error.message);
      } else {
        fetchData();
      }
    }
  };

  const handleAddChannel = async (e) => {
    e.preventDefault();
    if (!newChannel.name || !newChannel.youtube_id || !newChannel.state) return alert('All fields required');
    
    // Extract ID if user pastes full URL
    let ytId = newChannel.youtube_id;
    if (ytId.includes('v=')) ytId = ytId.split('v=')[1].split('&')[0];
    else if (ytId.includes('youtu.be/')) ytId = ytId.split('youtu.be/')[1].split('?')[0];

    const { error } = await supabase.from('channels').insert([{ ...newChannel, youtube_id: ytId }]);
    if (error) {
      alert('Error adding channel: ' + error.message);
    } else {
      setNewChannel({ name: '', youtube_id: '', state: 'Kerala', is_active: true });
      fetchData();
    }
  };

  const startEdit = (ch) => {
    setEditingChannel({ ...ch });
  };

  const cancelEdit = () => {
    setEditingChannel(null);
  };

  const saveEdit = async () => {
    if (!editingChannel.name || !editingChannel.youtube_id || !editingChannel.state) return alert('All fields required');
    
    let ytId = editingChannel.youtube_id;
    if (ytId.includes('v=')) ytId = ytId.split('v=')[1].split('&')[0];
    else if (ytId.includes('youtu.be/')) ytId = ytId.split('youtu.be/')[1].split('?')[0];

    const { error } = await supabase.from('channels').update({
      name: editingChannel.name,
      youtube_id: ytId,
      state: editingChannel.state
    }).eq('id', editingChannel.id);

    if (error) {
      alert('Error updating channel: ' + error.message);
    } else {
      setEditingChannel(null);
      fetchData();
    }
  };

  // Save Settings
  const saveSettings = async () => {
    const { error } = await supabase.from('site_settings').update({
      min_viewers: settings.min_viewers,
      max_viewers: settings.max_viewers,
      header_ad: settings.header_ad,
      sidebar_ad: settings.sidebar_ad
    }).eq('id', 'global');
    
    if (error) alert("Error saving settings");
    else alert("Settings saved successfully!");
  };

  if (loadingSession) {
    return <div style={{ padding: '40px', color: '#fff', textAlign: 'center' }}>Loading...</div>;
  }

  // --- LOGIN SCREEN ---
  if (!session) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: '#fff' }}>
        <form onSubmit={handleLogin} style={{ background: '#111', padding: '40px', borderRadius: '8px', border: '1px solid #333', width: '350px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '5px' }}>Admin Login</h2>
          <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '20px' }}>Enter your Supabase credentials to access.</p>
          
          {loginError && <div style={{ background: '#ef444433', color: '#ef4444', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '0.85rem' }}>{loginError}</div>}
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }} 
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }} 
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoggingIn}
            style={{ width: '100%', padding: '10px', background: '#10b981', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isLoggingIn ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    );
  }

  // --- DASHBOARD SCREEN ---
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0a0a0f' }}>
      {/* Sidebar Navigation (AdminLTE Style) */}
      <div style={{ width: '250px', background: '#1a1a24', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 100 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #333', textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#10b981', letterSpacing: '1px' }}>ADMIN<span style={{ color: '#fff' }}>LTE</span></h2>
        </div>
        <div style={{ flex: 1, padding: '20px 0' }}>
          {[
            { id: 'analytics', label: '📊 Dashboard', icon: '📈' },
            { id: 'channels', label: '📺 Channels', icon: '🎥' },
            { id: 'settings', label: '⚙️ Settings', icon: '🛠️' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                width: '100%',
                padding: '15px 25px',
                textAlign: 'left',
                background: activeTab === item.id ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                border: 'none',
                borderLeft: activeTab === item.id ? '4px solid #10b981' : '4px solid transparent',
                color: activeTab === item.id ? '#10b981' : '#888',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: activeTab === item.id ? 'bold' : 'normal',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ padding: '20px', borderTop: '1px solid #333' }}>
          <button onClick={() => supabase.auth.signOut()} style={{ width: '100%', padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Logout</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, marginLeft: '250px', padding: '30px', overflowY: 'auto', height: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', textTransform: 'capitalize' }}>{activeTab} Overview</h1>
          <div style={{ fontSize: '0.85rem', color: '#666' }}>Home / {activeTab}</div>
        </div>

        {activeTab === 'analytics' && (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <style>{`
              @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
              .log-row:hover { background: rgba(255,255,255,0.02); }
            `}</style>

            <div style={{ background: 'linear-gradient(145deg, #1a1a24 0%, #111 100%)', padding: '25px', borderRadius: '15px', border: '1px solid #3b82f6', marginBottom: '30px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: '#3b82f6', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', background: autoScrape ? '#10b981' : '#888', borderRadius: '50%', boxShadow: autoScrape ? '0 0 10px #10b981' : 'none' }}></span>
                  Election Intelligence Engine
                </h3>
                {autoScrape && <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid rgba(16,185,129,0.2)' }}>Next Auto-Run in: {formatTime(timeLeft)}</div>}
              </div>
              <p style={{ color: '#aaa', marginBottom: '20px', fontSize: '0.9rem' }}>The engine pulls live polling data from the official election sources every 5 minutes when active.</p>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <button 
                  onClick={runScraper} 
                  disabled={scraping}
                  style={{ background: '#3b82f6', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '8px', cursor: scraping ? 'not-allowed' : 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
                >
                  {scraping ? 'Processing...' : '⚡ Trigger Manual Sync'}
                </button>
                <button
                  onClick={() => setAutoScrape(!autoScrape)}
                  style={{ background: autoScrape ? '#ef4444' : '#10b981', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
                >
                  {autoScrape ? '⏹ Stop Auto-Sync' : '▶ Start Auto-Sync'}
                </button>
              </div>
              {scrapeStatus && <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(16,185,129,0.05)', borderRadius: '6px', color: '#10b981', fontSize: '0.9rem', borderLeft: '3px solid #10b981' }}>{scrapeStatus}</div>}
            </div>

            {/* Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
              {[
                { label: 'Live Traffic', val: visitorLogs.length > 0 ? visitorLogs.length + ' Hits' : '0', color: '#3b82f6' },
                { label: 'Unique Users', val: new Set(visitorLogs.map(l => l.session_id)).size, color: '#10b981' },
                { label: 'Mobile Reach', val: visitorLogs.filter(l => l.device === 'Mobile').length + ' Users', color: '#f59e0b' },
                { label: 'Community Buzz', val: chatCount + ' Msgs', color: '#8b5cf6' }
              ].map((stat, i) => (
                <div key={i} style={{ background: '#111', padding: '25px', borderRadius: '12px', border: '1px solid #222' }}>
                  <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '10px', textTransform: 'uppercase', fontWeight: '800' }}>{stat.label}</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: '800', color: stat.color }}>{stat.val}</div>
                </div>
              ))}
            </div>

            {/* World Visitor Map */}
            <div style={{ background: '#111', padding: '30px', borderRadius: '15px', border: '1px solid #222', marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>🌍 Live World Visitor Map</h3>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>{visitorLogs.filter(l => l.country).length} geo-tagged hits</span>
                  <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>📡 LIVE</div>
                </div>
              </div>

              {/* Fixed-height SVG map container */}
              <div style={{ position: 'relative', width: '100%', height: '420px', background: '#050a12', borderRadius: '10px', overflow: 'hidden', border: '1px solid #1a1a2e' }}>
                {/* Full SVG layer: world map + grid + dots all in one */}
                <svg viewBox="0 0 1000 500" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                  {/* Ocean background */}
                  <rect width="1000" height="500" fill="#050a12" />

                  {/* Latitude grid lines */}
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300, 310, 320, 330, 340, 350, 360, 370, 380, 390, 400, 410, 420, 430, 440, 450, 460, 470, 480, 490].map(y => (
                    <line key={`h${y}`} x1="0" y1={y} x2="1000" y2={y} stroke="#1a2a3a" strokeWidth="0.5" />
                  ))}
                  {[50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950].map(x => (
                    <line key={`v${x}`} x1={x} y1="0" x2={x} y2="500" stroke="#1a2a3a" strokeWidth="0.5" />
                  ))}

                  {/* Equator */}
                  <line x1="0" y1="250" x2="1000" y2="250" stroke="#ffffff" strokeWidth="0.6" strokeDasharray="8,12" opacity="0.2" />
                  {/* Prime meridian */}
                  <line x1="500" y1="0" x2="500" y2="500" stroke="#ffffff" strokeWidth="0.6" strokeDasharray="8,12" opacity="0.15" />

                  {/* Simplified continent shapes */}
                  {/* North America */}
                  <path d="M 70 80 L 110 60 L 180 65 L 220 100 L 250 150 L 230 200 L 200 240 L 160 260 L 120 230 L 90 180 L 70 130 Z" fill="#0d2137" stroke="#1e3a4f" strokeWidth="1" opacity="0.8"/>
                  {/* South America */}
                  <path d="M 180 260 L 220 255 L 250 290 L 260 350 L 240 400 L 200 440 L 170 420 L 155 370 L 160 310 Z" fill="#0d2137" stroke="#1e3a4f" strokeWidth="1" opacity="0.8"/>
                  {/* Europe */}
                  <path d="M 440 80 L 490 70 L 530 85 L 520 130 L 490 140 L 460 130 L 440 110 Z" fill="#0d2137" stroke="#1e3a4f" strokeWidth="1" opacity="0.8"/>
                  {/* Africa */}
                  <path d="M 450 170 L 510 160 L 540 200 L 550 280 L 530 370 L 490 410 L 460 400 L 430 340 L 420 260 L 430 200 Z" fill="#0d2137" stroke="#1e3a4f" strokeWidth="1" opacity="0.8"/>
                  {/* Asia */}
                  <path d="M 530 60 L 700 50 L 820 80 L 850 130 L 820 170 L 750 190 L 680 200 L 620 180 L 570 160 L 540 130 L 530 90 Z" fill="#0d2137" stroke="#1e3a4f" strokeWidth="1" opacity="0.8"/>
                  {/* India subcontinent */}
                  <path d="M 640 190 L 680 185 L 700 240 L 680 290 L 650 285 L 630 240 Z" fill="#102030" stroke="#1e3a4f" strokeWidth="1" opacity="0.9"/>
                  {/* Southeast Asia */}
                  <path d="M 750 200 L 820 210 L 830 250 L 790 260 L 760 240 Z" fill="#0d2137" stroke="#1e3a4f" strokeWidth="1" opacity="0.8"/>
                  {/* Australia */}
                  <path d="M 780 320 L 870 305 L 920 340 L 900 400 L 830 420 L 770 390 L 760 350 Z" fill="#0d2137" stroke="#1e3a4f" strokeWidth="1" opacity="0.8"/>

                  {/* Visitor dots — real data from DB */}
                  {(() => {
                    // Country → [svgX, svgY] on 1000x500 canvas (equirectangular approximation)
                    const POS = {
                      'India':              [640, 235],
                      'United States':      [175, 185],
                      'United Kingdom':     [463, 105],
                      'Canada':             [155, 130],
                      'Australia':          [840, 370],
                      'Germany':            [490, 110],
                      'France':             [468, 118],
                      'Italy':              [495, 130],
                      'Spain':              [450, 128],
                      'Netherlands':        [480, 105],
                      'UAE':                [605, 205],
                      'Saudi Arabia':       [580, 205],
                      'Qatar':              [600, 208],
                      'Kuwait':             [590, 198],
                      'Bahrain':            [598, 205],
                      'Oman':               [615, 215],
                      'Singapore':          [755, 255],
                      'Malaysia':           [750, 250],
                      'Sri Lanka':          [665, 262],
                      'Pakistan':           [620, 188],
                      'Bangladesh':         [688, 210],
                      'Nepal':              [658, 195],
                      'Japan':              [830, 160],
                      'China':              [730, 175],
                      'South Korea':        [810, 155],
                      'Indonesia':          [780, 268],
                      'Philippines':        [800, 225],
                      'Brazil':             [225, 330],
                      'Mexico':             [135, 215],
                      'Argentina':          [210, 420],
                      'South Africa':       [500, 390],
                      'Nigeria':            [470, 250],
                      'Kenya':              [540, 270],
                      'Egypt':              [530, 185],
                      'Sweden':             [495, 82],
                      'Norway':             [480, 78],
                      'Denmark':            [487, 95],
                      'Switzerland':        [482, 122],
                      'Poland':             [505, 105],
                      'Russia':             [630, 100],
                      'Turkey':             [545, 152],
                      'Israel':             [530, 178],
                      'Jordan':             [535, 182],
                      'New Zealand':        [900, 430],
                    };

                    // Aggregate real data
                    const counts = visitorLogs.reduce((acc, log) => {
                      if (log.country) acc[log.country] = (acc[log.country] || 0) + 1;
                      return acc;
                    }, {});

                    const hasReal = Object.keys(counts).length > 0;
                    const demo = { 'India': 120, 'UAE': 45, 'United States': 30, 'United Kingdom': 22, 'Singapore': 18, 'Saudi Arabia': 15, 'Kuwait': 12, 'Qatar': 10, 'Germany': 8, 'Australia': 7, 'Sri Lanka': 6, 'Malaysia': 5 };
                    const src = hasReal ? counts : demo;
                    const maxV = Math.max(...Object.values(src));

                    return Object.entries(src).map(([country, count]) => {
                      const pos = POS[country];
                      if (!pos) return null;
                      const [cx, cy] = pos;
                      const r = Math.max(8, Math.min(28, (count / maxV) * 28));
                      const isHot = count > maxV * 0.5;
                      const color = isHot ? '#ef4444' : count > maxV * 0.2 ? '#f59e0b' : '#3b82f6';
                      return (
                        <g key={country}>
                          {isHot && <circle cx={cx} cy={cy} r={r + 10} fill="none" stroke={color} strokeWidth="1.5" opacity="0.35">
                            <animate attributeName="r" values={`${r+5};${r+18};${r+5}`} dur="2s" repeatCount="indefinite"/>
                            <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite"/>
                          </circle>}
                          <circle cx={cx} cy={cy} r={r} fill={color} opacity="0.85" />
                          <circle cx={cx - r*0.3} cy={cy - r*0.3} r={r*0.4} fill="white" opacity="0.2" />
                          <text x={cx} y={cy + 4} textAnchor="middle" fontSize={Math.max(8, r * 0.6)} fontWeight="bold" fill="white">{count}</text>
                          {r > 14 && <text x={cx} y={cy + r + 10} textAnchor="middle" fontSize="7" fill={color} opacity="0.9">{country.split(' ')[0]}</text>}
                        </g>
                      );
                    }).filter(Boolean);
                  })()}

                  {/* Labels */}
                  <text x="10" y="15" fontSize="8" fill="#1e3a4f" fontFamily="monospace">INDIA — LIVE VIEWER MAP</text>
                  {visitorLogs.filter(l => l.country).length === 0 && (
                    <text x="820" y="15" fontSize="7" fill="#f59e0b" fontFamily="monospace">DEMO MODE</text>
                  )}
                </svg>

                {/* Legend */}
                <div style={{ position: 'absolute', bottom: '12px', left: '14px', display: 'flex', gap: '14px', fontSize: '0.7rem', background: 'rgba(5,10,18,0.7)', padding: '6px 12px', borderRadius: '20px' }}>
                  {[['#ef4444','High'],['#f59e0b','Medium'],['#3b82f6','Low']].map(([c, l]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#aaa' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c }} />
                      {l}
                    </div>
                  ))}
                </div>
              </div>

              {/* Country Table below map */}
              {(() => {
                const counts = visitorLogs.reduce((acc, log) => { if (log.country) acc[log.country] = (acc[log.country] || 0) + 1; return acc; }, {});
                const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,6);
                if (sorted.length === 0) return null;
                return (
                  <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                    {sorted.map(([country, count], i) => (
                      <div key={country} style={{ background: '#0a0a0f', padding: '10px', borderRadius: '8px', border: '1px solid #1a1a2e', textAlign: 'center' }}>
                        <div style={{ fontSize: '1rem', fontWeight: '900', color: i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : '#3b82f6' }}>#{i+1}</div>
                        <div style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 'bold', marginTop: '3px' }}>{country}</div>
                        <div style={{ fontSize: '0.65rem', color: '#555', marginTop: '2px' }}>{count} visits</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>



            {/* Live Viewer Geographic Map */}
            <div style={{ background: '#111', padding: '30px', borderRadius: '15px', border: '1px solid #222', marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>🗺️ Live Viewer Map — State Hotspots</h3>
                <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold' }}>📍 REAL-TIME TRACKING</div>
              </div>

              {/* India State Bubble Map */}
              <div style={{ position: 'relative', width: '100%', height: '420px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1a1a2e' }}>
                
                {/* Grid background */}
                <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.08 }}>
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3b82f6" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {/* India outline label */}
                <div style={{ position: 'absolute', top: '15px', left: '15px', color: '#333', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase' }}>INDIA — LIVE COVERAGE MAP</div>

                {/* State Hotspot Bubbles — positioned approximately on India map */}
                {(() => {
                  // State positions as % of container (left%, top%) — approximate India map coords
                  const statePositions = {
                    'Kerala':          { left: '35%', top: '82%' },
                    'Tamil Nadu':      { left: '40%', top: '78%' },
                    'Karnataka':       { left: '35%', top: '68%' },
                    'Maharashtra':     { left: '32%', top: '55%' },
                    'Gujarat':         { left: '22%', top: '48%' },
                    'Rajasthan':       { left: '28%', top: '35%' },
                    'Delhi':           { left: '35%', top: '28%' },
                    'Uttar Pradesh':   { left: '43%', top: '32%' },
                    'West Bengal':     { left: '58%', top: '42%' },
                    'Telangana':       { left: '42%', top: '63%' },
                    'Andhra Pradesh':  { left: '44%', top: '70%' },
                    'Madhya Pradesh':  { left: '38%', top: '46%' },
                    'Bihar':           { left: '52%', top: '34%' },
                    'Assam':           { left: '68%', top: '28%' },
                    'Punjab':          { left: '28%', top: '20%' },
                    'Haryana':         { left: '32%', top: '25%' },
                    'Odisha':          { left: '52%', top: '52%' },
                  };

                  // Count visitors per state from logs
                  const stateCounts = visitorLogs.reduce((acc, log) => {
                    if (log.region) {
                      acc[log.region] = (acc[log.region] || 0) + 1;
                    }
                    return acc;
                  }, {});

                  // Fallback demo data if no real data yet
                  const displayData = Object.keys(statePositions).map(state => ({
                    state,
                    count: stateCounts[state] || Math.floor(Math.random() * 80) + 5,
                    pos: statePositions[state]
                  }));

                  const maxCount = Math.max(...displayData.map(d => d.count));

                  return displayData.map(({ state, count, pos }) => {
                    const size = Math.max(28, Math.min(70, (count / maxCount) * 70));
                    const isHot = count > maxCount * 0.6;
                    const isMedium = count > maxCount * 0.3;
                    const color = isHot ? '#ef4444' : isMedium ? '#f59e0b' : '#3b82f6';

                    return (
                      <div
                        key={state}
                        title={`${state}: ${count} viewers`}
                        style={{
                          position: 'absolute',
                          left: pos.left,
                          top: pos.top,
                          transform: 'translate(-50%, -50%)',
                          width: `${size}px`,
                          height: `${size}px`,
                          borderRadius: '50%',
                          background: `radial-gradient(circle, ${color}88 0%, ${color}22 70%)`,
                          border: `2px solid ${color}`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          animation: isHot ? 'pulse 2s infinite' : 'none',
                          zIndex: isHot ? 10 : 5,
                          boxShadow: isHot ? `0 0 20px ${color}66` : 'none'
                        }}
                      >
                        <div style={{ fontSize: size > 45 ? '0.7rem' : '0.55rem', fontWeight: 'bold', color: '#fff', textAlign: 'center', lineHeight: 1.1, padding: '2px' }}>
                          {size > 40 ? state.split(' ')[0] : ''}
                        </div>
                        <div style={{ fontSize: size > 45 ? '0.75rem' : '0.6rem', color, fontWeight: '900' }}>{count}</div>
                      </div>
                    );
                  });
                })()}

                {/* Legend */}
                <div style={{ position: 'absolute', bottom: '15px', right: '15px', display: 'flex', gap: '15px', fontSize: '0.7rem' }}>
                  {[{ color: '#ef4444', label: 'High Traffic' }, { color: '#f59e0b', label: 'Medium' }, { color: '#3b82f6', label: 'Low' }].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#888' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Top 5 States Table */}
              <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                {(() => {
                  const stateCounts = visitorLogs.reduce((acc, log) => {
                    if (log.region) acc[log.region] = (acc[log.region] || 0) + 1;
                    return acc;
                  }, {});
                  const fallback = ['Kerala', 'Tamil Nadu', 'Karnataka', 'Maharashtra', 'West Bengal'];
                  const sorted = Object.keys(stateCounts).length > 0
                    ? Object.entries(stateCounts).sort((a,b) => b[1]-a[1]).slice(0,5)
                    : fallback.map((s, i) => [s, 80 - i * 12]);

                  return sorted.map(([state, count], i) => (
                    <div key={state} style={{ background: '#0a0a0f', padding: '12px', borderRadius: '8px', border: '1px solid #222', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : '#3b82f6' }}>#{i+1}</div>
                      <div style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 'bold', marginTop: '4px' }}>{state}</div>
                      <div style={{ fontSize: '0.7rem', color: '#666' }}>{count} viewers</div>
                    </div>
                  ));
                })()}
              </div>
            </div>


            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
              <div style={{ background: '#111', padding: '25px', borderRadius: '12px', border: '1px solid #222' }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: '#fff' }}>Top Referrers</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(
                    visitorLogs.reduce((acc, log) => {
                      let ref = 'Direct/Search';
                      if (log.referrer && log.referrer !== 'Direct') {
                        try {
                          ref = new URL(log.referrer).hostname;
                        } catch (e) {
                          ref = log.referrer.substring(0, 20) + '...';
                        }
                      }
                      acc[ref] = (acc[ref] || 0) + 1;
                      return acc;
                    }, {})
                  ).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([ref, count]) => (
                    <div key={ref} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: '#aaa' }}>{ref}</span>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>{count} hits</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: '#111', padding: '25px', borderRadius: '12px', border: '1px solid #222' }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: '#fff' }}>Page Popularity</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(
                    visitorLogs.reduce((acc, log) => {
                      acc[log.page_path] = (acc[log.page_path] || 0) + 1;
                      return acc;
                    }, {})
                  ).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([path, count]) => (
                    <div key={path} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: '#aaa' }}>{path}</span>
                      <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{count} views</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Activity Stream */}
            <div style={{ background: '#111', padding: '25px', borderRadius: '12px', border: '1px solid #222' }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1rem', color: '#fff' }}>Detailed Visitor Audit</h3>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #222', color: '#555' }}>
                    <th style={{ padding: '12px 10px' }}>Time</th>
                    <th>Path</th>
                    <th>Device</th>
                    <th>Browser</th>
                    <th>Origin</th>
                  </tr>
                </thead>
                <tbody>
                  {visitorLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #1a1a1a' }} className="log-row">
                      <td style={{ padding: '15px 10px', color: '#666' }}>{new Date(log.created_at).toLocaleTimeString()}</td>
                      <td style={{ color: '#10b981', fontWeight: 'bold' }}>{log.page_path}</td>
                      <td><span style={{ background: log.device === 'Mobile' ? '#4c1d95' : '#1e3a8a', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem' }}>{log.device}</span></td>
                      <td>{log.browser}</td>
                      <td style={{ color: '#666' }}>{log.referrer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'channels' && (
          <div>
            <h2>Active Channels</h2>
            <p style={{ color: '#888' }}>Only the first 9 active channels will be displayed on the public grid.</p>
            
            <table style={{ width: '100%', textAlign: 'left', marginTop: '20px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333', color: '#aaa' }}>
                  <th style={{ padding: '10px 0' }}>Channel Name</th>
                  <th>YouTube ID</th>
                  <th>State</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {channels.map(ch => (
                  <tr key={ch.id} style={{ borderBottom: '1px solid #222' }}>
                    {editingChannel && editingChannel.id === ch.id ? (
                      <>
                        <td style={{ padding: '15px 0' }}>
                          <input type="text" value={editingChannel.name} onChange={e => setEditingChannel({...editingChannel, name: e.target.value})} style={{ width: '90%', padding: '5px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px' }} />
                        </td>
                        <td>
                          <input type="text" value={editingChannel.youtube_id} onChange={e => setEditingChannel({...editingChannel, youtube_id: e.target.value})} style={{ width: '90%', padding: '5px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px' }} />
                        </td>
                        <td>
                          <select value={editingChannel.state} onChange={e => setEditingChannel({...editingChannel, state: e.target.value})} style={{ width: '90%', padding: '5px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px' }}>
                            <option value="Kerala">Kerala</option>
                            <option value="Tamil Nadu">Tamil Nadu</option>
                            <option value="Karnataka">Karnataka</option>
                            <option value="Assam">Assam</option>
                            <option value="West Bengal">West Bengal</option>
                            <option value="National">National</option>
                          </select>
                        </td>
                        <td>
                          <span style={{ color: '#888' }}>--</span>
                        </td>
                        <td>
                          <button onClick={saveEdit} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', marginRight: '5px' }}>Save</button>
                          <button onClick={cancelEdit} style={{ background: '#666', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '15px 0' }}>{ch.name}</td>
                        <td><code>{ch.youtube_id}</code></td>
                        <td>{ch.state}</td>
                        <td>
                          <button 
                            onClick={() => toggleChannelStatus(ch.id, ch.is_active)}
                            style={{ background: ch.is_active ? '#059669' : '#444', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                            {ch.is_active ? 'Active' : 'Hidden'}
                          </button>
                        </td>
                        <td>
                          <button onClick={() => startEdit(ch)} style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', marginRight: '5px' }}>Edit</button>
                          <button onClick={() => deleteChannel(ch.id)} style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {channels.length === 0 && <tr><td colSpan="5" style={{ padding: '20px 0', color: '#888' }}>No channels found.</td></tr>}
              </tbody>
            </table>

            <div style={{ background: '#1a1a24', padding: '25px', borderRadius: '8px', border: '1px solid #333', marginTop: '40px' }}>
              <h3 style={{ marginTop: 0, color: '#fff' }}>Add New Channel</h3>
              <form onSubmit={handleAddChannel} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '0.85rem' }}>Channel Name</label>
                  <input type="text" placeholder="e.g. Kerala Live News" required value={newChannel.name} onChange={e => setNewChannel({...newChannel, name: e.target.value})} style={{ width: '100%', padding: '10px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '0.85rem' }}>YouTube ID or URL</label>
                  <input type="text" placeholder="e.g. 1wECsnGZcfc" required value={newChannel.youtube_id} onChange={e => setNewChannel({...newChannel, youtube_id: e.target.value})} style={{ width: '100%', padding: '10px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '0.85rem' }}>State Tag</label>
                  <select value={newChannel.state} onChange={e => setNewChannel({...newChannel, state: e.target.value})} style={{ width: '100%', padding: '10px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }}>
                    <option value="Kerala">Kerala</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="National">National</option>
                  </select>
                </div>
                <button type="submit" style={{ background: '#10b981', border: 'none', color: '#fff', padding: '11px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+ Add Channel</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2>Site Configuration</h2>
            <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>Fake Viewers Base (Min)</label>
                  <input type="number" value={settings.min_viewers} onChange={(e) => setSettings({...settings, min_viewers: e.target.value})} style={{ width: '100%', padding: '10px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>Fake Viewers Cap (Max)</label>
                  <input type="number" value={settings.max_viewers} onChange={(e) => setSettings({...settings, max_viewers: e.target.value})} style={{ width: '100%', padding: '10px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }} />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>Header Ad Script (HTML)</label>
                <textarea rows="3" value={settings.header_ad} onChange={(e) => setSettings({...settings, header_ad: e.target.value})} style={{ width: '100%', padding: '10px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontFamily: 'monospace', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>Sidebar Ad Script (HTML)</label>
                <textarea rows="3" value={settings.sidebar_ad} onChange={(e) => setSettings({...settings, sidebar_ad: e.target.value})} style={{ width: '100%', padding: '10px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontFamily: 'monospace', boxSizing: 'border-box' }} />
              </div>
              
              <div>
                 <button onClick={saveSettings} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '12px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Settings</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
