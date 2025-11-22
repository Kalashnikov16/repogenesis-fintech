import { createClient } from "@supabase/supabase-js";

// REPLACE WITH YOUR ACTUAL SUPABASE KEYS
const supabaseUrl = "https://pudkmyomgwqpapxmwyms.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGtteW9tZ3dxcGFweG13eW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MzYyNzcsImV4cCI6MjA3OTMxMjI3N30.NvQ0pEXjAV2SppKtY4dyNjyt0290wYHCbfZtT51Ul4Y"; // The 'anon' key

export const supabase = createClient(supabaseUrl, supabaseKey);
