import React, { useState, useRef, useEffect, useCallback } from "react";

export default function CircosPlot() {
  const [files, setFiles] = useState([]);
  const [labels, setLabels] = useState([]);
  const [geneCol, setGeneCol] = useState("Gene.ID");
  const [minShared, setMinShared] = useState(1);

  const [pngB64, setPngB64] = useState(null);
  const [linksN, setLinksN] = useState(null);      // kept for compatibility with your UI
  const [labelsUsed, setLabelsUsed] = useState(null);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const [dlPngUrl, setDlPngUrl] = useState(null);  // now client-side Blob URLs
  const [dlPdfUrl, setDlPdfUrl] = useState(null);

  const [autoUpdate, setAutoUpdate] = useState(true);

  const inputRef = useRef();
  const debounceTimer = useRef(null);
  const lastBlobUrlsRef = useRef({ png: null, pdf: null });

  const BACKEND_ORIGIN = process.env.REACT_APP_BACKEND_ORIGIN || process.env.REACT_APP_API_BASE || "/api";
  const API_URL = `${BACKEND_ORIGIN}/api/circos`;

  const filenameStem = (name) => name.replace(/\.[^/.]+$/, "");

  const revokeLastUrls = () => {
    const { png, pdf } = lastBlobUrlsRef.current;
    if (png) URL.revokeObjectURL(png);
    if (pdf) URL.revokeObjectURL(pdf);
    lastBlobUrlsRef.current = { png: null, pdf: null };
  };

  const clearAll = () => {
    setFiles([]);
    setLabels([]);
    setGeneCol("Gene.ID");
    setMinShared(1);
    setPngB64(null);
    setLinksN(null);
    setLabelsUsed(null);
    setMsg(null);
    revokeLastUrls();
    setDlPngUrl(null);
    setDlPdfUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onFilesChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
    setLabels(selected.map((f) => filenameStem(f.name))); // prefill labels
    setMsg(null);
  };

  const onLabelChange = (idx, value) => {
    setLabels((prev) => {
      const next = prev.slice();
      next[idx] = value;
      return next;
    });
  };

  const buildFormData = () => {
    const fd = new FormData();
    files.forEach((file) => fd.append("files", file));
    // send both repeated labels and JSON (backend supports either)
    labels.forEach((lbl) => fd.append("labels", (lbl ?? "").toString()));
    fd.append("labels_json", JSON.stringify(labels));
    fd.append("gene_col_user", geneCol.trim());
    fd.append("min_shared", String(minShared));
    return fd;
  };

  const b64ToBlob = (b64, mime) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  };

  const runRequest = useCallback(async () => {
    if (files.length < 2) {
      setMsg("Please select at least two files.");
      return;
    }
    if (!geneCol.trim()) {
      setMsg("Please specify the gene column name.");
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch(API_URL, { method: "POST", body: buildFormData() });
      const data = await res.json();

      // Diagnostics from R on 4xx/5xx
      if (!res.ok || data.success === false || data.error) {
        // surface useful hints if present
        if (data?.error && data?.pairwise_overlap) {
          setMsg(`No links to plot. Check gene column and ID system. (Gene col used: ${Object.values(data.gene_column_used || {}).join(", ")})`);
        } else {
          setMsg(data?.error || `Request failed (HTTP ${res.status})`);
        }
        // clear preview/downloads if this was an error
        setPngB64(null);
        revokeLastUrls();
        setDlPngUrl(null);
        setDlPdfUrl(null);
        setLinksN(0);
        setLabelsUsed(null);
        return;
      }

      // Success path: backend returns base64 fields
      const png_base64 = data.png_base64 || null;
      const pdf_base64 = data.pdf_base64 || null;

      // preview image (same UI style)
      setPngB64(png_base64);

      // create fresh blob URLs for downloads
      revokeLastUrls();
      let pngUrl = null, pdfUrl = null;
      if (png_base64) {
        const pngBlob = b64ToBlob(png_base64, "image/png");
        pngUrl = URL.createObjectURL(pngBlob);
      }
      if (pdf_base64) {
        const pdfBlob = b64ToBlob(pdf_base64, "application/pdf");
        pdfUrl = URL.createObjectURL(pdfBlob);
      }
      lastBlobUrlsRef.current = { png: pngUrl, pdf: pdfUrl };
      setDlPngUrl(pngUrl);
      setDlPdfUrl(pdfUrl);

      // keep these props for your existing UI (not used by backend now)
      setLinksN(null);
      setLabelsUsed(labels.length ? labels : null);
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [files, labels, geneCol, minShared, API_URL]);

  // Manual submit (button)
  const handleSubmit = async (e) => {
    e.preventDefault();
    await runRequest();
  };

  // Debounced auto-update when labels change (same style/behavior)
  useEffect(() => {
    if (!autoUpdate) return;
    if (files.length < 2) return;
    if (loading) return;
    if (pngB64 === null && linksN === null) return; // wait until first run

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      runRequest();
    }, 600);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [labels, autoUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Revoke object URLs on unmount
  useEffect(() => () => revokeLastUrls(), []);

  return (
    <div style={{ padding: "24px 12px" }}>
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        {/* LEFT PANEL */}
        <div style={{ flex: "0 0 45%", maxWidth: "45%" }}>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              padding: 20,
              position: "relative",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Circos Plot Overlap</h3>
            <p style={{ color: "#6b7280", marginTop: 0 }}>
              Upload 2+ gene lists (CSV/TSV/TXT) to create a Circos chord diagram to visualize shared or overlapping genes across conditions
              or time points. Ribbon width is proportional to the number of shared genes.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label className="form-label">Choose files (2+)</label>
                  <input
                    ref={inputRef}
                    className="form-control"
                    type="file"
                    accept=".csv,.tsv,.txt,text/plain"
                    multiple
                    onChange={onFilesChange}
                  />
                </div>

                {files.length > 0 && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Custom labels (optional)</label>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <label style={{ fontSize: 13, color: "#374151" }}>
                          <input
                            type="checkbox"
                            checked={autoUpdate}
                            onChange={(e) => setAutoUpdate(e.target.checked)}
                            style={{ marginRight: 6 }}
                          />
                          Auto-update on change
                        </label>
                        <button
                          className="btn btn-outline-secondary"
                          type="button"
                          onClick={runRequest}
                          disabled={loading || files.length < 2}
                        >
                          Update plot now
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                      {files.map((f, idx) => (
                        <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div className="form-control" style={{ background: "#f9fafb" }}>
                            {f.name}
                          </div>
                          <input
                            className="form-control"
                            placeholder={filenameStem(f.name)}
                            value={labels[idx] ?? ""}
                            onChange={(e) => onLabelChange(idx, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="form-label">Gene column name</label>
                  <input
                    className="form-control"
                    value={geneCol}
                    onChange={(e) => setGeneCol(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Minimum shared genes</label>
                  <input
                    className="form-control"
                    type="number"
                    min={1}
                    value={minShared}
                    onChange={(e) => setMinShared(Number(e.target.value) || 1)}
                  />
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={loading}
                    style={{ background: "#b6d4c1", color: "#000", borderColor: "#93b8a1" }}
                  >
                    {loading ? "Please wait…" : "Run Circos"}
                  </button>

                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={clearAll}
                    disabled={loading}
                    style={{ background: "#fff", color: "#000", borderColor: "#d1d5db" }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </form>

            {msg && (
              <div className="alert alert-warning" style={{ marginTop: 14 }}>
                {msg}
              </div>
            )}

            {loading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(255,255,255,0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div className="spinner-border" style={{ width: 36, height: 36 }} />
                <span style={{ marginLeft: 10 }}>Running…</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ flex: "1", maxWidth: "45%" }}>
          {(pngB64 || linksN !== null) && (
            <div
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                padding: 16,
              }}
            >
              <h5 style={{ margin: "4px 0 12px" }}>Results</h5>

              <div
                style={{
                  border: "1px dashed #d1d5db",
                  borderRadius: 6,
                  minHeight: 360,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  background: "#fafafa",
                }}
              >
                {pngB64 ? (
                  <img
                    src={`data:image/png;base64,${pngB64}`}
                    alt="Circos Plot"
                    style={{ width: "100%", maxWidth: "700px" }}
                  />
                ) : (
                  <span style={{ color: "#9ca3af" }}>No preview image provided</span>
                )}
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a
                  className="btn btn-outline-primary"
                  href={dlPngUrl || "#"}
                  onClick={(e) => { if (!dlPngUrl) e.preventDefault(); }}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download PNG
                </a>
                <a
                  className="btn btn-outline-primary"
                  href={dlPdfUrl || "#"}
                  onClick={(e) => { if (!dlPdfUrl) e.preventDefault(); }}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download PDF
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
