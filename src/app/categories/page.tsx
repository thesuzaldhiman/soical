'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { PageCategory } from '@/types';
import {
  Tags,
  Plus,
  Trash2,
  Edit2,
  Hash,
  CheckCircle2,
  Layers,
} from 'lucide-react';

export default function CategoriesPage() {
  return (
    <AppShell>
      <CategoriesContent />
    </AppShell>
  );
}

function CategoriesContent() {
  const { categories, pages, createCategory, deleteCategory } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tagsArray = tagsInput
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));

    createCategory(name.trim(), color, selectedPages, tagsArray);
    setName('');
    setTagsInput('');
    setSelectedPages([]);
    setModalOpen(false);
  };

  const togglePageInModal = (pid: string) => {
    setSelectedPages((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Tags className="w-6 h-6 text-pink-600" />
            <span>Page Groups & Category Tags</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Group your social channels by topic (e.g. Breaking News, Weather, Video Shorts) and associate default hashtag pools.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Page Category</span>
        </button>
      </div>

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-5"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-4 h-4 rounded-full shadow-xs shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <h3 className="font-bold text-slate-900 text-base">{cat.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => deleteCategory(cat.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Associated Pages */}
              <div className="text-xs text-slate-600 mb-4 space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Mapped Channels ({cat.pageIds.length}):
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {cat.pageIds.map((pid) => {
                    const pg = pages.find((p) => p.id === pid);
                    if (!pg) return null;
                    return (
                      <span
                        key={pid}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                      >
                        {pg.name}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Tags Pool */}
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  <span>Category Hashtags:</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {cat.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-semibold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>One-click append in Composer</span>
              <span className="font-semibold text-slate-700">Active</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-fade-in space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Create New Category</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Breaking News & Alerts"
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Badge Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-9 h-9 rounded-lg cursor-pointer border-0"
                  />
                  <span className="text-xs font-mono font-medium text-slate-600">{color}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Default Hashtags (Space separated)
                </label>
                <textarea
                  rows={2}
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="#HimachalNews #Shimla #Breaking"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Select Channels in this Group
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {pages.map((p) => {
                    const isChecked = selectedPages.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => togglePageInModal(p.id)}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 text-blue-600 rounded"
                        />
                        <span className="font-medium text-slate-800">{p.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
