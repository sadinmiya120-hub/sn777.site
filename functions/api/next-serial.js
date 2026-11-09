export async function onRequest(context) {
  const serial = Math.floor(100 + Math.random() * 900);
  return new Response(JSON.stringify({
    success: true,
    serial: serial
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
