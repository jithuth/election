import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simulate slight fluctuations in the live count
    const fluctuate = (base) => base + Math.floor(Math.random() * 5) - 2;

    const data = {
      states: {
        'Kerala': { party1: 'UDF', score1: fluctuate(75), party2: 'LDF', score2: fluctuate(64) },
        'Tamil Nadu': { party1: 'DMK+', score1: fluctuate(152), party2: 'AIADMK', score2: fluctuate(68) },
      },
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(data);
  } catch (error) {
    // CRITICAL: Always return a valid JSON response to prevent 503/500 crashes
    console.error("API Fetch Error:", error);
    return NextResponse.json({ 
      error: 'System temporarily overloaded', 
      states: {}, 
      fallback: true 
    }, { status: 200 }); // Return 200 with error info to keep frontend stable
  }
}
