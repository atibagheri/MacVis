import React from "react";
import { Link, useLocation } from "react-router-dom";

const ITEMS = [
  { label: "PCA", path: "/pca" },
  { label: "VennDiagram", path: "/venn" },
  { label: "Heatmap", path: "/heatmap" },
  { label: "GO Analysis", path: "/go-map" },
  { label: "KEGG Analysis", path: "/kegg-map" },
  { label: "PubMed Cloud", path: "/textmining" },
  { label: "Circos Overlap", path: "/circos" },
  { label: "Demo", path: "/demo" },
  { label: "Contact", path: "/contact" },
];

export default function SmartPanel() {
  const { pathname } = useLocation();

  return (
    <div className="smartpanel">
      <div className="smartpanel-inner">
        {/* 👇 NEW: title above the buttons */}
        <div className="sp-title">Smart Panel</div>

        <div className="sp-buttons">
          {ITEMS.map((item) => {
            const active = pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path} className={`sp-link ${active ? "active" : ""}`}>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
