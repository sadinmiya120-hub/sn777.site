<?php
$rawData = $_POST;
$secretKey = "77a2d3a02360d495a1b07abfe5b196e8";

if (empty($rawData)) {
    die("fail");
}

$signParams = $rawData;
unset($signParams['sign'], $signParams['signType']);
ksort($signParams);

$signStr = "";
foreach ($signParams as $k => $v) {
    if ($v !== '' && $v !== null) {
        $signStr .= $k . "=" . $v . "&";
    }
}
$signStr .= "key=" . $secretKey;

$calculatedSign = md5($signStr);
$receivedSign   = isset($rawData['sign']) ? strtolower($rawData['sign']) : '';

if ($calculatedSign !== $receivedSign) {
    die("fail"); // Signature verification mismatch
}

if ($rawData['tradeResult'] === '1') {
    // Payment verified successfully. Trigger your internal order update logic.
    
    // Handshake Acknowledgment: Must output exactly success in lowercase
    echo "success";
    exit;
} else {
    die("fail");
}
?>
