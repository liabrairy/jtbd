import Script from "next/script";

import { yandexMetrikaId } from "@/lib/yandex-metrika";

export function YandexMetrika() {
  if (!yandexMetrikaId) return null;

  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">
        {`
          (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j += 1) {
              if (document.scripts[j].src === r) return;
            }
            k=e.createElement(t);
            a=e.getElementsByTagName(t)[0];
            k.async=1;
            k.src=r;
            a.parentNode.insertBefore(k,a);
          })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js?id=${yandexMetrikaId}", "ym");

          ym(${yandexMetrikaId}, "init", {
            ssr: true,
            clickmap: true,
            ecommerce: "dataLayer",
            referrer: document.referrer,
            url: location.href,
            trackLinks: true,
            accurateTrackBounce: true,
            webvisor: true
          });

          window.__YANDEX_METRIKA_READY__ = true;
          (window.__YANDEX_METRIKA_PENDING__ || []).forEach(function(args) {
            ym.apply(null, args);
          });
          window.__YANDEX_METRIKA_PENDING__ = [];
        `}
      </Script>
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${yandexMetrikaId}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
