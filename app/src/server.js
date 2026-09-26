const express = require("express");
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 8080;

const restaurants = [
  { id: 1, name: "Spice Garden", cuisine: "Indian", rating: 4.5 },
  { id: 2, name: "Burger House", cuisine: "Fast Food", rating: 4.2 },
  { id: 3, name: "Pizza Corner", cuisine: "Italian", rating: 4.4 }
];

app.get("/healthz", (_req, res) => res.json({status:"ok"}));
app.get("/readyz", (_req, res) => res.json({status:"ready"}));
app.get("/api/restaurants", (_req, res) => res.json(restaurants));

app.post("/api/orders", (req, res) => {
  const {customerName, restaurantId, items} = req.body;
  if (!customerName || !restaurantId || !Array.isArray(items) || !items.length)
    return res.status(400).json({error:"customerName, restaurantId and items are required"});
  res.status(201).json({orderId:`ORD-${Date.now()}`,status:"PLACED",customerName,restaurantId,items});
});

app.use((_req,res)=>res.status(404).json({error:"Not found"}));

if (require.main === module) app.listen(PORT, ()=>console.log(`Food delivery API listening on ${PORT}`));
module.exports = app;