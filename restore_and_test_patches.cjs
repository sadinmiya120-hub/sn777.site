const fs = require("fs");
const { execSync } = require("child_process");

console.log("Restoring original JS to dist and dist_backup...");
fs.copyFileSync("original-index-sn777-v5.js", "dist/assets/index-sn777-v5.js");
fs.copyFileSync("original-index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js");

const patches = [
  "patch_clean_order_id.cjs",
  "patch_remove_top_right_icons.cjs",
  "apply_dark_transaction_modal.cjs",
  "patch_propay_url.cjs",
  "patch_fix_chat.cjs",
  "patch_auto_cancel_history.cjs",
  "patch_signup_bonus_message.cjs",
  "patch_promo_bonus_message.cjs",
  "patch_admin_deposit_visibility.cjs",
  "patch_user_online_status.cjs",
  "patch_fix_double_deposit_message.cjs",
  "patch_fix_login.cjs",
  "patch_livechat_redirect.cjs",
  "patch_firestore_offline.cjs",
  "patch_enable_manual_deposit.cjs",
  "patch_hide_propay.cjs",
  "patch_hide_dep_channel_section.cjs",
  "patch_payment_exact_css.cjs",
  "patch_payment_page_screenshot.cjs"
];

for (const patch of patches) {
  if (fs.existsSync(patch)) {
    console.log("Running", patch, "...");
    try {
      execSync("node " + patch, { stdio: "inherit" });
    } catch (e) {
      console.error("Failed patch:", patch, e.message);
    }
  }
}
console.log("Done running patches.");
