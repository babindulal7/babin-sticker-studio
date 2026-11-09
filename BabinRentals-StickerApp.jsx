import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Boxes,
  Palette,
  Printer,
  UploadCloud,
  ScanLine,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  C,
  PAGES,
  STORE_KEYS,
  DEFAULT_SETTINGS,
  resolveTemplateId,
  suggestTemplate,
  TEMPLATES,
} from "./src/config/tokens.js";
import { storeLoad, storeSave } from "./src/utils/storage.js";
import { DEFAULT_LOGO_WHITE } from "./src/config/defaultLogo.js";

import { ImportView } from "./src/components/import/ImportView.jsx";
import { LibraryView } from "./src/components/library/LibraryView.jsx";
import { DesignerView } from "./src/components/designer/DesignerView.jsx";
import { PrintView } from "./src/components/print/PrintView.jsx";
import { SettingsModal } from "./src/components/common/SettingsModal.jsx";
import { QuickSearchModal } from "./src/components/common/QuickSearchModal.jsx";

function useViewportWidth() {
  const [width, setWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1280));
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return width;
}

export default function App() {
  const viewportWidth = useViewportWidth();
  const isMobile = viewportWidth <= 900;
  const isPhone = viewportWidth <= 640;

  // App State
  const [page, setPage] = useState("library");
  const [items, setItems] = useState([]);
  const [queue, setQueue] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // Designer State
  const [designerItem, setDesignerItem] = useState(null);
  const [designerTemplate, setDesignerTemplate] = useState("t3");

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Toast Helper
  const showToast = useCallback((message, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3200);
  }, []);

  // Load Persisted Data on Mount
  useEffect(() => {
    let alive = true;
    (async () => {
      const [
        savedItems,
        savedQueue,
        savedPage,
        savedSettings,
        savedDesignerTemplate,
        savedDesignerItemRef,
      ] = await Promise.all([
        storeLoad(STORE_KEYS.items),
        storeLoad(STORE_KEYS.queue),
        storeLoad(STORE_KEYS.page),
        storeLoad(STORE_KEYS.settings),
        storeLoad(STORE_KEYS.designerTemplate),
        storeLoad(STORE_KEYS.designerItemRef),
      ]);

      if (!alive) return;

      const restoredItems = Array.isArray(savedItems) ? savedItems : [];
      const restoredQueue = Array.isArray(savedQueue) ? savedQueue : [];

      if (restoredItems.length > 0) setItems(restoredItems);
      else {
        // Sample default equipment if library is completely empty
        setItems([
          {
            id: "demo-1",
            sku: "CAM-FX3-01",
            name: "Sony FX3 Cinema Line Camera Kit",
            category: "Camera",
            qr_url: "https://babinrentals.com/items/CAM-FX3-01",
            isPrinted: true,
          },
          {
            id: "demo-2",
            sku: "LNS-SIG-2470",
            name: "Sigma 24-70mm f/2.8 DG DN Art Lens (Sony E)",
            category: "Lens",
            qr_url: "https://babinrentals.com/items/LNS-SIG-2470",
            isPrinted: false,
          },
          {
            id: "demo-3",
            sku: "LGT-APU-MC8",
            name: "Aputure MC Pro RGB LED 8-Light Kit",
            category: "Lighting",
            qr_url: "https://babinrentals.com/items/LGT-APU-MC8",
            isPrinted: false,
          },
        ]);
      }

      if (restoredQueue.length > 0) setQueue(restoredQueue);
      if (typeof savedPage === "string" && PAGES.includes(savedPage)) setPage(savedPage);
      if (savedSettings && typeof savedSettings === "object") {
        setSettings({ ...DEFAULT_SETTINGS, ...savedSettings });
      }
      if (typeof savedDesignerTemplate === "string") {
        setDesignerTemplate(resolveTemplateId(savedDesignerTemplate));
      }

      if (savedDesignerItemRef && typeof savedDesignerItemRef === "object") {
        const item = restoredItems.find((i) => i.id === savedDesignerItemRef.id || i.sku === savedDesignerItemRef.sku);
        if (item) setDesignerItem(item);
      }

      setLoaded(true);
    })();

    return () => {
      alive = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Save changes to storage
  useEffect(() => {
    if (!loaded) return;
    storeSave(STORE_KEYS.items, items);
  }, [items, loaded]);

  useEffect(() => {
    if (!loaded) return;
    storeSave(STORE_KEYS.queue, queue);
  }, [queue, loaded]);

  useEffect(() => {
    if (!loaded) return;
    storeSave(STORE_KEYS.settings, settings);
  }, [settings, loaded]);

  useEffect(() => {
    if (!loaded) return;
    storeSave(STORE_KEYS.page, page);
  }, [page, loaded]);

  useEffect(() => {
    if (!loaded) return;
    storeSave(STORE_KEYS.designerTemplate, designerTemplate);
  }, [designerTemplate, loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (designerItem) {
      storeSave(STORE_KEYS.designerItemRef, { id: designerItem.id, sku: designerItem.sku });
    }
  }, [designerItem, loaded]);

  // Global Keyboard Shortcuts (Pressing "/" opens Quick Search & Barcode Scanner)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Add Item to Queue Handler
  const handleAddToQueue = useCallback(
    (item, templateId, qty = 1, sequenceConfig = null, options = null) => {
      const resolved = resolveTemplateId(templateId);
      setQueue((prev) => {
        const existingIdx = prev.findIndex(
          (q) =>
            (q.item?.sku === item.sku || q.item?.id === item.id) &&
            q.templateId === resolved &&
            JSON.stringify(q.options) === JSON.stringify(options)
        );
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx].qty += qty;
          return next;
        }
        return [
          ...prev,
          {
            item,
            templateId: resolved,
            qty,
            sequenceConfig: sequenceConfig || { enabled: true },
            options: options || {
              theme: settings.defaultTheme || "dark",
              codeType: settings.defaultCodeType || "qr",
            },
          },
        ];
      });
      showToast(`Added ${qty} sticker(s) of "${item.name}" to print queue`);
    },
    [settings, showToast]
  );

  // Instant Single Print Handler (direct label print)
  const handleDirectPrintItem = (item, templateId, qty, sequenceConfig, options) => {
    const tpl = TEMPLATES[resolveTemplateId(templateId)];
    const printWin = window.open("", "_blank", "width=800,height=600");
    if (!printWin) {
      alert("Please allow pop-ups to print stickers.");
      return;
    }

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Print Label - ${item.name}</title>
    <style>
      @page { size: auto; margin: 0mm; }
      body { margin: 0; padding: 0; background: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .label-item { page-break-after: always; break-after: page; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; }
    </style>
  </head>
  <body>
    <div id="print-mount"></div>
    <script>
      window.onload = () => { setTimeout(() => window.print(), 250); };
    </script>
  </body>
</html>`;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();

    // Add to queue as well for records
    handleAddToQueue(item, templateId, qty, sequenceConfig, options);
  };

  // Open item in Designer
  const handleOpenDesigner = (item, template) => {
    setDesignerItem(item);
    if (template) setDesignerTemplate(template);
    setPage("designer");
  };

  // Count total stickers in queue
  const totalQueuedStickers = queue.reduce((acc, q) => acc + (q.qty || 1), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg, color: C.white, overflow: "hidden" }}>
      {/* Top Application Header */}
      <header
        style={{
          height: 56,
          background: "#111111",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Brand Logo & Name */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              height: 28,
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={() => setPage("library")}
          >
            <img
              src={settings.customLogo || DEFAULT_LOGO_WHITE}
              alt="Logo"
              style={{ height: "100%", width: "auto", display: "block" }}
            />
          </div>
          {!isPhone && (
            <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: 12, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".04em", color: C.white }}>
                {settings.brand || "BABIN RENTALS"}
              </span>
              <span style={{ fontSize: 10, color: C.muted }}>Sticker & Asset Tag Studio</span>
            </div>
          )}
        </div>

        {/* Center Navigation Links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {[
            { id: "library", label: "Library", icon: <Boxes size={15} />, count: items.length },
            { id: "designer", label: "Designer", icon: <Palette size={15} /> },
            { id: "print", label: "Print Queue", icon: <Printer size={15} />, count: totalQueuedStickers, badgeColor: C.red },
            { id: "import", label: "Import", icon: <UploadCloud size={15} /> },
          ].map((tab) => {
            const active = page === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPage(tab.id)}
                style={{
                  padding: isPhone ? "6px 8px" : "6px 14px",
                  background: active ? "#222222" : "transparent",
                  border: `1px solid ${active ? C.border : "transparent"}`,
                  borderRadius: 6,
                  color: active ? C.white : C.muted,
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all .15s",
                }}
              >
                <span>{tab.icon}</span>
                {!isPhone && <span>{tab.label}</span>}
                {tab.count != null && tab.count > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 10,
                      background: tab.badgeColor || "rgba(255,255,255,0.1)",
                      color: C.white,
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Tools (Quick Scan & Settings) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Barcode Quick Scan Trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            style={{
              padding: "6px 12px",
              background: "#1A1A1A",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.white,
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            title="Scan barcode or press '/' to quickly find and print"
          >
            <ScanLine size={14} color={C.red} />
            {!isPhone && <span>Quick Scan</span>}
            <kbd
              style={{
                background: "#2A2A2A",
                padding: "1px 5px",
                borderRadius: 3,
                fontSize: 10,
                color: C.muted,
                fontFamily: "monospace",
              }}
            >
              /
            </kbd>
          </button>

          {/* Settings Trigger */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            style={{
              padding: "6px 10px",
              background: isSettingsOpen ? "#222" : "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.white,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="App Settings & Branding"
          >
            <SettingsIcon size={16} />
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {page === "library" && (
          <LibraryView
            items={items}
            setItems={setItems}
            onOpenDesigner={handleOpenDesigner}
            onAddToQueue={handleAddToQueue}
            showToast={showToast}
            isMobile={isMobile}
            isPhone={isPhone}
            settings={settings}
          />
        )}

        {page === "designer" && (
          <DesignerView
            items={items}
            selectedItem={designerItem}
            setSelectedItem={setDesignerItem}
            templateId={designerTemplate}
            setTemplateId={setDesignerTemplate}
            onAddToQueue={handleAddToQueue}
            onDirectPrintItem={handleDirectPrintItem}
            showToast={showToast}
            isMobile={isMobile}
            isPhone={isPhone}
            settings={settings}
          />
        )}

        {page === "print" && (
          <PrintView
            queue={queue}
            setQueue={setQueue}
            showToast={showToast}
            isMobile={isMobile}
            isPhone={isPhone}
            settings={settings}
          />
        )}

        {page === "import" && (
          <ImportView
            items={items}
            setItems={setItems}
            showToast={showToast}
            onDone={() => setPage("library")}
            isMobile={isMobile}
            isPhone={isPhone}
            settings={settings}
          />
        )}
      </main>

      {/* Quick Search & Barcode Scan Modal */}
      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        items={items}
        onAddToQueue={handleAddToQueue}
        onOpenInDesigner={handleOpenDesigner}
        settings={settings}
      />

      {/* App & Brand Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
        allItems={items}
        allQueue={queue}
        onRestoreBackup={(backup) => {
          if (backup.settings) setSettings(backup.settings);
          if (Array.isArray(backup.items)) setItems(backup.items);
          if (Array.isArray(backup.queue)) setQueue(backup.queue);
        }}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: toast.type === "error" ? C.red : "#1A2E1E",
            border: `1px solid ${toast.type === "error" ? C.redDim : C.green}`,
            color: C.white,
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            gap: 8,
            animation: "fadeIn 0.2s ease",
          }}
        >
          {toast.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
