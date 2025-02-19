import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL ou clé Anon non définie. Vérifiez vos variables d'environnement."
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
