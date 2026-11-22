import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://tqztlckmeznbsjcszzyg.supabase.co";
const supabaseKey = "sb_publishable_pwbQw_DdIm4q5jjBMSpCSA_5aRUw7cj";

const client = createClient(supabaseUrl, supabaseKey);

async function testCustomerActions() {
  // Sign in as customer (customer seed: customer@mati-foodfinder.com or check if customer exists)
  // Let's see what users exist in auth.users or check sequence permissions via RPC or postgres query
  console.log("Checking sequence usage permissions...");
}

testCustomerActions().catch(console.error);
