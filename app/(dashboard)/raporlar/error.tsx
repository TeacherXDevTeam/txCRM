"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Raporlar rotasına özel hata sınırı.
 *
 * Bu olmadan bir çalışma zamanı hatası Next.js'in genel ekranına düşüyor
 * ("Application error: a client-side exception has occurred") ve sebebi
 * yalnızca tarayıcı konsolundan okunabiliyor. Burada hatayı ekrana basıyoruz
 * ki ekran görüntüsü yeterli olsun.
 */
export default function RaporlarError({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Raporlar] hata:", error);
  }, [error]);

  const sha = process.env.NEXT_PUBLIC_BUILD_SHA ?? "bilinmiyor";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-lg border-l-[3px] border-tx-kirmizi bg-white p-6">
        <h1 className="flex items-center gap-2 font-baslik text-lg font-semibold text-tx-metin">
          <AlertTriangle className="h-5 w-5 text-tx-kirmizi" />
          Raporlar sayfası yüklenemedi
        </h1>
        <p className="mt-2 text-sm text-tx-gri">
          Sayfa açılırken bir hata oluştu. Aşağıdaki bilgiyi geliştiriciye iletirseniz sebebi
          doğrudan görülebilir.
        </p>

        <dl className="mt-4 space-y-3 rounded bg-tx-kagit p-4 text-[13px]">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-tx-kirmizi">Hata</dt>
            <dd className="mt-1 break-words font-mono text-tx-metin">{error.message || "(mesaj yok)"}</dd>
          </div>
          {error.digest && (
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-tx-kirmizi">Digest</dt>
              <dd className="mt-1 font-mono text-tx-metin">{error.digest}</dd>
            </div>
          )}
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-tx-kirmizi">Sürüm</dt>
            <dd className="mt-1 font-mono text-tx-metin">{sha}</dd>
          </div>
        </dl>

        <button
          onClick={reset}
          className="mt-5 inline-flex items-center gap-1.5 rounded bg-tx-siyah px-3 py-2 text-sm font-medium text-white hover:bg-tx-metin"
        >
          <RotateCcw className="h-4 w-4" />
          Tekrar dene
        </button>
      </div>
    </div>
  );
}
