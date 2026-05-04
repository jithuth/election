"use client";

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Analytics() {
  useEffect(() => {
    const track = async () => {
      try {
        const ua = window.navigator.userAgent;
        let browser = "Other";
        if (ua.includes("Chrome")) browser = "Chrome";
        else if (ua.includes("Firefox")) browser = "Firefox";
        else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
        
        const device = /Mobi|Android/i.test(ua) ? "Mobile" : "Desktop";
        
        // Use a simple session ID to track unique sessions
        let sessionId = localStorage.getItem('analytics_session');
        if (!sessionId) {
          sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('analytics_session', sessionId);
        }

        const log = {
          page_path: window.location.pathname,
          referrer: document.referrer || "Direct",
          browser: browser,
          device: device,
          session_id: sessionId
        };

        // Fire and forget log insertion
        await supabase.from('visitor_logs').insert([log]);
      } catch (e) {
        console.error("Analytics Error:", e);
      }
    };

    track();
  }, []);

  return null;
}
