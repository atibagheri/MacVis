import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const Layout = ({ children }) => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div
        style={{
          width: '220px',
          backgroundColor: '#f9f9f9',
          borderRight: '1px solid #ddd',
          padding: '20px',
          boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
        }}
      >
        <h2
          style={{ cursor: 'pointer', marginBottom: '30px' }}
          onClick={() => navigate('/')}
        >
          DEGViz
        </h2>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <StyledLink to="/venn">Venn Diagram</StyledLink>
          <StyledLink to="/pca">PCA</StyledLink>
          <StyledLink to="/heatmap">Heatmap</StyledLink>
          <StyledLink to="/enrichment">Enrichment</StyledLink>
          <StyledLink to="/go">GO Map</StyledLink>
          <StyledLink to="/kegg" newTab>KEGG Map</StyledLink>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '40px' }}>{children}</div>
    </div>
  );
};

const StyledLink = ({ to, children, newTab = false }) => {
  if (newTab) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          textDecoration: 'none',
          color: '#333',
          padding: '8px 12px',
          borderRadius: '4px',
          backgroundColor: '#eaeaea',
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        textDecoration: 'none',
        color: isActive ? 'white' : '#333',
        backgroundColor: isActive ? '#007bff' : '#eaeaea',
        padding: '8px 12px',
        borderRadius: '4px',
        fontWeight: isActive ? 'bold' : 'normal',
      })}
    >
      {children}
    </NavLink>
  );
};

export default Layout;
