import React, { useState, useRef } from "react";
import Plot from "react-plotly.js";
import Plotly from "plotly.js-dist-min";
import * as d3 from "d3";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";

// ✅ Import your images from src/assets
import transpcaImg from '../assets/Immune.png';
import pcaImg from "../assets/pca_plot.png";
import vennImg from "../assets/venn.png";
import enrichmentImg from "../assets/wordcloud.png";
import heatmapImg from "../assets/heatmap.png";
import goImg from "../assets/go.png";
import keggImg from "../assets/kegg.png";
import circosImg from '../assets/circos.png';

export default function HomePage() {
  const navigate = useNavigate();

  // ✅ Define routes and images
  const cards = [
    { name: "Macrophage Latent Space\n(MacView)", img: transpcaImg, route: "/transpca" },
    { name: "PCA Analysis", img: pcaImg, route: "/pca" },
    { name: "Venn Diagram", img: vennImg, route: "/venn" },
    { name: "Heatmap", img: heatmapImg, route: "/heatmap" },
    { name: "GO Enrichment Analysis", img: goImg, route: "/go-map" },
    { name: "KEGG Enrichment Analysis", img: keggImg, route: "/kegg-map" },
    { name: "Pubmed Cloud", img: enrichmentImg, route: "/textMining" },
    { name: "Circos Plot Overlap", img: circosImg, route: "/circos" },
  ];

  const gridContainer = {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gridTemplateRows: "repeat(2, 1fr)",
    height: "70vh",
    margin: 0,
    marginTop: "40px",
    padding: "8px",
    gap: "10px",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
  };

  const cardStyle = {
    height: "100%",
    border: "1px solid #ccc",
    borderRadius: "10px",
    overflow: "hidden",
    cursor: "pointer",
    background: "#fcf7f0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  };

  const imgStyle = {
    width: "100%",
    height: "60%",
    objectFit: "cover",
    borderBottom: "1px solid #ddd",
  };

  const titleStyle = {
    fontSize: "1.1rem",
    padding: "6px",
    textAlign: "center",
    fontWeight: "600",
    whiteSpace: "pre-line", // 👈 enables "\n" line breaks
  };

  return (
    <div style={gridContainer}>
      {cards.map((card, idx) => (
        <div
          key={idx}
          style={cardStyle}
          onClick={() => navigate(card.route)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.03)";
            e.currentTarget.style.boxShadow = "0 6px 14px rgba(0,0,0,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.1)";
          }}
        >
          <img src={card.img} alt={card.name} style={imgStyle} />
          <div style={titleStyle}>{card.name}</div>
        </div>
      ))}
    </div>
  );
}
