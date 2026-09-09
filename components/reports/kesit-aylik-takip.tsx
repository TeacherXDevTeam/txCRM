"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Select } from "@/components/ui/select";
import { tr, tr1 } from "./brand";
import { formatDate } from "@/lib/utils";
import {
  METRIKLER, kisaAy, metrikDegeri, zamanKonumlari,
  type MetrikAnahtar, type Trend, type TrendHucre,
} from "./kesit-trend";

/** Metriğe göre biçimlendirme — yüzdeler bir ondalık, adetler tam sayı. */
function bicim(deger: number | null, yuzde: boolean): string {
  if (deger === null) return "—";
  return yuzde ? `%${tr1(deger)}` : tr(Math.round(deger));
}

/** Bir serideki ilk ve son BİLİNEN değer arasındaki fark. */
function degisim(seri: (number | null)[]): { fark: number; ilk: number; son: number } | null {
  const bilinen = seri.map((d, i) => ({ d, i })).filter((x): x is { d: number; i: number } => x.d !== null);
  if (bilinen.length < 2) return null;
  const ilk = bilinen[0].d, son = bilinen[bilinen.length - 1].d;
  return { fark: son - ilk, ilk, son };
}

function DegisimRozeti({ fark, yuzde, artmasiKotu }: { fark: number; yuzde: boolean; artmasiKotu: boolean }) {
  const yuvarli = yuzde ? Math.round(fark * 10) / 10 : Math.round(fark);
  if (yuvarli === 0) {
    return <span className="inline-flex items-center gap-1 text-tx-gri"><Minus className="h-3 w-3" />0</span>;
  }
  const iyi = yuvarli > 0 !== artmasiKotu;
  const Ok = yuvarli > 0 ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${iyi ? "text-[#1E7B34]" : "text-tx-kirmizi"}`}>
      <Ok className="h-3 w-3" />
      {yuzde ? `${tr1(Math.abs(yuvarli))} puan` : tr(Math.abs(yuvarli))}
    </span>
  );
}

/* ---------------------------------------------------------------- grafik --- */

const G = { g: 900, y: 300, sol: 52, sag: 14, ust: 16, alt: 34 };

interface Seri { ad: string; renk: string; kalinlik: number; noktalar: (number | null)[] }

function CizgiGrafik({
  seriler, tarihler, yuzde,
}: { seriler: Seri[]; tarihler: string[]; yuzde: boolean }) {
  const etiketler = tarihler.map(kisaAy);
  const tumDegerler = seriler.flatMap((s) => s.noktalar).filter((d): d is number => d !== null);
  const enBuyuk = tumDegerler.length ? Math.max(...tumDegerler) : 1;
  const tavan = yuzde ? 100 : Math.max(1, Math.ceil((enBuyuk * 1.1) / 5) * 5);

  const cizim = G.g - G.sol - G.sag;
  const boy = G.y - G.ust - G.alt;

  /*
   * Nokta konumları TARİHE göre; sıraya göre değil. Geçen yılın kapanış
   * dosyası ile bu ayın kesiti arasında 15 ay, iki aylık kesit arasında
   * 1 ay olabiliyor — eşit aralıklı çizmek eğimi yanıltıcı yapardı.
   */
  const konumlar = zamanKonumlari(tarihler);
  const x = (i: number) => G.sol + konumlar[i] * cizim;
  const yy = (d: number) => G.ust + boy - (d / tavan) * boy;

  /*
   * Noktalar zaman ekseninde kümelenebilir (12 aylık kesit + 1 yıl öncesi).
   * Üst üste binen etiket okunmaz; ilk ve son daima yazılır, aradakiler
   * yalnız yeterli boşluk varsa.
   */
  const etiketliler = new Set<number>();
  let sonX = -Infinity;
  const ETIKET_ARALIGI = 46;
  tarihler.forEach((_, i) => {
    const son = i === tarihler.length - 1;
    if (i === 0 || son || x(i) - sonX >= ETIKET_ARALIGI) {
      // Son etiket sondan öncekini eziyorsa öncekini düşür
      if (son && x(i) - sonX < ETIKET_ARALIGI) {
        const oncekiler = [...etiketliler];
        etiketliler.delete(oncekiler[oncekiler.length - 1]);
      }
      etiketliler.add(i);
      sonX = x(i);
    }
  });

  const yEksen = [0, 0.25, 0.5, 0.75, 1].map((o) => o * tavan);

  return (
    <div className="overflow-x-auto rounded bg-white px-2 py-4">
      <svg viewBox={`0 0 ${G.g} ${G.y}`} className="min-w-[560px] w-full" role="img"
           aria-label="Kesitler arası değişim grafiği">
        {yEksen.map((d) => (
          <g key={d}>
            <line x1={G.sol} x2={G.g - G.sag} y1={yy(d)} y2={yy(d)}
                  stroke={d === 0 ? "#101010" : "#E8E6E1"} strokeWidth={d === 0 ? 1 : 1} />
            <text x={G.sol - 8} y={yy(d) + 4} textAnchor="end" fontSize="11" fill="#6B6B6B">
              {yuzde ? `%${Math.round(d)}` : tr(Math.round(d))}
            </text>
          </g>
        ))}

        {etiketler.map((e, i) => etiketliler.has(i) ? (
          <text key={`${e}-${i}`} x={x(i)} y={G.y - 12} textAnchor="middle" fontSize="11" fill="#6B6B6B">
            {e}
          </text>
        ) : (
          // Etiketi sığmayan noktanın yerini küçük bir çentik gösterir
          <line key={`${e}-${i}`} x1={x(i)} x2={x(i)} y1={G.y - G.alt + 2} y2={G.y - G.alt + 6}
                stroke="#C9C6C0" strokeWidth="1" />
        ))}

        {seriler.map((s) => {
          // Bilinmeyen noktalarda çizgi KOPAR — eksik veri düz çizgiyle
          // doldurulursa "değişmedi" gibi okunur.
          const parcalar: string[] = [];
          let aktif: string[] = [];
          s.noktalar.forEach((d, i) => {
            if (d === null) { if (aktif.length > 1) parcalar.push(aktif.join(" ")); aktif = []; return; }
            aktif.push(`${aktif.length === 0 ? "M" : "L"}${x(i).toFixed(1)},${yy(d).toFixed(1)}`);
          });
          if (aktif.length > 1) parcalar.push(aktif.join(" "));

          return (
            <g key={s.ad}>
              {parcalar.map((p, i) => (
                <path key={i} d={p} fill="none" stroke={s.renk} strokeWidth={s.kalinlik}
                      strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {s.noktalar.map((d, i) => d === null ? null : (
                <circle key={i} cx={x(i)} cy={yy(d)} r={s.kalinlik + 1.5} fill={s.renk}>
                  <title>{`${s.ad}\n${etiketler[i]}\n${bicim(d, yuzde)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap gap-4 px-4 pt-1">
        {seriler.map((s) => (
          <span key={s.ad} className="inline-flex items-center gap-1.5 text-[12px] text-tx-gri">
            <span className="inline-block h-[3px] w-5 rounded" style={{ background: s.renk }} />
            {s.ad}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ pano --- */

export function KesitAylikTakip({ trend }: { trend: Trend }) {
  const [metrikAnahtar, setMetrikAnahtar] = useState<MetrikAnahtar>("ilerlemeOrtalamasi");
  const [sabitSepet, setSabitSepet] = useState(true);
  const [secili, setSecili] = useState<string | null>(null);

  const metrik = METRIKLER.find((m) => m.anahtar === metrikAnahtar)!;
  const { kesitler, kurumlar } = trend;

  const sepetDegisiyor = trend.sabitKurumSayisi !== kurumlar.length;
  const toplamHucreler: (TrendHucre | null)[] = sabitSepet ? trend.toplamSabit : trend.toplam;

  const seriler = useMemo<Seri[]>(() => {
    const s: Seri[] = [{
      ad: sabitSepet ? `Tüm kurumlar (${tr(trend.sabitKurumSayisi)} sabit)` : "Tüm kurumlar",
      renk: "#101010",
      kalinlik: 2.5,
      noktalar: toplamHucreler.map((h) => metrikDegeri(h, metrikAnahtar)),
    }];
    const k = kurumlar.find((x) => x.anahtar === secili);
    if (k) {
      s.push({
        ad: k.kurumAdi,
        renk: "#E70917",
        kalinlik: 2,
        noktalar: k.hucreler.map((h) => metrikDegeri(h, metrikAnahtar)),
      });
    }
    return s;
  }, [toplamHucreler, kurumlar, secili, metrikAnahtar, sabitSepet, trend.sabitKurumSayisi]);

  // Tek kesit varken trend yoktur; hata gibi değil, ne yapılacağını söyleyerek anlat.
  if (kesitler.length < 2) {
    return (
      <div className="rounded border border-dashed border-tx-cizgi bg-white px-7 py-12 text-center">
        <h3 className="font-baslik text-base font-semibold text-tx-metin">Aylık Takip için ikinci bir kesit gerekiyor</h3>
        <p className="mx-auto mt-2 max-w-[60ch] text-[13.5px] leading-relaxed text-tx-gri">
          {kesitler.length === 0
            ? "Henüz kaydedilmiş kesit yok. Bir tamamlama raporu yükleyip kaydettiğinizde burada zaman serisi oluşmaya başlar."
            : <>Şu an tek kesit var: <b className="font-medium text-tx-metin">{formatDate(kesitler[0].tarih)}</b> ({tr(kesitler[0].kurumSayisi)} kurum).
               Bir sonraki ay raporu yükleyip kaydettiğinizde değişim buradan izlenir — elle bir şey yapmanız gerekmez.</>}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="ic-arac flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-baslik text-lg font-semibold text-tx-metin">Aylık Takip</h2>
          <p className="text-[12.5px] text-tx-gri">
            {tr(kesitler.length)} kesit · {formatDate(kesitler[0].tarih)} → {formatDate(kesitler[kesitler.length - 1].tarih)}
            {" · "}Bir kuruma tıklayarak grafiğe ekleyin
          </p>
        </div>
        <div className="flex items-end gap-3">
          {sepetDegisiyor && (
            <label className="flex items-center gap-2 pb-2 text-[12.5px] text-tx-gri">
              <input type="checkbox" checked={sabitSepet} onChange={(e) => setSabitSepet(e.target.checked)}
                     className="h-3.5 w-3.5 accent-tx-kirmizi" />
              Sabit sepet
            </label>
          )}
          <div className="w-60">
            <Select value={metrikAnahtar} onChange={(e) => setMetrikAnahtar(e.target.value as MetrikAnahtar)}>
              {METRIKLER.map((m) => <option key={m.anahtar} value={m.anahtar}>{m.ad}</option>)}
            </Select>
          </div>
        </div>
      </div>

      <CizgiGrafik seriler={seriler} tarihler={kesitler.map((k) => k.tarih)} yuzde={metrik.yuzde} />

      <p className="px-1 text-[12px] leading-relaxed text-tx-gri">
        {metrik.aciklama}. Toplam satırı öğretmen sayısıyla <b className="font-medium text-tx-metin">ağırlıklı</b> hesaplanır —
        kurum ortalamalarının ortalaması değildir.
        {sepetDegisiyor && (sabitSepet
          ? <> Sepet sabit: yalnızca <b className="font-medium text-tx-metin">{tr(trend.sabitKurumSayisi)}</b> kurum her kesitte ölçüldüğü için toplam onlardan hesaplanıyor; sonradan eklenen kurumlar toplamı aşağı çekmesin diye.</>
          : <> Sepet değişken: her kesitte o kesitte ölçülen tüm kurumlar toplama girer, bu yüzden kurum sayısı değiştiğinde toplam da <b className="font-medium text-tx-metin">bu yüzden</b> oynayabilir.</>)}
      </p>

      <div className="overflow-x-auto rounded bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-tx-siyah">
              <th className="sticky left-0 z-10 bg-white px-3 py-2.5 text-left text-[12px] font-medium text-tx-gri">
                Kurum
              </th>
              {kesitler.map((k) => (
                <th key={k.id} className="whitespace-nowrap px-3 py-2.5 text-right text-[12px] font-medium text-tx-gri">
                  {formatDate(k.tarih)}
                  <i className="block text-[10px] not-italic opacity-70">{tr(k.kurumSayisi)} kurum</i>
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2.5 text-right text-[12px] font-medium text-tx-gri">Değişim</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-tx-cizgi bg-tx-zemin font-medium">
              <td className="sticky left-0 z-10 bg-tx-zemin px-3 py-2.5">
                {sabitSepet && sepetDegisiyor ? `Tüm kurumlar (${tr(trend.sabitKurumSayisi)} sabit)` : "Tüm kurumlar"}
              </td>
              {toplamHucreler.map((h, i) => (
                <td key={kesitler[i].id} className="px-3 py-2.5 text-right tabular-nums">
                  {bicim(metrikDegeri(h, metrikAnahtar), metrik.yuzde)}
                </td>
              ))}
              <td className="px-3 py-2.5 text-right">
                {(() => {
                  const d = degisim(toplamHucreler.map((h) => metrikDegeri(h, metrikAnahtar)));
                  return d ? <DegisimRozeti fark={d.fark} yuzde={metrik.yuzde} artmasiKotu={metrik.artmasiKotu} /> : "—";
                })()}
              </td>
            </tr>

            {kurumlar.map((k) => {
              const seri = k.hucreler.map((h) => metrikDegeri(h, metrikAnahtar));
              const d = degisim(seri);
              const aktif = secili === k.anahtar;
              return (
                <tr key={k.anahtar}
                    onClick={() => setSecili(aktif ? null : k.anahtar)}
                    className={`cursor-pointer border-b border-tx-cizgi transition-colors ${
                      aktif ? "bg-[#FBE6DA]" : "hover:bg-tx-zemin"}`}>
                  <td className={`sticky left-0 z-10 px-3 py-2 ${aktif ? "bg-[#FBE6DA]" : "bg-white"}`}>
                    <span className={aktif ? "font-medium text-tx-kirmizi" : ""}>{k.kurumAdi}</span>
                    {!k.tamSeri && (
                      <i className="ml-1.5 text-[10px] not-italic text-tx-gri">kısmi</i>
                    )}
                  </td>
                  {seri.map((deger, i) => (
                    <td key={kesitler[i].id} className="px-3 py-2 text-right tabular-nums">
                      {bicim(deger, metrik.yuzde)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    {d ? <DegisimRozeti fark={d.fark} yuzde={metrik.yuzde} artmasiKotu={metrik.artmasiKotu} /> : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
