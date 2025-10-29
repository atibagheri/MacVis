import React, { useState, useEffect } from "react";
import axios from "axios";

export default function KEGGApp() {
  const [mode, setMode] = useState("genelist");        // "genelist" | "genelist_fc"
  const [species, setSpecies] = useState("mouse");     // "mouse" | "human"
  const [file, setFile] = useState(null);

  const [result, setResult] = useState(null);          // plumber response
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [selectedMapType, setSelectedMapType] = useState("base"); // "base" | "fc"
  const [selectedMap, setSelectedMap] = useState("");

  // -------- util: download a base64 blob (ZIP etc.)
  const downloadBase64 = async (base64, filename, mime = "application/octet-stream") => {
    try {
      const res = await fetch(`data:${mime};base64,${base64}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "results.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setMsg("❌ Download failed.");
    }
  };

  // -------- file validation (lightweight; keeps your style)
  const handleFileChange = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target.result || "").trim();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length === 0) {
        setMsg("❌ File is empty!");
        e.target.value = null;
        return;
      }

      // very light check (first line)
      const firstLine = lines[0];
      const cols = firstLine.split(/\t|,/);

      if (mode === "genelist" && cols.length > 1) {
        setMsg("❌ Selected 'Gene List Only' but file has multiple columns.");
        e.target.value = null;
        return;
      }
      if (mode === "genelist_fc" && cols.length === 1) {
        setMsg("❌ Selected 'Gene List + Fold Change' but file has only one column.");
        e.target.value = null;
        return;
      }

      setMsg("");
      setFile(uploadedFile);
    };
    reader.readAsText(uploadedFile);
  };

  // -------- run analysis (calls your Flask → plumber)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMsg("Please select a valid file first.");
      return;
    }

    const formData = new FormData();
    formData.append("mode", mode);
    formData.append("species", species);
    formData.append("file", file);

    try {
      setLoading(true);
      setResult(null);
      setSelectedMap("");
      setMsg("");

      const res = await axios.post("/api/keggmap", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res?.data?.success) {
        setResult(res.data);

        // auto-download the ZIP returned by plumber as base64
        if (res.data.zip_base64) {
          downloadBase64(
            res.data.zip_base64,
            res.data.zip_filename || "kegg_results.zip",
            "application/zip"
          );
        }
      } else {
        setMsg(res?.data?.error || "Unknown error from server.");
      }
    } catch (err) {
      setMsg("Server error: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // -------- keys: use EXACTLY what the backend returns (no regex filtering)
  const baseMapKeys = Object.keys(result?.maps || {});
  const fcMapKeys   = Object.keys(result?.foldchange_maps || {});

  // which list to show
  let mapsToShow = [];
  if (result) {
    if (mode === "genelist") {
      mapsToShow = baseMapKeys;
    } else {
      mapsToShow = selectedMapType === "base" ? baseMapKeys : fcMapKeys;
    }
  }

  // auto-select first map whenever result or map-type changes
  useEffect(() => {
    if (!result) return;
    if (mapsToShow.length === 0) {
      setSelectedMap("");
      return;
    }
    if (!mapsToShow.includes(selectedMap)) {
      setSelectedMap(mapsToShow[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, selectedMapType]);

  const selectedImgBase64 =
    mode === "genelist_fc" && selectedMapType === "fc"
      ? (result?.foldchange_maps?.[selectedMap] || "")
      : (result?.maps?.[selectedMap] || "");

  // -------- styles (your look-and-feel)
  const S = {
    page: { padding: "24px 12px" },
    shell: { display: "flex", gap: 20, alignItems: "flex-start" },
    leftWrap: { flex: "0 0 45%", maxWidth: "45%" },
    rightWrap: { flex: 1, maxWidth: "45%" },

    card: {
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      padding: 20,
      position: "relative",
    },
    sub: { color: "#6b7280", marginTop: 0 },

    table: { width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 8 },
    th: { border: "1px solid #d1d5db", padding: 8, textAlign: "left", fontWeight: 700 },
    td: { border: "1px solid #e5e7eb", padding: 8, verticalAlign: "top" },

    dropBox: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      border: "1px solid #dbeafe",
      background: "#eff6ff",
      padding: "3px 6px",
      borderRadius: 8,
      marginTop: 5,
      gap: 12,
    },
    dropLabel: { fontWeight: 700 },
    select: {
      border: "1px solid #c7d2fe",
      backgroundColor: "#fff",
      borderRadius: 8,
      padding: "8px 28px 8px 10px",
      fontWeight: 600,
      cursor: "pointer",
      appearance: "none",
      WebkitAppearance: "none",
      MozAppearance: "none",
      backgroundImage:
        "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 20 20%22 fill=%22%23111%22><path d=%22M5.5 7.5l4.5 4.5 4.5-4.5%22/></svg>')",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 8px center",
      backgroundSize: "12px 12px",
    },

    dashedPreview: {
      border: "1px dashed #d1d5db",
      borderRadius: 6,
      minHeight: 360,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      background: "#fafafa",
    },
    img: { width: "100%", maxWidth: 700, height: "auto", display: "block" },

    btnRow: { display: "flex", gap: 8, marginTop: 10 },
    btnPrimary: {
      background: "#b6d4c1",
      color: "#000",
      padding: "2px 8px",
      borderRadius: 8,
      border: 0,
      cursor: "pointer",
      fontWeight: 700,
      width: 200,
    },
    btnSecondary: {
      background: "#e5e7eb",
      color: "#111827",
      padding: "10px 16px",
      borderRadius: 8,
      border: 0,
      cursor: "pointer",
      fontWeight: 700,
    },

    downloadsRow: { marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" },
    dlBtn: {
      border: "2px solidrgb(158, 165, 141)",    // slightly bolder border
      color: "#1d4ed8",
      background: "#fff",
      padding: "15px 30px",           // ⬅ bigger
      borderRadius: 10,
      textDecoration: "none",
      fontWeight: 700,
      fontSize: 16,                   // ⬅ bigger text
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap",
      minWidth: 260,                  // ⬅ wider box
      height: 48,                     // ⬅ taller box
      lineHeight: 1.2
    
    },

    hint: { color: "#6b7280", fontSize: 12, marginTop: 6 },
    msg: { marginTop: 12 },
  };

  return (
    <div style={S.page}>
      <div style={S.shell}>
        {/* LEFT PANEL */}
        <div style={S.leftWrap}>
          <div style={S.card}>
            <h2 style={{ marginTop: 0 }}>🧬 KEGG Analysis Modes</h2>
            <p style={S.sub}>Choose how you want to run your analysis:</p>
            <ul style={{ marginTop: 0 }}>
              <li><strong>Gene List Only:</strong> supply gene symbols or Entrez IDs.</li>
              <li><strong>Gene List + Fold Change:</strong> supply gene symbols with fold change values.</li>
            </ul>

            <table style={S.table}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th style={S.th}>Feature</th>
                  <th style={S.th}>Gene List Only</th>
                  <th style={S.th}>Gene List + Fold Change</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={S.td}><strong>Input</strong></td>
                  <td style={S.td}>Gene symbols or Entrez IDs</td>
                  <td style={S.td}>Gene symbols + fold change</td>
                </tr>
                <tr>
                  <td style={S.td}><strong>Purpose</strong></td>
                  <td style={S.td}>Find enriched pathways</td>
                  <td style={S.td}>Find &amp; visualize regulated pathways</td>
                </tr>
                <tr>
                  <td style={S.td}><strong>Output</strong></td>
                  <td style={S.td}>Bar plot + KEGG maps</td>
                  <td style={S.td}>Bar plot + base &amp; FC maps</td>
                </tr>
                <tr>
                  <td style={S.td}><strong>KEGG Map</strong></td>
                  <td style={S.td}>Highlights genes</td>
                  <td style={S.td}>Highlights + color by regulation</td>
                </tr>
              </tbody>
            </table>

            <div style={S.dropBox}>
              <span style={S.dropLabel}>Mode</span>
              <select value={mode} onChange={(e) => setMode(e.target.value)} style={S.select}>
                <option value="genelist">Gene List Only</option>
                <option value="genelist_fc">Gene List + Fold Change</option>
              </select>
            </div>

            <div style={S.dropBox}>
              <span style={S.dropLabel}>Species</span>
              <select value={species} onChange={(e) => setSpecies(e.target.value)} style={S.select}>
                <option value="mouse">Mouse</option>
                <option value="human">Human</option>
              </select>
            </div>

            <div style={{ marginTop: 10 }}>
              <input type="file" onChange={handleFileChange} />
            </div>

            <div style={S.btnRow}>
              <button onClick={handleSubmit} disabled={loading} style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }}>
                {loading ? "⏳ Please Wait…" : "▶️ Run KEGG Analysis"}
              </button>
              <button
                onClick={() => {
                  setMode("genelist");
                  setSpecies("mouse");
                  setFile(null);
                  setResult(null);
                  setSelectedMapType("base");
                  setSelectedMap("");
                  setMsg("");
                }}
                disabled={loading}
                style={S.btnSecondary}
              >
                Clear
              </button>
            </div>

            {msg && <div className="alert alert-warning" style={S.msg}>{msg}</div>}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={S.rightWrap}>
          {(result || loading) && (
            <div style={S.card}>
              <h5 style={{ margin: "4px 0 12px" }}>Results</h5>

              {/* Barplot */}
              <div style={S.dashedPreview}>
                {result?.barplot_base64 ? (
                  <img src={`data:image/png;base64,${result.barplot_base64}`} alt="KEGG Barplot" style={S.img} />
                ) : (
                  <span style={{ color: "#9ca3af" }}>
                    {loading ? "Running…" : "Barplot will appear here after running."}
                  </span>
                )}
              </div>

              {/* Map type toggle (only for gene+fc) */}
              {mode === "genelist_fc" && result && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <strong>Map Type:</strong>
                    <label>
                      <input
                        type="radio"
                        checked={selectedMapType === "base"}
                        onChange={() => { setSelectedMapType("base"); setSelectedMap(""); }}
                      /> Base Pathway Maps
                    </label>
                    <label>
                      <input
                        type="radio"
                        checked={selectedMapType === "fc"}
                        onChange={() => { setSelectedMapType("fc"); setSelectedMap(""); }}
                      /> Fold-Change Maps
                    </label>
                  </div>

                  <div style={{ marginTop: 6, ...S.hint }}>
                    Base maps: {baseMapKeys.length} • FC maps: {fcMapKeys.length}
                  </div>
                </div>
              )}

              {/* Map selector */}
              {result && mapsToShow.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontWeight: 700, marginBottom: 6, display: "block" }}>
                    Select Pathway
                  </label>
                  <select
                    style={{ ...S.select, width: "100%", backgroundPosition: "right 10px center" }}
                    value={selectedMap}
                    onChange={(e) => setSelectedMap(e.target.value)}
                  >
                    {mapsToShow.map((k) => (
                      <option key={k} value={k}>
                        {k.split("/").pop()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Selected map preview */}
              {selectedMap && (
                <div style={{ ...S.dashedPreview, marginTop: 12 }}>
                  {selectedImgBase64 ? (
                    <img src={`data:image/png;base64,${selectedImgBase64}`} alt={selectedMap} style={S.img} />
                  ) : (
                    <span style={{ color: "#9ca3af" }}>No image data for the selected map.</span>
                  )}
                </div>
              )}

              {/* Downloads */}
              <div style={S.downloadsRow}>
                {result?.zip_base64 && (
                  <button
                    type="button"
                    style={S.dlBtn}
                    onClick={() => downloadBase64(result.zip_base64, result.zip_filename || "kegg_results.zip", "application/zip")}
                  >
                    ⬇️ Download All Results (ZIP)
                  </button>
                )}
              </div>

              {result?.zip_base64 && (
                <div style={S.hint}>
                  Barplot, CSVs, and all maps are included inside the ZIP.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
