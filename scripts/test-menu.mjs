import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://tqztlckmeznbsjcszzyg.supabase.co";
const supabaseKey = "sb_publishable_pwbQw_DdIm4q5jjBMSpCSA_5aRUw7cj";

const client = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: menu, error } = await client.from("menu_items").select("id, name, store_id, price_centavos, is_published, is_available");
  console.log("Menu items count:", menu?.length, "Error:", error);
  if (menu) {
    for (const m of menu) {
      console.log(`- ${m.name} (Store: ${m.store_id}, Price: ${m.price_centavos/100}, Pub: ${m.is_published}, Avail: ${m.is_available})`);
    }
  }
}

check().catch(console.error);
