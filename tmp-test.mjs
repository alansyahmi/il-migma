import fetch from "node-fetch"; fetch("http://localhost:8788/api/admin/entries?q=għabad").then(r=>r.json()).then(console.log);
