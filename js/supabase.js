// js/supabase.js

const SUPABASE_URL = 'https://cbtxvevwewfgbgzrjdch.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sC6OSRe0wCCP8Xb-1capzQ_3rrX1EeF';

if (window.supabase && window.supabase.createClient) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error('Библиотека Supabase CDN не загружена! Проверьте интернет-соединение.');
}
