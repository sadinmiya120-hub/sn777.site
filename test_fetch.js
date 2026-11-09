async function run() {
  const start = Date.now();
  console.log("Sending reject...");
  const res = await fetch("http://127.0.0.1:3000/api/admin/reject-deposit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_no: "ORD1788600124751", reason: "Test" })
  });
  const data = await res.json();
  console.log("Response:", data, "Time taken:", Date.now() - start, "ms");
}
run();
