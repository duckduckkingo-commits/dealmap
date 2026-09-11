// Seeds local dev DB from data/seed.catalog.json. All rows flagged isDemo:true.
const fs = require("fs");
const path = require("path");
const catalog = require("../data/seed.catalog.json");

const DB_FILE = path.join(__dirname, "..", "data", "db.json");
function load() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return { users: [], products: [], observations: [], watchlists: [], alerts: [], purchases: [], warranties: [], returns: [], contributions: [], notifications: [], audit: [], reports: [], settings: {}, analytics: [], sessions: [], categories: [], passwordResets: [], receipts: [] }; }
}

const brandOf = {};
let n = 0;
const db = load();
db.categories = catalog.categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name }));
db.products = catalog.products.map((p) => ({
  id: p.id, brandId: "b_" + p.brand.toLowerCase(), brand: p.brand, model: p.model,
  name: p.name, categoryId: "cat_" + p.category.split(" ")[0].toLowerCase(), category: p.category,
  specs: p.specs, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
}));
db.observations = [];
catalog.observations.forEach((group, gi) => {
  group.prices.forEach((price, i) => {
    const d = new Date(Date.now() - (group.prices.length - i) * 6 * 86400000);
    db.observations.push({
      id: `seed_${gi}_${i}`, productId: group.productId, price, currency: "MAD",
      condition: group.condition === "used_good" ? "used_good" : "new",
      sellerType: i % 3 === 0 ? "store" : "individual",
      location: group.location, sourceType: "partner_feed",
      observedAt: d.toISOString(), createdAt: d.toISOString(),
      quality: "MEDIUM", verificationStatus: "verified", isDemo: true,
    });
    n++;
  });
});
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
console.log(`Seeded ${db.products.length} products, ${n} demo observations (flagged isDemo:true).`);
