// Cloudflare Pages Function Proxy for GoPay Webhook Notification
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = `https://sn777-site-864935185164.us-west1.run.app${url.pathname}${url.search}`;

  try {
    const headers = new Headers(request.headers);
    headers.set("host", "sn777-site-864935185164.us-west1.run.app");

    let body = null;
    if (request.method !== "GET" && request.method !== "HEAD") {
      body = await request.arrayBuffer();
    }

    const backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: body,
      redirect: "follow"
    });

    const responseBody = await backendResponse.arrayBuffer();
    const responseHeaders = new Headers(backendResponse.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(responseBody, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders
    });
  } catch (err) {
    console.error("GoPay Notify Proxy Error:", err);
    return new Response("fail", {
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
}
