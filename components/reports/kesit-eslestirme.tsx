"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Check, CircleAlert, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { KesitKurum } from "./kesit";
import {
  kurumlariEslestir, eslesmeOzeti, sehirTahminEt, type OkulAdayi,
} from "./kurum-eslestir";
import { tr } from "./brand";

/** Bir kurum için kullanıcının kararı. */
type Karar =
  | { tip: "okul"; schoolId: string }
  | { tip: "yeni"; sehir: string }
  | { tip: "yok" };

interface Props {
  kurumlar: KesitKurum[];
  okullar: OkulAdayi[];
  kaydediliyor: boolean;
  hata: string | null;
  onGeri: () => void;
  onKaydet: (kararlar: Record<string, Karar>) => void;
}

export function KesitEslestirme({ kurumlar, okullar, kaydediliyor, hata, onGeri, onKaydet }: Props) {
  const eslesmeler = useMemo(
    () => kurumlariEslestir(kurumlar.map((k) => k.kurumAdi), okullar),
    [kurumlar, okullar]
  );
  const ozet = useMemo(() => eslesmeOzeti(eslesmeler), [eslesmeler]);

  const subeAdlari = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const k of kurumlar) m.set(k.kurumAdi, k.subeler.map((s) => s.subeAdi));
    return m;
  }, [kurumlar]);

  // Başlangıç kararları: eşleşen okula bağlan, eşleşmeyen için yeni okul öner
  const [kararlar, setKararlar] = useState<Record<string, Karar>>(() => {
    const k: Record<string, Karar> = {};
    for (const e of eslesmeler) {
      k[e.raporKurum] = e.okul
        ? { tip: "okul", schoolId: e.okul.id }
        : { tip: "yeni", sehir: sehirTahminEt(e.raporKurum, subeAdlari.get(e.raporKurum) ?? []) ?? "" };
    }
    return k;
  });

  const ayarla = (kurum: string, karar: Karar) => setKararlar((p) => ({ ...p, [kurum]: karar }));

  const sehirsizYeni = eslesmeler.filter((e) => {
    const k = kararlar[e.raporKurum];
    return k?.tip === "yeni" && !k.sehir.trim();
  });

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
            Eşleştirme kaydedilir; sonraki kesitlerde tekrar sorulmaz.
          </p>
        </div>
        <Button onClick={() => onKaydet(kararlar)} disabled={kaydediliyor || sehirsizYeni.length > 0}>
          <Save className="mr-1.5 h-4 w-4" />
          {kaydediliyor ? "Kaydediliyor..." : "Onayla ve Kaydet"}
        </Button>
      </div>

      {/* özet */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kutu etiket="Otomatik eşleşen" deger={ozet.kesin} renk="text-tx-metin" />
        <Kutu etiket="Onay gereken" deger={ozet.onerilen} renk={ozet.onerilen ? "text-tx-kirmizi" : "text-tx-metin"} />
        <Kutu etiket="Yeni okul olarak eklenecek" deger={yeniSayisi} renk="text-tx-metin" />
        <Kutu etiket="Bağlanmayacak" deger={yokSayisi} renk="text-tx-gri" />
      </div>

      {sehirsizYeni.length > 0 && (
        <p className="rounded border-l-[3px] border-tx-kirmizi bg-white px-4 py-3 text-[13px]">
          <b>{sehirsizYeni.length}</b> yeni okulun şehri boş. Şehir zorunlu bir alan; rapor bu bilgiyi
          içermediği için kurum ve şube adından tahmin edilmeye çalışıldı. Boş kalanları doldurun ya da
          &quot;Bağlama&quot; seçin.
        </p>
      )}
      {hata && (
        <p className="rounded border-l-[3px] border-tx-kirmizi bg-white px-4 py-3 text-[13px] text-tx-metin">{hata}</p>
      )}

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
            {eslesmeler.map((e) => {
              const kurum = kurumlar.find((k) => k.kurumAdi === e.raporKurum);
              const karar = kararlar[e.raporKurum];
              return (
                <tr key={e.raporKurum} className="align-top hover:bg-tx-kagit">
                  <th className="border-b border-tx-cizgi px-2.5 py-2.5 text-left font-medium">{e.raporKurum}</th>
                  <td className="border-b border-tx-cizgi px-2.5 py-2.5 text-right tabular-nums">
                    {tr(kurum?.ogretmenSayisi ?? 0)}
                  </td>
                  <td className="border-b border-tx-cizgi px-2.5 py-2.5">
                    {e.guven === "kesin" ? (
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
                          {e.digerAdaylar.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </optgroup>
                      )}
                      <optgroup label="Tüm okullar">
                        {okullar.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </optgroup>
                    </Select>

                    {karar?.tip === "yeni" && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <label className="text-[11px] text-tx-gri">Şehir</label>
                        <input
                          value={karar.sehir}
                          onChange={(ev) => ayarla(e.raporKurum, { tip: "yeni", sehir: ev.target.value })}
                          placeholder="zorunlu"
                          className={`h-8 w-44 rounded-md border bg-white px-2 text-[13px] ${
                            karar.sehir.trim() ? "border-tx-cizgi" : "border-tx-kirmizi"
                          }`}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11.5px] text-tx-gri">{tr(baglananSayisi)} kurum mevcut okula bağlanacak.</p>
    </div>
  );
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
