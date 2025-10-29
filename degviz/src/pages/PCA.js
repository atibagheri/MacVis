import React, { useState } from 'react';
import axios from 'axios';

function PCA() {
  const [exprFile, setExprFile] = useState(null);
  const [sampleFile, setSampleFile] = useState(null);
  const [plotImg, setPlotImg] = useState(null);
  const [pdfLink, setPdfLink] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRunPCA = async () => {
    if (!exprFile || !sampleFile) return;
    setLoading(true);
    try {
      const fd = new FormData();
  
      // Send both alias pairs so either backend variant works
      fd.append('expr_file', exprFile);
      fd.append('expression_file', exprFile);
      fd.append('meta_file', sampleFile);
      fd.append('sample_file', sampleFile);
  
      // Common flags (as strings)
      fd.append('cpm', 'true');
      fd.append('log2', 'true');
      // If you use aesthetics, include them only if present:
      // fd.append('color', 'Condition');
      // fd.append('shape', 'Day');
      // fd.append('size', '');
  
      const res = await axios.post('/api/pca/', fd);  // keep trailing slash
      setPlotImg(`data:image/png;base64,${res.data.png}`);
      setPdfLink(`data:application/pdf;base64,${res.data.pdf}`);
    } catch (error) {
      // See the actual server message:
      console.error('PCA error:', error?.response?.status, error?.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };
  
  

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      height: '100vh',
      padding: '1rem',
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box',
      gap: '1rem',
      overflow: 'hidden'
    }}>
      {/* LEFT SIDE */}
      <div style={{
        flex: 1.2,
        overflow: 'auto',
        paddingRight: '0.5rem',
      }}>
        <div style={{
          border: '1px solid lightgray',
          borderRadius: '10px',
          padding: '1rem',
          backgroundColor: 'white',
          maxHeight: 'calc(100vh - 2rem)',
          overflowY: 'auto'
        }}>
          {/*
          <h2 style={{ color: '#87CEEB' }}>🧬 PCA Analysis</h2>*/}
          <p><b>To perform PCA, upload:</b></p>
          <ul>
            <li><b>Expression Data:</b> tab-delimited TXT (rows = genes, columns = samples)</li>
            <li><b>Sample Info:</b> tab-delimited TXT (sample names + metadata)</li>
          </ul>

          <h4>Example Expression Data</h4>
          <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', background: '#fff', width: '80%' }}>
            <thead>
              <tr><th>Gene.ID</th><th>Sample1</th><th>Sample2</th><th>Sample3</th></tr>
            </thead>
            <tbody>
              <tr><td>Gene1</td><td>10.5</td><td>12.3</td><td>11.2</td></tr>
              <tr><td>Gene2</td><td>8.7</td><td>9.1</td><td>10.0</td></tr>
            </tbody>
          </table>

          <h4 style={{ marginTop: '1rem' }}>Example Sample Information</h4>
          <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', background: '#fff', width: '80%' }}>
            <thead>
              <tr><th>Sample.ID</th><th>Condition</th><th>Day</th></tr>
            </thead>
            <tbody>
              <tr><td>Sample1</td><td>Control</td><td>1</td></tr>
              <tr><td>Sample2</td><td>Treatment</td><td>1</td></tr>
              <tr><td>Sample3</td><td>Treatment</td><td>2</td></tr>
            </tbody>
          </table>

          {/* Upload Inputs + Run Button */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            marginTop: '1.5rem',
            flexWrap: 'wrap'
          }}>
            <div>
              <label><b>Upload Expression Data (TXT):</b></label><br />
              <input type="file" accept=".txt" onChange={e => setExprFile(e.target.files[0])} />
            </div>

            <div style={{ marginTop: '1.7rem', textAlign: 'center' }}>
              <button 
                onClick={handleRunPCA}
                style={{
                  backgroundColor: '#b6d4c1',
                  color: 'black',
                  padding: '0.6rem 1.2rem',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Run PCA
              </button>
            </div>

            <div>
              <label><b>Upload Sample Information (TXT):</b></label><br />
              <input type="file" accept=".txt" onChange={e => setSampleFile(e.target.files[0])} />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        padding: '1rem',
        maxHeight: '100vh'
      }}>
        {loading && (
          <p style={{ color: '#87CEEB', fontWeight: 'bold' }}>
            🔄 Please wait... PCA is running
          </p>
        )}

        {plotImg && (
          <>
            <div style={{
              border: '1px solid #ccc',
              borderRadius: '10px',
              backgroundColor: '#fff',
              padding: '1rem',
              overflow: 'auto',
              maxHeight: '65vh'
            }}>
              <img 
                src={plotImg}
                alt="PCA Plot"
                style={{
                  maxWidth: '100%',
                  maxHeight: '60vh',
                  objectFit: 'contain'
                }}
              />
            </div>

            <div style={{ marginTop: '1rem' }}>
              <a href={plotImg} download="pca_plot.png">
                <button style={{ marginRight: '1rem' }}>Download PNG</button>
              </a>
              <a href={pdfLink} download="pca_plot.pdf">
                <button>Download PDF</button>
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PCA;
