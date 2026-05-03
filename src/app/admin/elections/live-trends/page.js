"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';

export default function AdminElectionTrends() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
      try {
          const res = await fetch('/api/elections/live-summary');
          const data = await res.json();
          if (data.success) {
              setSummary(data);
          }
      } catch (e) {
          console.error(e);
      }
  };

  const runScraper = async () => {
    setLoading(true);
    setStatusMsg('Scraping in progress...');
    try {
      const res = await fetch('/api/admin/elections/scrape-now', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(`Success! Updated ${data.updated} constituencies.`);
        fetchSummary(); // refresh data
      } else {
        setStatusMsg('Error: ' + data.error);
      }
    } catch (e) {
      setStatusMsg('Failed to run scraper.');
    }
    setLoading(false);
  };

  if (!session) {
    return <div style={{ padding: '40px', color: '#fff', textAlign: 'center' }}>Admin Access Required. Please login via /admin.</div>;
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', color: '#fff' }}>
      <h1>Live Trends Module - Admin</h1>
      
      <div style={{ background: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #333', marginBottom: '20px' }}>
        <h2>Scraper Control</h2>
        <p style={{ color: '#888' }}>Manually trigger the Playwright scraper to fetch latest trends from ECI.</p>
        <button 
          onClick={runScraper} 
          disabled={loading}
          style={{ background: '#10b981', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Scraping...' : 'Run Scraper Now'}
        </button>
        {statusMsg && <p style={{ marginTop: '10px', color: '#3b82f6' }}>{statusMsg}</p>}
      </div>

      {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ background: '#1a1a24', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                <h3>Recent Alerts (Swings)</h3>
                <ul style={{ paddingLeft: '20px', color: '#aaa' }}>
                    {summary.alerts.map(a => (
                        <li key={a.id} style={{ marginBottom: '10px' }}>
                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>[{a.severity.toUpperCase()}]</span> {a.title}: {a.message}
                        </li>
                    ))}
                    {summary.alerts.length === 0 && <li>No recent alerts.</li>}
                </ul>
              </div>

              <div style={{ background: '#1a1a24', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                <h3>Database Status</h3>
                <p>Total Constituencies Tracked: {summary.summary.totalConstituencies}</p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {Object.entries(summary.summary.partyLeads).map(([party, count]) => (
                        <div key={party} style={{ background: '#222', padding: '5px 10px', borderRadius: '4px' }}>
                            {party}: {count}
                        </div>
                    ))}
                </div>
              </div>
          </div>
      )}
    </div>
  );
}
