// api/ping.js
module.exports = (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res
    .status(200)
    .end(JSON.stringify({ ok: true, time: new Date().toISOString() }));
};
module.exports.default = module.exports;
