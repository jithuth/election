"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function PublicLiveTrends() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/elections/live-summary');
      const data = await res.json();
      if (data.success) {
        setSummary(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();

    // Supabase Realtime Subscription for updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'election_constituency_results',
        },
        (payload) => {
          console.log('Realtime Update Received!', payload);
          fetchSummary(); // Refetch to get new intelligence metrics
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <div style={{ padding: '40px', color: '#fff', textAlign: 'center' }}>Loading Live Trends Engine...</div>;
  if (!summary) return <div style={{ padding: '40px', color: '#fff', textAlign: 'center' }}>No election data available.</div>;

  const filteredResults = summary.raw_results.filter(r => 
    r.state.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.constituency.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.leading_party && r.leading_party.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', color: '#fff', minHeight: '100vh', background: '#09090b' }}>
      <header style={{ marginBottom: '40px', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#10b981' }}>Live Election Trends Dashboard</h1>
        <p style={{ color: '#aaa' }}>Powered by AI Intelligence Layer</p>
      </header>

      {/* Top Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        
        {/* Momentum Index */}
        <div style={{ background: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
          <h3 style={{ marginTop: 0, color: '#fbbf24' }}>Momentum Leaders</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(summary.intelligence.momentum)
              .sort(([,a], [,b]) => b.totalScore - a.totalScore)
              .slice(0, 3)
              .map(([party, data]) => (
                <div key={party} style={{ display: 'flex', justifyContent: 'space-between', background: '#1a1a24', padding: '10px', borderRadius: '4px' }}>
                  <span style={{ fontWeight: 'bold' }}>{party}</span>
                  <span style={{ color: '#10b981' }}>Score: {data.totalScore}</span>
                </div>
            ))}
          </div>
        </div>

        {/* Alerts Feed */}
        <div style={{ background: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
          <h3 style={{ marginTop: 0, color: '#ef4444' }}>Live Alert Feed</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
             {summary.alerts.map(a => (
                <div key={a.id} style={{ fontSize: '0.85rem', borderLeft: '2px solid #ef4444', paddingLeft: '10px' }}>
                   <strong>{a.title}</strong>
                   <div style={{ color: '#aaa', marginTop: '2px' }}>{a.message}</div>
                </div>
             ))}
             {summary.alerts.length === 0 && <div style={{ color: '#666' }}>Waiting for signals...</div>}
          </div>
        </div>

        {/* Volatile Seats */}
        <div style={{ background: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
          <h3 style={{ marginTop: 0, color: '#3b82f6' }}>Most Volatile Seats</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {summary.intelligence.volatileSeats.slice(0,3).map(vs => (
              <div key={vs.constituency} style={{ fontSize: '0.85rem', background: '#1a1a24', padding: '8px', borderRadius: '4px' }}>
                <div style={{ fontWeight: 'bold', color: '#fff' }}>{vs.constituency} ({vs.state})</div>
                <div style={{ color: '#aaa' }}>Margin: <span style={{ color: '#ef4444' }}>{vs.margin}</span> ({vs.leading} vs {vs.trailing})</div>
              </div>
            ))}
             {summary.intelligence.volatileSeats.length === 0 && <div style={{ color: '#666' }}>No highly volatile seats detected currently.</div>}
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div style={{ background: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Constituency Live Data</h2>
          <input 
            type="text" 
            placeholder="Search state, constituency, party..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff', width: '300px' }}
          />
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #444', color: '#aaa', fontSize: '0.9rem' }}>
              <th style={{ padding: '12px 8px' }}>State</th>
              <th style={{ padding: '12px 8px' }}>Constituency</th>
              <th style={{ padding: '12px 8px' }}>Leading</th>
              <th style={{ padding: '12px 8px' }}>Trailing</th>
              <th style={{ padding: '12px 8px' }}>Margin</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #222', transition: 'background 0.2s' }}>
                <td style={{ padding: '12px 8px' }}>{r.state}</td>
                <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{r.constituency}</td>
                <td style={{ padding: '12px 8px' }}>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>{r.leading_party}</span>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>{r.leading_candidate}</div>
                </td>
                <td style={{ padding: '12px 8px' }}>
                  <span style={{ color: '#ef4444' }}>{r.trailing_party}</span>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>{r.trailing_candidate}</div>
                </td>
                <td style={{ padding: '12px 8px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                  {r.margin.toLocaleString()}
                </td>
              </tr>
            ))}
            {filteredResults.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No records found matching search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
