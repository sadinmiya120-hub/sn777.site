const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log("[Build] 1. Syncing assets...");
if (fs.existsSync("dist_backup")) {
  copyDir("dist_backup", "dist");
} else if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist", { recursive: true });
}

// Ensure index.html and _redirects exist in dist
if (fs.existsSync("index.html")) {
  fs.copyFileSync("index.html", "dist/index.html");
}
if (fs.existsSync("_redirects")) {
  fs.copyFileSync("_redirects", "dist/_redirects");
}

console.log("[Build] 2. Running patches...");
try {
  if (fs.existsSync("./update_deposit_min_200.cjs")) {
    require("./update_deposit_min_200.cjs");
  } else if (fs.existsSync("./apply_min_deposit_100.cjs")) {
    require("./apply_min_deposit_100.cjs");
  }
} catch (e) {
  console.warn("Patch deposit warning:", e.message);
}

try {
  if (fs.existsSync("./fix_deposit_balance_and_cancelled_stats.cjs")) {
    require("./fix_deposit_balance_and_cancelled_stats.cjs");
  }
} catch (e) {
  console.warn("Fix deposit balance warning:", e.message);
}


try {
  if (fs.existsSync("./patch_gopay_gateway.cjs")) {
    require("./patch_gopay_gateway.cjs");
  }
} catch (e) {
  console.warn("Patch gopay warning:", e.message);
}

try {
  if (fs.existsSync("./apply_remove_all_old_gateways.cjs")) {
    require("./apply_remove_all_old_gateways.cjs");
  }
} catch (e) {
  console.warn("Remove old gateways warning:", e.message);
}

try {
  if (fs.existsSync("./patch_telegram_livechat.cjs")) {
    require("./patch_telegram_livechat.cjs");
  }
} catch (e) {
  console.warn("Patch telegram livechat warning:", e.message);
}

try {
  if (fs.existsSync("./patch_fishing_games.cjs")) {
    require("./patch_fishing_games.cjs");
  }
} catch (e) {
  console.warn("Patch fishing warning:", e.message);
}

try {
  if (fs.existsSync("./patch_dg_baccarat_qc02.cjs")) {
    require("./patch_dg_baccarat_qc02.cjs");
  }
} catch (e) {
  console.warn("Patch DG baccarat QC02 warning:", e.message);
}

try {
  if (fs.existsSync("./patch_casino_app_install.cjs")) {
    require("./patch_casino_app_install.cjs");
  }
} catch (e) {
  console.warn("Patch casino app warning:", e.message);
}

try {
  if (fs.existsSync("./patch_deposit_history_order.cjs")) {
    require("./patch_deposit_history_order.cjs");
  }
} catch (e) {
  console.warn("Patch deposit history warning:", e.message);
}

try {
  if (fs.existsSync("./patch_remove_top_install_banner.cjs")) {
    require("./patch_remove_top_install_banner.cjs");
  }
} catch (e) {
  console.warn("Patch remove top banner warning:", e.message);
}

try {
  if (fs.existsSync("./apply_full_pp_slot.cjs")) {
    require("./apply_full_pp_slot.cjs");
  } else if (fs.existsSync("./patch_slot_pp.cjs")) {
    require("./patch_slot_pp.cjs");
  }
} catch (e) {
  console.warn("Patch slot PP warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_pg.cjs")) {
    require("./patch_slot_pg.cjs");
  }
} catch (e) {
  console.warn("Patch slot PG warning:", e.message);
}

try {
  if (fs.existsSync("./patch_game_rules_popup.cjs")) {
    require("./patch_game_rules_popup.cjs");
  }
} catch (e) {
  console.warn("Patch game rules popup warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_jdb.cjs")) {
    require("./patch_slot_jdb.cjs");
  }
} catch (e) {
  console.warn("Patch slot JDB warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_combo.cjs")) {
    require("./patch_slot_combo.cjs");
  }
} catch (e) {
  console.warn("Patch slot COMBO warning:", e.message);
}

try {
  if (fs.existsSync("./patch_provider_direct_rules.cjs")) {
    require("./patch_provider_direct_rules.cjs");
  }
} catch (e) {
  console.warn("Patch provider direct rules warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_letsgo.cjs")) {
    require("./patch_slot_letsgo.cjs");
  }
} catch (e) {
  console.warn("Patch slot LETSGO warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_monopoly.cjs")) {
    require("./patch_slot_monopoly.cjs");
  }
} catch (e) {
  console.warn("Patch slot MONOPOLY warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_mg.cjs")) {
    require("./patch_slot_mg.cjs");
  }
} catch (e) {
  console.warn("Patch slot MG warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_yellowbat.cjs")) {
    require("./patch_slot_yellowbat.cjs");
  }
} catch (e) {
  console.warn("Patch slot YELLOWBAT warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_fastspin.cjs")) {
    require("./patch_slot_fastspin.cjs");
  }
} catch (e) {
  console.warn("Patch slot FASTSPIN warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_sg.cjs")) {
    require("./patch_slot_sg.cjs");
  }
} catch (e) {
  console.warn("Patch slot SG warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_nextspin.cjs")) {
    require("./patch_slot_nextspin.cjs");
  }
} catch (e) {
  console.warn("Patch slot NEXTSPIN warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_lucky365.cjs")) {
    require("./patch_slot_lucky365.cjs");
  }
} catch (e) {
  console.warn("Patch slot LUCKY365 warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_fiveg.cjs")) {
    require("./patch_slot_fiveg.cjs");
  }
} catch (e) {
  console.warn("Patch slot FIVEG warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_rich88.cjs")) {
    require("./patch_slot_rich88.cjs");
  }
} catch (e) {
  console.warn("Patch slot RICH88 warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_acewin.cjs")) {
    require("./patch_slot_acewin.cjs");
  }
} catch (e) {
  console.warn("Patch slot ACEWIN warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_btg.cjs")) {
    require("./patch_slot_btg.cjs");
  }
} catch (e) {
  console.warn("Patch slot BTG warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_cg.cjs")) {
    require("./patch_slot_cg.cjs");
  }
} catch (e) {
  console.warn("Patch slot CG warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_dragoonsoft.cjs")) {
    require("./patch_slot_dragoonsoft.cjs");
  }
} catch (e) {
  console.warn("Patch slot DRAGOONSOFT warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_gtf.cjs")) {
    require("./patch_slot_gtf.cjs");
  }
} catch (e) {
  console.warn("Patch slot GTF warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_hacksaw.cjs")) {
    require("./patch_slot_hacksaw.cjs");
  }
} catch (e) {
  console.warn("Patch slot HACKSAW warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_km.cjs")) {
    require("./patch_slot_km.cjs");
  }
} catch (e) {
  console.warn("Patch slot KM warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_microslot.cjs")) {
    require("./patch_slot_microslot.cjs");
  }
} catch (e) {
  console.warn("Patch slot MICROSLOT warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_mimi.cjs")) {
    require("./patch_slot_mimi.cjs");
  }
} catch (e) {
  console.warn("Patch slot MIMI warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_netent.cjs")) {
    require("./patch_slot_netent.cjs");
  }
} catch (e) {
  console.warn("Patch slot NETENT warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_nlc.cjs")) {
    require("./patch_slot_nlc.cjs");
  }
} catch (e) {
  console.warn("Patch slot NLC warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_octoplay.cjs")) {
    require("./patch_slot_octoplay.cjs");
  }
} catch (e) {
  console.warn("Patch slot OCTOPLAY warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_p8.cjs")) {
    require("./patch_slot_p8.cjs");
  }
} catch (e) {
  console.warn("Patch slot P8 warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_playstar.cjs")) {
    require("./patch_slot_playstar.cjs");
  }
} catch (e) {
  console.warn("Patch slot PLAYSTAR warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_pt.cjs")) {
    require("./patch_slot_pt.cjs");
  }
} catch (e) {
  console.warn("Patch slot PT warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_relax.cjs")) {
    require("./patch_slot_relax.cjs");
  }
} catch (e) {
  console.warn("Patch slot RELAX warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_rt.cjs")) {
    require("./patch_slot_rt.cjs");
  }
} catch (e) {
  console.warn("Patch slot RT warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_yggdrasil.cjs")) {
    require("./patch_slot_yggdrasil.cjs");
  }
} catch (e) {
  console.warn("Patch slot YGGDRASIL warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_yl.cjs")) {
    require("./patch_slot_yl.cjs");
  }
} catch (e) {
  console.warn("Patch slot YL warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_cq9.cjs")) {
    require("./patch_slot_cq9.cjs");
  }
} catch (e) {
  console.warn("Patch slot CQ9 warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_injoy.cjs")) {
    require("./patch_slot_injoy.cjs");
  }
} catch (e) {
  console.warn("Patch slot INJOY warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_joker.cjs")) {
    require("./patch_slot_joker.cjs");
  }
} catch (e) {
  console.warn("Patch slot JOKER warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_ka.cjs")) {
    require("./patch_slot_ka.cjs");
  }
} catch (e) {
  console.warn("Patch slot KA warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_maha.cjs")) {
    require("./patch_slot_maha.cjs");
  }
} catch (e) {
  console.warn("Patch slot MAHA warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_worldmatch.cjs")) {
    require("./patch_slot_worldmatch.cjs");
  }
} catch (e) {
  console.warn("Patch slot WORLDMATCH warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_habanero.cjs")) {
    require("./patch_slot_habanero.cjs");
  }
} catch (e) {
  console.warn("Patch slot HABANERO warning:", e.message);
}

try {
  try {
  try {
  try {
  try {
  try {
  if (fs.existsSync("./patch_hide_hacksaw.cjs")) {
    require("./patch_hide_hacksaw.cjs");
  }
} catch (e) {
  console.warn("Patch hide hacksaw warning:", e.message);
}
if (fs.existsSync("./patch_user_online_instant.cjs")) {
    require("./patch_user_online_instant.cjs");
  }
} catch (e) {
  console.warn("Patch user online instant warning:", e.message);
}
if (fs.existsSync("./patch_hide_hot_games.cjs")) {
    require("./patch_hide_hot_games.cjs");
  }
} catch (e) {
  console.warn("Patch hide hot games warning:", e.message);
}
if (fs.existsSync("./patch_crash_crash88.cjs")) {
    require("./patch_crash_crash88.cjs");
  }
} catch (e) {
  console.warn("Patch crash CRASH88 warning:", e.message);
}
if (fs.existsSync("./patch_crash_aviator2.cjs")) {
    require("./patch_crash_aviator2.cjs");
  }
} catch (e) {
  console.warn("Patch crash AVIATOR2 warning:", e.message);
}
if (fs.existsSync("./patch_crash_aviator.cjs")) {
    require("./patch_crash_aviator.cjs");
  }
} catch (e) {
  console.warn("Patch crash AVIATOR warning:", e.message);
}

try {
  if (fs.existsSync("./patch_slot_games_inside_only.cjs")) {
    require("./patch_slot_games_inside_only.cjs");
  }
} catch (e) {
  console.warn("Patch slot games inside only warning:", e.message);
}

try {
  if (fs.existsSync("./patch_performance_optimization.cjs")) {
    require("./patch_performance_optimization.cjs");
  }
} catch (e) {
  console.warn("Patch performance optimization warning:", e.message);
}

try {
  if (fs.existsSync("./patch_speed_optimizations.cjs")) {
    require("./patch_speed_optimizations.cjs");
  }
} catch (e) {
  console.warn("Patch speed optimizations warning:", e.message);
}

try {
  if (fs.existsSync("./patch_firestore_offline.cjs")) {
    require("./patch_firestore_offline.cjs");
  }
} catch (e) {
  console.warn("Patch firestore offline warning:", e.message);
}

if (fs.existsSync("index.html")) {
  try {
    if (!fs.existsSync("dist")) fs.mkdirSync("dist", { recursive: true });
    if (!fs.existsSync("dist_backup")) fs.mkdirSync("dist_backup", { recursive: true });
    fs.copyFileSync("index.html", "dist/index.html");
    fs.copyFileSync("index.html", "dist_backup/index.html");
  } catch (e) {}
}

try {
  if (fs.existsSync("./patch_hide_table_games.cjs")) {
    require("./patch_hide_table_games.cjs");
  }
} catch (e) {
  console.warn("Patch hide table games warning:", e.message);
}

try {
  if (fs.existsSync("./patch_add_fishing.cjs")) {
    require("./patch_add_fishing.cjs");
  }
} catch (e) {
  console.warn("Patch add fishing warning:", e.message);
}

try {
  if (fs.existsSync("./patch_hide_arcade_games.cjs")) {
    require("./patch_hide_arcade_games.cjs");
  }
} catch (e) {
  console.warn("Patch hide arcade games warning:", e.message);
}

try {
  if (fs.existsSync("./patch_add_arcade_providers.cjs")) {
    require("./patch_add_arcade_providers.cjs");
  }
} catch (e) {
  console.warn("Patch add arcade providers warning:", e.message);
}

try {
  if (fs.existsSync("./patch_hide_lottery_games.cjs")) {
    require("./patch_hide_lottery_games.cjs");
  }
} catch (e) {
  console.warn("Patch hide lottery games warning:", e.message);
}

try {
  if (fs.existsSync("./patch_add_lottery_providers.cjs")) {
    require("./patch_add_lottery_providers.cjs");
  }
} catch (e) {
  console.warn("Patch add lottery providers warning:", e.message);
}

try {
  if (fs.existsSync("./patch_fix_profile_update.cjs")) {
    require("./patch_fix_profile_update.cjs");
  }
} catch (e) {
  console.warn("Patch fix profile update warning:", e.message);
}

console.log("[Build] 3. Bundling server.ts...");
if (fs.existsSync("server.ts")) {
  try {
    esbuild.buildSync({
      entryPoints: ["server.ts"],
      bundle: true,
      platform: "node",
      target: "node20",
      format: "cjs",
      packages: "external",
      outfile: "dist/server.cjs"
    });
    console.log("[Build] Server bundle generated at dist/server.cjs");
  } catch (err) {
    console.warn("[Build] Server bundle notice (ignorable for static hosting):", err.message);
  }
}

console.log("[Build] Build completed successfully!");
