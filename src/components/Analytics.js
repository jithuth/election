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
        
        let sessionId = localStorage.getItem('analytics_session');
        if (!sessionId) {
          sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('analytics_session', sessionId);
        }

        // Fetch geolocation data (free tier, no API key needed)
        let region = null;
        let country = null;
        let city = null;
        try {
          const geoRes = await fetch('https://ip-api.com/json/?fields=status,regionName,country,city');
          const geoData = await geoRes.json();
          if (geoData.status === 'success') {
            region = geoData.regionName || null;
            country = geoData.country || null;
            city = geoData.city || null;
          }
        } catch (geoErr) {
          // Geo lookup failed — non-fatal, continue without it
        }

        const log = {
          page_path: window.location.pathname,
          referrer: document.referrer || "Direct",
          browser,
          device,
          session_id: sessionId,
          region,
          country,
          city
        };

        await supabase.from('visitor_logs').insert([log]);
      } catch (e) {
        console.error("Analytics Error:", e);
      }
    };

    track();
  }, []);

  return null;
}
