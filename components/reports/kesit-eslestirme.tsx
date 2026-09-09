"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Check, CircleAlert, History, Plus, Save, Search, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { KesitKurum } from "./kesit";
import {
  kararlariHazirla, sehirTahminEt, eslesmeSupheliMi,
  type Karar, type KararDurumu, type OkulAdayi, type OncekiKarar,
} from "./kurum-eslestir";
import { tr } from "./brand";
import { formatDate } from "@/lib/utils";

interface Props {
  kurumlar: KesitKurum[];
  okullar: OkulAdayi[];
  /** Önceki kesitlerden hatırlanan kararlar — bulanık eşleştirmeyi ezer */
  oncekiKararlar: Record<string, OncekiKarar>;
  kaydediliyor: boolean;
  hata: string | null;
  onGeri: () => void;
  onKaydet: (kararlar: Record<string, Karar>) => void;
}

export function KesitEslestirme({
  kurumlar, okullar, oncekiKararlar, kaydediliyor, hata, onGeri, onKaydet,
}: Props) {
  const subeAdlari = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const k of kurumlar) m.set(k.kurumAdi, k.subeler.map((s) => s.subeAdi));
    return m;
  }, [kurumlar]);

  // Başlangıç kararları: önce hatırlanan karar, yoksa bulanık eşleştirme.
  const hazir = useMemo(
    () => kararlariHazirla(kurumlar.map((k) => k.kurumAdi), okullar, subeAdlari, oncekiKararlar),
    [kurumlar, okullar, subeAdlari, oncekiKararlar]
  );
  const { eslesmeler, durumlar } = hazir;

  const hatirlananSayisi = Object.values(durumlar).filter((d) => d === "hatirlandi").length;

  // Sorulması gerekenler üste — 92 satırlık listede yeni kurum aranmasın.
  const siraliEslesmeler = useMemo(() => {
    const agirlik: Record<KararDurumu, number> = { onay: 0, yeni: 1, otomatik: 2, hatirlandi: 3 };
    return [...eslesmeler].sort((a, b) =>
      agirlik[durumlar[a.raporKurum]] - agirlik[durumlar[b.raporKurum]] ||
      a.raporKurum.localeCompare(b.raporKurum, "tr"));
  }, [eslesmeler, durumlar]);

  const [kararlar, setKararlar] = useState<Record<string, Karar>>(hazir.kararlar);

  const ayarla = (kurum: string, karar: Karar) => setKararlar((p) => ({ ...p, [kurum]: karar }));

  /**
   * "Bağlanmayacak" durumdaki kurumların hepsini tek seferde yeni okula çevirir.
   * 92 kurumluk listede 30 satırı elle değiştirmek pratik değil; bu yüzden var.
   */
  function bagliOlmayanlariYeniYap() {
    setKararlar((p) => {
      const y = { ...p };
      for (const e of eslesmeler) {
        if (y[e.raporKurum]?.tip === "yok") {
          y[e.raporKurum] = {
            tip: "yeni",
            sehir: sehirTahminEt(e.raporKurum, subeAdlari.get(e.raporKurum) ?? []) ?? "",
          };
        }
      }
      return y;
    });
  }

  // Şehri boş kalan yeni okullar. ENGEL DEĞİL, yalnızca bilgi:
  // `schools.city` NOT NULL ama boş string'e izin veriyor ve sistemdeki
  // okulların şehri zaten dolu değil ("Belirtilmedi"). Şehri zorunlu tutmak
  // kullanıcıyı 30+ kurum için elle şehir yazmaya ya da hepsini "Bağlama"
  // seçmeye zorluyordu — ikincisi olduğu için hiçbir okul açılmadı.
  const sehirsizYeni = eslesmeler.filter((e) => {
    const k = kararlar[e.raporKurum];
    return k?.tip === "yeni" && !k.sehir.trim();
  });

  /*
   * Aynı okula birden çok kurum bağlanıyorsa bu neredeyse her zaman hatadır:
   * o okulun detay sayfasında iki kurumun verisi üst üste biner. Bulanık
   * eşleştirme bunu zaten "onay gerekir"e düşürüyor, ama HATIRLANAN kararlar
   * o kontrolü atlıyor — bu yüzden burada karar listesi üzerinden bakılır.
   */
  const cakisanOkullar = useMemo(() => {
    const sahipler = new Map<string, string[]>();
    for (const [kurum, k] of Object.entries(kararlar)) {
      if (k.tip !== "okul") continue;
      const l = sahipler.get(k.schoolId);
      if (l) l.push(kurum); else sahipler.set(k.schoolId, [kurum]);
    }
    return [...sahipler.entries()]
      .filter(([, kurumlarr]) => kurumlarr.length > 1)
      .map(([schoolId, kurumlarr]) => ({
        okulAdi: okullar.find((o) => o.id === schoolId)?.name ?? "(bilinmeyen okul)",
        kurumlar: kurumlarr,
      }));
  }, [kararlar, okullar]);

  /** Bağlandığı okulla tek ortak kelimesi olmayan eşleştirmeler — insan baksın. */
  const supheliler = useMemo(() => {
    const set = new Set<string>();
    for (const [kurum, k] of Object.entries(kararlar)) {
      if (k.tip !== "okul") continue;
      const okul = okullar.find((o) => o.id === k.schoolId);
      if (okul && eslesmeSupheliMi(kurum, okul.name)) set.add(kurum);
    }
    return set;
  }, [kararlar, okullar]);

  const cakisanKurumlar = useMemo(
    () => new Set(cakisanOkullar.flatMap((c) => c.kurumlar)), [cakisanOkullar]);

  /** Bir satır kullanıcının bakması gereken satır mı? */
  const sorunlu = (kurum: string) =>
    cakisanKurumlar.has(kurum) || supheliler.has(kurum) || durumlar[kurum] !== "hatirlandi";

  const sorunluSayisi = eslesmeler.filter((e) => sorunlu(e.raporKurum)).length;

  const [arama, setArama] = useState("");
  const [yalnizSorunlu, setYalnizSorunlu] = useState(false);

  const gosterilecek = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr");
    return siraliEslesmeler.filter((e) => {
      if (yalnizSorunlu && !sorunlu(e.raporKurum)) return false;
      if (!q) return true;
      const okul = kararlar[e.raporKurum]?.tip === "okul"
        ? okullar.find((o) => o.id === (kararlar[e.raporKurum] as { schoolId: string }).schoolId)?.name ?? ""
        : "";
      return e.raporKurum.toLocaleLowerCase("tr").includes(q)
          || okul.toLocaleLowerCase("tr").includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siraliEslesmeler, arama, yalnizSorunlu, kararlar, okullar, cakisanKurumlar, supheliler, durumlar]);

  const yeniSayisi = Object.values(kararlar).filter((k) => k.tip === "yeni").length;
  const baglananSayisi = Object.values(kararlar).filter((k) => k.tip === "okul").length;
  const yokSayisi = Object.values(kararlar).filter((k) => k.tip === "yok").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button onClick={onGeri} disabled={kaydediliyor}
                  className="mb-1 inline-flex items-center gap-1.5 text-sm text-tx-gri hover:text-tx-metin disabled:opacity-50">
            <ArrowLeft className="h-4 w-4" /> Panoya dön
          </button>
          <h2 className="font-baslik text-lg font-semibold text-tx-metin">Kurum Eşleştirme</h2>
          <p className="max-w-[70ch] text-[12.5px] text-tx-gri">
            Rapordaki kurum adları CRM&apos;deki okul kayıtlarıyla eşleştirilir. Eşleşen kurumların
            verisi sözleşme, atama ve lead verisiyle aynı okul üzerinden birleşir.
            Verdiğiniz karar kaydedilir; aynı kurum sonraki kesitlerde tekrar sorulmaz.
          </p>
        </div>
        <Button onClick={() => onKaydet(kararlar)} disabled={kaydediliyor}>
          <Save className="mr-1.5 h-4 w-4" />
          {kaydediliyor ? "Kaydediliyor..." : "Onayla ve Kaydet"}
        </Button>
      </div>

      {/* özet */}
      {hatirlananSayisi > 0 && (
        <p className="rounded border-l-[3px] border-tx-cizgi bg-white px-4 py-3 text-[13px] text-tx-gri">
          <b className="font-medium text-tx-metin">{tr(hatirlananSayisi)}</b> kurumun kararı önceki
          kesitlerden hatırlandı ve aşağıda hazır seçili — dokunmanıza gerek yok.
          {eslesmeler.length - hatirlananSayisi > 0
            ? <> Sorulması gereken <b className="font-medium text-tx-metin">{tr(eslesmeler.length - hatirlananSayisi)}</b> kurum listenin başında.</>
            : " Yeni kurum yok."}
        </p>
      )}

      {/*
        Kutular "kaydedince ne olacak" sorusunu yanıtlar ve BİRBİRİNİ DIŞLAR —
        toplamları kurum sayısına eşittir. Daha önce burada bulanık eşleştirme
        sayıları da vardı; hatırlanan kurumlar iki kez sayılıyor ve toplam
        tutmuyordu. Hatırlanan/sorulacak ayrımı yukarıdaki şeritte.
      */}
      <div className="grid grid-cols-3 gap-3">
        <Kutu etiket="Mevcut okula bağlanacak" deger={baglananSayisi} renk="text-tx-metin" />
        <Kutu etiket="Yeni okul olarak eklenecek" deger={yeniSayisi}
              renk={yeniSayisi ? "text-tx-kirmizi" : "text-tx-metin"} />
        <Kutu etiket="Bağlanmayacak" deger={yokSayisi} renk="text-tx-gri" />
      </div>

      {cakisanOkullar.length > 0 && (
        <div className="rounded border-l-[3px] border-tx-kirmizi bg-white px-4 py-3 text-[13px]">
          <p className="font-medium text-tx-metin">
            {tr(cakisanOkullar.length)} okula birden fazla kurum bağlanıyor
          </p>
          <p className="mt-0.5 text-tx-gri">
            Aynı okula iki kurum bağlanırsa o okulun sayfasında ikisinin verisi karışır.
            Her satırda yalnızca birini bırakın.
          </p>
          <ul className="mt-2 space-y-1">
            {cakisanOkullar.map((c) => (
              <li key={c.okulAdi} className="text-tx-metin">
                <b className="font-medium">{c.okulAdi}</b>
                <span className="text-tx-gri"> ← {c.kurumlar.join(" · ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {yokSayisi > 0 && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded border-l-[3px] border-tx-cizgi bg-white px-4 py-3 text-[13px] text-tx-gri">
          <span>
            <b className="font-medium text-tx-metin">{tr(yokSayisi)}</b> kurum hiçbir okula
            bağlanmayacak — bu kurumların verisi Okullar tarafında görünmez.
          </span>
          <button onClick={bagliOlmayanlariYeniYap}
                  className="rounded-md border border-tx-cizgi bg-white px-2.5 py-1 text-[12.5px] font-medium text-tx-metin hover:border-tx-kirmizi">
            Hepsini yeni okul olarak ekle
          </button>
        </p>
      )}

      {sehirsizYeni.length > 0 && (
        <p className="rounded border-l-[3px] border-tx-cizgi bg-white px-4 py-3 text-[13px] text-tx-gri">
          <b className="font-medium text-tx-metin">{tr(sehirsizYeni.length)}</b> yeni okulun şehri boş.
          Rapor bu bilgiyi içermiyor; kurum ve şube adından tahmin edilmeye çalışıldı.
          Boş bırakabilirsiniz — okul yine açılır, şehri sonra Okullar sayfasından doldurursunuz.
        </p>
      )}
      {hata && (
        <p className="rounded border-l-[3px] border-tx-kirmizi bg-white px-4 py-3 text-[13px] text-tx-metin">{hata}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-tx-gri" />
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Kurum veya okul adı ara…"
            className="h-9 w-full rounded-md border border-tx-cizgi bg-white pl-8 pr-3 text-[13px]"
          />
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-tx-gri">
          <input type="checkbox" checked={yalnizSorunlu} onChange={(e) => setYalnizSorunlu(e.target.checked)}
                 className="h-3.5 w-3.5 accent-tx-kirmizi" />
          Yalnız dikkat isteyenler ({tr(sorunluSayisi)})
        </label>
        <span className="text-[12px] text-tx-gri">
          {tr(gosterilecek.length)} / {tr(eslesmeler.length)} satır
        </span>
      </div>

      <div className="overflow-x-auto rounded bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Rapordaki kurum", "Öğretmen", "Durum", "CRM'deki karşılığı"].map((b, i) => (
                <th key={b} className={`border-b border-tx-siyah px-2.5 pb-2.5 pt-3 text-[11.5px] font-medium text-tx-gri ${i === 1 ? "text-right" : "text-left"}`}>
                  {b}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gosterilecek.map((e) => {
              const kurum = kurumlar.find((k) => k.kurumAdi === e.raporKurum);
              const karar = kararlar[e.raporKurum];
              return (
                <tr key={e.raporKurum} className="align-top hover:bg-tx-kagit">
                  <th className="border-b border-tx-cizgi px-2.5 py-2.5 text-left font-medium">{e.raporKurum}</th>
                  <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">
                    {tr(kurum?.ogretmenSayisi ?? 0)}
                  </td>
                  <td className="border-b border-tx-cizgi px-2.5 py-2.5">
                    {(cakisanKurumlar.has(e.raporKurum) || supheliler.has(e.raporKurum)) && (
                      <span className="mb-1 flex items-center gap-1 text-[12px] font-medium text-tx-kirmizi">
                        <TriangleAlert className="h-3.5 w-3.5" />
                        {cakisanKurumlar.has(e.raporKurum) ? "aynı okula 2 kurum" : "ad hiç benzemiyor"}
                      </span>
                    )}
                    {durumlar[e.raporKurum] === "hatirlandi" ? (
                      <span className="inline-flex items-center gap-1 text-[12px] text-tx-gri">
                        <History className="h-3.5 w-3.5" /> hatırlandı
                        <span className="text-tx-gri opacity-70">
                          ({formatDate(oncekiKararlar[e.raporKurum].tarih)})
                        </span>
                      </span>
                    ) : e.guven === "kesin" ? (
                      <span className="inline-flex items-center gap-1 text-[12px] text-tx-metin">
                        <Check className="h-3.5 w-3.5" /> otomatik
                      </span>
                    ) : e.guven === "onerilen" ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-tx-kirmizi">
                        <CircleAlert className="h-3.5 w-3.5" /> onay gerekir
                        <span className="font-normal text-tx-gri">(benzerlik {e.benzerlik.toFixed(2)})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[12px] text-tx-gri">
                        <Plus className="h-3.5 w-3.5" /> eşleşme yok
                      </span>
                    )}
                  </td>
                  <td className="border-b border-tx-cizgi px-2.5 py-2 min-w-[320px]">
                    <Select
                      value={karar?.tip === "okul" ? karar.schoolId : karar?.tip === "yeni" ? "__yeni" : "__yok"}
                      onChange={(ev) => {
                        const v = ev.target.value;
                        if (v === "__yeni") {
                          ayarla(e.raporKurum, {
                            tip: "yeni",
                            sehir: sehirTahminEt(e.raporKurum, subeAdlari.get(e.raporKurum) ?? []) ?? "",
                          });
                        } else if (v === "__yok") ayarla(e.raporKurum, { tip: "yok" });
                        else ayarla(e.raporKurum, { tip: "okul", schoolId: v });
                      }}
                    >
                      <option value="__yeni">＋ Yeni okul olarak ekle</option>
                      <option value="__yok">— Bağlama</option>
                      {e.digerAdaylar.length > 0 && (
                        <optgroup label="Yakın adaylar">
                          {e.digerAdaylar.map((o) => <option key={o.id} value={o.id}>{okulEtiketi(o)}</option>)}
                        </optgroup>
                      )}
                      <optgroup label="Tüm okullar">
                        {okullar.map((o) => <option key={o.id} value={o.id}>{okulEtiketi(o)}</option>)}
                      </optgroup>
                    </Select>

                    {karar?.tip === "yeni" && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <label className="text-[11px] text-tx-gri">Şehir</label>
                        <input
                          value={karar.sehir}
                          onChange={(ev) => ayarla(e.raporKurum, { tip: "yeni", sehir: ev.target.value })}
                          placeholder="isteğe bağlı"
                          className="h-8 w-44 rounded-md border border-tx-cizgi bg-white px-2 text-[13px]"
                        />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {gosterilecek.length === 0 && (
          <p className="px-3 py-6 text-center text-[13px] text-tx-gri">
            {yalnizSorunlu && !arama.trim()
              ? "Dikkat isteyen satır yok — eşleştirme temiz."
              : "Aramaya uyan kurum yok."}
          </p>
        )}
      </div>
      <p className="text-[11.5px] text-tx-gri">
        Toplam {tr(eslesmeler.length)} kurum. Verdiğiniz kararlar kaydedilir; bir dahaki
        yüklemede aynı kurumlar &quot;hatırlandı&quot; olarak gelir ve tekrar sorulmaz.
      </p>
    </div>
  );
}

/**
 * Okul adının yanına durumu yazar. Pasif ya da potansiyel bir okul, listede
 * ayırt edilemediği için gözden kaçıp "yeni okul" olarak yeniden açılabiliyordu.
 */
function okulEtiketi(o: OkulAdayi): string {
  return o.status && o.status !== "aktif" ? `${o.name}  (${o.status})` : o.name;
}

function Kutu({ etiket, deger, renk }: { etiket: string; deger: number; renk: string }) {
  return (
    <div className="rounded border-t-[3px] border-tx-cizgi bg-white px-4 pb-3 pt-3">
      <p className="text-[11.5px] text-tx-gri">{etiket}</p>
      <p className={`font-baslik text-2xl font-semibold ${renk}`}>{tr(deger)}</p>
    </div>
  );
}

export type { Karar };
