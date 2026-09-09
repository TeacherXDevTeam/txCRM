// Okul detay sayfasındaki "Eğitim Tamamlama" paneli.
//
// Bu dosyada "use client" YOK ve olmamalı — `okullar/[id]/page.tsx` bir Server
// Component ve buradaki fonksiyonları sunucuda çağırıyor (bkz. kesit-map.ts).
//
// Gizlilik: gösterilen her şey kesit ÖZETİDİR. Ad, e-posta ve kişi bazlı
// bilgi zaten DB'de yok; bu panel de üretmez.

import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { formatDate } from "@/lib/utils";

export interface OkulKesitNoktasi {
  tarih: string;
  kurumAdi: string;
  ogretmenSayisi: number;
  subeSayisi: number;
  egitimSayisi: number | null;
  ilerlemeOrtalamasi: number;
  tamamlanmaOrani: number;
  sertifikaSayisi: number | null;
  hicBaslamayan: number;
  tumunuTamamlayan: number;
}

export interface OkulKesitSubesi {
  subeAdi: string;
  ogretmenSayisi: number;
  ilerlemeOrtalamasi: number;
}

const tr = (n: number) => n.toLocaleString("tr-TR");
const tr1 = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Fark({ deger, puan, artmasiKotu = false }: { deger: number; puan?: boolean; artmasiKotu?: boolean }) {
  const yuvarli = puan ? Math.round(deger * 10) / 10 : Math.round(deger);
  if (yuvarli === 0) return <span className="text-xs text-gray-400">değişmedi</span>;
  const iyi = yuvarli > 0 !== artmasiKotu;
  const Ok = yuvarli > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${iyi ? "text-green-600" : "text-red-600"}`}>
      <Ok className="h-3 w-3" />
      {yuvarli > 0 ? "+" : "−"}{puan ? `${tr1(Math.abs(yuvarli))} puan` : tr(Math.abs(yuvarli))}
    </span>
  );
}

function Kutu({
  etiket, deger, alt, fark,
}: { etiket: string; deger: string; alt?: string; fark?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2.5">
      <p className="text-xs text-gray-400">{etiket}</p>
      <p className="mt-0.5 text-lg font-semibold text-gray-900">{deger}</p>
      {fark ?? (alt ? <span className="text-xs text-gray-400">{alt}</span> : null)}
    </div>
  );
}

/**
 * Küçük ilerleme eğrisi.
 *
 * Siyah, kırmızı değil: bu sayfada kırmızı zaten "kötüleşme" anlamına geliyor
 * (delta rozetleri). Aynı ekranda ikinci bir kırmızı anlamı karışıklık yaratır.
 * Şube barları da aynı sebeple nötr.
 */
function Egri({ degerler }: { degerler: number[] }) {
  const g = 240, y = 44, pad = 3;
  const enAz = Math.min(...degerler), enCok = Math.max(...degerler);
  const aralik = Math.max(1, enCok - enAz);
  const x = (i: number) => (i / (degerler.length - 1)) * g;
  const yy = (d: number) => y - pad - ((d - enAz) / aralik) * (y - pad * 2);
  const d = degerler.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yy(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${g} ${y}`} className="h-11 w-full" role="img" aria-label="İlerleme eğrisi" preserveAspectRatio="none">
      <path d={`${d} L${g},${y} L0,${y} Z`} fill="#101010" opacity="0.06" />
      <path d={d} fill="none" stroke="#101010" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"
            vectorEffect="non-scaling-stroke" />
      <circle cx={x(degerler.length - 1)} cy={yy(degerler[degerler.length - 1])} r="2.5" fill="#101010" />
    </svg>
  );
}

export function OkulKesitPaneli({
  okulAdi, noktalar, subeler,
}: { okulAdi: string; noktalar: OkulKesitNoktasi[]; subeler: OkulKesitSubesi[] }) {
  if (noktalar.length === 0) return null;

  const son = noktalar[noktalar.length - 1];
  const onceki = noktalar.length > 1 ? noktalar[noktalar.length - 2] : null;
  const adFarkli = son.kurumAdi.trim() !== okulAdi.trim();

  return (
    <section className="bg-white rounded-xl border p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Eğitim Tamamlama</h2>
          <p className="text-xs text-gray-400">
            {formatDate(son.tarih)} kesiti
            {noktalar.length > 1 && ` · ${tr(noktalar.length)} kesit`}
            {adFarkli && <> · raporda <span className="text-gray-500">{son.kurumAdi}</span></>}
          </p>
        </div>
        <Link href="/raporlar" className="inline-flex shrink-0 items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
          Raporlar <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kutu etiket="Öğretmen" deger={tr(son.ogretmenSayisi)}
              alt={`${tr(son.subeSayisi)} şube`}
              fark={onceki && <Fark deger={son.ogretmenSayisi - onceki.ogretmenSayisi} />} />
        <Kutu etiket="İlerleme ort." deger={`%${tr1(son.ilerlemeOrtalamasi)}`}
              alt="kısmi ilerleme sayılır"
              fark={onceki && <Fark deger={son.ilerlemeOrtalamasi - onceki.ilerlemeOrtalamasi} puan />} />
        <Kutu etiket="Tamamlanma" deger={`%${tr1(son.tamamlanmaOrani)}`}
              alt="kısmi sayılmaz"
              fark={onceki && <Fark deger={son.tamamlanmaOrani - onceki.tamamlanmaOrani} puan />} />
        <Kutu etiket="Hiç başlamayan" deger={tr(son.hicBaslamayan)}
              alt={son.ogretmenSayisi ? `öğretmenlerin %${Math.round((son.hicBaslamayan / son.ogretmenSayisi) * 100)}'i` : undefined}
              fark={onceki && <Fark deger={son.hicBaslamayan - onceki.hicBaslamayan} artmasiKotu />} />
      </div>

      {noktalar.length > 1 && (
        <div className="mt-3">
          <Egri degerler={noktalar.map((n) => n.ilerlemeOrtalamasi)} />
          <div className="flex justify-between text-[11px] text-gray-400">
            <span>{formatDate(noktalar[0].tarih)} · %{tr1(noktalar[0].ilerlemeOrtalamasi)}</span>
            <span>{formatDate(son.tarih)} · %{tr1(son.ilerlemeOrtalamasi)}</span>
          </div>
        </div>
      )}

      {subeler.length > 1 && (
        <div className="mt-4 border-t pt-3">
          <p className="mb-2 text-xs font-medium text-gray-500">Şubeler</p>
          <div className="space-y-1.5">
            {subeler.map((s) => (
              <div key={s.subeAdi} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-sm text-gray-700">{s.subeAdi}</span>
                <span className="h-1.5 flex-1 rounded bg-gray-100">
                  <span className="block h-full rounded bg-gray-800"
                        style={{ width: `${Math.max(0, Math.min(100, s.ilerlemeOrtalamasi))}%` }} />
                </span>
                <span className="w-24 shrink-0 text-right text-xs text-gray-500">
                  %{tr1(s.ilerlemeOrtalamasi)} · {tr(s.ogretmenSayisi)} öğr.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
        Kesit özetinden gelir; öğretmen adı veya kişi bazlı bilgi içermez.
        {son.sertifikaSayisi !== null
          ? ` Bu kesitte ${tr(son.sertifikaSayisi)} sertifika verilmiş.`
          : " Bu kesit öğretmen özeti dökümünden geldiği için sertifika bilgisi yok."}
      </p>
    </section>
  );
}
