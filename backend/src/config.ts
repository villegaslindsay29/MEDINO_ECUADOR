export const config = {
  adminEmail: (process.env.ADMIN_EMAIL?.trim() || "villegaslindsay29@gmail.com").toLowerCase(),
  supabaseUrl: process.env.SUPABASE_URL?.trim() || "https://rwxssihkseyrgjqphhci.supabase.co",
  supabasePublishableKey:
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() || "sb_publishable_3HSOcS2zKxP_xMpgDmOBxA_m4R9hCmq",
  databaseUrl: process.env.DATABASE_URL?.trim() || "",
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || "",
  geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
};
