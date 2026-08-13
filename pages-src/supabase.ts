import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://hcvdqiemmikqnvezcqgd.supabase.co",
  "sb_publishable_934rJU10cmLDTl7xFesWUw_mYkpx8-i",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
