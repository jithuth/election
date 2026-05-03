import { NextResponse } from 'next/server';

export async function GET() {
  // Option 2: Automated API Integration
  // This is a secure server-side API route. Your API Keys will not be exposed to the browser.
  
  try {
    // TODO: Replace this URL with your actual live Election API or News API endpoint.
    // Example: const response = await fetch('https://api.your-news-provider.com/v1/election-results', { headers: { 'Authorization': 'Bearer YOUR_KEY' } });
    // const realData = await response.json();
    
    // For now, we are generating dynamic mock data here on the server so you can see the frontend update automatically.
    // Once you have an API, just map `realData` to this structure.
    
    // Simulate slight fluctuations in the live count
    const fluctuate = (base) => base + Math.floor(Math.random() * 5) - 2;

    const data = {
      states: {
        'Kerala': { party1: 'UDF', score1: fluctuate(75), party2: 'LDF', score2: fluctuate(64) },
        'Tamil Nadu': { party1: 'DMK+', score1: fluctuate(152), party2: 'AIADMK', score2: fluctuate(68) },
      },
      lastUpdated: new Date().toISOString()
    };

    // Return the JSON to your frontend
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Fetch Error:", error);
    return NextResponse.json({ error: 'Failed to fetch election data' }, { status: 500 });
  }
}
