// api/ping.js — minimal healthcheck for Vercel serverless
export default function handler(req, res) {
  try {
    res.setHeader("Content-Type", "application/json");
    res
      .status(200)
      .end(JSON.stringify({ ok: true, time: new Date().toISOString() }));
  } catch (e) {
    console.error("/api/ping error", e);
    res.status(500).end(JSON.stringify({ ok: false }));
  }
}
