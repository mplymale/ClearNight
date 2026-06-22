import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://czwwqragxwvjynlhlagh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_f9hpnL9BX2oFzOCYR96yJg_AEb7CYA1';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
