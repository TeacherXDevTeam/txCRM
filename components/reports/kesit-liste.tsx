"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tr } from "./brand";
import { formatDate } from "@/lib/utils";
import { egitimYili, type Trend } from "./kesit-trend";
import { kesitSil } from "./kesit-db";

/**
 * Kayıtlı kesitlerin listesi ve silme.
 *
 * Neden var: aynı rapor yanlış tarihe kaydedilebiliyor (test için ya da
 * kazayla). Silmenin tek yolu SQL Editor'e gitmekti.
 *
 * Silme GERİ ALINAMAZ ve cascade ile kurum/şube/eğitim/sertifika satırlarını
 * da götürür, bu yüzden tek tıkla yapılmaz: satır önce onay moduna geçer.
 * Aynı gerekçeyle "hepsini sil" gibi toplu bir işlem BİLEREK yok.
 */
export function KesitListesi({ trend }: { trend: Trend | null }) {
  const router = useRouter();
  const [onayBekleyen, setOnayBekleyen] = useState<string | null>(null);
  const [siliniyor, setSiliniyor] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const kesitler = [...(trend?.kesitler ?? [])].sort((a, b) => b.tarih.localeCompare(a.tarih));

  async function sil(id: string) {
    setSiliniyor(id); setHata(null);
    try {
      await kesitSil(id);
      setOnayBekleyen(null);
      router.refresh();
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Silinemedi.");
    } finally {
      setSiliniyor(null);
    }
  }

  if (kesitler.length === 0) {
    return (
      <div className="rounded border border-dashed border-tx-cizgi bg-white px-7 py-12 text-center text-[13.5px] text-tx-gri">
        Henüz kaydedilmiş kesit yok.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="ic-arac">
        <h2 className="font-baslik text-lg font-semibold text-tx-metin">Kesitler</h2>
        <p className="text-[12.5px] text-tx-gri">
          Kaydedilmiş {tr(kesitler.length)} kesit. Silmek geri alınamaz; o kesitin kurum, şube,
          eğitim ve sertifika satırları da gider. Okul kayıtları etkilenmez.
        </p>
      </div>

      {hata && (
        <p className="rounded border-l-[3px] border-tx-kirmizi bg-white px-4 py-3 text-[13px] text-tx-metin">
          {hata}
        </p>
      )}

      <div className="overflow-x-auto rounded bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-tx-siyah">
              {["Kesit tarihi", "Eğitim yılı", "Dosya", "Kurum", "Öğretmen", "Satır", ""].map((b, i) => (
                <th key={b || i}
                    className={`whitespace-nowrap px-3 py-2.5 text-[12px] font-medium text-tx-gri ${
                      i >= 3 && i <= 5 ? "text-right" : "text-left"}`}>
                  {b}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kesitler.map((k) => {
              const onayda = onayBekleyen === k.id;
              return (
                <tr key={k.id} className={`border-b border-tx-cizgi ${onayda ? "bg-[#FBE6DA]" : ""}`}>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium">{formatDate(k.tarih)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-tx-gri">{egitimYili(k.tarih)}</td>
                  <td className="max-w-[280px] truncate px-3 py-2.5 text-tx-gri" title={k.dosyaAdi ?? ""}>
                    {k.dosyaAdi ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{tr(k.kurumSayisi)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{tr(k.ogretmenSayisi)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-tx-gri">{tr(k.kaynakSatir)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {onayda ? (
                      <span className="flex items-center justify-end gap-2">
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-tx-kirmizi">
                          <TriangleAlert className="h-3.5 w-3.5" /> Geri alınamaz
                        </span>
                        <Button onClick={() => sil(k.id)} disabled={siliniyor === k.id}
                                className="h-7 bg-tx-kirmizi px-2.5 text-[12px] hover:bg-tx-bordo">
                          {siliniyor === k.id ? "Siliniyor…" : "Sil"}
                        </Button>
                        <button onClick={() => setOnayBekleyen(null)} disabled={siliniyor === k.id}
                                className="text-[12px] text-tx-gri hover:text-tx-metin disabled:opacity-50">
                          Vazgeç
                        </button>
                      </span>
                    ) : (
                      <span className="flex justify-end">
                        <button onClick={() => { setHata(null); setOnayBekleyen(k.id); }}
                                className="inline-flex items-center gap-1 rounded-md border border-tx-cizgi px-2 py-1 text-[12px] text-tx-gri hover:border-tx-kirmizi hover:text-tx-metin">
                          <Trash2 className="h-3.5 w-3.5" /> Sil
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="px-1 text-[11.5px] leading-relaxed text-tx-gri">
        Aynı raporu farklı tarihlere kaydettiyseniz fazlasını buradan silebilirsiniz. Silinen bir
        kesit, aynı dosya o tarihle yeniden yüklenerek geri getirilebilir.
      </p>
    </div>
  );
}
