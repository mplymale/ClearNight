import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://czwwqragxwvjynlhlagh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_f9hpnL9BX2oFzOCYR96yJg_AEb7CYA1';

// `auth.storage` must be set explicitly in React Native — supabase-js has
// no default storage here (it isn't `localStorage`), so without this the
// anonymous session never persists: every cold start finds no session,
// calls `signInAnonymously()` again, and a brand new user_id is created —
// orphaning that device's old alerts/locations/push_token rows under an
// abandoned user forever. This is what was behind the flood of duplicate
// user_ids in Supabase and the repeat alert sends tied to them.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
