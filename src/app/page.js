"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import EmojiPicker from 'emoji-picker-react';

// Specialized component to handle ad scripts execution
const AdSlot = ({ html, className }) => {
  const containerRef = (node) => {
    if (node && html) {
      // Clear existing content
      node.innerHTML = "";
      
      // Create a temporary div to parse the HTML string
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      
      // Move all non-script nodes and execute script nodes
      Array.from(tempDiv.childNodes).forEach((child) => {
        if (child.tagName === "SCRIPT") {
          const script = document.createElement("script");
          if (child.src) {
            script.src = child.src;
          } else {
            script.textContent = child.textContent;
          }
          // Clone attributes
          Array.from(child.attributes).forEach(attr => script.setAttribute(attr.name, attr.value));
          node.appendChild(script);
        } else {
          node.appendChild(child.cloneNode(true));
        }
      });
    }
  };

  return <div ref={containerRef} className={className} />;
};

// Default mock channels
const DEFAULT_CHANNELS = [
  { id: '1', name: 'Kerala News', youtube_id: 's0LLVQeMmtU', state: 'Kerala' },
  { id: '2', name: 'Tamil Nadu TV', youtube_id: 'nObUcHKZEGY', state: 'Tamil Nadu' },
  { id: '3', name: 'Kerala 24/7', youtube_id: 'YGEgelAiUf0', state: 'Kerala' },
  { id: '4', name: 'TN Focus', youtube_id: 'T9Ol2JHqKlM', state: 'Tamil Nadu' },
  { id: '5', name: 'National Mix', youtube_id: 'yiiqRHY1Bl8', state: 'Kerala' },
];

export default function Home() {
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);
  const [activeAudio, setActiveAudio] = useState(null);
  const [activeState, setActiveState] = useState('All States');
  
  // Dynamic Page Title for browser tab
  useEffect(() => {
    document.title = activeState === 'All States' 
      ? 'Live Election News 24/7 | Multi-State Command Center'
      : `Live ${activeState} Election Results | News Portal`;
  }, [activeState]);

  const [viewers, setViewers] = useState(1204);
  const [updatingViewers, setUpdatingViewers] = useState(false);
  const [electionData, setElectionData] = useState(null);
  const [showVideos, setShowVideos] = useState(true);
  const [hiddenChannels, setHiddenChannels] = useState(new Set());
  const [chatMessages, setChatMessages] = useState([
    { id: 1, username: 'Admin', text: 'Welcome to the Live News Portal!' }
  ]);
  const [newMsg, setNewMsg] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [settings, setSettings] = useState(null);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Fake viewers logic
  useEffect(() => {
    const interval = setInterval(() => {
      setViewers(prev => prev + Math.floor(Math.random() * 10) - 4); // Fluctuates +/- 5
      setUpdatingViewers(true);
      setTimeout(() => setUpdatingViewers(false), 500);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Live API Election Polling
  useEffect(() => {
    const fetchElectionData = async () => {
      try {
        const res = await fetch('/api/election');
        const data = await res.json();
        if (data && data.states) {
          setElectionData(data.states);
        }
      } catch (e) {
        console.error("Failed to fetch election data", e);
      }
    };
    
    // Fetch immediately on load
    fetchElectionData();
    
    // Then poll every 30 seconds
    const interval = setInterval(fetchElectionData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch site settings (ads, etc)
  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('site_settings').select('*').eq('id', 'global').single();
      if (data) setSettings(data);
    }
    fetchSettings();
  }, []);

  // Fetch channels from Supabase
  useEffect(() => {
    async function fetchChannels() {
      try {
        const { data, error } = await supabase
          .from('channels')
          .select('*');
          
        if (data && data.length > 0) {
          setChannels(data);
        }
      } catch (err) {
        console.warn('Supabase not fully configured yet, using default channels.');
      }
    }
    fetchChannels();
  }, []);

  // Supabase Realtime Chat logic
  useEffect(() => {
    // 1. Fetch existing messages
    async function fetchMessages() {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setChatMessages(data.reverse());
    }
    fetchMessages();

    // 2. Chat Simulation Logic (multilingual high-activity with emojis & sentiment)
    const dummyPool = [
      { u: "User_492", t: "UDF is leading big in Wayanad! ✌️🔥" },
      { u: "Anon_882", t: "திமுக சென்னை தொகுதிகளில் முன்னிலை! 🗳️🙌" },
      { u: "User_102", t: "ഇടതുപക്ഷം തൃശ്ശൂരിൽ മുന്നേറുന്നു. 🚩🚩" },
      { u: "Guest_339", t: "Massive swing detected in Coimbatore seats. 📈😮" },
      { u: "User_771", t: "Fake data! These numbers are not matching with ground reality 😡🚫" },
      { u: "Anon_223", t: "Who is winning in Thiruvananthapuram? 🤔" },
      { u: "User_554", t: "அதிமுக கடும் போட்டி கொடுக்கிறது! 🦁👊" },
      { u: "Guest_910", t: "ഏതാണ് ഇപ്പോഴത്തെ നില? 🕒" },
      { u: "Anon_612", t: "This channel is biased! Show real numbers 👎🤨" },
      { u: "User_303", t: "மதுரை முடிவுகள் எப்போது வரும்? ⏳" },
      { u: "Guest_441", t: "യുഡിഎഫ് വൻ മുന്നേറ്റം നടത്തുന്നു. 🌊💎" },
      { u: "User_819", t: "Tamil Nadu results are going to be historical. 🇮🇳✨" },
      { u: "Anon_707", t: "Don't believe these trends, wait for evening. 😤🛑" },
      { u: "Guest_112", t: "കേരളത്തിൽ എൽഡിഎഫ് ഭരണത്തുടർച്ച ഉണ്ടാകുമോ? ❓" },
      { u: "User_225", t: "BJP gaining ground in some areas. 🗳️🔥" },
      { u: "Anon_993", t: "Slow counting! Why is it taking so long?? 😴💢" },
      { u: "Guest_505", t: "சென்னை வடக்கு முடிவுகள் தெரியுமா? 📍" },
      { u: "User_667", t: "വോട്ടിംഗ് ശതമാനം വളരെ കൂടുതലാണ് ഇത്തവണ. 📈💪" }
    ];

    const simulationInterval = setInterval(() => {
      const randomMsg = dummyPool[Math.floor(Math.random() * dummyPool.length)];
      const mockMessage = {
        id: Math.random(),
        username: randomMsg.u,
        text: randomMsg.t,
        created_at: new Date().toISOString()
      };
      
      setChatMessages(prev => {
        const updated = [...prev, mockMessage];
        return updated.length > 50 ? updated.slice(1) : updated;
      });
    }, 1500); // Slightly faster for more "Live" feel

    // 3. Realtime subscription
    const channel = supabase.channel('chat_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        setChatMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      clearInterval(simulationInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    
    // Optimistic UI update can go here, but let's just insert to DB for simplicity
    const messageToSend = newMsg;
    setNewMsg(''); // clear input early for better UX
    
    const { error } = await supabase
      .from('chat_messages')
      .insert([
        { username: 'Guest', text: messageToSend }
      ]);
      
    if (error) {
      console.error('Error sending message:', error);
      // fallback add to UI if failed? (omitted for brevity)
    }
  };

  const filteredChannels = channels.filter(channel => activeState === 'All States' || channel.state === activeState);

  return (
    <>
      <header>
        <h1 className="brand">
          Live<span>Election</span> News 24/7
        </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <AdSlot 
              className="header-ad-slot" 
              html={settings?.header_ad || `
                <script>
                  atOptions = {
                    'key' : '97c438075f81f5cb57cdb3bb862165d0',
                    'format' : 'iframe',
                    'height' : 50,
                    'width' : 320,
                    'params' : {}
                  };
                </script>
                <script src="https://www.highperformanceformat.com/97c438075f81f5cb57cdb3bb862165d0/invoke.js"></script>
              `} 
            />
            <button 
              onClick={() => setActiveAudio(null)}
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                color: '#aaa', 
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '6px 12px', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                fontSize: '0.8rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Mute All"
            >
              🔇 Mute All
            </button>
            <button 
              onClick={() => setShowVideos(!showVideos)}
              style={{ 
                background: showVideos ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                color: showVideos ? '#ef4444' : '#10b981', 
                border: '1px solid',
                borderColor: showVideos ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                padding: '6px 12px', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                fontSize: '0.8rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {showVideos ? '🚫 Hide Videos' : '📺 Show Videos'}
            </button>
            <button 
              onClick={toggleFullScreen}
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid var(--border-color)', 
                color: '#fff', 
                padding: '8px 16px', 
                borderRadius: '20px', 
                cursor: 'pointer', 
                fontSize: '0.75rem', 
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              <span style={{ fontSize: '1rem' }}>⛶</span> Full Screen
            </button>
          </div>
      </header>

      <div className="filters" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
          {['All States', 'Kerala', 'Tamil Nadu'].map(state => (
            <button 
              key={state}
              className={`filter-btn ${activeState === state ? 'active' : ''}`}
              onClick={() => {
                setActiveState(state);
                setActiveAudio(null); // Reset audio when changing filter
              }}
            >
              {state}
            </button>
          ))}
        </div>
        
        {/* Ticker moved to State Line */}
        <div className="ticker-wrap" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '16px', height: '30px', margin: 0 }}>
          <div className="ticker-content" style={{ lineHeight: '30px' }}>
            {electionData ? (
              <>
                <span className="ticker-item">🔴 KERALA UPDATE: {electionData.Kerala?.party1} leading in {electionData.Kerala?.score1}, {electionData.Kerala?.party2} in {electionData.Kerala?.score2}...</span>
                <span className="ticker-item">🔴 TAMIL NADU: {electionData['Tamil Nadu']?.party1} sweeping with leads in {electionData['Tamil Nadu']?.score1} constituencies, {electionData['Tamil Nadu']?.party2} ahead in {electionData['Tamil Nadu']?.score2}...</span>
              </>
            ) : (
              <span className="ticker-item">Fetching live election trends...</span>
            )}
          </div>
        </div>
      </div>

      <main>
        {/* Video Grid Area */}
        {showVideos ? (
          <div className="grid-container">
            {filteredChannels.slice(0, 9).map((channel) => {
              const isHidden = hiddenChannels.has(channel.id);
              
              if (isHidden) {
                return (
                  <div key={channel.id} className="tile" style={{ background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#444', border: '1px dashed #222' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🚫</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{channel.name} Hidden</div>
                    <button 
                      onClick={() => {
                        const newHidden = new Set(hiddenChannels);
                        newHidden.delete(channel.id);
                        setHiddenChannels(newHidden);
                      }}
                      style={{ marginTop: '10px', background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                      Show Video
                    </button>
                  </div>
                );
              }

              return (
                <div 
                  key={channel.id} 
                  className={`tile ${activeAudio === channel.youtube_id ? 'active-audio' : ''}`}
                  onClick={() => setActiveAudio(channel.youtube_id)}
                >
                  <iframe
                    key={`${channel.youtube_id}-${activeAudio === channel.youtube_id}`}
                    src={`https://www.youtube.com/embed/${channel.youtube_id}?autoplay=1&mute=${activeAudio === channel.youtube_id ? 0 : 1}&controls=1&rel=0&modestbranding=1&enablejsapi=1`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                  <div className="tile-overlay">
                    <div className="channel-name">{channel.name}</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const newHidden = new Set(hiddenChannels);
                          newHidden.add(channel.id);
                          setHiddenChannels(newHidden);
                        }}
                        style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                      >
                        Hide
                      </button>
                      <button 
                        className="audio-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeAudio === channel.youtube_id) {
                            setActiveAudio(null);
                          } else {
                            setActiveAudio(channel.youtube_id);
                          }
                        }}
                      >
                        {activeAudio === channel.youtube_id ? '🔊' : '🔇'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050505', color: '#444', border: '1px dashed #222', margin: '10px', borderRadius: '12px' }}>
             <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📺</div>
             <div style={{ fontWeight: 'bold' }}>Video Streams Hidden</div>
             <button onClick={() => setShowVideos(true)} style={{ marginTop: '15px', padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Resume Watching</button>
          </div>
        )}

        {/* Sidebar & Chat Area */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h3>Live Discussion</h3>
            <div className="live-viewers">
              <span className="pulse"></span>
              <span className={`viewer-count ${updatingViewers ? 'updating' : ''}`}>
                {viewers.toLocaleString()}
              </span> Watching
            </div>
          </div>
          
          {/* Live Election Pulse Widget */}
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: '0 0 20px 0', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>
              Live Election Pulse
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              {/* Kerala */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Kerala</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>55% Momentum</span>
                </div>
                <div style={{ height: '6px', width: '100%', borderRadius: '3px', overflow: 'hidden', display: 'flex', marginBottom: '8px' }}>
                  <div style={{ width: '55%', background: '#ef4444' }}></div>
                  <div style={{ width: '45%', background: '#3b82f6' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>{electionData?.Kerala?.party1}: <b style={{ color: '#fff' }}>{electionData?.Kerala?.score1}</b></span>
                  <span>{electionData?.Kerala?.party2}: <b style={{ color: '#fff' }}>{electionData?.Kerala?.score2}</b></span>
                </div>
              </div>

              {/* Tamil Nadu */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Tamil Nadu</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>65% Swing</span>
                </div>
                <div style={{ height: '6px', width: '100%', borderRadius: '3px', overflow: 'hidden', display: 'flex', marginBottom: '8px' }}>
                  <div style={{ width: '65%', background: '#10b981' }}></div>
                  <div style={{ width: '35%', background: '#f59e0b' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>{electionData?.['Tamil Nadu']?.party1}: <b style={{ color: '#fff' }}>{electionData?.['Tamil Nadu']?.score1}</b></span>
                  <span>{electionData?.['Tamil Nadu']?.party2}: <b style={{ color: '#fff' }}>{electionData?.['Tamil Nadu']?.score2}</b></span>
                </div>
              </div>
            </div>
          </div>
          
          <AdSlot 
            className="sidebar-ad-slot" 
            html={settings?.sidebar_ad || `
              <script>
                atOptions = {
                  'key' : '90d958d4b70dde1eadc08c143547c656',
                  'format' : 'iframe',
                  'height' : 250,
                  'width' : 300,
                  'params' : {}
                };
              </script>
              <script src="https://www.highperformanceformat.com/90d958d4b70dde1eadc08c143547c656/invoke.js"></script>
            `} 
          />


          <div className="chat-container">
            {chatMessages.map(msg => (
              <div key={msg.id} className="chat-message">
                <span className="username">{msg.username || 'Admin'}</span>
                <span className="text">{msg.text}</span>
              </div>
            ))}
          </div>

          <form className="chat-input-area" onSubmit={handleSendMessage} style={{ position: 'relative' }}>
            <button 
              type="button" 
              onClick={() => setShowEmojiPicker(prev => !prev)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px', color: '#fff' }}
              title="Add Emoji"
            >
              😀
            </button>
            {showEmojiPicker && (
              <div style={{ position: 'absolute', bottom: '100%', left: '0', zIndex: 100, marginBottom: '10px' }}>
                <EmojiPicker 
                  theme="dark" 
                  onEmojiClick={(e) => setNewMsg(prev => prev + e.emoji)} 
                  searchDisabled={true}
                  width={300}
                  height={350}
                />
              </div>
            )}
            <input 
              type="text" 
              className="chat-input" 
              placeholder="Say something..." 
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onFocus={() => setShowEmojiPicker(false)}
            />
            <button type="submit" className="chat-send">Send</button>
          </form>
        </aside>
      </main>
    </>
  );
}
