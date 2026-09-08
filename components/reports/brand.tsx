// TeacherX rapor kimliği — örnek çıktılardaki (kurum_raporu.py) görünümün
// React karşılığı. Grafikler saf SVG/CSS: kütüphane yok, yazdırmada birebir basar.
//
// Marka kuralı: kırmızı yalnızca kicker, ince ayraç ve öne çıkan rakamda.
// Gövde metni asla kırmızı olmaz.

import type { ReactNode } from "react";

export const tr = (n: number) => n.toLocaleString("tr-TR");
export const tr1 = (n: number) =>
  n.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/* ---------------------------------------------------------------- kabuk --- */

export function UstSerit({ tarih }: { tarih: string }) {
  return (
    <div className="bg-tx-siyah px-7 py-3.5">
      <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4">
        <span className="font-baslik text-[15px] font-bold uppercase tracking-[0.14em] text-white">
          Teacher<span className="text-tx-kirmizi">X</span>
        </span>
        <span className="text-[11.5px] tabular-nums tracking-wide text-[#8F8C88]">{tarih}</span>
      </div>
    </div>
  );
}

export function RaporBasligi({
  kurum, altBaslik, meta,
}: { kurum: string; altBaslik: string; meta: ReactNode }) {
  return (
    <header className="border-b border-tx-cizgi bg-white px-7 pb-6 pt-6">
      <div className="mx-auto max-w-[900px]">
        <h1 className="font-baslik text-[clamp(21px,3vw,28px)] font-semibold leading-[1.22] text-tx-metin">
          {kurum}
          <span className="mt-1 block text-[15px] font-normal text-tx-gri">{altBaslik}</span>
        </h1>
        <p className="mt-1 text-[12.5px] text-tx-gri">{meta}</p>
      </div>
    </header>
  );
}

export function Bolum({
  baslik, aciklama, children, className = "",
}: { baslik: string; aciklama?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`mb-11 print:mb-7 print:break-inside-avoid ${className}`}>
      <h2 className="font-baslik text-[19px] font-semibold text-tx-metin">{baslik}</h2>
      {aciklama && <p className="mb-5 mt-1.5 max-w-[64ch] text-[14px] text-tx-gri">{aciklama}</p>}
      {!aciklama && <div className="mb-5" />}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ kpi --- */

export function Pano({ children, sutun = 4 }: { children: ReactNode; sutun?: 3 | 4 }) {
  return (
    <div
      className={`mb-3 grid gap-3 ${
        sutun === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-4"
      } print:grid-cols-4`}
    >
      {children}
    </div>
  );
}

export function Kpi({
  etiket, deger, alt, vurgu = false,
}: { etiket: string; deger: string; alt?: string; vurgu?: boolean }) {
  return (
    <div
      className={`flex min-w-0 flex-col rounded-b bg-white px-4 pb-[18px] pt-4 border-t-[3px] ${
        vurgu ? "border-tx-kirmizi" : "border-tx-cizgi"
      }`}
    >
      <span className="min-h-[2.7em] text-[11.5px] leading-[1.35] text-tx-gri">{etiket}</span>
      <b
        className={`mt-1.5 font-baslik text-[30px] font-semibold leading-[1.1] ${
          vurgu ? "text-tx-kirmizi" : "text-tx-metin"
        }`}
      >
        {deger}
      </b>
      {alt && <span className="mt-[5px] text-[11.5px] text-tx-gri">{alt}</span>}
    </div>
  );
}

/* ---------------------------------------------------------------- halka --- */

export interface HalkaDilim { ad: string; deger: number; renk: string }

export function Halka({
  dilimler, ortaDeger, ortaEtiket,
}: { dilimler: HalkaDilim[]; ortaDeger: string; ortaEtiket: string }) {
  const toplam = dilimler.reduce((a, d) => a + d.deger, 0) || 1;
  const R = 70, C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-x-9 gap-y-5 rounded bg-white px-6 py-6">
      <svg viewBox="0 0 180 180" className="h-[180px] w-[180px] flex-none" role="img"
           aria-label={dilimler.map((d) => `${d.ad}: ${d.deger}`).join(", ")}>
        <g transform="translate(90,90) rotate(-90)">
          {dilimler.map((d) => {
            const uzunluk = (d.deger / toplam) * C;
            const el = (
              <circle key={d.ad} r={R} fill="none" stroke={d.renk} strokeWidth={26}
                      strokeDasharray={`${uzunluk} ${C - uzunluk}`} strokeDashoffset={-offset} />
            );
            offset += uzunluk;
            return el;
          })}
        </g>
        <text x="90" y="86" textAnchor="middle" className="font-baslik"
              style={{ fontSize: 30, fontWeight: 600, fill: "#2A2A2A" }}>{ortaDeger}</text>
        <text x="90" y="104" textAnchor="middle" style={{ fontSize: 11, fill: "#6B6B6B" }}>
          {ortaEtiket}
        </text>
      </svg>

      <div className="flex min-w-0 flex-col gap-3.5">
        {dilimler.map((d) => (
          <div key={d.ad} className="flex items-center gap-2.5 text-[13.5px]">
            <i className="h-[11px] w-[11px] flex-none rounded-[2px]" style={{ background: d.renk }} />
            <span className="min-w-[150px]">{d.ad}</span>
            <span className="tabular-nums text-tx-gri">
              {tr(d.deger)} · %{Math.round((d.deger / toplam) * 100)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- yatay barlar --- */

export interface BarSatiri { ad: string; oran: number; deger: string; soluk?: boolean }

export function YatayBarlar({ satirlar, dipnot }: { satirlar: BarSatiri[]; dipnot?: string }) {
  return (
    <div className="mb-5 rounded bg-white px-6 pb-3.5 pt-5">
      {satirlar.map((s) => (
        <div key={s.ad} className="mb-[11px] flex items-center gap-3.5">
          <span className={`w-[110px] flex-none break-words text-right text-[12.5px] leading-tight md:w-[190px] ${
            s.soluk ? "italic text-tx-gri" : "text-tx-metin"
          }`}>
            {s.ad}
          </span>
          <span className="block h-5 flex-1 rounded-[3px] bg-tx-dolgu">
            <i className={`block h-full rounded-[3px] bg-tx-kirmizi ${s.soluk ? "opacity-40" : ""}`}
               style={{ width: `${Math.max(0, Math.min(100, s.oran))}%` }} />
          </span>
          <span className="w-12 flex-none text-right text-[13px] font-semibold tabular-nums">
            {s.deger}
          </span>
        </div>
      ))}
      <div className="ml-[122px] mr-12 flex justify-between pt-1 text-[11px] text-tx-gri md:ml-[204px]">
        <span>0</span><span>%50</span><span>%100</span>
      </div>
      {dipnot && <p className="mt-2.5 text-[11.5px] text-tx-gri">{dipnot}</p>}
    </div>
  );
}

/* ------------------------------------------------------- dağılım sütunu --- */

export interface Sutun { etiket: string; deger: number; ek?: string }

export function DagilimGrafigi({ sutunlar }: { sutunlar: Sutun[] }) {
  const enBuyuk = Math.max(...sutunlar.map((s) => s.deger), 1);
  return (
    <div className="rounded bg-white px-6 pb-4 pt-8">
      <div className="flex h-[140px] items-end gap-2.5 border-b border-tx-metin">
        {sutunlar.map((s, i) => (
          <div key={s.etiket} className="flex h-full flex-1 flex-col items-center justify-end">
            <div className="relative w-full rounded-t-[2px]"
                 style={{
                   height: `${(s.deger / enBuyuk) * 100}%`,
                   background: i === sutunlar.length - 1 ? "#E70917" : "#101010",
                 }}>
              <b className="absolute -top-[19px] left-0 right-0 text-center text-[11.5px] font-semibold">
                {tr(s.deger)}
              </b>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2.5">
        {sutunlar.map((s) => (
          <span key={s.etiket} className="flex-1 pt-2 text-center text-[11px] leading-[1.35] text-tx-gri">
            {s.etiket}
            {s.ek && <i className="block text-[10px] not-italic opacity-75">{s.ek}</i>}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- tablo --- */

export function Tablo({ basliklar, children }: { basliklar: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13.5px]">
        <thead>
          <tr>
            {basliklar.map((b, i) => (
              <th key={i} className={`border-b border-tx-siyah pb-2.5 pr-2.5 text-[12px] font-medium text-tx-gri ${
                i === 0 ? "text-left" : "text-right"
              }`}>
                {b}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function OranBari({ oran }: { oran: number }) {
  return (
    <span className="block h-[7px] min-w-[60px] rounded bg-tx-dolgu">
      <span className="block h-full rounded bg-tx-kirmizi"
            style={{ width: `${Math.max(0, Math.min(100, oran))}%` }} />
    </span>
  );
}

export function Dipnot({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-[70ch] border-t border-tx-cizgi pt-3.5 text-[12.5px] text-tx-gri">
      {children}
    </p>
  );
}
