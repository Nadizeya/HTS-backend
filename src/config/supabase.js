const { createClient } = require("@supabase/supabase-js");

// Validate environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL environment variable");
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error("Missing SUPABASE_ANON_KEY environment variable");
}

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
  },
);

// Optional: Create a service role client for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
  },
);
// Test connection and log status
(async () => {
  try {
    const { data, error } = await supabase
      .from("_test_connection")
      .select("*")
      .limit(1);
    if (
      error &&
      (error.code === "42P01" ||
        error.message.includes("Could not find the table"))
    ) {
      // Table doesn't exist, but connection is working
      console.log("✓ Supabase database connected successfully");
      console.log(`  URL: ${process.env.SUPABASE_URL}`);
    } else if (error) {
      console.warn(
        "⚠ Supabase client created but connection test failed:",
        error.message,
      );
    } else {
      console.log("✓ Supabase database connected successfully");
      console.log(`  URL: ${process.env.SUPABASE_URL}`);
    }
  } catch (err) {
    console.error("✗ Supabase connection error:", err.message);
  }
})();

module.exports = supabase;
module.exports.supabaseAdmin = supabaseAdmin;
