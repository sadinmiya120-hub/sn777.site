const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const targetScript = `<script>
      // Register Service Worker & Self-Heal Caches
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
          .then(function(reg) {
            if (reg && typeof reg.update === 'function') {
              reg.update().catch(function() {});
            }
          })
          .catch(function(err) { console.warn('SW registration error:', err); });
      }
      try {
        var APP_VER = "20261101_crash_aviator_v2";
        if (localStorage.getItem("sn777_app_ver") !== APP_VER) {
          localStorage.setItem("sn777_app_ver", APP_VER);
          if ('caches' in window) {
            caches.keys().then(function(keys) {
              keys.forEach(function(k) {
                if (k !== "sn777-v29") caches.delete(k);
              });
            });
          }
        }
      } catch(e) {}
      var deferredPwaPrompt = null;
      window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPwaPrompt = e;
        var bar = document.getElementById('sn777-app-install-bar');
        var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (bar && !isStandalone) bar.style.display = 'flex';
      });
      window.addEventListener('appinstalled', function() {
        var bar = document.getElementById('sn777-app-install-bar');
        if (bar) bar.style.display = 'none';
        deferredPwaPrompt = null;
        closeInstallGuideModal();
      });
      window.handleAppInstallAction = function() {
        if (deferredPwaPrompt) {
          try {
            deferredPwaPrompt.prompt();
            deferredPwaPrompt.userChoice.then(function(choiceResult) {
              if (choiceResult && choiceResult.outcome === 'accepted') {
                var bar = document.getElementById('sn777-app-install-bar');
                if (bar) bar.style.display = 'none';
              }
              deferredPwaPrompt = null;
            }).catch(function() {
              showInstallGuideModal();
            });
          } catch(err) {
            showInstallGuideModal();
          }
        } else {
          var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          if (isIOS) {
            alert("iOS/Safari তে অ্যাপ ইনস্টল করতে নিচে Share (📤) আইকনে চাপ দিয়ে 'Add to Home Screen' নির্বাচন করুন।");
          } else {
            showInstallGuideModal();
          }
        }
      };
      window.triggerActualInstall = function() {
        if (deferredPwaPrompt) {
          try {
            deferredPwaPrompt.prompt();
            deferredPwaPrompt.userChoice.then(function(choiceResult) {
              if (choiceResult && choiceResult.outcome === 'accepted') {
                var bar = document.getElementById('sn777-app-install-bar');
                if (bar) bar.style.display = 'none';
              }
              deferredPwaPrompt = null;
              closeInstallGuideModal();
            }).catch(function() {
              closeInstallGuideModal();
            });
          } catch(e) {
            closeInstallGuideModal();
          }
        } else {
          closeInstallGuideModal();
          var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          if (isIOS) {
            alert("iOS/Safari তে শর্টকাট অ্যাপ বানাতে নিচে Share (📤) আইকনে চাপ দিয়ে 'Add to Home Screen' চাপুন।");
          } else {
            alert("গুগল ক্রোম ব্রাউজারের উপরে ডানদিকের ৩-ডট (⋮) মেনুতে চাপ দিয়ে 'Install app' বা 'Add to Home screen' চাপুন, তাহলে সরাসরি ফোনের হোমস্ক্রিনে অ্যাপটি তৈরি হয়ে যাবে।");
          }
        }
      };
      window.showInstallGuideModal = function() {
        var m = document.getElementById('sn777-install-guide-modal');
        if (m) m.style.display = 'flex';
      };
      window.closeInstallGuideModal = function() {
        var m = document.getElementById('sn777-install-guide-modal');
        if (m) m.style.display = 'none';
      };
    </script>`;

const scriptStart = html.indexOf('<script>\n      // Register Service Worker');
const scriptEnd = html.indexOf('<!-- End Sn777 Official Telegram');

if (scriptStart !== -1 && scriptEnd !== -1) {
  html = html.substring(0, scriptStart) + targetScript + "\n" + html.substring(scriptEnd);
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('REPLACED PWA SCRIPT BLOCK IN index.html successfully!');
} else {
  console.log('SEARCH PATTERN NOT FOUND:', scriptStart, scriptEnd);
}
