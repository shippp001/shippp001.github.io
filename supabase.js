// supabase.js - Supabase client configuration
import { createClient } from '@supabase/supabase-js'

// Replace with your actual Supabase URL and anon key
const supabaseUrl = 'https://YOUR_PROJECT.supabase.co'
const supabaseAnonKey = 'YOUR_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database schema for shipments table:
// CREATE TABLE shipments (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   tracking_id TEXT UNIQUE NOT NULL,
//   origin TEXT NOT NULL,
//   destination TEXT NOT NULL,
//   estimated_delivery TEXT,
//   status TEXT DEFAULT 'In Transit',
//   type TEXT DEFAULT 'Air Freight',
//   weight TEXT,
//   packages INTEGER DEFAULT 1,
//   method TEXT,
//   recipient TEXT,
//   delivery_method TEXT,
//   current_location TEXT,
//   update_text TEXT,
//   update_date TEXT,
//   update_time TEXT,
//   timeline JSONB DEFAULT '[]',
//   package_details JSONB DEFAULT '[]',
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );