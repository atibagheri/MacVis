import React, { useMemo, useRef, useState } from "react";

const BACKEND_ORIGIN = process.env.REACT_APP_BACKEND_ORIGIN || "http://localhost:5050";
const API_URL = `${BACKEND_ORIGIN}/api/venn-upset`;

export default function VennDiagram() {
  // ---- state ----
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // results
  const [pngB64, setPngB64] = useState(null);
  const [pdfObjUrl, setPdfObjUrl] = useState(null);

  const inputRef = useRef(null);

  const canRun = useMemo(() => files.length >= 2 && files.length <= 7 && !loading, [files, loading]);

  // ---- handlers ----
  const onFilesChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
    setPngB64(null);
    setPdfObjUrl(null);
    setError("");
  };

  const clearAll = () => {
    setFiles([]);
    setPngB64(null);
    if (pdfObjUrl) URL.revokeObjectURL(pdfObjUrl);
    setPdfObjUrl(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  async function run() {
    if (!canRun) {
      setError("Please select 2–7 TXT files (one gene ID per line).");
      return;
    }
    setLoading(true);
    setError("");
    setPngB64(null);
    if (pdfObjUrl) { URL.revokeObjectURL(pdfObjUrl); setPdfObjUrl(null); }

    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));

      const res = await fetch(API_URL, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);
      const data = await res.json();

      // PNG (base64)
      if (data.png) {
        setPngB64(data.png);
      } else {
        setPngB64(null);
      }

      // PDF (base64 -> blob URL)
      if (data.pdf) {
        const bytes = atob(data.pdf);
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        const pdfBlob = new Blob([arr], { type: "application/pdf" });
        const url = URL.createObjectURL(pdfBlob);
        setPdfObjUrl(url);
      } else {
        setPdfObjUrl(null);
      }

      if (!data.png && !data.pdf) {
        setError("No plot returned from server. Check inputs or backend logs.");
      }
    } catch (e) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // ---- styles to match Circos/Text Mining ----
  const S = {
    page: { width: "100%", padding: "24px 12px" },
    shell: { display: "flex", gap: 20, alignItems: "flex-start" },

    leftWrap: { flex: "0 0 45%", maxWidth: "45%" },
    card: {
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 1,
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      padding: 20,
      position: "relative",
    },

    rightWrap: { flex: "0 0 55%", maxWidth: "55%" }, // same width as left
    resultCard: {
      background: "white",
      border: "none",
      borderRadius: 0,
      padding: 0,
    },

    sectionTitle: { margin: "4px 0 12px", fontSize: 18, fontWeight: 600 },
    sub: { color: "#6b7280", marginTop: 0 },

    grid: { display: "grid", gap: 12 },
    row: { display: "flex", gap: 8 },

    btnPrimary: (enabled) => ({
      background: enabled ? "#86efac" : "#b6d4c1",
      color: "#000",
      padding: "8px 16px",
      borderRadius: 6,
      border: 0,
      cursor: enabled ? "pointer" : "not-allowed",
      fontWeight: 600,
    }),
    btnGhost: {
      background: "#fff",                // was gray
      color: "#000",                     // black text
      padding: "8px 16px",
      borderRadius: 6,
      border: "1px solid #d1d5db",       // subtle border so it’s still a "box"
      fontWeight: 600,
      cursor: "pointer",
    },

    // downloads block under Run/Clear (left panel)
    downloads: {
      marginTop: 16,
      paddingTop: 12,
      borderTop: "1px solid #e5e7eb",
      display: "grid",
      gap: 10,
    },
    dlGroup: {
      background: "#f8fafc",
      border: "1px solidrgb(50, 51, 53)",
      borderRadius: 10,
      padding: 12,
      display: "grid",
      gap: 8,
    },
    dlGroupTitle: { margin: 0, fontSize: 14, color: "#334155", fontWeight: 700 },
    dlRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },

    // result image
    preview: {
      border: "1px dashed #d1d5db",
      borderRadius: 6,
      minHeight: 360,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      background: "#fafafa",
    },
    img: {
      width: "100%",          // match the container width
      maxWidth: "800px",      // same as left box width
      borderRadius: 0,
      border: "none",
      height: "auto",         // let height adjust automatically
      objectFit: "contain",
    },

    list: { marginTop: 10, color: "#374151", paddingLeft: 16 },
    filePill: {
      background: "transparent",
      border: "1px solid #e5e7eb",
      borderRadius: 6,
      padding: "6px 8px",
      fontSize: 13,
    },

    err: { color: "#dc2626", fontSize: 14, marginTop: 10 },
    overlay: {
      position: "absolute", inset: 0, background: "rgba(255,255,255,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
    },

    dlBtn: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "10px 12px",
      borderRadius: 8,
      border: "1px solid #e5e7eb",
      background: "#fff",
      color: "#111827",
      fontSize: 14,
      fontWeight: 600,
      textDecoration: "none",
      cursor: "pointer",
      width: "100%",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    },
  };

  return (
    <div style={S.page}>
      <div style={S.shell}>
        {/* LEFT: Upload & controls + Downloads */}
        <div style={S.leftWrap}>
          <div style={S.card}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Venn / UpSet Plot</h3>
            <p style={S.sub}>
              Upload <strong>gene list </strong> TXT files containing gene IDs (one per line). We’ll compute overlaps
              and render a Venn or UpSet plot depending on set count.
            </p>

            <div style={S.grid}>
              <div>
                <label className="form-label">Upload files (2–7)</label>
                <input
                  ref={inputRef}
                  className="form-control"
                  type="file"
                  accept=".txt,text/plain"
                  multiple
                  onChange={onFilesChange}
                />
                {files.length > 0 && (
                  <ul style={S.list}>
                    {files.map((f, i) => (
                      <li key={i} style={S.filePill}>{f.name}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={S.row}>
                <button onClick={run} disabled={!canRun} style={S.btnPrimary(canRun)} type="button">
                  {loading ? "Please wait…" : "Generate Plot"}
                </button>
                <button onClick={clearAll} disabled={loading} style={S.btnGhost} type="button">
                  Clear
                </button>
              </div>

              {error && <div style={S.err}>{error}</div>}

              {/* Downloads under the run box */}
              {pngB64 && !loading && (
                <div style={S.downloads}>
                  <h4 style={{ margin: 0, fontSize: 16 }}>Downloads</h4>

                  <div style={S.dlGroup}>
                    <p style={S.dlGroupTitle}>Plot</p>
                    <div style={S.dlRow}>
                      <a
                        style={S.dlBtn}
                        href={`data:image/png;base64,${pngB64}`}
                        download="venn_upset_plot.png"
                      >
                        Plot PNG
                      </a>
                      {pdfObjUrl ? (
                        <a
                          style={S.dlBtn}
                          href={pdfObjUrl}
                          download="venn_upset_plot.pdf"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Plot PDF
                        </a>
                      ) : (
                        <button style={{ ...S.dlBtn, opacity: 0.6, cursor: "not-allowed" }} disabled>
                          Plot PDF (not available)
                        </button>
                      )}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {loading && (
              <div style={S.overlay}>
                <div className="spinner-border" style={{ width: 36, height: 36 }} />
                <span style={{ marginLeft: 10 }}>Running…</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Result image only (same width as left) */}
        <div style={S.rightWrap}>
          {(pngB64 !== null) && (
            <div style={S.resultCard}>
              <h5 style={S.sectionTitle}>Result</h5>
              <div style={S.preview}>
                {pngB64 ? (
                  <img
                    src={`data:image/png;base64,${pngB64}`}
                    alt="Venn/UpSet Plot"
                    style={S.img}
                  />
                ) : (
                  <span style={{ color: "#9ca3af" }}>No preview image provided</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
