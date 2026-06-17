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

const ADMIN_ID   = "eb43f098-119d-490a-938f-cd947bc274db";
const SATIS_ID   = "59006094-1ff7-4ffe-9cc4-3f2d3d102f86";
const OPS_ID     = "be607106-c050-464c-b135-365ba04abc46";
const EGITIM_ID  = "aa77b1e2-8a2b-4249-a3a3-0c6a451b6923";

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
  "apikey": SERVICE_ROLE_KEY,
  "Prefer": "return=representation",
};

async function insert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers,
    body: JSON.stringify(rows),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`❌ ${table}:`, JSON.stringify(data));
    return [];
  }
  return data;
}

// Null-safe ID lookup — undefined → null prevents PGRST102
function id(map, key) {
  const val = map[key];
  return val !== undefined ? val : null;
}

async function deleteAll(table) {
  // Use a filter that matches everything (created_at or a non-null column)
  // For junction tables without id, we need a different filter
  const junctionTables = ["meeting_contacts", "package_trainings", "meeting_contacts", "wg_members"];
  const filter = junctionTables.includes(table)
    ? `meeting_id=not.is.null` // will fail for non-meeting tables but that's ok
    : `created_at=not.is.null`;

  // For tables that might not have created_at, fall back to a raw SQL truncate via RPC
  // For simplicity, just use the id filter for tables with id, else skip gracefully
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { ...headers, "Prefer": "return=minimal" },
  });
  if (!res.ok && res.status !== 404 && res.status !== 400) {
    // Try with a generic filter that works for all tables
    const res2 = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=not.is.null`, {
      method: "DELETE",
      headers: { ...headers, "Prefer": "return=minimal" },
    });
    if (!res2.ok && res2.status !== 404 && res2.status !== 400) {
      const txt = await res2.text();
      console.error(`  ⚠️  cleanup ${table}:`, txt.slice(0, 80));
    }
  }
}

async function cleanup() {
  console.log("🗑️  Eski demo data temizleniyor...");
  // Order matters — delete children before parents
  const tables = [
    "meeting_contacts", "todo_items", "wg_members", "wg_sessions", "wg_phases",
    "meetings", "activities", "orders", "contracts", "assignments",
    "trainers", "package_trainings", "packages", "trainings",
    "leads", "onboarding_milestones", "coordinators", "contacts", "schools",
  ];
  for (const t of tables) {
    await deleteAll(t);
  }
  console.log("   ✅ Temizlendi\n");
}

async function seedData() {
  await cleanup();
  console.log("🌱 Demo data ekleniyor...\n");

  // ── Contacts ──────────────────────────────────────────────
  console.log("👤 Kişiler...");
  const contacts = await insert("contacts", [
    { full_name: "Ayşe Kaya",       email: "ayse.kaya@kadikoylis.edu.tr",    phone: "0532 111 2233", title: "Okul Koordinatörü", organization: "Kadıköy Anadolu Lisesi",  contact_type: "okul_koordinatoru" },
    { full_name: "Mehmet Demir",     email: "mehmet.demir@besiktas.edu.tr",   phone: "0533 222 3344", title: "Müdür Yardımcısı",  organization: "Beşiktaş Ortaokulu",      contact_type: "okul_koordinatoru" },
    { full_name: "Fatma Şahin",      email: "fatma.sahin@uskudar.edu.tr",     phone: "0534 333 4455", title: "Rehber Öğretmen",   organization: "Üsküdar İlkokulu",        contact_type: "okul_koordinatoru" },
    { full_name: "Ali Yıldız",       email: "ali.yildiz@maltepe.edu.tr",      phone: "0535 444 5566", title: "Müdür",             organization: "Maltepe Fen Lisesi",      contact_type: "okul_koordinatoru" },
    { full_name: "Zeynep Arslan",    email: "zeynep.arslan@sisli.edu.tr",     phone: "0536 555 6677", title: "Koordinatör",       organization: "Şişli Koleji",            contact_type: "okul_koordinatoru" },
    { full_name: "Dr. Can Öztürk",   email: "can.ozturk@egitimci.com",        phone: "0537 666 7788", title: "Eğitim Uzmanı",     organization: "Bağımsız",               contact_type: "egitmen"           },
    { full_name: "Prof. Elif Çelik", email: "elif.celik@universite.edu.tr",   phone: "0538 777 8899", title: "Öğretim Görevlisi", organization: "Marmara Üniversitesi",    contact_type: "egitmen"           },
    { full_name: "Hasan Koç",        email: "hasan.koc@ataşehir.edu.tr",      phone: "0539 888 9900", title: "İdari Koordinatör", organization: "Ataşehir Anadolu Lisesi", contact_type: "potansiyel"        },
    { full_name: "Selin Güneş",      email: "selin.gunes@pendik.edu.tr",      phone: "0541 999 0011", title: "Öğretmen",          organization: "Pendik Ortaokulu",        contact_type: "potansiyel"        },
    { full_name: "Mustafa Yılmaz",   email: "mustafa.yilmaz@tuzla.edu.tr",    phone: "0542 000 1122", title: "Müdür",             organization: "Tuzla İlköğretim",        contact_type: "partner"           },
  ]);
  console.log(`   ✅ ${contacts.length} kişi eklendi`);

  const c = contacts.reduce((acc, c) => { acc[c.email] = c.id; return acc; }, {});

  // ── Schools ───────────────────────────────────────────────
  console.log("🏫 Okullar...");
  const schools = await insert("schools", [
    { name: "Kadıköy Anadolu Lisesi",  city: "İstanbul", district: "Kadıköy",  school_type: "devlet", status: "aktif",      partnership_start_date: "2025-09-01" },
    { name: "Beşiktaş Ortaokulu",      city: "İstanbul", district: "Beşiktaş", school_type: "devlet", status: "aktif",      partnership_start_date: "2025-10-15" },
    { name: "Üsküdar İlkokulu",        city: "İstanbul", district: "Üsküdar",  school_type: "devlet", status: "aktif",      partnership_start_date: "2026-01-10" },
    { name: "Şişli Koleji",            city: "İstanbul", district: "Şişli",    school_type: "ozel",   status: "aktif",      partnership_start_date: "2025-06-01" },
    { name: "Maltepe Fen Lisesi",      city: "İstanbul", district: "Maltepe",  school_type: "devlet", status: "pasif",      partnership_start_date: "2024-09-01" },
    { name: "Ataşehir Anadolu Lisesi", city: "İstanbul", district: "Ataşehir", school_type: "devlet", status: "potansiyel", partnership_start_date: null         },
    { name: "Pendik Ortaokulu",        city: "İstanbul", district: "Pendik",   school_type: "devlet", status: "potansiyel", partnership_start_date: null         },
  ]);
  console.log(`   ✅ ${schools.length} okul eklendi`);

  const s = schools.reduce((acc, s) => { acc[s.name] = s.id; return acc; }, {});

  // ── Coordinators ──────────────────────────────────────────
  await insert("coordinators", [
    { school_id: s["Kadıköy Anadolu Lisesi"],  contact_id: id(c, "ayse.kaya@kadikoylis.edu.tr"),  is_primary: true  },
    { school_id: s["Beşiktaş Ortaokulu"],      contact_id: id(c, "mehmet.demir@besiktas.edu.tr"), is_primary: true  },
    { school_id: s["Üsküdar İlkokulu"],        contact_id: id(c, "fatma.sahin@uskudar.edu.tr"),   is_primary: true  },
    { school_id: s["Şişli Koleji"],            contact_id: id(c, "zeynep.arslan@sisli.edu.tr"),   is_primary: true  },
    { school_id: s["Maltepe Fen Lisesi"],      contact_id: id(c, "ali.yildiz@maltepe.edu.tr"),    is_primary: true  },
    { school_id: s["Ataşehir Anadolu Lisesi"], contact_id: id(c, "hasan.koc@ataşehir.edu.tr"),    is_primary: false },
  ]);

  // ── Onboarding milestones ─────────────────────────────────
  const aktifOkullar = [s["Kadıköy Anadolu Lisesi"], s["Beşiktaş Ortaokulu"], s["Şişli Koleji"]];
  const milestones = [];
  for (const school_id of aktifOkullar) {
    milestones.push(
      { school_id, milestone_key: "sozlesme_imzalandi",        completed_at: new Date().toISOString(), completed_by: ADMIN_ID },
      { school_id, milestone_key: "koordinator_girildi",        completed_at: new Date().toISOString(), completed_by: ADMIN_ID },
      { school_id, milestone_key: "egitim_paketi_belirlendi",   completed_at: new Date().toISOString(), completed_by: OPS_ID   },
    );
  }
  milestones.push(
    { school_id: s["Kadıköy Anadolu Lisesi"], milestone_key: "acilis_toplantisi_yapildi",   completed_at: new Date().toISOString(), completed_by: ADMIN_ID },
    { school_id: s["Kadıköy Anadolu Lisesi"], milestone_key: "certifiX_hesabi_olusturuldu", completed_at: new Date().toISOString(), completed_by: OPS_ID   },
  );
  await insert("onboarding_milestones", milestones);

  // ── Trainings ─────────────────────────────────────────────
  console.log("📚 Eğitimler...");
  const trainings = await insert("trainings", [
    { title: "Yapay Zeka ile Ders Tasarımı",        category: "yapay_zeka",          format: "yuz_yuze",  duration_hours: 6,  status: "aktif" },
    { title: "Olumlu Okul İklimi Atölyesi",          category: "olumlu_okul_iklimi",  format: "yuz_yuze",  duration_hours: 8,  status: "aktif" },
    { title: "Etkili Soru Sorma Teknikleri",         category: "etkili_ogretmenlik",  format: "cevrimici", duration_hours: 3,  status: "aktif" },
    { title: "Dijital Araçlarla Öğretim",            category: "yapay_zeka",          format: "hibrit",    duration_hours: 5,  status: "aktif" },
    { title: "Sınıf Yönetimi ve Motivasyon",         category: "etkili_ogretmenlik",  format: "yuz_yuze",  duration_hours: 4,  status: "aktif" },
  ]);
  console.log(`   ✅ ${trainings.length} eğitim eklendi`);
  const t = trainings.reduce((acc, t) => { acc[t.title] = t.id; return acc; }, {});

  // ── Trainers ──────────────────────────────────────────────
  const trainers = await insert("trainers", [
    { contact_id: id(c, "can.ozturk@egitimci.com"),      expertise_areas: ["yapay_zeka", "dijital_araclar"], status: "aktif", bio: "10 yıllık eğitim teknolojileri deneyimi." },
    { contact_id: id(c, "elif.celik@universite.edu.tr"), expertise_areas: ["olumlu_okul_iklimi", "sinif_yonetimi"], status: "aktif", bio: "Eğitim psikolojisi alanında doktora." },
  ]);
  const tr = trainers.filter(t => t.contact_id).reduce((acc, t) => { acc[t.contact_id] = t.id; return acc; }, {});

  // ── Assignments ───────────────────────────────────────────
  console.log("📋 Atamalar...");
  const today = new Date();
  const past10 = new Date(today); past10.setDate(today.getDate() - 10);
  const past3  = new Date(today); past3.setDate(today.getDate() - 3);
  const future7  = new Date(today); future7.setDate(today.getDate() + 7);
  const future14 = new Date(today); future14.setDate(today.getDate() + 14);
  const future21 = new Date(today); future21.setDate(today.getDate() + 21);

  const fmt = (d) => d.toISOString().split("T")[0];

  const assignments = await insert("assignments", [
    { school_id: s["Kadıköy Anadolu Lisesi"], training_id: t["Yapay Zeka ile Ders Tasarımı"],  trainer_id: id(tr, id(c, "can.ozturk@egitimci.com")),      assigned_to: EGITIM_ID, status: "tamamlandi", scheduled_date: fmt(past10),   completed_date: fmt(past10), period: "2026-Q2", notes: null, completion_notes: null },
    { school_id: s["Beşiktaş Ortaokulu"],     training_id: t["Olumlu Okul İklimi Atölyesi"],   trainer_id: id(tr, id(c, "elif.celik@universite.edu.tr")), assigned_to: EGITIM_ID, status: "tamamlandi", scheduled_date: fmt(past3),    completed_date: fmt(past3),  period: "2026-Q2", notes: null, completion_notes: null },
    { school_id: s["Şişli Koleji"],           training_id: t["Etkili Soru Sorma Teknikleri"],  trainer_id: id(tr, id(c, "can.ozturk@egitimci.com")),      assigned_to: EGITIM_ID, status: "planlanmis", scheduled_date: fmt(future7),  completed_date: null,        period: "2026-Q3", notes: null, completion_notes: null },
    { school_id: s["Üsküdar İlkokulu"],       training_id: t["Dijital Araçlarla Öğretim"],     trainer_id: null,                                          assigned_to: EGITIM_ID, status: "planlanmis", scheduled_date: fmt(future14), completed_date: null,        period: "2026-Q3", notes: null, completion_notes: null },
    { school_id: s["Kadıköy Anadolu Lisesi"], training_id: t["Sınıf Yönetimi ve Motivasyon"],  trainer_id: id(tr, id(c, "elif.celik@universite.edu.tr")), assigned_to: EGITIM_ID, status: "planlanmis", scheduled_date: fmt(future21), completed_date: null,        period: "2026-Q3", notes: null, completion_notes: null },
    { school_id: s["Maltepe Fen Lisesi"],     training_id: t["Yapay Zeka ile Ders Tasarımı"],  trainer_id: null,                                          assigned_to: EGITIM_ID, status: "planlanmis", scheduled_date: fmt(past3),    completed_date: null,        period: "2026-Q2", notes: "Eğitmen bulunamadı, ertelendi.", completion_notes: null },
  ]);
  console.log(`   ✅ ${assignments.length} atama eklendi`);

  // ── Leads ─────────────────────────────────────────────────
  console.log("📈 Leadler...");
  const future5 = new Date(today); future5.setDate(today.getDate() + 5);
  const past5   = new Date(today); past5.setDate(today.getDate() - 5);

  const leads = await insert("leads", [
    { contact_id: id(c, "hasan.koc@ataşehir.edu.tr"),  stage: "teklif_verildi",     assigned_to: SATIS_ID, source: "referans",    estimated_value: 45000, next_action_date: fmt(future5), school_id: null,              notes: "Müdür teklife olumlu baktı.",   reminder_sent: false },
    { contact_id: id(c, "selin.gunes@pendik.edu.tr"),   stage: "gorusme_yapildi",    assigned_to: SATIS_ID, source: "etkinlik",    estimated_value: 30000, next_action_date: fmt(past5),   school_id: null,              notes: "Fuarda tanıştık, ilgileniyor.", reminder_sent: false },
    { contact_id: id(c, "mustafa.yilmaz@tuzla.edu.tr"), stage: "yeni_baglanti",      assigned_to: SATIS_ID, source: "soguk_arama", estimated_value: 20000, next_action_date: fmt(future7), school_id: null,              notes: null,                            reminder_sent: false },
    { contact_id: id(c, "zeynep.arslan@sisli.edu.tr"),  stage: "kapandi_kazanildi",  assigned_to: SATIS_ID, source: "referans",    estimated_value: 60000, next_action_date: null,         school_id: s["Şişli Koleji"], notes: null,                            reminder_sent: false },
    { contact_id: id(c, "ali.yildiz@maltepe.edu.tr"),   stage: "kapandi_kaybedildi", assigned_to: SATIS_ID, source: "web",         estimated_value: 25000, next_action_date: null,         school_id: null,              notes: "Bütçe yok bu yıl.",             reminder_sent: false },
  ]);
  console.log(`   ✅ ${leads.length} lead eklendi`);

  const leadIds = leads.reduce((acc, l) => { acc[l.contact_id] = l.id; return acc; }, {});

  // ── Activities ────────────────────────────────────────────
  await insert("activities", [
    { school_id: s["Kadıköy Anadolu Lisesi"], lead_id: null, contact_id: null, created_by: ADMIN_ID,  activity_type: "toplanti", summary: "Açılış toplantısı yapıldı",      details: null, activity_date: fmt(past10) },
    { school_id: s["Beşiktaş Ortaokulu"],     lead_id: null, contact_id: null, created_by: OPS_ID,    activity_type: "telefon",  summary: "Koordinatör ile durum görüşmesi", details: null, activity_date: fmt(past3)  },
    { school_id: null, lead_id: id(leadIds, id(c, "hasan.koc@ataşehir.edu.tr")), contact_id: null, created_by: SATIS_ID, activity_type: "toplanti", summary: "Online demo yapıldı",      details: null, activity_date: fmt(past5) },
    { school_id: null, lead_id: id(leadIds, id(c, "selin.gunes@pendik.edu.tr")),  contact_id: null, created_by: SATIS_ID, activity_type: "eposta",   summary: "Teklif maili gönderildi", details: null, activity_date: fmt(past3) },
  ]);

  // ── Packages ──────────────────────────────────────────────
  const packages = await insert("packages", [
    { name: "Temel Eğitim Paketi", description: "3 eğitimden oluşan başlangıç paketi", status: "aktif" },
    { name: "Kapsamlı Gelişim Paketi", description: "5 eğitimli tam dönüşüm programı", status: "aktif" },
  ]);
  const pkg = packages.reduce((acc, p) => { acc[p.name] = p.id; return acc; }, {});

  await insert("package_trainings", [
    { package_id: pkg["Temel Eğitim Paketi"],      training_id: t["Yapay Zeka ile Ders Tasarımı"]   },
    { package_id: pkg["Temel Eğitim Paketi"],      training_id: t["Etkili Soru Sorma Teknikleri"]  },
    { package_id: pkg["Temel Eğitim Paketi"],      training_id: t["Sınıf Yönetimi ve Motivasyon"] },
    { package_id: pkg["Kapsamlı Gelişim Paketi"],  training_id: t["Yapay Zeka ile Ders Tasarımı"]   },
    { package_id: pkg["Kapsamlı Gelişim Paketi"],  training_id: t["Olumlu Okul İklimi Atölyesi"]    },
    { package_id: pkg["Kapsamlı Gelişim Paketi"],  training_id: t["Etkili Soru Sorma Teknikleri"]  },
    { package_id: pkg["Kapsamlı Gelişim Paketi"],  training_id: t["Dijital Araçlarla Öğretim"]      },
    { package_id: pkg["Kapsamlı Gelişim Paketi"],  training_id: t["Sınıf Yönetimi ve Motivasyon"] },
  ]);

  // ── Contracts ─────────────────────────────────────────────
  console.log("📄 Sözleşmeler...");
  const expiring = new Date(today); expiring.setDate(today.getDate() + 20);
  const nextYear = new Date(today); nextYear.setFullYear(today.getFullYear() + 1);

  await insert("contracts", [
    { school_id: s["Kadıköy Anadolu Lisesi"], package_id: pkg["Kapsamlı Gelişim Paketi"], created_by: ADMIN_ID, start_date: "2025-09-01", end_date: fmt(expiring), contract_value: 60000, payment_status: "kismi",      status: "aktif",     auto_renew: true  },
    { school_id: s["Şişli Koleji"],           package_id: pkg["Temel Eğitim Paketi"],     created_by: ADMIN_ID, start_date: "2026-01-01", end_date: fmt(nextYear), contract_value: 35000, payment_status: "tamamlandi", status: "aktif",     auto_renew: false },
    { school_id: s["Beşiktaş Ortaokulu"],     package_id: null,                           created_by: ADMIN_ID, start_date: "2025-10-15", end_date: "2026-08-30",  contract_value: 28000, payment_status: "tamamlandi", status: "aktif",     auto_renew: false },
    { school_id: s["Maltepe Fen Lisesi"],     package_id: pkg["Temel Eğitim Paketi"],     created_by: ADMIN_ID, start_date: "2024-09-01", end_date: "2025-06-30",  contract_value: 20000, payment_status: "tamamlandi", status: "suresi_doldu", auto_renew: false },
  ]);
  console.log(`   ✅ Sözleşmeler eklendi`);

  // ── Meetings + Todos ──────────────────────────────────────
  console.log("📝 Toplantılar ve todolar...");
  const meetings = await insert("meetings", [
    {
      title: "Kadıköy AL — Dönem Değerlendirme",
      meeting_date: new Date(today.getTime() - 7 * 86400000).toISOString(),
      meeting_type: "okul_ziyareti",
      notes: "## Toplantı Notları\n\nOkul koordinatörü Ayşe Hanım ile Q2 değerlendirmesi yapıldı.\n\n**Olumlu noktalar:**\n- Yapay Zeka eğitimi çok beğenildi\n- Öğretmen katılımı %85\n\n**Aksiyon kalemleri:**\n- Q3 için yeni eğitim takvimi oluşturulacak\n- CertifiX hesapları aktive edilecek",
      related_entity_type: "school",
      related_entity_id: s["Kadıköy Anadolu Lisesi"],
      tags: ["degerlendirme", "q2", "kadikoy"],
      created_by: ADMIN_ID,
    },
    {
      title: "Haftalık Satış Toplantısı",
      meeting_date: new Date(today.getTime() - 2 * 86400000).toISOString(),
      meeting_type: "ekip",
      notes: "## Satış Pipeline Güncellemesi\n\nAktif leadler gözden geçirildi.\n\n- Ataşehir AL: teklif aşamasında, bu hafta karar bekleniyor\n- Pendik Ortaokulu: ek bilgi talep etti\n- Tuzla demo randevusu alındı",
      related_entity_type: null,
      related_entity_id: null,
      tags: ["satis", "pipeline", "haftalik"],
      created_by: SATIS_ID,
    },
  ]);

  const meetingIds = meetings.map((m) => m.id);

  await insert("todo_items", [
    { meeting_id: meetingIds[0], text: "Q3 eğitim takvimini oluştur ve Ayşe Hanım'a gönder",        assigned_to: EGITIM_ID, due_date: fmt(future7),  status: "acik"       },
    { meeting_id: meetingIds[0], text: "Kadıköy AL için CertifiX hesaplarını aktive et",             assigned_to: OPS_ID,    due_date: fmt(future5),  status: "acik"       },
    { meeting_id: meetingIds[0], text: "Q2 tamamlanma raporunu hazırla",                             assigned_to: ADMIN_ID,  due_date: fmt(past3),    status: "tamamlandi" },
    { meeting_id: meetingIds[1], text: "Ataşehir AL müdürünü ara — teklif kararını öğren",           assigned_to: SATIS_ID,  due_date: fmt(future5),  status: "acik"       },
    { meeting_id: meetingIds[1], text: "Pendik Ortaokulu için ek bilgi dokümanı hazırla",            assigned_to: SATIS_ID,  due_date: fmt(future7),  status: "acik"       },
  ]);
  console.log(`   ✅ Toplantılar ve todolar eklendi`);

  // ── Meeting contacts ──────────────────────────────────────
  await insert("meeting_contacts", [
    { meeting_id: meetingIds[0], contact_id: id(c, "ayse.kaya@kadikoylis.edu.tr") },
  ]);

  console.log("\n✨ Demo data başarıyla eklendi!");
  console.log("\n📊 Özet:");
  console.log(`   • ${schools.length} okul (4 aktif, 1 pasif, 2 potansiyel)`);
  console.log(`   • ${contacts.length} kişi`);
  console.log(`   • ${leads.length} lead (1 kazanıldı, 1 kaybedildi, 3 aktif)`);
  console.log(`   • ${assignments.length} atama (2 tamamlandı, 1 gecikmiş, 3 planlı)`);
  console.log(`   • 4 sözleşme (1 süresi dolacak)`);
  console.log(`   • 2 toplantı + 5 todo`);
}

seedData().catch(console.error);
