import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: "private/.env" });

const supabaseUrl = process.env.SUPABASE_PROJECT_URI ?? "";
const supabaseKey = process.env.SUPABASE_KEY ?? "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_PROJECT_URI o SUPABASE_KEY no están definidos en el .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);
export { supabase };
