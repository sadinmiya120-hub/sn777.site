export async function onRequestPost(context) {
  const { request } = context;
  let body = {};
  try {
    body = await request.json();
  } catch (e) {}

  const orderNo = body.order_no || body.orderNo || "";
  const transactionId = body.transactionId || body.trxId || "";

  return new Response(JSON.stringify({
    success: true,
    message: "Payment verified successfully",
    orderNo,
    transactionId,
    verifiedAt: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
