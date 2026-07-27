import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

interface Product {
  id: number;
  name: string;
  sku: string;
  costPrice: number;
  stock: number;
}

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

export default function FinishedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await axios.get<Product[]>(`${API_URL}/products`);
      setProducts(res.data);
    } catch (err) {
      setListError(
        axios.isAxiosError(err) && err.response
          ? `Failed to load products: ${err.response.status}`
          : 'Could not reach the server. Check the console.'
      );
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalValue = products.reduce((sum, p) => sum + (p.stock || 0) * (p.costPrice || 0), 0);
  const outOfStockCount = products.filter((p) => (p.stock || 0) <= 0).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between pb-1">
        <div>
          <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Finished Products</h2>
          <p className="text-[0.9rem] text-[#545454]">Completed goods ready for dispatch.</p>
        </div>
        <button
          type="button"
          onClick={fetchProducts}
          disabled={loading}
          className="h-10 px-4 flex items-center gap-2 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.875rem] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
        >
          <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />
          Refresh
        </button>
      </div>

      {/* ══════════ STAT CARDS ══════════ */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className={`${cardClass} flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-lg bg-[rgba(226,30,83,0.08)] text-[#e21e53] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-layer-group" />
          </div>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">Products</p>
            <p className="text-[1.1rem] font-extrabold text-[#1E1E1E] m-0">{products.length}</p>
          </div>
        </div>
        <div className={`${cardClass} flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-lg bg-[rgba(59,130,246,0.08)] text-[#3b82f6] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-boxes-stacked" />
          </div>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">Total Stock</p>
            <p className="text-[1.1rem] font-extrabold text-[#1E1E1E] m-0">{totalStock} units</p>
          </div>
        </div>
        <div className={`${cardClass} flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-lg bg-[rgba(16,185,129,0.08)] text-[#10b981] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-sack-dollar" />
          </div>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">Stock Value</p>
            <p className="text-[1.1rem] font-extrabold text-[#1E1E1E] m-0">৳{totalValue.toFixed(2)}</p>
          </div>
        </div>
        <div className={`${cardClass} flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-lg bg-[rgba(239,68,68,0.08)] text-[#ef4444] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-triangle-exclamation" />
          </div>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">Out of Stock</p>
            <p className="text-[1.1rem] font-extrabold text-[#1E1E1E] m-0">{outOfStockCount}</p>
          </div>
        </div>
      </div>

      {/* ══════════ PRODUCTS TABLE ══════════ */}
      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-box mr-2 text-[#e21e53]" />
          Ready Stock
        </h3>

        {loading && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading products...</p>}
        {!loading && listError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{listError}</p>}
        {!loading && !listError && products.length === 0 && (
          <p className="text-[0.8rem] font-semibold text-[#545454]">
            No finished products yet -- these get created automatically the first time a Packaging entry
            references a recipe SKU that doesn't exist yet, or you can add one directly on the Products side.
          </p>
        )}

        {!loading && !listError && products.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e8e8e8]">
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Product</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">SKU</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Cost Price</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Stock</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Total Value</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const inStock = (p.stock || 0) > 0;
                  return (
                    <tr key={p.id} className="border-b border-[#f1f1f1] last:border-0">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-[0.6rem]">
                          <div className="w-8 h-8 rounded-lg bg-[rgba(226,30,83,0.08)] text-[#e21e53] flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-box text-[0.8rem]" />
                          </div>
                          <span className="text-[0.875rem] font-bold text-[#1E1E1E]">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-[0.8rem] font-medium text-[#545454]">{p.sku}</td>
                      <td className="py-3 pr-3 text-[0.875rem] font-medium text-[#545454] text-right">৳{p.costPrice}</td>
                      <td className={`py-3 pr-3 text-[0.9rem] font-extrabold text-right ${inStock ? 'text-[#1E1E1E]' : 'text-[#ef4444]'}`}>
                        {p.stock}
                      </td>
                      <td className="py-3 pr-3 text-[0.875rem] font-bold text-[#10b981] text-right">
                        ৳{((p.stock || 0) * (p.costPrice || 0)).toFixed(2)}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        {inStock ? (
                          <span className="rounded-full bg-[rgba(16,185,129,0.1)] text-[#10b981] text-[0.7rem] font-bold px-3 py-1">
                            In Stock
                          </span>
                        ) : (
                          <span className="rounded-full bg-[rgba(239,68,68,0.1)] text-[#ef4444] text-[0.7rem] font-bold px-3 py-1">
                            Out of Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
