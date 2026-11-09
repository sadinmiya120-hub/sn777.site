import sys
content = open('patch_payment_exact_css.cjs', 'r').read()

# Replace wrapper
content = content.replace(
    '.sn-pay-page-wrapper { background-color: #ffffff !important; min-height: 100vh !important; height: auto !important; width: 100% !important; display: flex !important; justify-content: center !important; padding-bottom: 200px !important; }',
    '.sn-pay-page-wrapper { background-color: #f1f5f9 !important; min-height: 100vh !important; height: auto !important; width: 100% !important; display: flex !important; justify-content: center !important; padding: 16px 16px 200px 16px !important; box-sizing: border-box !important; }'
)

# Replace card
content = content.replace(
    '.sn-pay-card { width: 100% !important; max-width: 448px !important; background-color: #ffffff !important; min-height: 100vh !important; height: auto !important; padding-bottom: 200px !important; display: flex !important; flex-direction: column !important; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }',
    '.sn-pay-card { width: 100% !important; max-width: 448px !important; background-color: #ffffff !important; min-height: auto !important; height: max-content !important; padding-bottom: 40px !important; display: flex !important; flex-direction: column !important; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; border: 2px solid #cbd5e1 !important; border-radius: 12px !important; overflow: hidden !important; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important; }'
)

open('patch_payment_exact_css.cjs', 'w').write(content)
