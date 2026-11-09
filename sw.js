const CACHE_NAME = "sn777-v58-speed";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/assets/index-C0XgLZC6-v3.css",
  "/assets/index-sn777-v13-nagad.js?v=1794130275901",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjessdgCem41qNzUMd-yLXBtZkKt7AEkcXAfSy-yT3uFnvb9fXXr_c_JUbyRu9EHjYNDeQ0lC3yZDMLPGq_zduTog1I-lsIzizfBRdHLOKo6hDOkE1CFg8JEnZ_ZtIa9BZCxOEn_oZhl0dvS9FLiR2tUNWXb5rUm_DBgBr6boxLhwhrkDQ-NvnoLVpes1nQ/s120/provider-awcv2_jili.png",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjI37CASsqIXZ9FS68u2Vo0NOt4Kh2wxaRBLgwFLSlEWttNEJI1Sy2uOv7Ut7NgkY3PjbkHxIJrOh1n-_MjSh7uTm1DHxoFw7g9eKa1-Jo88r3OVmeLy6aozGzGiyi1pSypzy4S5_TST0XRI4PxuUaI7KZjihP8U0ei0rF_v455jVrfKH2TM6R6CChZ3lDh/s120/provider-awcv2_fc.png",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiMPZWLFyD6YlVWO4bmuZXAxlCYR8pjpFZHlqviWga8hDmHzZwLiaSt6FeiGbfDwQxVXO34aqc-cHN9KqGfgSKbcyt-ehIM8mniu9AdsRpPfyemOXN__7WFexeZGgtHPp4wVtduP_xKX6xDnB25i4wyXbSNBhxEczajBFOnaGElEspurSpxOCgdfAGGpasr/s120/provider-awcv2_pp%20(1).png",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiSVKhAnrlFv-ZatgcAKGZ3m0b8JGJRCuERTUi5aCb3qER7RlEad-r1l6at218Uk2YwUpom4aN6fCquRaWXUfXKo5ZVHTIjbLi1dDQGIHB9Q4O8F1TALtIaeqUFd78lMI0MV9YiuIHyQq6YZ7ufIC6BPq7-RRqUey9-T93d1n6wND_cio20hCm8I4_vmc-N/s120/provider-awcv2_pg.png",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEht1EH5nfdmUETFfsQZtVSkBY9dqYQVssawVLxOycbkeUJ9C3tZZpP8cvq-aUNVT5YDp4a6ifCkZO-Xzmlo7R6Lbegx2UkmaOaydWAhczc_XzAfwFEuRqJXTYQe5VcEioolf_sjd90sjLmmLVydOoAc5-zt3bG4k4_FgRb2VArx6a4zfFVaT17aou1bzcl1/s120/provider-awcv2_jdb.png",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjzL3Q0Ans_zuLxYZnEaJjkqKkWS3pANzbmQ6L7xgjMg7uD3yua0KejfultWCyC_CyFgGIVCffxSsn0_bxhEf9Jxg_pNfxUzJKTR5t4Gr3e55eMFgfnCe5oZbINbj1VfGwtALPtkK1VQMOAeMW4ur7mm8e2fOr2iRXmmbwhzJRVpkUtrjlhVk3XNNwvY8HC/s120/provider-awcv2_combo.png",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhKcF7-7SDl-459vpzdIByX8-xavLRul8CFFdjMR50Rj487IVnvxaMq3bFjvcDZQXQ5bHbZwpfcGQmPfGJdcm9QnqTnPcOkktgWUVrlNK4Yz9tYkW9fqzMjyN8l6ucnz6etDjflgsbiKsuCJ_3qXXELXtmbtAzSf8odlGDVL_54SPY3JLQRjto_xmOm8kIt/s120/provider-awcv2_letsgo.png",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiOkyplq5U_mbnfFkb_heLxDN__Kh7h7GfwOAR1w_EzAnLOiLxXEGfHWZtctDTO_jU0TTzCpbPkxezuGZBZU1kew_2h2LHCI2b6I8uU5QFhyphenhyphenXxShDVqlxSSGMBpoQVI37Vx76RjeabnTV4lUtoSuFIzCI8uzTES5FIlFfL3VEOyjFmLZI_bxpYxml1AeiMT/s120/provider-monopoly.png",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEguqiwXsxMKY6vfS4jXtoMc7PRBmKO_uVp-BKvqCsqjcrIy1qM1rwNr-iUxKUgtNL4Acy9izQj8VB8GhDXE38gEMrirtHERyAsxFsqL7LFmj73R9g-O8sPnU5Ci5pdfog1bL6R4FG6MZK1BrloeO3i_3cIaOFhP-i8uWJly18shcxFUFauRC1fbTFFoUsDX/s120/provider-mg.png",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj-8Fm0wrTld_zhkleR7eYF9tZhsV5dGAPpWypYrBeWS9xB-VoKzL6bf8ZQGE4RoA-J3mkFFFuTyOXmpaEaITjlF1NE-RyR9yVQ3jr_HuVaQ0QxV2HK3d9va3yOpFhmofxYFOQTh4SAKkTVs9BuYMcymXQh5_YR_6B8E6XxJdZLSRtzfFZ5WEzP8vFbe6wZ/s120/provider-awcv2_yesbingo.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip dynamic API and auth endpoints
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/__/") || url.pathname.includes("firestore")) {
    return;
  }

  // Fast Cache-First with background revalidation for static bundles, fonts, styles, and images
  if (
    url.pathname.startsWith("/assets/") ||
    url.hostname.includes("blogger.googleusercontent.com") ||
    url.hostname.includes("cdn.jsdelivr.net") ||
    url.hostname.includes("fonts.gstatic.com") ||
    url.hostname.includes("fonts.googleapis.com")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Stale-While-Revalidate for HTML navigation (Opens app in 0ms, updates cache in background!)
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match("/index.html").then((cachedIndex) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", responseToCache));
            }
            return networkResponse;
          })
          .catch(() => cachedIndex);

        // If we have cached index, return immediately for instant startup!
        return cachedIndex || fetchPromise;
      })
    );
    return;
  }

  // Default network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});
