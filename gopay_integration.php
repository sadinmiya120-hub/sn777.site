<?php
$gatewayUrl = "https://mch.go-pay.cyou/pay.php";
$secretKey  = "77a2d3a02360d495a1b07abfe5b196e8";

$postData = [
    'app_id'         => 'GP_47479521',
    'mch_order_no'   => 'ORD_' . time(),
    'trade_amount'   => $_GET['amount'] ?? '200',
    'pay_type'       => $_GET['method'] === 'bkash' ? '2202' : '2201', 
    'goods_name'     => $_GET['method'] === 'bkash' ? 'BKASH' : 'NAGAD',
    'notify_url'     => 'https://sn777.site/gopay_notify.php',
    'page_url'       => 'https://sn777.site/return',
    'mch_return_msg' => 'InvoiceRef_12',
    'order_date'     => date('Y-m-d H:i:s')
];

ksort($postData);

$signStr = "";
foreach ($postData as $k => $v) {
    if ($v !== '' && $v !== null) {
        $signStr .= $k . "=" . $v . "&";
    }
}
$signStr .= "key=" . $secretKey;

$postData['sign'] = md5($signStr);
$postData['sign_type'] = 'MD5';

$ch = curl_init($gatewayUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
$response = curl_exec($ch);
curl_close($ch);

$res = json_decode($response, true);
if ($res && isset($res['respCode']) && $res['respCode'] === 'SUCCESS') {
    // Priority: payUrl, fallback: pay_url
    $payUrl = $res['payUrl'] ?? $res['pay_url'] ?? '';
    if ($payUrl) {
        header("Location: " . $payUrl);
        exit;
    } else {
        echo "Gateway Error: Success received but no URL provided.";
    }
} else {
    // Handle failure response
    $errorMsg = isset($res['tradeMsg']) ? $res['tradeMsg'] : 'Connection Failed';
    echo "Gateway Error: " . $errorMsg;
}
?>
