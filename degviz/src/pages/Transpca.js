import React, { useEffect, useMemo, useRef, useState } from "react";

/* ===============================
   Config
   =============================== */
const API_BASE = "http://localhost:5050/api/transpca";
const DEFAULT_LABEL_COL = ".JOIN_SAMPLE"; // or "SampleName"

/* ===============================
   Preview sizing
   =============================== */
const LEFT_COL_FLEX     = "0 0 50%";
const PREVIEW_MAX_WIDTH = 820;
const PREVIEW_HEIGHT    = 150;
const PREVIEW_FONT_SIZE = 11;
const MAX_PREVIEW_ROWS  = 5;

/* ===============================
   Helpers
   =============================== */
const asText = (v) =>
  v == null ? "" : (typeof v === "object" ? JSON.stringify(v) : String(v));

const normalizeAes = (obj) => {
  const o = obj && typeof obj === "object" ? obj : {};
  return {
    size:  typeof o.size  === "string" ? o.size  : "",
    color: typeof o.color === "string" ? o.color : "",
    shape: typeof o.shape === "string" ? o.shape : "",
    label: typeof o.label === "string" ? o.label : "",
  };
};

const downloadDataUri = (dataUriOrBase64, filename, mime = "application/octet-stream") => {
  if (!dataUriOrBase64) return;
  const href = dataUriOrBase64.startsWith("data:")
    ? dataUriOrBase64
    : `data:${mime};base64,${dataUriOrBase64}`;
  const a = document.createElement("a");
  a.href = href; a.download = filename || "download";
  document.body.appendChild(a); a.click(); a.remove();
};

/* ===============================
   Component
   =============================== */
export default function TranscriptomePCA() {
  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resp, setResp] = useState(null);

  // Marker state + options
  const [marker, setMarker] = useState("");         // value sent to backend (e.g., "IL6")
  const [markerOpts, setMarkerOpts] = useState([]); // [{value:"IL6", label:"IL6 (M1)", class:"M1"}, ...]

  // Mouse TPM preview (table)
  const [tpm, setTpm] = useState({
    columns: [],
    rows: [],
    preview_csv_base64: "",
    preview_csv_filename: "mouse_tpm_preview.txt",
  });
  const [tpmErr, setTpmErr] = useState("");
  const [tpmLoading, setTpmLoading] = useState(false);
  const [tpmLoaded, setTpmLoaded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const inputRef = useRef(null);
  const metaRef = useRef(null);

  const canRun = useMemo(() => !!file && !busy, [file, busy]);

  const visibleCols = useMemo(() => tpm.columns || [], [tpm.columns]);
  const visibleRows = useMemo(
    () => (tpm.rows || []).slice(0, MAX_PREVIEW_ROWS),
    [tpm.rows]
  );

  /* ---------- fetch marker list once ---------- */
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/marker-list`);
        const j = await r.json().catch(() => null);
        if (!r.ok || !j || j.status !== "ok") throw new Error(j?.message || `HTTP ${r.status}`);
        console.log("marker-list raw:", j); // <-- add this line
        let opts = [];
        if (Array.isArray(j.markers)) {
          opts = j.markers.filter(m => m && m.value).map(m => ({
            value: String(m.value).toUpperCase(),
            label: m.class ? `${String(m.value).toUpperCase()} (${m.class})` : String(m.value).toUpperCase(),
            class: m.class || ""
          }));
        } else if (Array.isArray(j.marker)) {
          const cls = Array.isArray(j.class) ? j.class : [];
          opts = j.marker.map((g, i) => {
            const up = String(g || "").toUpperCase();
            const c  = String(cls[i] || "");
            return { value: up, label: c ? `${up} (${c})` : up, class: c };
          });
        }
        if (!abort) setMarkerOpts(opts);
      } catch (e) {
        console.warn("marker-list error:", e.message || e);
      }
    })();
    return () => { abort = true; };
  }, []);


  // Marker list hook
const [markers, setMarkers] = useState([]);
const [selectedMarker, setSelectedMarker] = useState("(none)");

useEffect(() => {
  async function loadMarkers() {
    try {
      const r = await fetch(`${API_BASE.replace("/api/transpca","")}/marker-list`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();

      console.log("marker-list raw:", j);

      // Accept either {markers:[...]} or a bare array
      const arr = Array.isArray(j) ? j : j?.markers;
      const opts = (arr || []).map(m => ({
        value: m.value,
        label: m.label,
        class: m.class
      }));

      if (opts.length === 0) {
        setMarkers([{ value: "(none)", label: "(none)", class: "" }]);
        setSelectedMarker("(none)");
      } else {
        setMarkers(opts);
        setSelectedMarker(opts[0].value); // default first marker
      }
    } catch (err) {
      console.error("Failed to load markers:", err);
      setMarkers([{ value: "(none)", label: "(none)", class: "" }]);
      setSelectedMarker("(none)");
    }
  }
  loadMarkers();
}, []);

  

  /* ---------- handlers ---------- */
  const onFile = (e) => { setFile(e.target.files?.[0] || null); setError(""); setResp(null); };
  const onMeta = (e) => { setMeta(e.target.files?.[0] || null); };

  async function togglePreview() {
    if (tpmLoaded) { setPreviewOpen(v => !v); return; }
    try {
      setTpmLoading(true);
      setTpmErr("");
      const r = await fetch(`${API_BASE}/mouse-tpm-preview?limit=${MAX_PREVIEW_ROWS}`);
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || j.status !== "ok") throw new Error(j?.message || `HTTP ${r.status}`);
      setTpm({
        columns: Array.isArray(j.columns) ? j.columns : [],
        rows: Array.isArray(j.rows) ? j.rows.slice(0, MAX_PREVIEW_ROWS) : [],
        preview_csv_base64: typeof j.preview_csv_base64 === "string" ? j.preview_csv_base64 : "",
        preview_csv_filename: typeof j.preview_csv_filename === "string" ? j.preview_csv_filename : "mouse_tpm_preview.txt",
      });
      setTpmLoaded(true);
      setPreviewOpen(true);
    } catch (e) {
      setTpmErr(e.message || String(e));
      setPreviewOpen(false);
    } finally {
      setTpmLoading(false);
    }
  }

  async function run() {
    if (!file) { setError("Choose a file (.txt/.tsv/.csv)."); return; }
    setBusy(true); setError(""); setResp(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (meta) fd.append("meta", meta);
      fd.append("label_col", DEFAULT_LABEL_COL);
      if (marker) fd.append("marker", marker); // <-- send selected marker

      const r = await fetch(`${API_BASE}/`, { method: "POST", body: fd });
      const text = await r.text();
      let json; try { json = JSON.parse(text); } catch { json = null; }

      if (json) {
        if (json.notes && json.notes.aes_chosen) json.notes.aes_chosen = normalizeAes(json.notes.aes_chosen);
        if (json.meta_used_cols) json.meta_used_cols = normalizeAes(json.meta_used_cols);
      }

      if (!r.ok || !json || json.status !== "ok") {
        throw new Error(json?.message || `HTTP ${r.status}`);
      }
      setResp(json);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null); setMeta(null); setError(""); setResp(null);
    setMarker("");
    if (inputRef.current) inputRef.current.value = "";
    if (metaRef.current) metaRef.current.value = "";
  }

  /* ---------- render ---------- */
  return (
    <div style={S.page}>
      <div style={S.shell}>
        {/* LEFT PANEL (wider) */}
        <div style={S.leftWrap}>
          <div style={S.card}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Macrophage Latent Space</h3>
            <p style={{ color: "#6b7280", marginTop: 0 }}>
              Projects your dataset onto PCA from a mouse macrophage reference (M1/M0/M2).
              Optionally attach a metadata file; the plot can map size by <code>Day</code> automatically.
            </p>

            <div style={{ display: "grid", gap: 12 }}>
              {/* Mouse TPM preview */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Mouse TPM (preview)</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={togglePreview}
                      disabled={tpmLoading}
                      style={S.ghostBtnSmall}
                      type="button"
                      title={tpmLoaded ? (previewOpen ? "Hide preview" : "Show preview") : "Load preview"}
                    >
                      {tpmLoading ? "Loading…" : (previewOpen ? "Hide" : "Preview")}
                    </button>
                    <a href={`${API_BASE}/mouse-tpm-download`} style={S.ghostBtnSmall}>⬇️ Download file</a>
                  </div>
                </div>

                {previewOpen && (
                  <div style={S.previewBox}>
                    {tpmLoading ? (
                      <div style={{ color: "#374151" }}>Loading…</div>
                    ) : tpmErr ? (
                      <div style={{ color: "#dc2626" }}>{tpmErr}</div>
                    ) : visibleRows.length ? (
                      <div style={S.previewViewport}>
                        <table style={S.previewTable}>
                          <thead>
                            <tr>
                              {visibleCols.map((c) => (
                                <th key={c} style={S.previewTh} title={c}>{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {visibleRows.map((row, i) => (
                              <tr key={i}>
                                {visibleCols.map((c) => (
                                  <td key={c} style={S.previewTd} title={row?.[c] != null ? String(row[c]) : ""}>
                                    {asText(row?.[c])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ color: "#6b7280" }}>(empty)</div>
                    )}
                  </div>
                )}

                <small style={{ color: "#6b7280" }}>
                  Preview:  <code>Curated in-vitro Macrophage Reference </code>.
                </small>
              </div>

              {/* Uploads */}
              <div>
                <label className="form-label">Upload Expression Matrix</label>
                <input
                  ref={inputRef}
                  className="form-control"
                  type="file"
                  accept=".txt,.tsv,.csv,text/plain"
                  onChange={onFile}
                />
                <small style={{ color: "#6b7280" }}>
                  Must include a <code>Gene</code> column and numeric sample columns.
                </small>
              </div>

              <div>
                <label className="form-label">Optional Metadata</label>
                <input
                  ref={metaRef}
                  className="form-control"
                  type="file"
                  accept=".txt,.tsv,.csv,text/plain"
                  onChange={onMeta}
                />
                <small style={{ color: "#6b7280" }}>
                  Include a sample ID column; best overlap is auto-matched. If a <code>Day</code> column exists, point size reflects it.
                  When multiple metadata columns are available, it automatically detects which metadata columns to use for color, shape, and size in the PCA plot. 
                 
                </small>
              </div>

              {/* Marker dropdown */}
              <div>
                <label className="form-label">Marker (optional)</label>
                <select
                  className="form-control"
                  value={marker}
                  onChange={(e) => setMarker(e.target.value)}
                >
                  <option value="">None</option>
                  {markerOpts.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <small style={{ color: "#6b7280" }}>
                  Highlights one gene on the Macrophage Latent Space. Lighter = lower expression; darker = higher expression.
                </small>
              </div>

              <div style={S.btnRow}>
                <button onClick={run} disabled={!canRun} style={S.primaryBtn(canRun)} type="button">
                  {busy ? "Please wait…" : "Run"}
                </button>
                <button onClick={reset} type="button" style={S.ghostBtn}>
                  Clear
                </button>
              </div>

              {error && <div style={{ color: "#dc2626", fontSize: 14 }}>{error}</div>}

              {/* Downloads */}
              {resp && !busy && (
                <div style={S.downloads}>
                  <h4 style={{ margin: 0, fontSize: 16 }}>Downloads</h4>

                  {/* Mouse PCs */}
                  <div style={S.dlGroup}>
                    <p style={S.dlGroupTitle}>Mouse Macrophages (PC1–PC2)</p>
                    <div style={S.dlRow}>
                      <button onClick={() => downloadDataUri(resp.plot9, "mouse_pc_plot.png", "image/png")} style={S.ghostBtn}>Plot (PNG)</button>
                      <button onClick={() => downloadDataUri(resp.plot9_pdf, "mouse_pc_plot.pdf", "application/pdf")} style={S.ghostBtn}>Plot (PDF)</button>
                    </div>
                    <div style={S.dlRow}>
                      <button onClick={() => downloadDataUri(resp.scores9_csv, "mouse_pc_scores.csv", "text/csv")} style={S.ghostBtn}>Scores (CSV)</button>
                    </div>
                  </div>

                  {/* Data PCs */}
                  {resp.plot_rest && (
                    <div style={S.dlGroup}>
                      <p style={S.dlGroupTitle}>Data (PC1–PC2)</p>
                      <div style={S.dlRow}>
                        <button onClick={() => downloadDataUri(resp.plot_rest, "data_pc_plot.png", "image/png")} style={S.ghostBtn}>Plot (PNG)</button>
                        <button onClick={() => downloadDataUri(resp.plot_rest_pdf, "data_pc_plot.pdf", "application/pdf")} style={S.ghostBtn}>Plot (PDF)</button>
                      </div>
                      <div style={S.dlRow}>
                        <button onClick={() => downloadDataUri(resp.scores_rest_csv, "data_pc_scores.csv", "text/csv")} style={S.ghostBtn}>Scores+Meta (CSV)</button>
                      </div>
                      {resp?.notes?.aes_chosen && (
                        <p style={S.muted}>
                          {(() => {
                            const pick = (v) => {
                              const t = typeof v === "string" ? v.trim() : "";
                              return t ? t : "none";
                            };
                            const a = normalizeAes(resp.notes.aes_chosen);
                            return (
                              <>
                                Mapping — size: <code>{pick(a.size)}</code>,{" "}
                                color: <code>{pick(a.color)}</code>,{" "}
                                shape: <code>{pick(a.shape)}</code>.{" "}
                                Matched samples: {Number(resp.notes?.matched) || 0}.
                              </>
                            );
                          })()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={S.right}>
          {busy && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#374151" }}>
              <span className="spinner-border spinner-border-sm" aria-hidden /> Please wait…
            </div>
          )}
          {resp && (
            <div style={S.resultGrid}>
              <div>
                <h4 style={S.sectionTitle}>PC1 vs PC2 (Mouse Macrophages)</h4>
                <div style={S.imgCard}>
                  <img alt="PC1 vs PC2 (mouse)" style={S.img} src={resp.plot9} />
                </div>
              </div>
              {resp.plot_rest && (
                <div>
                  <h4 style={S.sectionTitle}>PC1 vs PC2 (Data)</h4>
                  <div style={S.imgCard}>
                    <img alt="PC1 vs PC2 (data)" style={S.img} src={resp.plot_rest} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===============================
   Styles
   =============================== */
const S = {
  page: { width: "100%" },
  shell: {
    display: "flex",
    flexDirection: "row",
    gap: 24,
    alignItems: "flex-start",
    margin: 0,
    paddingLeft: 0
  },
  leftWrap: { flex: LEFT_COL_FLEX, maxWidth: PREVIEW_MAX_WIDTH, minWidth: 0 },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    padding: 20,
    width: "100%",
    boxSizing: "border-box"
  },
  right: { flex: "1 1 40%", minWidth: 0 },
  resultGrid: { display: "grid", gap: 28 },
  imgCard: { border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", padding: 10 },
  img: { width: "100%", maxHeight: 520, objectFit: "contain", borderRadius: 8, background: "#f8fafc" },
  sectionTitle: { margin: "8px 0", fontSize: 18, fontWeight: 600 },
  muted: { color: "#6b7280", fontSize: 13, marginTop: 6 },
  downloads: { marginTop: 16, paddingTop: 12, borderTop: "1px solid #e5e7eb", display: "grid", gap: 10 },
  dlGroup: { background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, display: "grid", gap: 8 },
  dlGroupTitle: { margin: 0, fontSize: 14, color: "#334155", fontWeight: 700 },
  dlRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  btnRow: { display: "flex", gap: 12 },
  primaryBtn: (enabled) => ({
    background: "#b6d4c1",
    color: "#000",
    padding: "8px 16px",
    borderRadius: 6,
    border: 0,
    cursor: enabled ? "pointer" : "not-allowed",
    fontWeight: 600
  }),
  ghostBtn: { background: "#e5e7eb", padding: "8px 16px", borderRadius: 6, border: 0, fontWeight: 600, cursor: "pointer", color: "#000" },
  ghostBtnSmall: { background: "#e5e7eb", color: "black", padding: "6px 10px", borderRadius: 6, border: 0, fontWeight: 600, cursor: "pointer", fontSize: 13 },
  previewBox: { border: "1px solid #e5e7eb", borderRadius: 8, background: "#f8fafc", padding: 8 },
  previewViewport: {
    width: "100%", maxWidth: "100%", height: PREVIEW_HEIGHT, overflowX: "auto", overflowY: "auto",
    borderRadius: 6, background: "#fff", border: "1px solid #e5e7eb", boxSizing: "border-box"
  },
  previewTable: { width: "100%", tableLayout: "fixed", borderCollapse: "collapse", fontSize: PREVIEW_FONT_SIZE },
  previewTh: {
    position: "sticky", top: 0, background: "#ffffff", zIndex: 1, textAlign: "left",
    padding: "6px 8px", borderBottom: "1px solid #e5e7eb", fontWeight: 700, whiteSpace: "nowrap",
    overflow: "hidden", textOverflow: "ellipsis"
  },
  previewTd: {
    padding: "6px 8px", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap",
    overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140
  }
};
