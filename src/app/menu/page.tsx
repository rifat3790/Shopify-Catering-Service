'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import QuickOrderModal from '@/components/QuickOrderModal';
import InvoiceModal from '@/components/InvoiceModal';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { initialMenuItems, MenuItemData, OrderData } from '@/lib/types';
import { 
  MenuSquare, 
  Sparkles, 
  Plus, 
  Flame, 
  ShoppingBag, 
  Check, 
  Coffee, 
  Utensils, 
  ArrowRight,
  Edit2,
  Trash2,
  PlusCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export default function MenuPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [menuItems, setMenuItems] = useState<MenuItemData[]>(initialMenuItems);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OrderData | null>(null);

  // Admin CRUD Modal state
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);
  const [dishName, setDishName] = useState('');
  const [dishNameBn, setDishNameBn] = useState('');
  const [dishPrice, setDishPrice] = useState<number>(20);
  const [dishCategory, setDishCategory] = useState<MenuItemData['category']>('Refreshments');
  const [dishImageUrl, setDishImageUrl] = useState('');
  const [dishDescription, setDishDescription] = useState('');

  const isSuperOrAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const loadMenu = async () => {
    try {
      const res = await fetch('/api/menu');
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        setMenuItems(data.data);
      }
    } catch (e) {
      console.warn('Using default menu');
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const categories = ['All', 'Refreshments', 'Lunch', 'Beverages', 'Executive Catering', 'Dessert'];

  const filteredItems = menuItems.filter((item) =>
    selectedCategory === 'All' ? true : item.category === selectedCategory
  );

  const addToCart = (id: string) => {
    setCart((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[id] > 1) {
        next[id] -= 1;
      } else {
        delete next[id];
      }
      return next;
    });
  };

  const totalCartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalCartPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find((m) => m._id === id || m.name.includes(id));
    return sum + (item ? item.price * qty : 0);
  }, 0);

  // Admin Menu CRUD Actions
  const handleOpenAddDish = () => {
    setEditingItem(null);
    setDishName('');
    setDishNameBn('');
    setDishPrice(20);
    setDishCategory('Refreshments');
    setDishImageUrl('https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80');
    setDishDescription('');
    setIsDishModalOpen(true);
  };

  const handleOpenEditDish = (item: MenuItemData) => {
    setEditingItem(item);
    setDishName(item.name);
    setDishNameBn(item.nameBn);
    setDishPrice(item.price);
    setDishCategory(item.category);
    setDishImageUrl(item.imageUrl);
    setDishDescription(item.description);
    setIsDishModalOpen(true);
  };

  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim() || dishPrice <= 0) return;

    try {
      if (editingItem) {
        // Edit existing
        const res = await fetch('/api/menu', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingItem._id,
            name: dishName,
            nameBn: dishNameBn || dishName,
            price: Number(dishPrice),
            category: dishCategory,
            imageUrl: dishImageUrl,
            description: dishDescription,
          }),
        });
        if (res.ok) {
          setMenuItems(prev => prev.map(m => m._id === editingItem._id ? {
            ...m,
            name: dishName,
            nameBn: dishNameBn || dishName,
            price: Number(dishPrice),
            category: dishCategory,
            imageUrl: dishImageUrl,
            description: dishDescription,
          } : m));
        }
      } else {
        // Add new
        const res = await fetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: dishName,
            nameBn: dishNameBn || dishName,
            price: Number(dishPrice),
            category: dishCategory,
            imageUrl: dishImageUrl,
            description: dishDescription,
            isAvailable: true,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) setMenuItems(prev => [json.data, ...prev]);
        }
      }
      setIsDishModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDish = async (id?: string) => {
    if (!id || !confirm('Are you sure you want to remove this dish from the menu?')) return;
    try {
      await fetch(`/api/menu?id=${id}`, { method: 'DELETE' });
      setMenuItems(prev => prev.filter(m => m._id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleAvailable = async (item: MenuItemData) => {
    const nextState = !item.isAvailable;
    setMenuItems(prev => prev.map(m => m._id === item._id ? { ...m, isAvailable: nextState } : m));
    try {
      await fetch('/api/menu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item._id, isAvailable: nextState }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      <Sidebar onOpenNewOrder={() => setIsOrderModalOpen(true)} />

      <main className="flex-1 w-full min-w-0 px-4 sm:px-6 lg:px-10 py-8 space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-emerald-900/40">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'bn' ? 'এক্সক্লুসিভ ক্যাটারিং মেনু ক্যাটালগ' : 'Curated Catering Menu & Management'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white">
              {language === 'bn' ? 'শপিফাই লাক্সারি ক্যাটারিং মেনু' : 'Shopify Luxury Catering Menu'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'bn'
                ? 'সিঙ্গারা, চমচা ও স্পেশাল মসলা চা থেকে শুরু করে এক্সিকিউটিভ খাসির কাচ্চি ও চিকেন রোস্ট'
                : 'Afternoon refreshments, tea snacks, and executive corporate lunch platters'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Add Dish Button (Admin & Super Admin CRUD) */}
            {isSuperOrAdmin && (
              <button
                onClick={handleOpenAddDish}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>{language === 'bn' ? '+ নতুন খাবার যুক্ত করুন' : '+ Add New Dish'}</span>
              </button>
            )}

            {/* Quick Cart Pill */}
            {totalCartCount > 0 && (
              <button
                onClick={() => setIsOrderModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg animate-bounce"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{totalCartCount} items • ৳{totalCartPrice.toFixed(0)}</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat === 'All' ? (language === 'bn' ? 'সকল মেনু' : 'All Items') : cat}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const countInCart = cart[item._id || item.name] || 0;

            return (
              <div
                key={item._id || item.name}
                className={`group rounded-3xl bg-slate-900/80 border p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl relative overflow-hidden ${
                  item.isAvailable === false 
                    ? 'opacity-60 border-slate-800' 
                    : 'border-slate-800 hover:border-emerald-700/80 hover:shadow-emerald-950/40'
                }`}
              >
                {/* Popular Badge */}
                {item.popular && (
                  <div className="absolute top-4 left-4 z-10 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <Flame className="w-3 h-3 fill-slate-950" />
                    <span>Popular</span>
                  </div>
                )}

                {/* Admin Management Floating Toolbar */}
                {isSuperOrAdmin && (
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-slate-950/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow-lg">
                    <button
                      onClick={() => handleToggleAvailable(item)}
                      title={item.isAvailable ? 'Mark Out of Stock' : 'Mark Available'}
                      className="p-1 rounded text-slate-400 hover:text-white"
                    >
                      {item.isAvailable ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-rose-400" />}
                    </button>
                    <button
                      onClick={() => handleOpenEditDish(item)}
                      title="Edit Dish"
                      className="p-1 rounded text-slate-400 hover:text-amber-300"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDish(item._id)}
                      title="Delete Dish"
                      className="p-1 rounded text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div>
                  {/* Food Image */}
                  <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-slate-950 mb-3.5">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                    <span className="absolute bottom-2.5 right-2.5 px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-amber-500/40 font-mono font-bold text-amber-300 text-sm">
                      ৳{item.price.toFixed(2)}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <h3 className="font-serif font-bold text-white text-base group-hover:text-amber-200 transition-colors">
                      {language === 'bn' ? item.nameBn : item.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {language === 'bn' ? item.descriptionBn : item.description}
                    </p>
                  </div>
                </div>

                {/* Footer action */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {item.calories ? `${item.calories} kcal` : item.category}
                  </span>

                  {item.isAvailable === false ? (
                    <span className="text-[11px] font-bold text-rose-400 px-2 py-0.5 rounded bg-rose-950/40 border border-rose-800">
                      Out of Stock
                    </span>
                  ) : countInCart > 0 ? (
                    <div className="flex items-center gap-2 bg-emerald-950 border border-emerald-600/60 rounded-xl p-1">
                      <button
                        onClick={() => removeFromCart(item._id || item.name)}
                        className="w-6 h-6 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-white px-1">
                        {countInCart}
                      </span>
                      <button
                        onClick={() => addToCart(item._id || item.name)}
                        className="w-6 h-6 rounded-lg bg-emerald-600 text-slate-950 flex items-center justify-center text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item._id || item.name)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-slate-950 text-xs font-semibold transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'অর্ডার কার্টে নিন' : 'Add to Cart'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </main>

      {/* Admin Add / Edit Dish Modal */}
      {isDishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-700/80 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-serif font-bold text-white text-base">
                {editingItem ? 'খাবার এডিট করুন (Edit Dish)' : 'নতুন খাবার যুক্ত করুন (Add Dish)'}
              </h3>
              <button onClick={() => setIsDishModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveDish} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Dish Name (English) *</label>
                <input
                  type="text"
                  required
                  value={dishName}
                  onChange={e => setDishName(e.target.value)}
                  placeholder="e.g. Royal Shahi Halwa"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">নাম (বাংলা)</label>
                <input
                  type="text"
                  value={dishNameBn}
                  onChange={e => setDishNameBn(e.target.value)}
                  placeholder="যেমনঃ শাহী হালুয়া"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Price (৳) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={dishPrice}
                    onChange={e => setDishPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Category</label>
                  <select
                    value={dishCategory}
                    onChange={e => setDishCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="Refreshments">Refreshments</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Executive Catering">Executive Catering</option>
                    <option value="Dessert">Dessert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Image URL</label>
                <input
                  type="text"
                  value={dishImageUrl}
                  onChange={e => setDishImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Description</label>
                <textarea
                  value={dishDescription}
                  onChange={e => setDishDescription(e.target.value)}
                  rows={2}
                  placeholder="Short description of the food item..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDishModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-amber-600 text-slate-950 font-bold text-xs"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <QuickOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSubmit={async (data) => {
          await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          setCart({});
          alert('অর্ডার সফলভাবে গ্রহণ করা হয়েছে!');
        }}
      />
    </div>
  );
}
