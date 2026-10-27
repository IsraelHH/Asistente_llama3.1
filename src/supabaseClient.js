import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://hjgksxkcqzhhpcxbvdfu.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_-WxBFzzr2pNZnRxwN7PtrQ_6sQsv5JI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
