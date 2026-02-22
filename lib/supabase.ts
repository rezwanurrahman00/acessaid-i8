import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://cydwkrigujhtxarmnpkw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZHdrcmlndWpodHhhcm1ucGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MjY0MDIsImV4cCI6MjA4NzMwMjQwMn0.MraplC1eVzhg4OuBGj0RTZQcDKUXgxmVZ87cGXPXfYc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
