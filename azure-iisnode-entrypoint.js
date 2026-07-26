"use strict";

const { server } = require("./server.js");

const port = process.env.PORT || 8766;
if (!server.listening) {
  server.listen(port, () => {
    console.log(`KAU planner listening on ${port}`);
  });
}

module.exports = { server };
