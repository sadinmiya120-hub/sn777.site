<?php
$balanceUrl = "https://mch.go-pay.cyou/balance_api.php";
$secretKey  = "77a2d3a02360d495a1b07abfe5b196e8";

$postData = [
    'app_id'    => 'GP_47479521',
    'timestamp' => date('Y-m-d H:i:s')
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

$ch = curl_init($balanceUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
$response = curl_exec($ch);
curl_close($ch);

$res = json_decode($response, true);
if ($res && isset($res['respCode']) && $res['respCode'] === 'SUCCESS') {
    echo "Available Balance: " . $res['balance'] . " " . $res['currency'];
} else {
    echo "Query failed: " . (isset($res['tradeMsg']) ? $res['tradeMsg'] : 'Error');
}
?>
