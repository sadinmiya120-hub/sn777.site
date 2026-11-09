import sys
content = open('patch_payment_exact_css.cjs', 'r').read()
content = content.replace(
    '.sn-pay-page-wrapper { background-color: #ffffff !important; min-width: 100% !important; display: flex !important; justify-content: center !important; padding-bottom: 120px !important; }',
    '.sn-pay-page-wrapper { background-color: #ffffff !important; min-height: 100vh !important; height: auto !important; width: 100% !important; display: flex !important; justify-content: center !important; padding-bottom: 200px !important; }'
)
open('patch_payment_exact_css.cjs', 'w').write(content)
