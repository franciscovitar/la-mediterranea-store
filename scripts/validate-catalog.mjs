import fs from "node:fs";
import path from "node:path";

const file = path.resolve("data/products.json");
const products = JSON.parse(fs.readFileSync(file, "utf8"));
const ids = new Set();
const errors = [];

for (const [index, product] of products.entries()) {
  const where = `products[${index}]`;
  for (const field of ["id", "category", "name", "description", "image"]) {
    if (typeof product[field] !== "string" || !product[field].trim()) errors.push(`${where}.${field} is required`);
  }
  if (!Number.isInteger(product.price) || product.price <= 0) errors.push(`${where}.price must be a positive integer`);
  if (ids.has(product.id)) errors.push(`${where}.id duplicates ${product.id}`);
  ids.add(product.id);
  if (!product.image?.startsWith("/products/")) errors.push(`${where}.image must point to /products/`);
  if (product.colors) {
    const colorKeys = new Set();
    for (const color of product.colors) {
      if (colorKeys.has(color.key)) errors.push(`${where} has duplicate color key ${color.key}`);
      colorKeys.add(color.key);
      if (!color.image?.startsWith("/products/")) errors.push(`${where} color ${color.key} has invalid image`);
    }
  }
}

if (!products.length) errors.push("catalog cannot be empty");

if (errors.length) {
  console.error(`Catalog validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Catalog validation passed: ${products.length} products, ${ids.size} unique ids.`);
