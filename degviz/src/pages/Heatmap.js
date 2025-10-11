import React, { useState, useRef } from "react";
import Plot from "react-plotly.js";
import Plotly from "plotly.js-dist-min";
import * as d3 from "d3";
import jsPDF from "jspdf";

const exampleData = [
  ["Gene", "Sample1", "Sample2", "Sample3"],
  ["Gene1", 10.5, 8.2, 12.1],
  ["Gene2", 5.3, 6.7, 4.9],
  ["Gene3", 15.1, 14.8, 16.0],
  ["Gene4", 8.7, 9.1, 10.3],
];

function zScoreNormalize(matrix) {
  return matrix.map((row) => {
    const mean = row.reduce((a, b) => a + b, 0) / row.length;
    const std = Math.sqrt(
      row.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / row.length
    );
    return row.map((v) => (std === 0 ? 0 : (v - mean) / std));
  });
}

export default function HeatmapPage() {
  const [file, setFile] = useState(null);
  const [plotData, setPlotData] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState("");
  const plotRef = useRef(null);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setLoadingMsg(f ? "File selected. Ready to run." : "");
  };

  const run = () => {
    if (!file) return;
    setLoadingMsg("Please wait… Generating heatmap");
    setPlotData(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const rows = d3.tsvParseRows(text);

      if (!rows || rows.length < 2) {
        setLoadingMsg("Invalid file: need header + at least one data row.");
        return;
      }

      const headers = rows[0];
      const genes = rows.slice(1).map((r) => r[0]);
      const raw = rows.slice(1).map((r) => r.slice(1).map((x) => parseFloat(x)));

      const z = zScoreNormalize(raw);

      setPlotData({
        z,
        x: headers.slice(1),
        y: genes,
        type: "heatmap",
        colorscale: [
          [0, "blue"],
          [0.5, "white"],
          [1, "red"],
        ],
        zmid: 0,
      });
      setLoadingMsg("");
    };
    reader.readAsText(file);
  };

  const clearAll = () => {
    setFile(null);
    setPlotData(null);
    setLoadingMsg("");
  };

  // --- High-quality PDF export ---
  const downloadPDF = async () => {
    if (!plotRef.current) return;
    try {
      const imgData = await Plotly.toImage(plotRef.current.el, {
        format: "png",
        width: 2400,   // keeps same display ratio
        height: 1600,
        scale: 3,      // high resolution (3x pixel density)
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [1200, 800],
        compress: false,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 40;
      const imgHeight = (1600 / 2400) * imgWidth;
      const imgY = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, "PNG", 20, imgY, imgWidth, imgHeight, undefined, "FAST");
      pdf.save("heatmap_highres.pdf");
    } catch (err) {
      console.error("Error generating high-res PDF:", err);
    }
  };

  // --- High-quality PNG export ---
  const downloadPNG = async () => {
    if (!plotRef.current) return;
    try {
      const imgData = await Plotly.toImage(plotRef.current.el, {
        format: "png",
        width: 2400,
        height: 1600,
        scale: 3,
      });

      const a = document.createElement("a");
      a.href = imgData;
      a.download = "heatmap_highres.png";
      a.click();
    } catch (err) {
      console.error("Error generating PNG:", err);
    }
  };

  // --- shared styles ---
  const S = {
    page: { display: "flex", gap: 20, padding: "24px 12px" },
    leftWrap: { flex: "0 0 45%", maxWidth: "45%" },
    card: {
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      padding: 20,
    },
    sub: { color: "#6b7280", marginTop: 0 },
    h3: { marginTop: 0, marginBottom: 10 },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      margin: "8px 0 12px",
      fontSize: 14,
    },
    th: { textAlign: "left", border: "1px solid #e5e7eb", padding: 8, background: "#f3f4f6" },
    td: { border: "1px solid #e5e7eb", padding: 8 },
    btnPrimary: {
      background: "#b6d4c1",
      color: "#000",
      padding: "8px 16px",
      borderRadius: 6,
      border: 0,
      cursor: "pointer",
    },
    btnGhost: {
      background: "#e5e7eb",
      color: "#000",
      padding: "8px 16px",
      borderRadius: 6,
      border: 0,
      cursor: "pointer",
    },
    right: { flex: 1, maxWidth: "55%" },
    note: { color: "#6b7280", fontStyle: "italic", marginTop: 8 },
  };

  return (
    <div style={S.page}>
      {/* LEFT: instructions */}
      <div style={S.leftWrap}>
        <div style={S.card}>
          <h3 style={S.h3}>Heatmap Generator</h3>
          <p style={S.sub}>
            Input file should be a <b>tab-separated</b> TXT with the first column as{" "}
            <b>genes</b> and remaining columns as <b>samples</b>. Values are Z-score
            normalized per gene.
          </p>

          <div>
            <strong>Example:</strong>
            <table style={S.table}>
              <thead>
                <tr>
                  {exampleData[0].map((h, i) => (
                    <th key={i} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exampleData.slice(1).map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} style={S.td}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <input type="file" accept=".txt" onChange={onFile} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={run} disabled={!file} style={S.btnPrimary}>Run</button>
              <button onClick={clearAll} style={S.btnGhost}>Clear</button>
              {plotData && (
                <>
                  <button onClick={downloadPDF} style={S.btnGhost}>Download PDF</button>
                  <button onClick={downloadPNG} style={S.btnGhost}>Download PNG</button>
                </>
              )}
            </div>
            {loadingMsg && <div style={S.note}>{loadingMsg}</div>}
          </div>
        </div>
      </div>

      {/* RIGHT: Results */}
      <div style={S.right}>
        {plotData ? (
          <Plot
            ref={plotRef}
            data={[plotData]}
            layout={{
              autosize: true,
              margin: { t: 30, l: 120, r: 30, b: 100 },
              xaxis: { title: "Samples", tickangle: -45 },
              yaxis: { title: "Genes", automargin: true },
            }}
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
            config={{ responsive: true }}
          />
        ) : (
          <p style={S.note}>
            Your heatmap will appear here after clicking <b>Run</b>.
          </p>
        )}
      </div>
    </div>
  );
}
