import { createClient } from "@supabase/supabase-js";

// Public values only. The publishable key is designed to be public;
// data is protected by Row Level Security in the database.
// Never place the service_role key in this file.
const SUPABASE_URL = "https://twhatsvvvezyawkmzqms.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-bwVNIMEO7c5nE4-7cnFYg_OJvSEHul";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
