import sys
content = open('patch_payment_exact_css.cjs', 'r').read()
content = content.replace(
    '.sn-pay-card { width: 100% !important; max-width: 448px !important; background-color: #ffffff !important; min-padding-bottom: 160px !important; margin-bottom: 100px !important; display: flex !important; flex-direction: column !important; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }',
    '.sn-pay-card { width: 100% !important; max-width: 448px !important; background-color: #ffffff !important; min-height: 100vh !important; height: auto !important; padding-bottom: 200px !important; display: flex !important; flex-direction: column !important; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }'
)
open('patch_payment_exact_css.cjs', 'w').write(content)
