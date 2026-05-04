import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 15) + '...' : 'MISSING',
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    nodeVersion: process.version,
    memoryUsage: process.memoryUsage(),
    supabaseTest: 'Pending...'
  };

  try {
    // Attempt a simple connection test
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const { count, error } = await supabase
            .from('channels')
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            debugInfo.supabaseTest = `Error: ${error.message}`;
            debugInfo.errorDetails = error;
        } else {
            debugInfo.supabaseTest = `Connected Successfully! Found ${count} channels.`;
        }
    } else {
        debugInfo.supabaseTest = 'Skipped (No Env Vars)';
    }
  } catch (err) {
    debugInfo.supabaseTest = `Crash during test: ${err.message}`;
  }

  return NextResponse.json(debugInfo);
}
