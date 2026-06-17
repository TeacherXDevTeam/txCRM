import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
try {
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .forEach((l) => {
      const [key, ...rest] = l.split("=");
      if (key) process.env[key.trim()] = rest.join("=").trim();
    });
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ .env.local dosyasında NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  process.exit(1);
}

const DEFAULT_PASSWORD = "TeacherX2026!";

const USERS = [
  { email: "admin@teacherx.online",      full_name: "CRM Admin",           role: "admin",  department: "operasyon" },
  { email: "satis@teacherx.online",      full_name: "Satış Ekibi",         role: "member", department: "satis"     },
  { email: "operasyon@teacherx.online",  full_name: "Operasyon Ekibi",     role: "member", department: "operasyon" },
  { email: "icerik@teacherx.online",     full_name: "İçerik Ekibi",        role: "member", department: "icerik"    },
  { email: "egitim@teacherx.online",     full_name: "Eğitim Ekibi",        role: "member", department: "egitim"    },
  { email: "izleyici@teacherx.online",   full_name: "Yönetici İzleyici",   role: "viewer", department: null        },
];

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
  "apikey": SERVICE_ROLE_KEY,
};

async function createAuthUser(user) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: user.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: user.full_name, role: user.role },
    }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data };
  return { data };
}

async function upsertTeamMember(userId, user) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/team_members`, {
    method: "POST",
    headers: {
      ...headers,
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: userId,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      department: user.department,
      is_active: true,
    }),
  });
  if (!res.ok) {
    const data = await res.json();
    return { error: data };
  }
  return { data: null };
}

async function seed() {
  console.log("🌱 Seed başlıyor...\n");

  for (const user of USERS) {
    const { data: authData, error: authError } = await createAuthUser(user);

    if (authError) {
      const msg = authError.msg || authError.message || authError.error_description || JSON.stringify(authError);
      if (msg?.includes("already been registered") || authError.code === "email_exists") {
        console.log(`⚠️  ${user.email} — zaten var, atlanıyor`);
      } else {
        console.error(`❌ ${user.email} — Auth hatası: ${msg}`);
      }
      continue;
    }

    const { error: memberError } = await upsertTeamMember(authData.id, user);
    if (memberError) {
      const msg = memberError.message || memberError.details || JSON.stringify(memberError);
      console.error(`❌ ${user.email} — team_members hatası: ${msg}`);
      continue;
    }

    console.log(`✅ ${user.email}  (${user.role}${user.department ? " / " + user.department : ""})`);
  }

  console.log(`\n✨ Tamamlandı!`);
  console.log(`\n📋 Giriş bilgileri:`);
  console.log(`   Şifre (hepsi): ${DEFAULT_PASSWORD}\n`);
  USERS.forEach((u) => console.log(`   • ${u.email}  →  ${u.role}`));
}

seed().catch(console.error);
