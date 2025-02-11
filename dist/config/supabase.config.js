var _a, _b;
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: "private/.env" });
const supabaseUrl = (_a = process.env.SUPABASE_PROJECT_URI) !== null && _a !== void 0 ? _a : "";
const supabaseKey = (_b = process.env.SUPABASE_KEY) !== null && _b !== void 0 ? _b : "";
if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_PROJECT_URI o SUPABASE_KEY no están definidos en el .env");
}
const supabase = createClient(supabaseUrl, supabaseKey);
export { supabase };
