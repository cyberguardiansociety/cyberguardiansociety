'use client'

import { useState, useRef } from 'react'
import {
  Plus, Search, X, Edit2, Trash2, Save, Eye,
  Upload, Image as ImageIcon, ChevronDown, BookOpen, ShoppingBag,
  Package, Megaphone, CheckCircle2, RotateCcw, ArrowRight,
  TrendingUp, Sparkles, Layers, FileText
} from 'lucide-react'
import { deleteManagedContent, saveManagedContent } from '@/app/admin/management-actions'
import AdminFileUpload from './AdminFileUpload'
import AdminCombobox from './AdminCombobox'

// ── Types ──────────────────────────────────────────────────────────────

export type ContentRow = {
  id: string
  title: string
  slug: string
  summary: string
  body: string | null
  image_url: string | null
  action_url: string | null
  category: string | null
  price: number | null
  currency: string
  status: 'draft' | 'published' | 'archived'
  sort_order: number
  updated_at?: string
}

export type ContentType = 'announcement' | 'product' | 'merchandise' | 'resource'

type Props = {
  type: ContentType
  records: ContentRow[]
  error: boolean
}

// ── Config ─────────────────────────────────────────────────────────────

const typeConfig = {
  announcement: {
    label: 'Announcements',
    singular: 'announcement',
    icon: Megaphone,
    createLabel: 'Create announcement',
    searchPlaceholder: 'Search announcements...',
    showPrice: false,
    color: 'cobalt',
  },
  product: {
    label: 'Products',
    singular: 'product',
    icon: Package,
    createLabel: 'Create product',
    searchPlaceholder: 'Search products...',
    showPrice: true,
    color: 'purple',
  },
  merchandise: {
    label: 'Merchandise',
    singular: 'item',
    icon: ShoppingBag,
    createLabel: 'Add merchandise',
    searchPlaceholder: 'Search merchandise...',
    showPrice: true,
    color: 'emerald',
  },
  resource: {
    label: 'Free resources',
    singular: 'resource',
    icon: BookOpen,
    createLabel: 'Create resource',
    searchPlaceholder: 'Search resources...',
    showPrice: false,
    color: 'amber',
  },
}

// ── Helpers ────────────────────────────────────────────────────────────

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat('en', { dateStyle: 'short' }).format(new Date(dateStr))
}

function formatPrice(price: number | null, currency: string): string {
  if (price == null) return '—'
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price)
}

// ── Main Client Component ──────────────────────────────────────────────

export default function AdminContentWorkspace({ type, records, error }: Props) {
  const cfg = typeConfig[type]
  const Icon = cfg.icon

  // State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [editingItem, setEditingItem] = useState<ContentRow | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('draft')
  const formRef = useRef<HTMLFormElement>(null)

  // Derived data
  const categories = Array.from(new Set(records.map(r => r.category).filter(Boolean))) as string[]
  const publishedCount = records.filter(r => r.status === 'published').length
  const draftCount = records.filter(r => r.status === 'draft').length
  const archivedCount = records.filter(r => r.status === 'archived').length

  // Filtering
  const filtered = records.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      return (
        r.title.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        (r.category ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  // Start editing an item
  const startEdit = (item: ContentRow) => {
    setEditingItem(item)
    setSelectedStatus(item.status)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      formRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingItem(null)
    setSelectedStatus('draft')
  }

  return (
    <div className="cms-screen-container">
      {/* ── Redesigned Cyber Stats Grid ───────────────────────────────── */}
      <div className="registrants-cyber-stats-grid">
        <div className="cyber-kpi-card cyber-kpi-card--cobalt">
          <div className="cyber-kpi-card__top">
            <span className="cyber-kpi-badge cyber-kpi-badge--cobalt">Total Inventory</span>
            <div className="cyber-kpi-icon">
              <Icon size={16} />
            </div>
          </div>
          <div className="cyber-kpi-card__main">
            <span className="cyber-kpi-label">Total {cfg.label}</span>
            <strong className="cyber-kpi-value">{records.length}</strong>
          </div>
          <div className="cyber-kpi-card__footer">
            <span className="cyber-kpi-subtext">Managed platform content</span>
          </div>
        </div>

        <div className="cyber-kpi-card cyber-kpi-card--emerald">
          <div className="cyber-kpi-card__top">
            <span className="cyber-kpi-badge cyber-kpi-badge--emerald">Live Public</span>
            <div className="cyber-kpi-icon">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="cyber-kpi-card__main">
            <span className="cyber-kpi-label">Published</span>
            <strong className="cyber-kpi-value">{publishedCount}</strong>
          </div>
          <div className="cyber-kpi-card__footer">
            <span className="cyber-kpi-subtext">Active on live website</span>
          </div>
        </div>

        <div className="cyber-kpi-card cyber-kpi-card--amber">
          <div className="cyber-kpi-card__top">
            <span className="cyber-kpi-badge cyber-kpi-badge--amber">Pending</span>
            <div className="cyber-kpi-icon">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="cyber-kpi-card__main">
            <span className="cyber-kpi-label">Drafts</span>
            <strong className="cyber-kpi-value">{draftCount}</strong>
          </div>
          <div className="cyber-kpi-card__footer">
            <span className="cyber-kpi-subtext">Internal review &amp; staging</span>
          </div>
        </div>

        <div className="cyber-kpi-card cyber-kpi-card--purple">
          <div className="cyber-kpi-card__top">
            <span className="cyber-kpi-badge cyber-kpi-badge--purple">Taxonomy</span>
            <div className="cyber-kpi-icon">
              <Layers size={16} />
            </div>
          </div>
          <div className="cyber-kpi-card__main">
            <span className="cyber-kpi-label">Categories</span>
            <strong className="cyber-kpi-value">{categories.length}</strong>
          </div>
          <div className="cyber-kpi-card__footer">
            <span className="cyber-kpi-subtext">Distinct classification tags</span>
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Screen Layout ─────────────────────────────── */}
      <div className="cms-split-grid">
        {/* ── Column 1: Creation & Edit Form (Guaranteed 100% visible inside viewport) ── */}
        <section className="cms-form-card" ref={formRef}>
          <div className="cms-form-card__head">
            <div className="cms-form-card__icon">
              {editingItem ? <Edit2 size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <p className="cms-form-card__kicker">
                {editingItem ? 'Editing record' : 'New record'}
              </p>
              <h2 className="cms-form-card__title">
                {editingItem ? `Edit ${cfg.singular}` : cfg.createLabel}
              </h2>
            </div>
            {editingItem && (
              <button
                type="button"
                className="cms-cancel-edit-btn"
                onClick={cancelEdit}
                title="Cancel editing and create new"
              >
                <RotateCcw size={13} />
                <span>New</span>
              </button>
            )}
          </div>

          <form
            action={saveManagedContent}
            className="cms-integrated-form"
          >
            <input type="hidden" name="contentType" value={type} />
            {editingItem && <input type="hidden" name="id" value={editingItem.id} />}

            {/* Field: Title & Slug */}
            <div className="cms-form-row">
              <label className="cms-form-label">
                <span>Title <strong className="cms-required">*</strong></span>
                <input
                  key={editingItem?.id ?? 'title-new'}
                  name="title"
                  defaultValue={editingItem?.title ?? ''}
                  minLength={2}
                  maxLength={180}
                  placeholder="Enter title"
                  required
                  className="cms-form-input"
                />
              </label>
              <label className="cms-form-label">
                <span>Slug <small>(optional)</small></span>
                <input
                  key={editingItem?.id ?? 'slug-new'}
                  name="slug"
                  defaultValue={editingItem?.slug ?? ''}
                  maxLength={180}
                  placeholder="auto-generated"
                  className="cms-form-input"
                />
              </label>
            </div>

            {/* Field: Summary */}
            <label className="cms-form-label">
              <span>Summary <strong className="cms-required">*</strong></span>
              <textarea
                key={editingItem?.id ?? 'sum-new'}
                name="summary"
                defaultValue={editingItem?.summary ?? ''}
                maxLength={800}
                rows={2}
                placeholder="Brief summary for listings and cards..."
                required
                className="cms-form-textarea"
              />
            </label>

            {/* Field: Description */}
            <label className="cms-form-label">
              <span>Description <small>(optional markdown)</small></span>
              <textarea
                key={editingItem?.id ?? 'body-new'}
                name="body"
                defaultValue={editingItem?.body ?? ''}
                maxLength={8000}
                rows={3}
                placeholder="Full markdown/HTML description..."
                className="cms-form-textarea"
              />
            </label>

            {/* Field: Category & Action URL */}
            <div className="cms-form-row">
              <label className="cms-form-label">
                <span>Category</span>
                <input
                  key={editingItem?.id ?? 'cat-new'}
                  name="category"
                  defaultValue={editingItem?.category ?? ''}
                  maxLength={100}
                  placeholder="e.g. Tools, Guide, Apparel"
                  className="cms-form-input"
                />
              </label>
              <label className="cms-form-label">
                <span>Action URL <small>(optional)</small></span>
                <input
                  key={editingItem?.id ?? 'url-new'}
                  name="actionUrl"
                  defaultValue={editingItem?.action_url ?? ''}
                  maxLength={2048}
                  placeholder="/contact or https://..."
                  className="cms-form-input"
                />
              </label>
            </div>

            {/* Pricing Section (only for merchandise/products) */}
            {cfg.showPrice ? (
              <div className="cms-form-row">
                <label className="cms-form-label">
                  <span>Price</span>
                  <input
                    key={editingItem?.id ?? 'price-new'}
                    name="price"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={editingItem?.price ?? ''}
                    placeholder="0.00"
                    className="cms-form-input"
                  />
                </label>
                <label className="cms-form-label">
                  <span>Currency</span>
                  <input
                    key={editingItem?.id ?? 'curr-new'}
                    name="currency"
                    defaultValue={editingItem?.currency ?? 'USD'}
                    minLength={3}
                    maxLength={3}
                    required
                    className="cms-form-input"
                  />
                </label>
              </div>
            ) : (
              <>
                <input type="hidden" name="price" value="" />
                <input type="hidden" name="currency" value={editingItem?.currency ?? 'USD'} />
              </>
            )}

            {/* Animated Cyber Drag & Drop Image Upload Component */}
            <AdminFileUpload
              key={editingItem?.id ?? 'upload-fresh'}
              name="image"
              existingImageUrl={editingItem?.image_url}
              label={editingItem?.image_url ? 'Cover Image (Change / Replace)' : 'Cover Image Asset'}
              hint="PNG, JPEG, WebP up to 4MB"
            />

            {/* Publishing: Status & Display Order */}
            <div className="cms-form-row">
              <AdminCombobox
                key={editingItem?.id ?? 'status-field'}
                name="status"
                label="Lifecycle Status"
                defaultValue={editingItem?.status ?? 'draft'}
                options={[
                  { value: 'draft', label: 'Draft (Staging)' },
                  { value: 'published', label: 'Published (Live)' },
                  { value: 'archived', label: 'Archived' },
                ]}
                placeholder="Select status…"
              />

              <label className="cms-form-label">
                <span>Display order</span>
                <input
                  key={editingItem?.id ?? 'order-new'}
                  name="sortOrder"
                  type="number"
                  min={-100000}
                  max={100000}
                  defaultValue={editingItem?.sort_order ?? 0}
                  className="cms-form-input"
                />
              </label>
            </div>

            {/* Actions */}
            <div className="cms-form-actions">
              <button type="submit" className="cms-form-submit-btn">
                <Save size={15} />
                <span>{editingItem ? 'Save Changes' : `Create ${cfg.singular}`}</span>
              </button>
              {editingItem && (
                <button
                  type="button"
                  className="cms-form-cancel-btn"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* ── Column 2: Management List / Table & Filtering ─────────── */}
        <section className="cms-records-card">
          <div className="cms-records-card__head">
            <div className="cms-records-card__title-wrap">
              <div className="cms-records-card__icon">
                <Icon size={18} />
              </div>
              <div>
                <p className="cms-form-card__kicker">Published &amp; Drafts</p>
                <h2 className="cms-form-card__title">
                  {cfg.label} <span className="cms-records-count-badge">{filtered.length}</span>
                </h2>
              </div>
            </div>

            {/* Search & Filters in Header */}
            <div className="cms-filter-toolbar">
              <div className="cms-filter-search">
                <Search size={14} className="cms-search-icon" />
                <input
                  type="text"
                  placeholder={cfg.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label={cfg.searchPlaceholder}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="cms-clear-btn"
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div style={{ width: '150px' }}>
                <AdminCombobox
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'all', label: 'All statuses' },
                    { value: 'published', label: 'Published' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'archived', label: 'Archived' },
                  ]}
                  placeholder="Filter status…"
                />
              </div>

              {categories.length > 0 && (
                <div style={{ width: '160px' }}>
                  <AdminCombobox
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    options={[
                      { value: 'all', label: 'All categories' },
                      ...categories.map(c => ({ value: c, label: c })),
                    ]}
                    placeholder="Filter category…"
                  />
                </div>
              )}
            </div>
          </div>

          {error && (
            <p role="alert" className="admin-alert admin-alert--error" style={{ margin: '14px' }}>
              Couldn&apos;t load {cfg.label.toLowerCase()}.
            </p>
          )}

          {/* Records Table / List */}
          {filtered.length > 0 ? (
            <div className="cms-table-scroll">
              <table className="cms-integrated-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    {cfg.showPrice && <th>Price</th>}
                    <th>Status</th>
                    <th>Order</th>
                    <th>Updated</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className={editingItem?.id === item.id ? 'cms-row--editing' : ''}
                    >
                      <td className="cms-cell-main">
                        <div className="cms-item-flex">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="cms-thumb" loading="lazy" />
                          ) : (
                            <div className="cms-thumb cms-thumb--placeholder">
                              <Icon size={14} />
                            </div>
                          )}
                          <div className="cms-item-titles">
                            <strong className="cms-item-name">{item.title}</strong>
                            <span className="cms-item-sub">{item.slug || 'no-slug'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {item.category ? (
                          <span className="cms-badge-category">{item.category}</span>
                        ) : (
                          <span className="cms-text-muted">—</span>
                        )}
                      </td>
                      {cfg.showPrice && (
                        <td>
                          <span className="cms-price-text">
                            {formatPrice(item.price, item.currency)}
                          </span>
                        </td>
                      )}
                      <td>
                        <span className={`cms-pill cms-pill--${item.status}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <span className="cms-text-muted">{item.sort_order}</span>
                      </td>
                      <td>
                        <span className="cms-text-muted">{timeAgo(item.updated_at)}</span>
                      </td>
                      <td className="cms-cell-actions">
                        <div className="cms-row-action-btns">
                          <button
                            type="button"
                            className="cms-row-edit-btn"
                            onClick={() => startEdit(item)}
                            title="Edit this record in the form"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                          <form action={deleteManagedContent} className="cms-inline-del-form">
                            <input type="hidden" name="contentType" value={type} />
                            <input type="hidden" name="id" value={item.id} />
                            <button
                              type="submit"
                              className="cms-row-delete-btn"
                              title="Delete record"
                              onClick={(e) => {
                                if (!window.confirm(`Delete "${item.title}"? This action cannot be undone.`)) {
                                  e.preventDefault()
                                }
                              }}
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="cms-empty-state">
              <div className="cms-empty-icon">
                <Icon size={26} />
              </div>
              <p className="cms-empty-title">
                {search || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? `No ${cfg.label.toLowerCase()} match filters`
                  : `No ${cfg.label.toLowerCase()} yet`}
              </p>
              <p className="cms-empty-subtitle">
                {search || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try clearing the search query or status filter.'
                  : `Fill in the form on the left to create your first ${cfg.singular}.`}
              </p>
            </div>
          )}

          <div className="cms-records-card__foot">
            <p>Uploaded images are cached and publicly viewable on the website.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
