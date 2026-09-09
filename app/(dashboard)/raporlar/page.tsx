import { createClient } from "@/lib/supabase/server";
import { KesitPanosu } from "@/components/reports/kesit-panosu";
import { satirlariKesiteCevir, type KayitliKesit } from "@/components/reports/kesit-map";
import type { OkulAdayi } from "@/components/reports/kurum-eslestir";
import { trendKur, type Trend } from "@/components/reports/kesit-trend";
import { oncekiKararlariCikar } from "@/components/reports/kesit-map";
import type { OncekiKarar } from "@/components/reports/kurum-eslestir";
import type { Database } from "@/types/database";

export const metadata = { title: "Raporlar — TeacherX CRM" };
export const dynamic = "force-dynamic";

/** Aylık Takip'te gösterilen en fazla kesit — ayda bir yüklemede 3 yıl. */
const TREND_KESIT_SINIRI = 36;

export default async function RaporlarPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: memberRaw } = await supabase
    .from("team_members").select("role, department").eq("id", user?.id ?? "").single();
  const member = memberRaw as { role: string; department: string | null } | null;
  const allowed = member?.role === "admin" || member?.department === "operasyon";

  if (!allowed) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-sm text-gray-400">
        Bu sayfa yalnızca admin ve operasyon ekibi içindir.
      </div>
    );
  }

  // Eşleştirme için okul listesi
  const { data: okulRows } = await supabase.from("schools").select("id, name, status").order("name");
  const okullar: OkulAdayi[] = okulRows ?? [];

  // En son kaydedilmiş kesit. Tablolar yoksa sessizce boş görünmek yerine
  // kullanıcıya ne yapması gerektiğini söyleriz.
  let kayitli: KayitliKesit | null = null;
  let semaHatasi: string | null = null;

  const { data: kesitRows, error: kesitHata } = await supabase
    .from("report_kesit")
    .select("id, kesit_tarihi, dosya_adi, kaynak_satir")
    .order("kesit_tarihi", { ascending: false })
    .limit(1);

  if (kesitHata) {
    semaHatasi = kesitHata.message;
  } else if (kesitRows && kesitRows.length > 0) {
    const k = kesitRows[0];
    const { data: kurumlar } = await supabase
      .from("report_kurum").select("*").eq("kesit_id", k.id).order("kurum_adi");
    const kurumIdListesi = (kurumlar ?? []).map((r) => r.id);

    const [{ data: subeler }, { data: egitimler }, { data: sertAylar }] = await Promise.all([
      supabase.from("report_sube").select("*").in("kurum_id", kurumIdListesi),
      supabase.from("report_egitim").select("*").in("kurum_id", kurumIdListesi),
      supabase.from("report_sertifika_ay").select("*").in("kurum_id", kurumIdListesi),
    ]);

    kayitli = {
      id: k.id,
      kesitTarihi: k.kesit_tarihi,
      dosyaAdi: k.dosya_adi,
      kaynakSatir: k.kaynak_satir,
      kurumlar: satirlariKesiteCevir(kurumlar ?? [], subeler ?? [], egitimler ?? [], sertAylar ?? []),
      kurumIdleri: Object.fromEntries((kurumlar ?? []).map((r) => [r.kurum_adi, r.id])),
      okulBaglantilari: Object.fromEntries((kurumlar ?? []).map((r) => [r.kurum_adi, r.school_id])),
    };
  }

  // Aylık Takip — tüm kesitlerin kurum satırları.
  // Satır sayısı kesit × kurum ile büyür (12 kesit × 92 kurum ≈ 1100) ve
  // PostgREST tek istekte 1000 satırda kesiyor; bu yüzden sayfalanır.
  let trend: Trend | null = null;
  // Kurum → önceki eşleştirme kararı. Aynı satırlardan çıkar, ek sorgu yok.
  let oncekiKararlar: Record<string, OncekiKarar> = {};

  if (!semaHatasi) {
    const { data: tumKesitler } = await supabase
      .from("report_kesit")
      .select("id, kesit_tarihi, dosya_adi, kaynak_satir")
      .order("kesit_tarihi", { ascending: false })
      .limit(TREND_KESIT_SINIRI);

    if (tumKesitler && tumKesitler.length > 0) {
      const idler = tumKesitler.map((k) => k.id);
      const satirlar: Database["public"]["Tables"]["report_kurum"]["Row"][] = [];
      const SAYFA = 1000;

      for (let bas = 0; ; bas += SAYFA) {
        const { data: sayfa, error } = await supabase
          .from("report_kurum")
          .select("*")
          .in("kesit_id", idler)
          .order("kesit_id")
          .order("kurum_adi")
          .range(bas, bas + SAYFA - 1);

        if (error || !sayfa) break;
        satirlar.push(...sayfa);
        if (sayfa.length < SAYFA) break;
      }

      trend = trendKur(tumKesitler, satirlar);
      oncekiKararlar = oncekiKararlariCikar(tumKesitler, satirlar);
    }
  }

  return (
    <div className="space-y-6">
      <div className="ic-arac">
        <p className="mb-1 text-[12px] font-bold uppercase tracking-[0.16em] text-tx-kirmizi">TeacherX</p>
        <h1 className="font-baslik text-2xl font-semibold text-tx-metin">Raporlar</h1>
        <p className="mt-0.5 font-mono text-[11px] text-tx-gri">
          sürüm {process.env.NEXT_PUBLIC_BUILD_SHA ?? "local"}
        </p>
        <p className="mt-1 text-sm text-tx-gri">
          Platformdan aldığınız tamamlama raporunu yükleyin; kurum karşılaştırması, şube ve eğitim
          analizi ile kuruma gönderilebilir rapor otomatik çıkar. Dosya tarayıcınızda işlenir;
          ad, e-posta ve kişi bazlı bilgi hiçbir yere kaydedilmez.
        </p>
      </div>

      <KesitPanosu
        kullaniciId={user?.id ?? ""}
        okullar={okullar}
        kayitli={kayitli}
        trend={trend}
        oncekiKararlar={oncekiKararlar}
        semaHatasi={semaHatasi}
      />
    </div>
  );
}
