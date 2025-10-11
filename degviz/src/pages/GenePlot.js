import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import * as d3 from 'd3';
import { VennDiagram } from 'venn.js';
import { render as renderUpSet } from '@upsetjs/bundle';

const GenePlot = () => {
  const [datasets, setDatasets] = useState([]);
  const [plotType, setPlotType] = useState(null);
  const containerRef = useRef(null); // ✅ useRef

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const allDatasets = [];
    let loaded = 0;

    files.forEach((file, i) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.meta.fields.includes('Gene.ID')) {
            alert(`File "${file.name}" must contain a 'Gene.ID' column.`);
            return;
          }

          const geneIds = results.data.map(row => row['Gene.ID']).filter(Boolean);
          allDatasets[i] = { name: `Location${i + 1}`, genes: geneIds };

          loaded++;
          if (loaded === files.length) {
            setDatasets(allDatasets);
            setPlotType(allDatasets.length <= 5 ? 'venn' : 'upset');
          }
        }
      });
    });
  };

  const drawVenn = () => {
    const vennSets = datasets.map((d) => ({
      sets: [d.name],
      size: d.genes.length
    }));

    for (let i = 0; i < datasets.length; i++) {
      for (let j = i + 1; j < datasets.length; j++) {
        const inter = datasets[i].genes.filter(g => datasets[j].genes.includes(g));
        if (inter.length > 0) {
          vennSets.push({ sets: [datasets[i].name, datasets[j].name], size: inter.length });
        }
      }
    }

    d3.select(containerRef.current).html('');
    const chart = VennDiagram().width(500).height(500);
    d3.select(containerRef.current).datum(vennSets).call(chart);
  };

  const drawUpSet = () => {
    const allGenes = new Set(datasets.flatMap(d => d.genes));
    const geneMap = {};

    for (let gene of allGenes) {
      geneMap[gene] = {};
      datasets.forEach(d => {
        geneMap[gene][d.name] = d.genes.includes(gene) ? 1 : 0;
      });
    }

    const data = Object.entries(geneMap).map(([gene, presence]) => ({
      name: gene,
      ...presence,
    }));

    d3.select(containerRef.current).html('');
    renderUpSet(containerRef.current, {
      data,
      sets: datasets.map(d => d.name),
      width: 700,
      height: 500,
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;
    if (plotType === 'venn') drawVenn();
    else if (plotType === 'upset') drawUpSet();
  }, [datasets, plotType]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Upload Gene Files (.tsv/.txt with 'Gene.ID' column)</h2>
      <input type="file" multiple accept=".tsv,.txt,.csv" onChange={handleFileUpload} />
      <div ref={containerRef} style={{ marginTop: 30 }} />
    </div>
  );
};

export default GenePlot;
