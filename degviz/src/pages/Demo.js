import React from "react";
import { Link } from "react-router-dom";
import Immune from '../assets/transpca.png';
import pca from '../assets/pcaplot.png';
import vennUpset from '../assets/vennUpset.png';
import heatmap from '../assets/heatmapDemo.png';
import gomap from '../assets/gomap.png';
import keggmap from '../assets/keggmap.png';
import pubmedCloud from '../assets/pubmedCloud.png';
import circosOverlap from '../assets/Circosoverlap.png';



const CSS = `
:root{
  --demo-bg:#f7fafc; /* page bg */
  --demo-card:#ffffff; /* card bg */
  --demo-border:#e5e7eb; /* soft border */
  --demo-text:#111827; /* headings */
  --demo-muted:#475569; /* body */
  --demo-note:#64748b; /* captions */
}
/* Hero video */
.demo-hero{margin-bottom:24px}
.demo-video{
  width:100%;
  border-radius:20px;
  box-shadow:0 6px 24px rgba(17,24,39,.06);
  border:1px solid var(--demo-border);
  display:block
}
.demo-root{max-width:1200px;margin:0 auto;padding:32px 16px;}
.demo-intro{margin-bottom:24px}
.demo-h1{font-size:28px;font-weight:700;letter-spacing:-.2px;color:var(--demo-text)}
.demo-sub{color:var(--demo-muted);margin-top:6px}

.demo-card{display:flex;gap:24px;align-items:flex-start;background:var(--demo-card);border:1px solid var(--demo-border);border-radius:20px;box-shadow:0 6px 24px rgba(17,24,39,.06);padding:20px}
@media (max-width:500px){.demo-card{flex-direction:column}}

.demo-left{flex:1 1 48%}
.demo-right{flex:1 1 52%}
.demo-title{font-size:18px;font-weight:600;margin:0 0 8px;color:var(--demo-text)}
.demo-p{margin:6px 0;color:#334155}
.demo-ul{margin:8px 0 0 18px;color:var(--demo-muted)}

/* Buttons */
.demo-btn{display:inline-flex;gap:8px;align-items:center;padding:10px 14px;border-radius:12px;text-decoration:none;border:1px solid #0f172a;background:#0f172a;color:#fff}
.demo-btn:hover{background:#111827}


/* Generic single placeholder */
.placeholder{background:linear-gradient(135deg,#f1f5f9,#f8fafc);border:2px dashed #cbd5e1;border-radius:16px;min-height:180px;display:flex;align-items:center;justify-content:center;color:var(--demo-note)}
`;

export default function Demo() {
    return (
        <div className="demo-root">
            <style>{CSS}</style>

            

            {/* Immuno Decomposer (TransPCA) — NEW FIRST CARD */}
            <section>
                <div className="demo-card">
                    <div className="demo-left">
                        <img
                            src={Immune}
                            alt="Immune"
                            style={{ width: '100%', borderRadius: 16, display: 'block' }}
                        />

                    </div>
                    <div className="demo-right">
                        <h2 className="demo-title">Macrophage Latent Space (MacView)</h2>
                        <p className="demo-p">
                            MacVis starts with a curated in-vitro macrophage reference —M0 (unstimulated), M1 (pro-inflammatory), and M2 (anti-inflammatory) states.
                            Using PCA, we capture key biological variation: PC1 reflects the M1–M2 continuum, and PC2 separates M0 from polarized states.
                            We then fix these PCA loadings to create a stable “macrophage space.” When users upload new RNA-seq data, the app aligns genes, scales them,
                            and projects samples into this same space. This lets users compare macrophage states across datasets in a consistent, biologically meaningful way.</p>
                        <div style={{ marginTop: 10 }}>
                            <Link to="/transpca" className="demo-btn">Open (MacView)
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l9-9" /><path d="M7 7h10v10" /></svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* PCA */}
            <section style={{ marginTop: 16 }}>
                <div className="demo-card">
                    <div className="demo-left">
                        <img
                            src={pca}
                            alt="pca"
                            style={{ width: '100%', borderRadius: 16, display: 'block' }}
                        />
                    </div>
                    <div className="demo-right">
                        <h2 className="demo-title">PCA Analysis</h2>
                        <p className="demo-p">To run PCA, users upload two tab-delimited text files: (i) an expression matrix with genes as rows and samples as columns, and
                            (ii) a sample information table with metadata such as sample IDs, treatments, and time points. MacViz then computes the principal components and
                            generates an interactive scatterplot of PC1 and PC2,
                            which capture the major sources of variance in the dataset.</p>

                        <div style={{ marginTop: 10 }}>
                            <Link to="/pca" className="demo-btn">Open PCA
                                {/* <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l9-9" /><path d="M7 7h10v10" /></svg> */}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Venn / UpSet */}
            <section style={{ marginTop: 16 }}>
                <div className="demo-card">
                    <div className="demo-left">
                        <img
                            src={vennUpset}
                            alt="vennUpset"
                            style={{ width: '100%', borderRadius: 16, display: 'block' }}
                        />
                    </div>
                    <div className="demo-right">
                        <h2 className="demo-title">Venn Diagram / UpSet Plot</h2>
                        <p className="demo-p">
                            Depending on the input gene lists, users can generate either a Venn diagram or an UpSet plot, based on the number of datasets provided.It automatically generates Venn diagrams for up to 5 sets,
                            and for 6 or more sets—where traditional diagrams become cluttered or unreadable—it transitions to an UpSet plot, providing a scalable, clear, and informative representation of complex data intersections.
                            <ul style={{ margin: '0 0 0 18px', padding: 0 }}>
                                <li><strong>2 sets — circles:</strong> simple lens overlap, quickest to read.</li>
                                <li><strong>3 sets — circles:</strong> triangular layout with a central 3-way region.</li>
                                <li><strong>4 sets — rotated ellipses:</strong> avoids tiny slivers, preserves all 16 intersections.</li>
                                <li><strong>5 sets — petal ellipses:</strong> flexible curves to realize all 32 regions, readable transparency.</li>
                                <li><strong>6+ sets — </strong> traditional Venns switch to an UpSet plot, which shows the same intersection logic with sortable bars and a dot-matrix for combinations.</li>

                            </ul>

                        </p>

                        <div style={{ marginTop: 10 }}>

                            <Link to="/venn" className="demo-btn">
                                Open Venn / UpSet
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M7 17l9-9" /><path d="M7 7h10v10" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>


            {/* Heatmap */}
            <section style={{ marginTop: 16 }}>
                <div className="demo-card">
                    <div className="demo-left">
                        <img
                            src={heatmap}
                            alt="heatmap"
                            style={{ width: '100%', borderRadius: 16, display: 'block' }}
                        />
                    </div>
                    <div className="demo-right">
                        <h2 className="demo-title">Heatmap</h2>
                        <p className="demo-p">To generate a heatmap, users upload a tab-delimited text file where the first column lists gene identifiers and the remaining columns provide expression values across samples.
                            The application then processes this input to create an heatmap that highlights expression patterns.</p>
                        <ul className="demo-ul">
                        </ul>
                        <div style={{ marginTop: 10 }}>

                            <Link to="/heatmap" className="demo-btn">Open Heatmap
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l9-9" /><path d="M7 7h10v10" /></svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* GO */}
            <section style={{ marginTop: 16 }}>
                <div className="demo-card">
                    <div className="demo-left">
                        <img
                            src={gomap}
                            alt="Go map"
                            style={{ width: '100%', borderRadius: 16, display: 'block' }}
                        />
                    </div>
                    <div className="demo-right">
                        <h2 className="demo-title">GO Enrichment Analysis</h2>
                        <ul className="demo-ul">
                            Our application supports Gene Ontology (GO) enrichment analysis in two modes. In the first, users upload a simple gene list,
                            and the app identifies enriched Biological Process terms, displayed as a barplot. In the second, users provide a table with gene
                            symbols and log2FC values, enabling both a barplot and a cnetplot network diagram that maps genes to enriched GO terms. This dual approach allows
                            users to examine key functional categories and visualize how individual genes contribute to interconnected biological processes.
                        </ul>
                        <div style={{ marginTop: 10 }}>
                            <Link to="/go-map" className="demo-btn">Open GO
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l9-9" /><path d="M7 7h10v10" /></svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* KEGG */}
            <section style={{ marginTop: 16 }}>
                <div className="demo-card">
                    <div className="demo-left">
                        <img
                            src={keggmap}
                            alt="KEGG Enrichment overview"
                            style={{ width: '100%', borderRadius: 16, display: 'block' }}
                        />
                    </div>

                    <div className="demo-right">
                        <h2 className="demo-title">KEGG Enrichment Analysis</h2>

                        <p className="demo-p">
                            Users upload tab-delimited files, and pathways are statistically tested for
                            over-representation in the experimental gene list. The application supports two modes:
                        </p>

                        <ul className="demo-ul">
                            <li>
                                <strong>Gene List Only:</strong> performs KEGG enrichment, generates a barplot of the
                                top-10 enriched pathways, and provides static KEGG pathway maps plus enrichment statistics
                                and mapping files.
                            </li>
                            <li>
                                <strong>Gene List + Fold Change:</strong> generates both a barplot and KEGG maps,
                                including Base Pathway Maps and Fold-Change Maps, where components are color-coded by
                                input values (e.g., log2FC) to show up- and down-regulation.
                            </li>
                        </ul>

                        <p className="demo-p" style={{ marginTop: 6 }}>
                            Users can select the species for accurate mapping against the KEGG database. All outputs—plots,
                            pathway maps, and enrichment tables—are bundled into a downloadable ZIP for downstream analysis.
                        </p>

                        <div style={{ marginTop: 10 }}>
                            <Link to="/kegg-map" className="demo-btn">
                                Open KEGG
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M7 17l9-9" /><path d="M7 7h10v10" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>


            {/* PubMed */}
            <section style={{ marginTop: 16 }}>
                <div className="demo-card">
                    <div className="demo-left">
                        <img
                            src={pubmedCloud}
                            alt="PubMed Cloud"
                            style={{ width: '100%', borderRadius: 16, display: 'block' }}
                        />
                    </div>
                    <div className="demo-right">
                        <h2 className="demo-title">PubMed Cloud</h2>
                        <p className="demo-p">Users can upload or paste a gene list—optionally with a keyword—to retrieve literature-based summaries,
                            including gene–term associations, PubMed IDs, article titles, and relevance scores. This feature helps researchers quickly
                            gather background information, and prioritize genes for further study. By mining PubMed abstracts, the app highlights key
                            associations, frequently co-mentioned terms, and biological contexts where the genes appear.
                            Results include barplots, a word cloud where size reflects frequency, downloadable CSVs, of paper summaries and hit numbers.</p>
                        <div style={{ marginTop: 10 }}>
                            <Link to="/textmining" className="demo-btn">Open PubMed Cloud
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l9-9" /><path d="M7 7h10v10" /></svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
            {/* Circos */}
            <section style={{ marginTop: 16 }}>
                <div className="demo-card">
                    <div className="demo-left">
                        <img
                            src={circosOverlap}
                            alt="Circos Overlap"
                            style={{ width: "100%", borderRadius: 16, display: "block" }}
                        />
                    </div>

                    <div className="demo-right">
                        <h2 className="demo-title">Circos Plot Overlap</h2>
                        <p className="demo-p">
                            This plot is used to visualize the overlap between multiple gene lists. Each arc on the circle represents one gene list,
                            and the ribbons connecting arcs indicate shared genes between the lists. The wider the ribbon, the larger the overlap.
                            This makes it easy to see commonalities across datasets and identify strongly intersecting groups.
                        </p>



                        <div style={{ marginTop: 10 }}>
                            <Link to="/circos" className="demo-btn">
                                Open Circos
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ marginLeft: 6 }}
                                >
                                    <path d="M7 17l9-9" />
                                    <path d="M7 7h10v10" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
            {/* Top movie/hero */}
            <section style={{ textAlign: 'center',  marginTop: '64px',marginBottom: '32px' }}>
                <h2 style={{ marginBottom: '8px', color: 'var(--demo-text)' }}>Watch the MacViz Demo</h2>
                <a
                    href="https://usegalaxy.org/api/datasets/f9cad7b01a47213527de0e2789e7e89c/display?to_ext=mov"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="demo-btn"
                >
                    🎥 Watch Demo Video
                </a>
            </section>

        </div>
    );
}
