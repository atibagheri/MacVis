import React from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import '../App.css';

const Layout = () => {
  const { pathname } = useLocation();
  // With HashRouter, Home is "/"
  const isHome = pathname === "/";

  return (
    <div style={{ width: '100%' }}>
      {/* ✅ Show Smart Panel ONLY on Home */}
      {isHome && <div className="smartpanel-banner">Smart Panel</div>}

      {/* Green navbar (offset only when banner exists) */}
      <header className={`header header--green ${isHome ? 'header--offset' : ''}`}>
        <Link to="/" className="logo">MacVis</Link>
        <nav className="navbar">
          <NavLink to="/transpca">MacView</NavLink>
          <span className="nav-divider" aria-hidden="true" />
          <NavLink to="/pca">PCA</NavLink>
          <NavLink to="/venn">VennDiagram</NavLink>
          <NavLink to="/heatmap">Heatmap</NavLink>
          <NavLink to="/go-map">GO Analysis</NavLink>
          <NavLink to="/kegg-map">KEGG Analysis</NavLink>
          <NavLink to="/textmining">Pubmed Cloud</NavLink>
          <NavLink to="/circos">Circos Overlap</NavLink>
          <NavLink to="/demo">Demo</NavLink>
          <NavLink to="/contact">Contact</NavLink>
        </nav>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
