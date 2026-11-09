const fs = require("fs");
const path = require("path");

console.log("[Fix Crash & Providers] Deduplicating & syncing Crash category...");

const targets = [
  path.join(__dirname, "dist/assets/index-sn777-v12.js"),
  path.join(__dirname, "dist_backup/assets/index-sn777-v12.js"),
  path.join(__dirname, "original-index-sn777-v5.js"),
  path.join(__dirname, "public/assets/index-sn777-v12.js")
];

const aviatorGamePoster = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgxsYBYFOtvCQctwjjj4vv79pcgx-Dnsiz9k9h_wQzxvYyMFBj-CcTPUalx0nZ8gEn05mWeAVVobwKoQwO-qXw1EY5wnIoXrPJxkRAQ77QSBLpkN9f0c-ihUOFs7s-wsrfVM1I-H33QMt8SdqpiAwa03d8ftxQ8Z4zT1yDpp8jROvBylcJEq680AjtqC7sS/s554/images%20(5).jpeg";
const crashGamePoster = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgAOKNUFq_8aXlR-0tsKxFaNoXJDJ0bm_noJoKTk1TT3CKE2y7CvDj4N9rf7zszlIDdYQlLskhjBk2cidZR-r58n6CiEVsHWPEzQSaVO73CckBy5xpPrwJ6V3tyvS9wEhxtA2oQ-IJng1GEXE2bTO5dpGpnuHNemUAzpx-om6g3l239hx16qZgybwQJRH9z/s447/images%20(6).jpeg";

const crash88Img = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiDAhi9FFBlL4i4yXbCAruKcu-_8CELKe5FZb2KfpanCMLV6KlusG8ySCuJ3DEgFPKGkdog3kNBMajR0rcaNgFN3HK82Wwcz0eYU9L6a0wOrPHFbBp42ftXfKA550F60Z30bZO5YXl73ta1Tj17c6BA9EejWIPef82JmgVfdwBiQ6qSjwChljpiBgsz1bEg/s120/provider-awcv2_crash88.png";
const aviator2Img = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjrG9jOehiozyFRoPwiX4WHCzuVp67dlTUsj_VXSYpy-KddzVy2N6F7cEBv1IjqqUHaPeMcDmGybU0DsNv6PBQXkDoq9iwl35ZhO4A09yx6j0fKrAzWT8oU4taeeL1OEMb-A7Gl41mNF4UBAHcv0GaVthqSgOasLl9JLOh88t6uLMGJcMjWDDP1C3envl-G/s120/provider-awcv2_aviator2.png";
const smartsoftImg = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjn9PCwXIk1ekV5EL36qnpbrEJEL2nwedeYNTizO6WMHMi0C2q1HarR3VyrKWmWC299uQJzgIvz4YxR4zhQbVkM1iHsKRdeeVTNK51B6_wfl5NP-ZI1HBpF00i-daq2PUfkuBqXdAFXym_wqmJpsRsAbn3D4yibh2ZCIifRwJ0ZLYV3RXuCpmYDiW9TpuTb/s120/provider-awcv2_smartsoft.png";

const cleanCrashItems = [
  `{title:"SPRIBE",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgH0YR5LiIg87XHNLnRDzuQd0CIuLXXmzCRb9kwC20-d39yKye-Qk5P_SeeKyPybUhFOGGgMAcKG75RMOJlmEpJ5X2fUK7gJPyYsah2DJTouA7typnmR9QmK-5k3sLLt6NLI1YoziUA-TnYLttAtSH0mjukhtevNpf8s1fIJE8AIZj74Frs8FbTtJMM9sFA/s120/provider-awcv2_spribe.png",category:"ক্র্যাশ",isHot:!1}`,
  `{title:"JILI",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjessdgCem41qNzUMd-yLXBtZkKt7AEkcXAfSy-yT3uFnvb9fXXr_c_JUbyRu9EHjYNDeQ0lC3yZDMLPGq_zduTog1I-lsIzizfBRdHLOKo6hDOkE1CFg8JEnZ_ZtIa9BZCxOEn_oZhl0dvS9FLiR2tUNWXb5rUm_DBgBr6boxLhwhrkDQ-NvnoLVpes1nQ/s120/provider-awcv2_jili.png",category:"ক্র্যাশ",isHot:!1}`,
  `{title:"PP",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiMPZWLFyD6YlVWO4bmuZXAxlCYR8pjpFZHlqviWga8hDmHzZwLiaSt6FeiGbfDwQxVXO34aqc-cHN9KqGfgSKbcyt-ehIM8mniu9AdsRpPfyemOXN__7WFexeZGgtHPp4wVtduP_xKX6xDnB25i4wyXbSNBhxEczajBFOnaGElEsprSpxOCgdfAGGpasr/s120/provider-awcv2_pp%20(1).png",category:"ক্র্যাশ",isHot:!1}`,
  `{title:"MG",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgu0CIuLXXmzCRb9kwC20-d39yKye-Qk5P_SeeKyPybUhFOGGgMAcKG75RMOJlmEpJ5X2fUK7gJPyYsah2DJTouA7typnmR9QmK-5k3sLLt6NLI1YoziUA-TnYLttAtSH0mjukhtevNpf8s1fIJE8AIZj74Frs8FbTtJMM9sFA/s120/provider-mg.png",category:"ক্র্যাশ",isHot:!1}`,
  `{title:"JDB",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh6a4zfFVaT17aou1bzcl1/s120/provider-awcv2_jdb.png",category:"ক্র্যাশ",isHot:!1}`,
  `{title:"FC",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjI37CASsqIXZ9FS68u2Vo0NOt4Kh2wxaRBLgwFLSlEWttNEJI1Sy2uOv7Ut7NgkY3PjbkHxIJrOh1n-_MjSh7uTm1DHxoFw7g9eKa1-Jo88r3OVmeLy6aozGzGiyi1pSypzy4S5_TST0XRI4PxuUaI7KZjihP8U0ei0rF_v455jVrfKH2TM6R6CChZ3lDh/s120/provider-awcv2_fc.png",category:"ক্র্যাশ",isHot:!1}`,
  `{title:"KM",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg_OuzByTHTeYioOae/s120/provider-awcv2_kingmaker.png",category:"ক্র্যাশ",isHot:!1}`,
  `{title:"RELAX",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXs6qInxgnXy4Z8zluRhlB/s120/provider-awcv2_relax.png",category:"ক্র্যাশ",isHot:!1}`,
  `{title:"YL",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj8rL2B4jKU0WwzH4SzUleTUO/s360/provider-awcv2_yl.png",category:"ক্র্যাশ",isHot:!1}`,
  `{title:"CQ9",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgrcDv8FR4kQPpaBZUZWe8-qpQSoV/s120/provider-cq9.png",category:"ক্র্যাশ",isHot:!1}`,
  `{title:"JOKER",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsmzgzYJ5uTNCj533ReJvVYlgxF/s120/provider-joker.png",category:"ক্র্যাশ",isHot:!1}`,
  `{title:"KA",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEit20sImJ4hWoMPrcrKVV0siPvQtlKt/s120/provider-ka.png",category:"ক্র্যাশ",isHot:!1}`,
  `{title:"RICH88",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXyZV5Svpv7p9WAl6CGuFICyWi/s360/provider-rich88.png",category:"ক্র্যাশ",isHot:!1}`,
  `{title:"LETSGO",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXY3JLQRjto_xmOm8kIt/s120/provider-awcv2_letsgo.png",category:"ক্র্যাশ",isHot:!1}`,
  `{title:"AVIATOR2",image:"${aviator2Img}",category:"ক্র্যাশ",isHot:!1}`,
  `{title:"CRASH88",image:"${crash88Img}",category:"ক্র্যাশ",isHot:!1}`,
  `{title:"SMARTSOFT",image:"${smartsoftImg}",category:"ক্র্যাশ",isHot:!1}`,
  `{title:"Aviator",image:"${aviatorGamePoster}",category:"ক্র্যাশ",isHot:!0}`,
  `{title:"Crash",image:"${crashGamePoster}",category:"ক্র্যাশ",isHot:!0}`
];

const newBlock = cleanCrashItems.join(",");

targets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, "utf8");

  // Remove all existing items with category:"ক্র্যাশ"
  code = code.replace(/(\{title:"[^"]+",image:"[^"]+",category:"ক্র্যাশ",isHot:[^}]+\},?)+/g, "");

  // Insert single clean block before category:"টেবিল" or category:"ক্যাসিনো" or slot items
  const marker = `{title:"ক্যাসিনো"`;
  const insertIdx = code.indexOf(marker);
  if (insertIdx !== -1) {
    code = code.substring(0, insertIdx) + newBlock + "," + code.substring(insertIdx);
  }

  // Clean double commas
  code = code.replace(/,,+/g, ",");
  fs.writeFileSync(filePath, code, "utf8");
});

try {
  const distFile = path.join(__dirname, "dist/assets/index-sn777-v12.js");
  const publicFile = path.join(__dirname, "public/assets/index-sn777-v12.js");
  const backupFile = path.join(__dirname, "dist_backup/assets/index-sn777-v12.js");
  if (fs.existsSync(distFile)) {
    fs.copyFileSync(distFile, publicFile);
    fs.copyFileSync(distFile, backupFile);
    console.log("[Fix Crash] Deduplicated and synced pristine 19 Crash items!");
  }
} catch (err) {
  console.error("[Fix Crash Error]", err.message);
}
