import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { calculateMomentumIndex, findVolatileSeats } from '../../../../lib/electionIntelligence';

export async function GET() {
  try {
    // 1. Fetch current live results
    const { data: results, error: resultsError } = await supabase.from('election_constituency_results').select('*');
    
    if (resultsError) throw resultsError;

    // 2. Fetch recent alerts
    const { data: alerts } = await supabase.from('election_alerts').select('*').order('created_at', { ascending: false }).limit(5);

    // 3. Calculate Intelligence Metrics
    const momentum = calculateMomentumIndex(results || []);
    const volatileSeats = findVolatileSeats(results || []); // Assuming results act as latest snapshot for mock

    // 4. Aggregate Party Leads (Simple)
    const partyLeads = {};
    if (results) {
        results.forEach(r => {
            if (r.leading_party) {
                partyLeads[r.leading_party] = (partyLeads[r.leading_party] || 0) + 1;
            }
        });
    }

    return NextResponse.json({
        success: true,
        summary: {
            totalConstituencies: results ? results.length : 0,
            partyLeads
        },
        intelligence: {
            momentum,
            volatileSeats
        },
        alerts: alerts || [],
        raw_results: results || []
    });

  } catch (error) {
    console.error("Summary API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}
