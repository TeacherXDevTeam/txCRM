"use client";

import { useMemo } from "react";
import type { KesitKurum } from "./kesit";
import { tr } from "./brand";

/**
 * Kurum dağılımı — yatayda öğretmen sayısı, dikeyde ilerleme ortalaması.
 *
 * Tabloda kaybolan bir şeyi gösterir: hangi BÜYÜK kurum geride kalıyor.
 * 300 öğretmenli bir kurumun %20'de olması, 10 öğretmenli bir kurumun
 * %20'de olmasından çok daha önemli; sıralı tabloda ikisi yan yana durur.
 *
 * Saf SVG — kütüphane yok, PDF'e birebir basar. Tooltip için <title>
 * kullanılıyor: tarayıcının kendi ipucu, JavaScript gerektirmez.
 */

const G = { sol: 52, sag: 16, ust: 16, alt: 40 };
const W = 900, H = 340;
const ic = { g: W - G.sol - G.sag, y: H - G.ust - G.alt };

function renk(yuzde: number): string {
  if (yuzde >= 80) return "#16A34A";
  if (yuzde >= 60) return "#65A30D";
  if (yuzde >= 40) return "#CA8A04";
  if (yuzde >= 20) return "#EA580C";
  return "#E70917";
}

export function KesitDagilim({
  kurumlar, onKurumSec,
}: { kurumlar: KesitKurum[]; onKurumSec: (kurum: string) => void }) {
  const { noktalar, xTikler, ortalama } = useMemo(() => {
    const enBuyuk = Math.max(...kurumlar.map((k) => k.ogretmenSayisi), 10);
    // Öğretmen sayısı çok çarpık dağılıyor (5 ile 500+ arası) → log ölçek
    const maxLog = Math.log10(Math.max(enBuyuk, 10));
    const x = (n: number) => (Math.log10(Math.max(n, 1)) / maxLog) * ic.g;
    const y = (p: number) => ic.y - (Math.min(100, Math.max(0, p)) / 100) * ic.y;

    const noktalar = kurumlar.map((k) => ({
      kurum: k,
      cx: G.sol + x(k.ogretmenSayisi),
      cy: G.ust + y(k.ilerlemeOrtalamasi),
      r: k.ogretmenSayisi >= 200 ? 6 : k.ogretmenSayisi >= 50 ? 5 : 4,
    }));

    const tikDegerleri = [10, 50, 100, 250, 500, 1000].filter((t) => t <= enBuyuk * 1.4);
    const xTikler = tikDegerleri.map((t) => ({ deger: t, px: G.sol + x(t) }));

    const toplamKisi = kurumlar.reduce((a, k) => a + k.ogretmenSayisi, 0);
    const ortalama = toplamKisi
      ? kurumlar.reduce((a, k) => a + k.ilerlemeOrtalamasi * k.ogretmenSayisi, 0) / toplamKisi
      : 0;

    return { noktalar, xTikler, ortalama };
  }, [kurumlar]);

  // Dikkat çekmesi gereken kurumlar: büyük ama geride
  const riskli = useMemo(
    () =>
      [...kurumlar]
        .filter((k) => k.ilerlemeOrtalamasi < ortalama)
        .sort((a, b) => b.ogretmenSayisi - a.ogretmenSayisi)
        .slice(0, 3)
        .map((k) => k.kurumAdi),
    [kurumlar, ortalama]
  );

  return (
    <div className="rounded bg-white p-4 print:break-inside-avoid">
      <h3 className="font-baslik text-sm font-semibold text-tx-metin">Kurum Dağılımı</h3>
      <p className="mb-3 text-[12px] text-tx-gri">
        Yatay: öğretmen sayısı (logaritmik) · Dikey: ilerleme ortalaması. Sağ altta kalanlar
        öncelikli — çok öğretmen, düşük ilerleme. Noktaya tıklayınca kurum raporu açılır.
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 380 }}
           role="img" aria-label={`${kurumlar.length} kurumun öğretmen sayısı ve ilerleme ortalaması dağılımı`}>
        {/* yatay ızgara + y ekseni */}
        {[0, 20, 40, 60, 80, 100].map((p) => {
          const cy = G.ust + ic.y - (p / 100) * ic.y;
          return (
            <g key={p}>
              <line x1={G.sol} x2={W - G.sag} y1={cy} y2={cy} stroke="#DFDCD6" strokeWidth={1} />
              <text x={G.sol - 8} y={cy + 4} textAnchor="end" style={{ fontSize: 11, fill: "#6B6B6B" }}>%{p}</text>
            </g>
          );
        })}

        {/* ağırlıklı ortalama çizgisi */}
        <line
          x1={G.sol} x2={W - G.sag}
          y1={G.ust + ic.y - (ortalama / 100) * ic.y}
          y2={G.ust + ic.y - (ortalama / 100) * ic.y}
          stroke="#101010" strokeWidth={1} strokeDasharray="5 4"
        />
        <text x={W - G.sag} y={G.ust + ic.y - (ortalama / 100) * ic.y - 6} textAnchor="end"
              style={{ fontSize: 10.5, fill: "#101010" }}>
          ağırlıklı ortalama %{ortalama.toFixed(1)}
        </text>

        {/* x ekseni */}
        <line x1={G.sol} x2={W - G.sag} y1={G.ust + ic.y} y2={G.ust + ic.y} stroke="#2A2A2A" strokeWidth={1} />
        {xTikler.map((t) => (
          <text key={t.deger} x={t.px} y={G.ust + ic.y + 16} textAnchor="middle"
                style={{ fontSize: 11, fill: "#6B6B6B" }}>{tr(t.deger)}</text>
        ))}
        <text x={G.sol + ic.g / 2} y={H - 6} textAnchor="middle" style={{ fontSize: 11, fill: "#6B6B6B" }}>
          öğretmen sayısı
        </text>

        {/* noktalar */}
        {noktalar.map((n) => (
          <circle
            key={n.kurum.kurumAdi}
            cx={n.cx} cy={n.cy} r={n.r}
            fill={renk(n.kurum.ilerlemeOrtalamasi)}
            fillOpacity={0.82}
            stroke="#FFFFFF" strokeWidth={1}
            className="cursor-pointer"
            onClick={() => onKurumSec(n.kurum.kurumAdi)}
          >
            {/*
              TEK metin düğümü olmalı. <title> tarayıcıda ham metin (RCDATA)
              olarak ayrıştırılır; birden fazla JSX çocuğu verilirse React
              sunucuda aralarına <!-- --> koyar, tarayıcı bunları yorum değil
              METİN sayar ve hydration çöker.
            */}
            <title>{`${n.kurum.kurumAdi}\n${tr(n.kurum.ogretmenSayisi)} öğretmen\nilerleme %${n.kurum.ilerlemeOrtalamasi.toFixed(1)} · tamamlanma %${n.kurum.tamamlanmaOrani.toFixed(1)}`}</title>
          </circle>
        ))}
      </svg>

      {riskli.length > 0 && (
        <p className="mt-2 text-[12px] text-tx-gri">
          Ortalamanın altındaki en büyük kurumlar:{" "}
          {riskli.map((ad, i) => (
            <span key={ad}>
              {i > 0 && " · "}
              <button onClick={() => onKurumSec(ad)} className="font-medium text-tx-metin hover:text-tx-kirmizi hover:underline">
                {ad}
              </button>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
