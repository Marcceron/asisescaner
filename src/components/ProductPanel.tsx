"use client";

import type { Product, ProductCategory, SelectedItem } from "@/domain/types";
import { formatMoney } from "@/lib/money";

type Props = {
  activeCategory: ProductCategory;
  selectedItems: SelectedItem[];
  onCategoryChange: (category: ProductCategory) => void;
  onToggle: (id: string, category: ProductCategory) => void;
  products: Product[];
  categories: { id: string; label: string; order: number }[];
};

export function ProductPanel({ activeCategory, selectedItems, onCategoryChange, onToggle, products, categories }: Props) {
  const selectedIds = new Set(selectedItems.map((item) => item.productId));
  const visible = products.filter((product) => product.category === activeCategory && product.active);

  return (
    <section className="catalog" aria-labelledby="catalog-title">
      <div className="catalogHeading">
        <img src="/assets/shades.svg" alt="" width="36" height="36" />
        <h2 id="catalog-title">Selecciona las piezas de tu cortina</h2>
      </div>
      <div className="categoryTabs" role="tablist" aria-label="Categorías de productos">
        {categories.sort((a, b) => a.order - b.order).map((category) => (
          <button
            key={category.id}
            role="tab"
            aria-selected={activeCategory === category.id}
            className={activeCategory === category.id ? "active" : ""}
            onClick={() => onCategoryChange(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>
      <div className="productGrid">
        {visible.map((product) => {
          const selected = selectedIds.has(product.id);
          return (
            <button
              key={product.id}
              className={`productCard ${selected ? "selected" : ""}`}
              aria-pressed={selected}
              onClick={() => onToggle(product.id, product.category)}
            >
              <span className="productImage" style={{ backgroundColor: product.tone ?? "#e9e9e9" }}>
                <img src={product.image} alt="" />
              </span>
              <strong>{product.name}</strong>
              <small>{product.description}</small>
              <span>{formatMoney(product.priceCents)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
