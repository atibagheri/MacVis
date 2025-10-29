import React, { useMemo, useRef, useState } from "react";

const BASE_URL = process.env.REACT_APP_API_BASE || "/api";

/* ---------- styles (shared with Circos look) ---------- */
const S = {
  page: { width: "100%" },
  shell: {
    display: "flex",
    flexDirection: "row",
    gap: 24,
    alignItems: "flex-start",
    margin: 0,
    paddingLeft: 0,
  },
  leftWrap: { flex: "0 0 45%", maxWidth: "45%" },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    padding: 20,
    position: "relative",
  },
  right: { flex: "1 1 55%", minWidth: 0 },
  resultGrid: { display: "grid", gap: 28 },
  imgCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    background: "#fff",
    padding: 10,
  },
  img: {
    width: "100%",
    maxHeight: 420,
    objectFit: "contain",
    borderRadius: 8,
    background: "#f8fafc",
  },
  sectionTitle: { margin: "8px 0", fontSize: 18, fontWeight: 600 },
  muted: { color: "#6b7280", fontSize: 13, marginTop: 6 },

  // downloads block under Run/Clear (left side)
  downloads: {
    marginTop: 16,
    paddingTop: 12,
    borderTop: "1px solid #e5e7eb",
    display: "grid",
    gap: 10,
  },
  dlGroup: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 12,
    display: "grid",
    gap: 8,
  },
  dlGroupTitle: { margin: 0, fontSize: 14, color: "#334155", fontWeight: 700 },
  dlRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  btnRow: { display: "flex", gap: 12 },
  primaryBtn: (enabled) => ({
    background: "#b6d4c1",
    color: "#000",
    padding: "8px 16px",
    borderRadius: 6,
    border: 0,
    cursor: enabled ? "pointer" : "not-allowed",
    fontWeight: 600,
  }),
  ghostBtn: {
    background: "#e5e7eb",
    color: "#000",
    padding: "8px 16px",
    borderRadius: 6,
    border: 0,
    fontWeight: 600,
    cursor: "pointer",
  },
};

export default function TextMining() {
  const [inputMethod, setInputMethod] = useState("upload");
  const [file, setFile] = useState(null);
  const [genesText, setGenesText] = useState("");
  const [mode, setMode] = useState("gene_only");
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const inputRef = useRef(null);

  const haveInput =
    (inputMethod === "upload" && !!file) ||
    (inputMethod === "paste" && genesText.trim().length > 0);

  const canRun = useMemo(() => haveInput && !busy, [haveInput, busy]);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setError("");
  };

  async function run() {
    if (!haveInput) {
      setError(
        inputMethod === "upload"
          ? "Please choose a text file with one gene per line."
          : "Please paste genes (one per line)."
      );
      return;
    }

    setBusy(true);
    setError("");
    setResult(null);

    try {
      const fd = new FormData();

      if (inputMethod === "paste") {
        const cleaned = normalizePastedGenes(genesText);
        const blob = new Blob([cleaned], { type: "text/plain" });
        const fauxFile = new File([blob], "genes_pasted.txt", { type: "text/plain" });
        fd.append("genes", fauxFile);
      } else {
        fd.append("genes", file);
      }

      fd.append("mode", mode);
      if (mode === "gene_term") fd.append("term", term || "");

      const res = await fetch(`${BASE_URL}/api/textmining`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      if (!json?.success) throw new Error(json?.error || "Unknown error");
      setResult(json);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setInputMethod("upload");
    setFile(null);
    setGenesText("");
    setMode("gene_only");
    setTerm("");
    setError("");
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div style={S.page}>
      <div style={S.shell}>
        {/* LEFT PANEL: Form + Downloads */}
        <div style={S.leftWrap}>
          <div style={S.card}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>PubMed Cloud </h3>
            <p style={{ color: "#6b7280", marginTop: 0 }}>
              Upload a gene list <em>or</em> paste genes. Optionally add a term. We’ll fetch PubMed hit counts,
              build a barplot &amp; word cloud, and return CSVs + paper summaries.
            </p>

            <div style={{ display: "grid", gap: 12 }}>
              {/* Input method switch */}
              <div>
                <label className="form-label" style={{ display: "block", marginBottom: 6 }}>
                  Input method
                </label>
                <label style={{ fontSize: 14, marginRight: 16 }}>
                  <input
                    type="radio"
                    name="inputMethod"
                    value="upload"
                    checked={inputMethod === "upload"}
                    onChange={() => setInputMethod("upload")}
                    style={{ marginRight: 6 }}
                  />
                  Upload file
                </label>
                <label style={{ fontSize: 14 }}>
                  <input
                    type="radio"
                    name="inputMethod"
                    value="paste"
                    checked={inputMethod === "paste"}
                    onChange={() => setInputMethod("paste")}
                    style={{ marginRight: 6 }}
                  />
                  Paste genes
                </label>
              </div>

              {/* Upload */}
              {inputMethod === "upload" && (
                <div>
                  {/* <label className="form-label">Choose file</label> */}
                  <input
                    ref={inputRef}
                    className="form-control"
                    type="file"
                    accept=".txt,.tsv,.csv,text/plain"
                    onChange={onFile}
                  />
                  <small style={{ color: "#6b7280" }}>
                    Expected: one gene per line. Headers are ignored.
                  </small>
                </div>
              )}

              {/* Paste genes */}
              {inputMethod === "paste" && (
                <div>
                  <label className="form-label">Paste genes (one per line)</label>
                  <textarea
                    value={genesText}
                    onChange={(e) => setGenesText(e.target.value)}
                    rows={8}
                    placeholder={`TP53\nEGFR\nTNF\n...`}
                    className="form-control"
                    style={{
                      width: "100%",
                      borderRadius: 6,
                      border: "1px solid #e5e7eb",
                      padding: 8,
                      fontFamily: "monospace",
                    }}
                  />
                  <small style={{ color: "#6b7280" }}>
                    Empty lines and commas will be cleaned automatically.
                  </small>
                </div>
              )}

              {/* Mode */}
              <div>
                <label className="form-label" style={{ display: "block", marginBottom: 6 }}>
                  Mode
                </label>
                <label style={{ fontSize: 14, marginRight: 16 }}>
                  <input
                    type="radio"
                    name="mode"
                    value="gene_only"
                    checked={mode === "gene_only"}
                    onChange={() => setMode("gene_only")}
                    style={{ marginRight: 6 }}
                  />
                  Gene only
                </label>
                <label style={{ fontSize: 14 }}>
                  <input
                    type="radio"
                    name="mode"
                    value="gene_term"
                    checked={mode === "gene_term"}
                    onChange={() => setMode("gene_term")}
                    style={{ marginRight: 6 }}
                  />
                  Gene AND term
                </label>
              </div>

              {/* Term input */}
              {mode === "gene_term" && (
                <div>
                  <label className="form-label">Term</label>
                  <input
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="e.g. macrophage polarization"
                    className="form-control"
                    type="text"
                  />
                </div>
              )}

              {/* Actions */}
              <div style={S.btnRow}>
                <button onClick={run} disabled={!canRun} style={S.primaryBtn(canRun)} type="button">
                  {busy ? "Run…" : "Run"}
                </button>
                <button onClick={reset} type="button" style={S.ghostBtn}>
                  Clear
                </button>
              </div>

              {error && <div style={{ color: "#dc2626", fontSize: 14 }}>{error}</div>}

              {/* Downloads appear after result is ready */}
              {result && !busy && (
                <div style={S.downloads}>
                  <h4 style={{ margin: 0, fontSize: 16 }}>Downloads</h4>

                  {/* Barplot group */}
                  <div style={S.dlGroup}>
                    <p style={S.dlGroupTitle}>Bar Plot</p>
                    <div style={S.dlRow}>
                      <DL
                        label="Barplot PNG"
                        url={result?.downloads?.barplot_png}
                        fallbackB64={result.barplot_png_base64}
                        filename="pubmed_barplot.png"
                        mime="image/png"
                      />
                      <DL
                        label="Barplot PDF"
                        url={result?.downloads?.barplot_pdf}
                        fallbackB64={result.barplot_pdf_base64}
                        filename="pubmed_barplot.pdf"
                        mime="application/pdf"
                      />
                    </div>
                    <div style={S.muted}>Top 20 genes by PubMed hits</div>
                  </div>

                  {/* Word cloud group */}
                  <div style={S.dlGroup}>
                    <p style={S.dlGroupTitle}>Word Cloud</p>
                    <div style={S.dlRow}>
                      <DL
                        label="Wordcloud PNG"
                        url={result?.downloads?.wordcloud_png}
                        fallbackB64={result.wordcloud_png_base64}
                        filename="pubmed_wordcloud.png"
                        mime="image/png"
                      />
                      <DL
                        label="Wordcloud PDF"
                        url={result?.downloads?.wordcloud_pdf}
                        fallbackB64={result.wordcloud_pdf_base64}
                        filename="pubmed_wordcloud.pdf"
                        mime="application/pdf"
                      />
                    </div>
                    <div style={S.muted}>All genes included</div>
                  </div>

                  {/* Data group */}
                  <div style={S.dlGroup}>
                    <p style={S.dlGroupTitle}>Data</p>
                    <div style={S.dlRow}>
                      <DL
                        label="Hit Counts CSV"
                        url={result?.downloads?.hitcount_csv}
                        fallbackB64={result.hitcount_csv_base64}
                        filename="pubmed_hit_counts.csv"
                        mime="text/csv"
                      />
                      <DL
                        label="Summaries CSV"
                        url={result?.downloads?.summary_csv}
                        fallbackB64={result.summary_csv_base64}
                        filename="pubmed_summaries.csv"
                        mime="text/csv"
                      />
                    </div>
                    <div style={S.muted}>CSVs include all genes and per‑gene article summaries</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Plots only */}
        <div style={S.right}>
          {busy && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#374151" }}>
              <span className="spinner-border spinner-border-sm" aria-hidden /> Running PubMed queries…
            </div>
          )}

          {result && (
            <div style={S.resultGrid}>
              {/* Bar Plot */}
              <div>
                <h4 style={S.sectionTitle}>Bar Plot</h4>
                <div style={S.imgCard}>
                  <img
                    alt="PubMed bar plot"
                    style={S.img}
                    src={`data:image/png;base64,${result.barplot_png_base64}`}
                  />
                </div>
              </div>

              {/* Word Cloud */}
              <div>
                <h4 style={S.sectionTitle}>Word Cloud</h4>
                <div style={S.imgCard}>
                  <img
                    alt="PubMed word cloud"
                    style={S.img}
                    src={`data:image/png;base64,${result.wordcloud_png_base64}`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Normalize pasted genes: split by newlines/commas/tabs/semicolons, trim, unique, drop empties */
function normalizePastedGenes(text) {
  const items = text.split(/[\r\n,;\t]+/).map((s) => s.trim()).filter(Boolean);
  const seen = new Set();
  const unique = [];
  for (const g of items) {
    const key = g.toUpperCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(g);
    }
  }
  return unique.join("\n");
}

function DL({ label, url, fallbackB64, filename, mime }) {
  const onClick = (e) => {
    if (url) return; // prefer server URL
    e.preventDefault();
    if (!fallbackB64) return;
    try {
      const bytes = atob(fallbackB64);
      const buf = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
      const blob = new Blob([buf], { type: mime || "application/octet-stream" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename || `download.${extFromMime(mime)}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  const pill = {
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
  };

  return url ? (
    <a href={`${BASE_URL}${url}`} download style={pill} title={label}>
      {label}
    </a>
  ) : (
    <button onClick={onClick} type="button" style={pill} title={label}>
      {label}
    </button>
  );
}

function extFromMime(mime) {
  if (!mime) return "bin";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("png")) return "png";
  if (mime.includes("csv")) return "csv";
  return "dat";
}
