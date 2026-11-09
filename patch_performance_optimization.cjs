const fs = require('fs');
const path = require('path');

console.log('[Performance Patch] Starting speed and low-data optimizations...');

// Top provider logos and asset URLs for pre-caching
const providerLogosToPrecache = [
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

// 1. Update sw.js files to precache logos and optimize caching strategy
const swFiles = [
  path.join(__dirname, 'sw.js'),
  path.join(__dirname, 'public/sw.js'),
  path.join(__dirname, 'dist/sw.js')
];

swFiles.forEach(f => {
  if (!fs.existsSync(f)) return;
  let code = fs.readFileSync(f, 'utf8');
  
  // Replace CORE_ASSETS list with precached image URLs and bundles
  const precacheStr = JSON.stringify([
    "/",
    "/index.html",
    "/manifest.json",
    "/assets/index-C0XgLZC6-v3.css",
    "/assets/index-sn777-v13-nagad.js?v=1794130275901",
    ...providerLogosToPrecache
  ], null, 2);

  code = code.replace(/const CORE_ASSETS = \[[^\]]+\];/s, `const CORE_ASSETS = ${precacheStr};`);

  // Ensure Cache-First for blogger images is immediate
  if (!code.includes('caches.open(CACHE_NAME)')) {
    console.log(`[Performance Patch] sw.js missing cache put`);
  }

  fs.writeFileSync(f, code, 'utf8');
  console.log(`[Performance Patch] Updated pre-cache assets in ${f}`);
});

// 2. Enhance index.html with CDN preconnects & smooth rendering styles
const htmlFiles = [
  path.join(__dirname, 'index.html'),
  path.join(__dirname, 'dist/index.html'),
  path.join(__dirname, 'dist_backup/index.html')
];

const preconnectTags = `
    <!-- High-Performance Image Loading & CDN Preconnect -->
    <link rel="dns-prefetch" href="https://blogger.googleusercontent.com">
    <link rel="preconnect" href="https://blogger.googleusercontent.com" crossorigin>
    <style>
      * {
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }
      html, body {
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-y: none;
        text-rendering: optimizeSpeed;
      }
      img {
        content-visibility: auto;
        decoding: async;
      }
      .gpu-accelerated {
        transform: translateZ(0);
        will-change: transform;
        backface-visibility: hidden;
      }
    </style>
`;

htmlFiles.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  if (!content.includes('dns-prefetch')) {
    content = content.replace('</head>', `${preconnectTags}\n  </head>`);
    fs.writeFileSync(f, content, 'utf8');
    console.log(`[Performance Patch] Injected preconnects and smooth styling into ${f}`);
  }
});

// 3. Optimize JS file image creation with decoding="async" and loading="lazy"
const jsTargets = [
  path.join(__dirname, 'dist/assets/index-sn777-v13-nagad.js'),
  path.join(__dirname, 'dist_backup/assets/index-sn777-v13-nagad.js'),
  path.join(__dirname, 'public/assets/index-sn777-v13-nagad.js'),
  path.join(__dirname, 'dist/assets/index-sn777-v13-final.js'),
  path.join(__dirname, 'public/assets/index-sn777-v13-final.js'),
  path.join(__dirname, 'dist/assets/index-sn777-v12.js'),
  path.join(__dirname, 'dist_backup/assets/index-sn777-v12.js'),
  path.join(__dirname, 'original-index-sn777-v5.js')
];

jsTargets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Add decoding="async" and loading="lazy" to dynamically created images in JS
  if (code.includes('createElement("img")') && !code.includes('decoding="async"')) {
    code = code.replace(/createElement\("img"\)/g, 'Object.assign(document.createElement("img"),{decoding:"async",loading:"lazy"})');
    modified = true;
    console.log(`[Performance Patch] Added decoding="async" & loading="lazy" in ${path.basename(filePath)}`);
  }

  if (modified) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log(`[Performance Patch] Successfully optimized ${path.basename(filePath)}`);
  }
});

console.log('[Performance Patch] Speed and low-data optimizations completed successfully!');
