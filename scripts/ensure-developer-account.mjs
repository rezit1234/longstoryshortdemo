/**
 * Založí/aktualizuje skrytý developerský účet `rezit`.
 * Heslo ber z DEVELOPER_PASSWORD (necommituj ho).
 *
 *   node --env-file=.env.local scripts/ensure-developer-account.mjs
 */
import { createClient } from "@supabase/supabase-js";

const username = (process.env.DEVELOPER_USERNAME || "rezit").trim().toLowerCase();
const password = (process.env.DEVELOPER_PASSWORD || "").trim();
const fullName = (process.env.DEVELOPER_FULL_NAME || "Rezit").trim();
const email = `${username}@lss.local`;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!password) {
  console.error("Chybí DEVELOPER_PASSWORD.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function resolveRole() {
  // Preferuj developer; pokud enum ještě nemá hodnotu, spadni na owner.
  const probe = await admin.from("admin_profiles").select("id").limit(1);
  if (probe.error) throw probe.error;

  // Zkusíme dry-run přes check constraint nejde — ověříme enum přes insert do temp?
  // Jednoduše: zkus update neexistujícího s role developer přes RPC není.
  // Použijeme: select where role = 'developer' — pokud enum chybí, PostgREST vrátí chybu.
  const check = await admin
    .from("admin_profiles")
    .select("id")
    .eq("role", "developer")
    .limit(1);
  if (check.error && /developer|invalid input value|enum/i.test(check.error.message)) {
    console.warn(
      "Enum 'developer' ještě není v DB — používám dočasně role=owner (účet zůstane skrytý přes username).",
    );
    return "owner";
  }
  return "developer";
}

const role = await resolveRole();

async function upsertProfile(userId) {
  const { error } = await admin.from("admin_profiles").upsert({
    id: userId,
    username,
    full_name: fullName,
    role,
  });
  if (error) throw error;
}

async function updateAuth(userId) {
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password,
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName, username, role },
  });
  if (error) throw error;
}

const { data: existingProfile } = await admin
  .from("admin_profiles")
  .select("id, username, role")
  .eq("username", username)
  .maybeSingle();

if (existingProfile?.id) {
  await updateAuth(existingProfile.id);
  await upsertProfile(existingProfile.id);
  console.log(`OK updated ${username} as ${role} (${existingProfile.id})`);
  process.exit(0);
}

const { data: listed, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 200,
});
if (listError) throw listError;

const existingAuth = listed?.users?.find(
  (user) =>
    user.email?.toLowerCase() === email.toLowerCase() ||
    user.user_metadata?.username === username,
);

if (existingAuth) {
  await updateAuth(existingAuth.id);
  await upsertProfile(existingAuth.id);
  console.log(`OK linked ${username} as ${role} (${existingAuth.id})`);
  process.exit(0);
}

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName, username, role },
});
if (createError || !created.user) throw createError || new Error("create failed");

try {
  await upsertProfile(created.user.id);
} catch (error) {
  await admin.auth.admin.deleteUser(created.user.id);
  throw error;
}

console.log(`OK created ${username} as ${role} (${created.user.id})`);
