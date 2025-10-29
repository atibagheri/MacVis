import React, { useState, useEffect } from "react";
import axios from "axios";


export default function GOMapApp() {
  const [mode, setMode] = useState("genelist");     // "genelist" | "genelist_fc"
  const [species, setSpecies] = useState("mouse");  // "mouse" | "human"
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (result?.zip_base64) {
      // auto download the full results ZIP
      downloadBase64(
        result.zip_base64,
        result.zip_filename || "gomap_results.zip",
        "application/zip"
      );
    }
  }, [result]); // runs right after a successful response



  // --------- helper: base64 -> file download ----------
  const downloadBase64 = async (base64, filename, mime = "application/octet-stream") => {
    try {
      const res = await fetch(`data:${mime};base64,${base64}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed:", e);
      setMsg("❌ Download failed.");
    }
  };


  // Validate the uploaded file against selected mode
  const handleFileChange = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target.result || "").trim();
      const lines = text.split(/\r?\n/).filter(Boolean);

      if (lines.length === 0) {
        setMsg("❌ File is empty."); e.target.value = null; return;
      }

      const firstLine = lines[0];
      const columns = firstLine.split(/\t|,/);

      if (mode === "genelist" && columns.length > 1) {
        setMsg("❌ Selected 'Gene List Only' but file has multiple columns (fold change detected).");
        e.target.value = null; return;
      }
      if (mode === "genelist_fc" && columns.length === 1) {
        setMsg("❌ Selected 'Gene List + Fold Change' but file has only one column.");
        e.target.value = null; return;
      }

      setMsg("");
      setFile(uploadedFile);
    };
    reader.readAsText(uploadedFile);
  };

  const clearAll = () => {
    setMode("genelist");
    setSpecies("mouse");
    setFile(null);
    setResult(null);
    setMsg("");
    const inp = document.querySelector("#gomap-file");
    if (inp) inp.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMsg("❌ Please upload a valid file first!");
      return;
    }

    const formData = new FormData();
    formData.append("mode", mode);
    formData.append("species", species);
    formData.append("file", file);

    try {
      setLoading(true);
      setResult(null);
      setMsg("");

      const res = await axios.post("/api/gomap", formData);
      if (res?.data) {
        setResult(res.data);
        console.log("GOMap result keys:", Object.keys(res.data));
        console.log("zip_base64 length:", res.data.zip_base64?.length || 0);

      } else {
        setMsg("No data returned from server.");
      }
    } catch (err) {
      setMsg("Server error: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // ---------- styles (matching your original) ----------
  const S = {
    page: { padding: "24px 12px" },
    shell: { display: "flex", gap: "20px", alignItems: "flex-start" },

    leftWrap: { flex: "0 0 45%", maxWidth: "45%" },
    rightWrap: { flex: "1", maxWidth: "45%" },

    card: {
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      padding: 20,
      position: "relative",
    },
    sub: { color: "#6b7280", marginTop: 0 },

    grid: { display: "grid", gap: 12 },
    row: { display: "flex", gap: 8 },

    table: { width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 8 },
    th: { border: "1px solid #d1d5db", padding: 8, textAlign: "left", fontWeight: 700 },
    td: { border: "1px solid #e5e7eb", padding: 8, verticalAlign: "top" },

    label: { display: "block", marginBottom: 4, fontWeight: 600 },
    labelWithArrow: { display: "block", marginBottom: 4, fontWeight: 600, userSelect: "none" },
    hint: { color: "#6b7280", fontSize: 12, marginTop: 2 },
    control: { width: "100%" },

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

    btnRow: { display: "flex", gap: 8, flexWrap: "nowrap" },
    btnPrimary: {
      background: "#b6d4c1",
      color: "#000",
      padding: "12px 24px",          
      borderRadius: 8,
      border: 0,
      cursor: "pointer",
      whiteSpace: "nowrap",
      fontSize: 16,                   
      fontWeight: 700,
      minWidth: 180,                  // ⬅ wider box
      height: 48,                     // ⬅ taller box
      lineHeight: 1.2
    },
    btnSecondary: {
      background: "#e5e7eb",
      color: "#000",
      padding: "8px 16px",
      borderRadius: 6,
      border: 0,
      cursor: "pointer"
    },

    downloadsRow: { marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", overflowX: "auto" },
    dlBtn: {
      border: "2px solidrgb(158, 165, 141)",    // slightly bolder border
      color: "#1d4ed8",
      background: "#fff",
      padding: "12px 20px",           // ⬅ bigger
      borderRadius: 10,
      textDecoration: "none",
      fontWeight: 700,
      fontSize: 16,                   // ⬅ bigger text
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap",
      minWidth: 220,                  // ⬅ wider box
      height: 48,                     // ⬅ taller box
      lineHeight: 1.2
    },

    msg: { marginTop: 12 },
  };

  return (
    <div style={S.page}>
      <div style={S.shell}>
        {/* LEFT PANEL: Form (white card) */}
        <div style={S.leftWrap}>
          <div style={S.card}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>🧬 GO Enrichment</h3>
            <p style={S.sub}>
              Upload a gene list (or list with fold change), pick mode & species. We’ll compute GO enrichment and
              return plots plus downloadable results.
            </p>

            {/* FULL comparison table (restored text) */}
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
                  <td style={S.td}><strong>Input format</strong></td>
                  <td style={S.td}>A simple list of gene symbols or IDs (one per line).</td>
                  <td style={S.td}>A table with gene symbols and a <code>log2FC</code> column.</td>
                </tr>
                <tr>
                  <td style={S.td}><strong>What it finds</strong></td>
                  <td style={S.td}>Displaye most significant or selected enriched terms</td>
                  <td style={S.td}>Reveal which genes are involved in those significant terms.</td>
                </tr>
                <tr>
                  <td style={S.td}><strong>Visual outputs</strong></td>
                  <td style={S.td}>
                    ✅ Barplot of top enriched GO terms.<br />❌ No network plot.
                  </td>
                  <td style={S.td}>
                    ✅ Barplot <br />✅ <b>Cnetplot</b> network diagram, showing genes linked to GO terms, colored by fold change.
                  </td>
                </tr>
              </tbody>
            </table>

            <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
              <div style={S.grid}>
                <div className="row" style={S.row}>
                  <div style={{ flex: 1 }}>
                    <label style={S.labelWithArrow}>Mode ▼</label>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                      className="form-control"
                      style={S.control}
                    >
                      <option value="genelist">Gene List Only</option>
                      <option value="genelist_fc">Gene List + Fold Change</option>
                    </select>
                    <div style={S.hint}>Choose analysis mode (dropdown).</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={S.labelWithArrow}>Species ▼</label>
                    <select
                      value={species}
                      onChange={(e) => setSpecies(e.target.value)}
                      className="form-control"
                      style={S.control}
                    >
                      <option value="mouse">Mouse</option>
                      <option value="human">Human</option>
                    </select>
                    <div style={S.hint}>Pick the organism (dropdown).</div>
                  </div>
                </div>

                <div>
                  <label style={S.label}>Input file</label>
                  <input
                    id="gomap-file"
                    type="file"
                    onChange={handleFileChange}
                    className="form-control"
                    style={S.control}
                    accept=".txt,.csv,.tsv,text/plain"
                  />
                </div>

                <div style={S.btnRow}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }}
                  >
                    {loading ? "Please wait…" : "Run GO Analysis"}
                  </button>
                  <button type="button" onClick={clearAll} disabled={loading} style={S.btnSecondary}>
                    Clear
                  </button>
                </div>

                {msg && (
                  <div className="alert alert-warning" style={S.msg}>
                    {msg}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: Results (white card, dashed preview like Circos) */}
        <div style={S.rightWrap}>
          {(result || loading) && (
            <div style={S.card}>
              <h5 style={{ margin: "4px 0 12px" }}>Results</h5>

              {/* Barplot preview */}
              <div style={S.dashedPreview}>
                {result?.barplot_base64 ? (
                  <img
                    src={`data:image/png;base64,${result.barplot_base64}`}
                    alt="GO Barplot"
                    style={S.img}
                  />
                ) : (
                  <span style={{ color: "#9ca3af" }}>
                    {loading ? "Running…" : "Barplot will appear here after running."}
                  </span>
                )}
              </div>

              {/* Cnetplot preview (only for genelist_fc) */}
              {result?.cnetplot_base64 && mode === "genelist_fc" && (
                <div style={{ ...S.dashedPreview, marginTop: 12 }}>
                  <img
                    src={`data:image/png;base64,${result.cnetplot_base64}`}
                    alt="GO Cnetplot"
                    style={S.img}
                  />
                </div>
              )}

              {/* Downloads (buttons styled like your Circos links) */}
              <div style={S.downloadsRow}>

                {result?.zip_base64 && (
                  <button
                    type="button"
                    style={S.dlBtn}
                    onClick={() =>
                      downloadBase64(
                        result.zip_base64,
                        result.zip_filename || "gomap_results.zip",
                        "application/zip"
                      )
                    }
                  >
                    ⬇️ Download Results (ZIP)
                  </button>
                )}
              </div>

              {/* Tiny hint if CSV not separately provided */}
              {result && !result.csv_base64 && result.zip_base64 && (
                <div style={{ ...S.hint, marginTop: 6 }}>
                  CSV is included inside the ZIP.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
