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
  const [activeTab, setActiveTab] = useState('analytics');
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

  // Auto-scraper logic
  useEffect(() => {
    let interval;
    if (autoScrape) {
      runScraper();
      interval = setInterval(() => {
        runScraper();
      }, 5 * 60 * 1000); // 5 minutes
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScrape]);

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
  };

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
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', color: '#fff', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Control Center</h1>
          <p style={{ color: '#aaa', margin: 0 }}>Manage YouTube links, viewer counts, and ad configurations.</p>
        </div>
        <button 
          onClick={handleLogout}
          style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #444', color: '#ccc', borderRadius: '4px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <button 
          onClick={() => setActiveTab('analytics')}
          style={{ padding: '10px 20px', background: activeTab === 'analytics' ? '#10b981' : '#222', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span style={{ display: 'inline-block', width: '8px', height: '8px', background: activeTab === 'analytics' ? '#fff' : '#ef4444', borderRadius: '50%' }}></span>
          Live Analytics
        </button>
        <button 
          onClick={() => setActiveTab('channels')}
          style={{ padding: '10px 20px', background: activeTab === 'channels' ? '#10b981' : '#222', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
        >
          Manage Channels
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          style={{ padding: '10px 20px', background: activeTab === 'settings' ? '#10b981' : '#222', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
        >
          Site Settings
        </button>
      </div>

      <div style={{ background: '#111', padding: '30px', borderRadius: '8px', border: '1px solid #333' }}>
        {activeTab === 'analytics' && (
          <div>
            <h2>Live System Analytics</h2>
            <p style={{ color: '#888', marginBottom: '30px' }}>Real-time monitoring of your portal's performance and engagement.</p>

            <div style={{ background: '#1a1a24', padding: '25px', borderRadius: '8px', border: '1px solid #3b82f6', marginBottom: '30px' }}>
              <h3 style={{ marginTop: 0, color: '#3b82f6' }}>Election Trends Data Control</h3>
              <p style={{ color: '#ccc', marginBottom: '15px' }}>Manually trigger the scraper to fetch the latest trends from the Election Commission data source.</p>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <button 
                  onClick={runScraper} 
                  disabled={scraping}
                  style={{ background: '#3b82f6', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: scraping ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                >
                  {scraping ? 'Scraping...' : 'Run Scraper Now'}
                </button>
                <button
                  onClick={() => setAutoScrape(!autoScrape)}
                  style={{ background: autoScrape ? '#ef4444' : '#10b981', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {autoScrape ? 'Stop Auto-Scraper' : 'Start Auto-Scraper (5m)'}
                </button>
                {autoScrape && <span style={{ color: '#10b981', fontSize: '0.9rem' }}>● Running automatically every 5 mins</span>}
              </div>
              {scrapeStatus && <p style={{ marginTop: '10px', color: '#10b981', fontWeight: 'bold' }}>{scrapeStatus}</p>}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              <div style={{ background: '#1a1a24', padding: '20px', borderRadius: '8px', border: '1px solid #333', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '10px' }}>
                  {simulatedViewers.toLocaleString()}
                </div>
                <div style={{ color: '#aaa', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Viewers</div>
              </div>
              
              <div style={{ background: '#1a1a24', padding: '20px', borderRadius: '8px', border: '1px solid #333', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981', marginBottom: '10px' }}>
                  {channels.filter(c => c.is_active).length} / 9
                </div>
                <div style={{ color: '#aaa', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Channels</div>
              </div>

              <div style={{ background: '#1a1a24', padding: '20px', borderRadius: '8px', border: '1px solid #333', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#eab308', marginBottom: '10px' }}>
                  {chatCount}
                </div>
                <div style={{ color: '#aaa', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Chat Msgs</div>
              </div>

              <div style={{ background: '#1a1a24', padding: '20px', borderRadius: '8px', border: '1px solid #333', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ec4899', marginBottom: '10px' }}>
                  2
                </div>
                <div style={{ color: '#aaa', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Ad Slots Active</div>
              </div>
            </div>

            <div style={{ background: '#1a1a24', padding: '30px', borderRadius: '8px', border: '1px dashed #333' }}>
              <h3 style={{ marginTop: 0, color: '#ccc' }}>Engagement Graph (Simulated)</h3>
              <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '4px', overflow: 'hidden' }}>
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} style={{ 
                    flex: 1, 
                    background: i === 39 ? '#3b82f6' : '#222', 
                    height: `${Math.max(10, Math.random() * 100)}%`,
                    transition: 'height 1s ease',
                    borderRadius: '2px 2px 0 0'
                  }}></div>
                ))}
              </div>
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
