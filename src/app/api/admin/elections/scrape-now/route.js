import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { detectSwings } from '../../../../../lib/electionIntelligence';

// Note: In a real production scenario, this scraper would run in a separate worker process or via serverless function with extended timeout.
// For this example, we mock the scraping result since we can't reliably scrape ECI during dev without being blocked.
// In a true implementation, Playwright would be used here.

export async function POST(req) {
  try {
    // 1. Fetch current (old) results for comparison
    const { data: oldResults } = await supabase.from('election_constituency_results').select('*');
    
    // 2. MOCK SCRAPING DATA (Simulating ECI data normalization)
    const mockScrapedData = [
      { state: 'Kerala', constituency: 'Thiruvananthapuram', leading_party: 'UDF', trailing_party: 'LDF', leading_candidate: 'Cand A', trailing_candidate: 'Cand B', margin: Math.floor(Math.random() * 5000), status: 'leading', round_no: 1 },
      { state: 'Kerala', constituency: 'Kollam', leading_party: 'LDF', trailing_party: 'UDF', leading_candidate: 'Cand C', trailing_candidate: 'Cand D', margin: Math.floor(Math.random() * 5000), status: 'leading', round_no: 1 },
      { state: 'Assam', constituency: 'Guwahati', leading_party: 'NDA', trailing_party: 'INDIA', leading_candidate: 'Cand E', trailing_candidate: 'Cand F', margin: Math.floor(Math.random() * 5000), status: 'leading', round_no: 1 },
      { state: 'Tamil Nadu', constituency: 'Chennai South', leading_party: 'DMK+', trailing_party: 'AIADMK', leading_candidate: 'Cand G', trailing_candidate: 'Cand H', margin: Math.floor(Math.random() * 5000), status: 'leading', round_no: 1 },
      { state: 'West Bengal', constituency: 'Kolkata Dakshin', leading_party: 'TMC', trailing_party: 'BJP', leading_candidate: 'Cand I', trailing_candidate: 'Cand J', margin: Math.floor(Math.random() * 5000), status: 'leading', round_no: 1 },
    ];

    // 3. Update Database (Upsert)
    // Needs an active election event. Let's assume one exists or create a mock ID for now.
    const mockEventId = '00000000-0000-0000-0000-000000000000'; // Replace with actual event ID query

    const upsertPromises = mockScrapedData.map(async (res) => {
        // Find existing to get ID for upsert (or use unique constraints)
        const { data: existing } = await supabase.from('election_constituency_results')
            .select('id')
            .eq('state', res.state)
            .eq('constituency', res.constituency)
            .single();

        const payload = {
            state: res.state,
            constituency: res.constituency,
            leading_party: res.leading_party,
            trailing_party: res.trailing_party,
            leading_candidate: res.leading_candidate,
            trailing_candidate: res.trailing_candidate,
            margin: res.margin,
            status: res.status,
            round_no: res.round_no,
            last_updated: new Date().toISOString()
        };

        if (existing) {
            return supabase.from('election_constituency_results').update(payload).eq('id', existing.id);
        } else {
            return supabase.from('election_constituency_results').insert(payload);
        }
    });

    await Promise.all(upsertPromises);

    // 4. Intelligence Layer: Detect Swings and create Alerts
    if (oldResults && oldResults.length > 0) {
        const swings = detectSwings(oldResults, mockScrapedData);
        for (const swing of swings) {
            await supabase.from('election_alerts').insert({
                alert_type: 'swing',
                title: `Lead Change in ${swing.constituency}`,
                message: `${swing.newLeader} takes the lead from ${swing.oldLeader} in ${swing.state} (${swing.constituency}). Margin: ${swing.margin}`,
                severity: 'high',
                constituency: swing.constituency,
                party: swing.newLeader
            });
        }
    }

    // 5. Save Snapshot
    await supabase.from('election_snapshots').insert({
        source_url: 'mock_scraper',
        raw_payload: mockScrapedData
    });

    return NextResponse.json({ success: true, updated: mockScrapedData.length });
  } catch (error) {
    // CRITICAL SAFETY: Prevent 503 by catching all errors and returning a structured response
    console.error("Scraper API Fatal Error:", error);
    return NextResponse.json({ 
        success: false, 
        error: 'Background synchronization service is temporarily unavailable. The system will retry automatically.',
        details: error.message 
    }, { status: 200 }); // Return 200 even on error to keep the worker alive
  }
}
