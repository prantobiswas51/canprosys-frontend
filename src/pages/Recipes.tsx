import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';

const API_URL = import.meta.env.VITE_API_URL;

interface Recipe {
  id: number;
  product: string;
  sku: string;
  sizeNameBengali: string;
  sizeNameEnglish: string;
  woodKg: string;
  boardSheet: string;
  screwAndHinges: string;
  polyBagType: string;
  polyBagQuantity: string;
  frameMakingRate: string;
  boardFittingRate: string;
  packagingRate: string;
}

type RecipeFormState = Omit<Recipe, 'id'>;

const emptyForm: RecipeFormState = {
  product: '',
  sku: '',
  sizeNameBengali: '',
  sizeNameEnglish: '',
  woodKg: '',
  boardSheet: '',
  screwAndHinges: '',
  polyBagType: 'Pieces',
  polyBagQuantity: '',
  frameMakingRate: '',
  boardFittingRate: '',
  packagingRate: '',
};

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RecipeFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await axios.get<Recipe[]>(`${API_URL}/recipes`);
      setRecipes(res.data);
    } catch (err) {
      setListError(
        axios.isAxiosError(err) && err.response
          ? `Failed to load recipes: ${err.response.status}`
          : 'Could not reach the server. Check the console.'
      );
      console.error('Failed to load recipes', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setForm({
      product: recipe.product,
      sku: recipe.sku,
      sizeNameBengali: recipe.sizeNameBengali,
      sizeNameEnglish: recipe.sizeNameEnglish,
      woodKg: recipe.woodKg,
      boardSheet: recipe.boardSheet,
      screwAndHinges: recipe.screwAndHinges,
      polyBagType: recipe.polyBagType,
      polyBagQuantity: recipe.polyBagQuantity,
      frameMakingRate: recipe.frameMakingRate,
      boardFittingRate: recipe.boardFittingRate,
      packagingRate: recipe.packagingRate,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  const handleChange = (field: keyof RecipeFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      if (editingId != null) {
        await axios.patch(`${API_URL}/recipes/${editingId}`, form);
      } else {
        await axios.post(`${API_URL}/recipes`, form);
      }
      setModalOpen(false);
      fetchRecipes();
    } catch (err) {
      setFormError(
        axios.isAxiosError(err) && err.response
          ? `Failed to save: ${err.response.status}`
          : 'Could not reach the server. Check the console.'
      );
      console.error('Failed to save recipe', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this recipe? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await axios.delete(`${API_URL}/recipes/${id}`);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete recipe', err);
      window.alert('Failed to delete recipe. Check the console.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between pb-4">
        <div>
          <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Recipes</h2>
          <p className="text-[0.9rem] text-[#545454]">Material recipes and production formulas.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] hover:-translate-y-px hover:shadow-[0_6px_14px_rgba(226,30,83,0.25)] cursor-pointer"
        >
          <i className="fa-solid fa-flask" />
          Add Recipe
        </button>
      </div>

      {loading && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading recipes...</p>}

      {!loading && listError && (
        <p className="text-[0.8rem] font-semibold text-[#ef4444]">{listError}</p>
      )}

      {!loading && !listError && recipes.length === 0 && (
        <p className="text-[0.8rem] font-semibold text-[#545454]">No recipes yet. Add your first one.</p>
      )}

      {!loading && !listError && recipes.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
          {recipes.map((recipe) => (
            <div key={recipe.id} className={`${cardClass} flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-3">
                  <h3 className="text-[1.15rem] font-bold text-[#e21e53]">{recipe.product}</h3>
                  <span className="rounded-full bg-[rgba(59,130,246,0.1)] text-[#3b82f6] text-[0.7rem] font-bold px-3 py-1">
                    SKU: {recipe.sku}
                  </span>
                </div>

                <p className="text-[0.8rem] font-semibold text-[#1E1E1E]">
                  {recipe.sizeNameEnglish}
                  <span className="ml-1 font-medium text-[#545454] opacity-80">({recipe.sizeNameBengali})</span>
                </p>

                <p className="text-[0.72rem] font-bold uppercase tracking-[0.05em] text-[#545454] mt-3 mb-2">
                  Material Consumption (BOM)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-[0.35rem] rounded-lg border border-[#e8e8e8] bg-[#f8fafc] px-2 py-2 text-[0.8rem] font-semibold text-[#1E1E1E]">
                    <i className="fa-solid fa-tree w-4 text-center text-[#545454]" />
                    <span>Wood: {recipe.woodKg} kg</span>
                  </div>
                  <div className="flex items-center gap-[0.35rem] rounded-lg border border-[#e8e8e8] bg-[#f8fafc] px-2 py-2 text-[0.8rem] font-semibold text-[#1E1E1E]">
                    <i className="fa-solid fa-square w-4 text-center text-[#545454]" />
                    <span>Board: {recipe.boardSheet}</span>
                  </div>
                  <div className="flex items-center gap-[0.35rem] rounded-lg border border-[#e8e8e8] bg-[#f8fafc] px-2 py-2 text-[0.8rem] font-semibold text-[#1E1E1E]">
                    <i className="fa-solid fa-screwdriver w-4 text-center text-[#545454]" />
                    <span>Screws: {recipe.screwAndHinges}</span>
                  </div>
                  <div className="flex items-center gap-[0.35rem] rounded-lg border border-[#e8e8e8] bg-[#f8fafc] px-2 py-2 text-[0.8rem] font-semibold text-[#1E1E1E]">
                    <i className="fa-solid fa-box-open w-4 text-center text-[#545454]" />
                    <span>
                      Poly: {recipe.polyBagQuantity} {recipe.polyBagType}
                    </span>
                  </div>
                </div>

                <p className="text-[0.72rem] font-bold uppercase tracking-[0.05em] text-[#545454] mt-4 mb-2">
                  Artisan Wages (Payout — ৳)
                </p>
                <div className="flex flex-col gap-[0.35rem]">
                  <div className="flex justify-between border-b border-dashed border-[#e8e8e8] pb-1 text-[0.85rem]">
                    <span className="text-[#545454]">Frame Making</span>
                    <span className="font-bold text-[#1E1E1E]">৳ {recipe.frameMakingRate}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-[#e8e8e8] pb-1 text-[0.85rem]">
                    <span className="text-[#545454]">Board Fitting</span>
                    <span className="font-bold text-[#1E1E1E]">৳ {recipe.boardFittingRate}</span>
                  </div>
                  <div className="flex justify-between text-[0.85rem]">
                    <span className="text-[#545454]">Packaging</span>
                    <span className="font-bold text-[#1E1E1E]">৳ {recipe.packagingRate}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2 border-t border-[#e8e8e8] pt-3">
                <button
                  type="button"
                  onClick={() => openEditModal(recipe)}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.8rem] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200 cursor-pointer"
                >
                  <i className="fa-solid fa-pen" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(recipe.id)}
                  disabled={deletingId === recipe.id}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-[rgba(239,68,68,0.25)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
                  title="Delete"
                >
                  <i className={`fa-solid ${deletingId === recipe.id ? 'fa-spinner fa-spin' : 'fa-trash'}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editingId != null ? 'Edit Recipe' : 'Add Recipe'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <h4 className="text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] mb-2">
              Basic Info
            </h4>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Product</label>
                <input
                  type="text"
                  value={form.product}
                  onChange={(e) => handleChange('product', e.target.value)}
                  placeholder="e.g. Whiteboard"
                  required
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-[0.4rem]">
                  <label className="text-[0.8rem] font-bold text-[#1E1E1E]">SKU</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => handleChange('sku', e.target.value)}
                    placeholder="e.g. WB-3X4"
                    required
                    disabled={submitting}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-[0.4rem]">
                  <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Size (English)</label>
                  <input
                    type="text"
                    value={form.sizeNameEnglish}
                    onChange={(e) => handleChange('sizeNameEnglish', e.target.value)}
                    placeholder="e.g. 3x4 ft Whiteboard"
                    required
                    disabled={submitting}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-[0.4rem]">
                  <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Size (Bengali)</label>
                  <input
                    type="text"
                    value={form.sizeNameBengali}
                    onChange={(e) => handleChange('sizeNameBengali', e.target.value)}
                    placeholder="e.g. ৩ x ৪ ফুট হোয়াইটবোর্ড"
                    required
                    disabled={submitting}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] mb-2">
              Materials (BOM)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Wood (kg)</label>
                <input
                  type="text"
                  value={form.woodKg}
                  onChange={(e) => handleChange('woodKg', e.target.value)}
                  placeholder="e.g. 2.8"
                  required
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Board Sheet</label>
                <input
                  type="text"
                  value={form.boardSheet}
                  onChange={(e) => handleChange('boardSheet', e.target.value)}
                  placeholder="e.g. 1 piece"
                  required
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Screws &amp; Hinges</label>
                <input
                  type="text"
                  value={form.screwAndHinges}
                  onChange={(e) => handleChange('screwAndHinges', e.target.value)}
                  placeholder="e.g. 6 piece"
                  required
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-[0.4rem]">
                  <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Poly Bag Type</label>
                  <select
                    value={form.polyBagType}
                    onChange={(e) => handleChange('polyBagType', e.target.value)}
                    disabled={submitting}
                    className={inputClass}
                  >
                    <option value="Pieces">Pieces</option>
                    <option value="Yard">Yard</option>
                  </select>
                </div>
                <div className="flex flex-col gap-[0.4rem]">
                  <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Poly Bag Qty</label>
                  <input
                    type="text"
                    value={form.polyBagQuantity}
                    onChange={(e) => handleChange('polyBagQuantity', e.target.value)}
                    placeholder="e.g. 4"
                    required
                    disabled={submitting}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] mb-2">
              Artisan Wages (Payout — ৳)
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Frame Making</label>
                <input
                  type="text"
                  value={form.frameMakingRate}
                  onChange={(e) => handleChange('frameMakingRate', e.target.value)}
                  placeholder="e.g. 55"
                  required
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Board Fitting</label>
                <input
                  type="text"
                  value={form.boardFittingRate}
                  onChange={(e) => handleChange('boardFittingRate', e.target.value)}
                  placeholder="e.g. 55"
                  required
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Packaging</label>
                <input
                  type="text"
                  value={form.packagingRate}
                  onChange={(e) => handleChange('packagingRate', e.target.value)}
                  placeholder="e.g. 20"
                  required
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {formError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={submitting}
              className="h-10 px-4 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.875rem] hover:bg-[#f8fafc] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              <i className={`fa-solid ${submitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
              {submitting ? 'Saving...' : editingId != null ? 'Save Changes' : 'Create Recipe'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
