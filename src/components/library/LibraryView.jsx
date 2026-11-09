import React, { useState } from "react";
import {
  Search,
  FileSpreadsheet,
  Download,
  Plus,
  Palette,
  Edit3,
  CheckCircle2,
  Clock,
  Trash2,
  X,
} from "lucide-react";
import {
  C,
  CATEGORIES,
  suggestTemplate,
  TEMPLATES,
  uid,
} from "../../config/tokens.js";
import { CategoryTypeBadge } from "../common/Icons.jsx";
import { exportItemsToExcel, exportItemsToCsv } from "../../utils/exportUtils.js";

export function LibraryView({
  items,
  setItems,
  onOpenDesigner,
  onAddToQueue,
  showToast,
  isMobile,
  isPhone,
  settings,
}) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "printed" | "unprinted"
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Filter items
  const filtered = items.filter((item) => {
    const matchCat = catFilter === "All" || item.category === catFilter;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "printed" && item.isPrinted) ||
      (statusFilter === "unprinted" && !item.isPrinted);
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.sku && item.sku.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q));
    return matchCat && matchStatus && matchSearch;
  });

  const allSelected = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id || i.sku));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id || i.sku)));
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkQueue = () => {
    const toQueue = items.filter((i) => selectedIds.has(i.id || i.sku));
    if (toQueue.length === 0) return;
    toQueue.forEach((item) => {
      const template = suggestTemplate(item.category, item.name);
      onAddToQueue(item, template, 1);
    });
    showToast(`Added ${toQueue.length} items to print queue`);
    setSelectedIds(new Set());
  };

  const handleBulkMarkPrinted = (printed) => {
    setItems((prev) =>
      prev.map((i) => (selectedIds.has(i.id || i.sku) ? { ...i, isPrinted: printed } : i))
    );
    showToast(`Marked ${selectedIds.size} items as ${printed ? "printed" : "unprinted"}`);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (!window.confirm(`Delete ${selectedIds.size} selected items from inventory?`)) return;
    setItems((prev) => prev.filter((i) => !selectedIds.has(i.id || i.sku)));
    showToast(`Deleted ${selectedIds.size} items`);
    setSelectedIds(new Set());
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: C.bg }}>
      {/* Top Filter and Search Bar */}
      <div
        style={{
          padding: isPhone ? 12 : 16,
          borderBottom: `1px solid ${C.border}`,
          background: "#141414",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          {/* Search box */}
          <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 400 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.muted, display: "flex", alignItems: "center" }}>
              <Search size={14} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search equipment by SKU or name..."
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                background: "#1E1E1E",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.white,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => exportItemsToExcel(filtered)}
              style={{
                padding: "8px 12px",
                background: "#1C241D",
                border: `1px solid ${C.green}44`,
                color: C.green,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              title="Export filtered equipment to Excel spreadsheet"
            >
              <FileSpreadsheet size={14} />
              Export Excel
            </button>
            <button
              onClick={() => exportItemsToCsv(filtered)}
              style={{
                padding: "8px 12px",
                background: "#222222",
                border: `1px solid ${C.border}`,
                color: C.white,
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              title="Export filtered equipment to CSV"
            >
              <Download size={14} />
              Export CSV
            </button>
            <button
              onClick={() => {
                setEditingItem(null);
                setShowAddModal(true);
              }}
              style={{
                padding: "8px 16px",
                background: C.red,
                border: "none",
                color: C.white,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus size={15} />
              Add Item
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {CATEGORIES.map((cat) => {
            const active = catFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  background: active ? C.red : "#202020",
                  color: active ? C.white : C.muted,
                  border: `1px solid ${active ? C.red : C.border}`,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {cat}
              </button>
            );
          })}

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "4px 8px",
                background: "#1E1E1E",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.white,
                fontSize: 11,
                outline: "none",
              }}
            >
              <option value="all">All Print States</option>
              <option value="unprinted">⏳ Not Printed Yet</option>
              <option value="printed">✓ Printed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Selected Action Floating Banner */}
      {selectedIds.size > 0 && (
        <div
          style={{
            background: "#1E293B",
            borderBottom: `1px solid ${C.blue}44`,
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 13, color: C.white, fontWeight: 600 }}>
            {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handleBulkQueue}
              style={{
                padding: "6px 12px",
                background: C.red,
                color: C.white,
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Plus size={13} />
              Queue Selected
            </button>
            <button
              onClick={() => handleBulkMarkPrinted(true)}
              style={{
                padding: "6px 10px",
                background: "rgba(50,208,116,0.15)",
                border: `1px solid ${C.green}44`,
                color: C.green,
                borderRadius: 6,
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <CheckCircle2 size={12} />
              Mark Printed
            </button>
            <button
              onClick={() => handleBulkMarkPrinted(false)}
              style={{
                padding: "6px 10px",
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${C.border}`,
                color: C.muted,
                borderRadius: 6,
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Clock size={12} />
              Mark Unprinted
            </button>
            <button
              onClick={handleBulkDelete}
              style={{
                padding: "6px 10px",
                background: "rgba(215,25,32,0.1)",
                border: `1px solid ${C.red}44`,
                color: C.red,
                borderRadius: 6,
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: "#111111", position: "sticky", top: 0, zIndex: 5 }}>
              <th style={{ padding: "12px 14px", width: 36, textAlign: "center" }}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              </th>
              {["SKU", "Equipment Name", "Category", "Recommended Size", "Status", "Actions"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 14px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 60, textAlign: "center", color: C.muted, fontSize: 13 }}>
                  No equipment found matching criteria. Click "+ Add Item" or import a spreadsheet.
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const idKey = item.id || item.sku;
                const isChecked = selectedIds.has(idKey);
                const suggested = suggestTemplate(item.category, item.name);
                const tpl = TEMPLATES[suggested];

                return (
                  <tr
                    key={idKey}
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      background: isChecked ? "rgba(255,255,255,0.03)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(idKey)} />
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: C.yellow, fontWeight: 600 }}>
                      {item.sku}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: C.white }}>
                      {item.name}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <CategoryTypeBadge category={item.category} name={item.name} />
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: C.muted }}>
                      <span style={{ color: C.white, fontWeight: 500 }}>{tpl?.name}</span> ({tpl?.size})
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {item.isPrinted ? (
                        <span style={{ fontSize: 11, color: C.green, background: "rgba(50,208,116,0.1)", padding: "2px 8px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle2 size={11} /> Printed
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: C.muted, background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Clock size={11} /> Not Printed
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          onClick={() => {
                            onAddToQueue(item, suggested, 1);
                            showToast(`Added ${item.name} to print queue`);
                          }}
                          style={{
                            padding: "4px 10px",
                            background: C.red,
                            color: C.white,
                            border: "none",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Plus size={11} /> Queue
                        </button>
                        <button
                          onClick={() => onOpenDesigner(item, suggested)}
                          style={{
                            padding: "4px 8px",
                            background: "#222222",
                            color: C.white,
                            border: `1px solid ${C.border}`,
                            borderRadius: 4,
                            fontSize: 11,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Palette size={11} /> Design
                        </button>
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setShowAddModal(true);
                          }}
                          style={{
                            padding: "4px 8px",
                            background: "none",
                            color: C.muted,
                            border: `1px solid ${C.border}`,
                            borderRadius: 4,
                            fontSize: 11,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Edit3 size={11} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <ItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          item={editingItem}
          onSave={(savedItem) => {
            if (editingItem) {
              setItems((prev) => prev.map((i) => ((i.id || i.sku) === (editingItem.id || editingItem.sku) ? savedItem : i)));
              showToast("Item updated successfully");
            } else {
              setItems((prev) => [savedItem, ...prev]);
              showToast("New item created successfully");
            }
            setShowAddModal(false);
          }}
          settings={settings}
        />
      )}
    </div>
  );
}

function ItemModal({ isOpen, onClose, item, onSave, settings }) {
  const [formData, setFormData] = useState(() => {
    if (item) return { ...item };
    return {
      id: uid(),
      name: "",
      sku: "ITEM-" + Math.floor(100 + Math.random() * 900),
      category: "Camera",
      quantity: 1,
      qr_url: "",
      notes: "",
      isPrinted: false,
    };
  });

  if (!isOpen) return null;

  const website = settings?.website || "babinrentals.com";
  const defaultQrUrl = `https://${website}/items/${formData.sku}`;
  const suggestedSize = suggestTemplate(formData.category, formData.name);

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    background: "#181818",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.white,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: C.muted,
    textTransform: "uppercase",
    marginBottom: 4,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          backgroundColor: "#111111",
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>
            {item ? "Edit Equipment Item" : "Create New Equipment Item"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", display: "flex", alignItems: "center" }}>
            <X size={18} />
          </button>
        </div>

        <div>
          <label style={labelStyle}>Equipment Name *</label>
          <input
            style={inputStyle}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Sony FX3 Cinema Line Camera Kit"
            autoFocus
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>SKU Code *</label>
            <input
              style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", color: C.yellow }}
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select
              style={inputStyle}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {CATEGORIES.filter((c) => c !== "All").map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Quantity</label>
            <input
              type="number"
              min="1"
              style={inputStyle}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
            />
          </div>
          <div>
            <label style={labelStyle}>Suggested Sticker Size</label>
            <div
              style={{
                ...inputStyle,
                background: "#141414",
                color: C.white,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
              }}
            >
              {TEMPLATES[suggestedSize]?.name} ({TEMPLATES[suggestedSize]?.size})
            </div>
          </div>
        </div>

        <div>
          <label style={labelStyle}>QR Code Target URL (Optional)</label>
          <input
            style={inputStyle}
            value={formData.qr_url}
            onChange={(e) => setFormData({ ...formData, qr_url: e.target.value })}
            placeholder={defaultQrUrl}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
          <button
            onClick={onClose}
            style={{ padding: "8px 16px", background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.white, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!formData.name.trim() || !formData.sku.trim()) {
                alert("Please provide both name and SKU.");
                return;
              }
              onSave({
                ...formData,
                qr_url: formData.qr_url || defaultQrUrl,
              });
            }}
            style={{ padding: "8px 20px", background: C.red, border: "none", borderRadius: 6, color: C.white, fontWeight: 700, cursor: "pointer" }}
          >
            Save Item
          </button>
        </div>
      </div>
    </div>
  );
}

export default LibraryView;
