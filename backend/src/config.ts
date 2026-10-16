export const config = {
  adminEmail: (process.env.ADMIN_EMAIL?.trim() || "villegaslindsay29@gmail.com").toLowerCase(),
  supabaseUrl: process.env.SUPABASE_URL?.trim() || "https://rwxssihkseyrgjqphhci.supabase.co",
  supabasePublishableKey:
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() || "sb_publishable_3HSOcS2zKxP_xMpgDmOBxA_m4R9hCmq",
};
