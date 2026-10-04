// Supabase bağlantı bilgileri. Publishable (anon) anahtar uygulamaya gömülmek için tasarlanmıştır;
// veriler RLS politikalarıyla korunur. .env içindeki EXPO_PUBLIC_* değerleri bunları ezer.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vgdphmawnboljsiosnyu.supabase.co';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_SRn7sIitRf6K_1Stxl0eyQ_pk9k_jxS';
