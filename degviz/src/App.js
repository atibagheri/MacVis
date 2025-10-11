import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

import Home from './pages/Home';
import Transpca from './pages/Transpca';
import PCA from './pages/PCA';
import VennDiagram from './pages/VennDiagram';
import Heatmap from './pages/Heatmap';
import GOMap from './pages/GOMap';
import KEGGMap from './pages/KEGGMap';
import GenePlot from './pages/GenePlot';
import TextMining from './pages/TextMining';
import Circos from './pages/Circos';
import Demo from './pages/Demo';
import Contact from './pages/Contact';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/transpca" element={<Transpca />} />
        <Route path="/pca" element={<PCA />} />
        <Route path="/venn" element={<VennDiagram />} />
        <Route path="/heatmap" element={<Heatmap />} />
        <Route path="/go-map" element={<GOMap />} />
        <Route path="/kegg-map" element={<KEGGMap />} />
        <Route path="/textmining" element={<TextMining />} /> {/* lowercase */}
        <Route path="/gene-plot" element={<GenePlot />} />
        <Route path="/circos" element={<Circos />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/contact" element={<Contact />} />
        {/* optional fallback */}
        {/* <Route path="*" element={<Home />} /> */}
      </Route>
    </Routes>
  );
}
