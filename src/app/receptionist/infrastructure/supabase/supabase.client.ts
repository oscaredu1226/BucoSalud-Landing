import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://blhnevrsttzusemfurfy.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_fxtttmfXrH0XagAnjjlI2A_FJ4PYVL8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
