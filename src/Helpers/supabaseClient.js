import { createClient } from "@supabase/supabase-js";

/**
 * Retrieves the Supabase URL and Anon Key from environment variables.
 * Throws an error if any of these variables are missing.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL ou clé Anon non définie. Vérifiez vos variables d'environnement."
  );
}

/**
 * Initializes and exports the Supabase client.
 *
 * @constant {SupabaseClient} supabase - The Supabase client instance.
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
