import catalog from "@/data/products.json";

export type ProductColor = {
  key: string;
  label: string;
  swatch: string;
  image: string;
};

export type Product = {
  id: string;
  category: string;
  name: string;
  price: number;
  description: string;
  image: string;
  note?: string;
  colors?: ProductColor[];
  sizes?: string[];
  active: boolean;
};

export const products = catalog as Product[];

export const activeProducts = products.filter((product) => product.active);

export const categories = Array.from(
  new Set(activeProducts.map((product) => product.category)),
);

export const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
