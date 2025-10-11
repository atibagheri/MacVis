import io
import base64
import numpy as np
import pandas as pd
import plotly.express as px
from flask import Blueprint, request, jsonify
from sklearn.decomposition import PCA

# Requires: plotly + kaleido (for write_image)
# pip install plotly kaleido scikit-learn pandas numpy

pca_blueprint = Blueprint('pca', __name__)

# ---------- Helpers ----------
def _read_table_auto(file_storage):
    """Read CSV/TSV with auto-separator, no forced index yet."""
    # Try \t first (common for expression matrices), then comma
    try:
        df = pd.read_csv(file_storage, sep="\t")
        if df.shape[1] == 1:  # likely comma-separated
            file_storage.seek(0)
            df = pd.read_csv(file_storage)  # comma
    except Exception:
        file_storage.seek(0)
        df = pd.read_csv(file_storage)
    return df

def _coerce_sample_index(df: pd.DataFrame) -> pd.DataFrame:
    """
    Put a reasonable sample identifier column into the index if needed.
    Priority order: an existing index with non-range values -> 'Sample'/'sample'/'sample_id'/'SampleID'
    -> first column if it looks like identifiers (object dtype, unique).
    """
    if df.index.name is not None and not isinstance(df.index, pd.RangeIndex):
        return df

    candidates = [c for c in df.columns if c.lower() in ("sample", "sample_id", "sampleid", "id", "name")]
    for c in candidates:
        if c in df.columns and df[c].is_unique:
            df = df.set_index(c)
            return df

    # Fallback: first column if it’s likely IDs
    first = df.columns[0]
    if df[first].dtype == "object" and df[first].is_unique:
        df = df.set_index(first)
        return df

    # If nothing else, leave as-is (user had an unnamed RangeIndex)
    return df

def _ensure_expr_index(expr_df: pd.DataFrame) -> pd.DataFrame:
    """
    Make the first column gene IDs if needed; keep columns as samples.
    If index is a RangeIndex but first column is non-numeric string-like, set as index.
    """
    if isinstance(expr_df.index, pd.RangeIndex):
        first = expr_df.columns[0]
        if expr_df[first].dtype == "object" and expr_df[first].is_unique:
            expr_df = expr_df.set_index(first)
    return expr_df

def _align_expr_samples(expr_df: pd.DataFrame, sample_index: pd.Index) -> pd.DataFrame:
    """Keep only intersecting samples; preserve sample order defined by sample_index."""
    common = [s for s in sample_index if s in expr_df.columns]
    if len(common) == 0:
        raise ValueError("No overlapping sample names between expression and sample metadata.")
    return expr_df.loc[:, common]

def _auto_pick_columns(sample_df: pd.DataFrame):
    """
    Pick color/symbol from categorical columns (<= 20 unique values),
    and size from numeric columns.
    """
    cat_cols = []
    num_cols = []
    for col in sample_df.columns:
        if pd.api.types.is_numeric_dtype(sample_df[col]):
            num_cols.append(col)
        else:
            # Treat small-cardinality object columns as categorical
            nunq = sample_df[col].nunique(dropna=True)
            if nunq <= 20 and nunq > 1:
                cat_cols.append(col)

    color_col = cat_cols[0] if cat_cols else None
    # Use a different categorical column for symbol if possible
    symbol_col = cat_cols[1] if len(cat_cols) > 1 else color_col
    size_col = num_cols[0] if num_cols else None
    return color_col, symbol_col, size_col

def _validate_choice(col_name, df, kind):
    if not col_name:
        return None
    if col_name not in df.columns:
        raise ValueError(f"{kind} column '{col_name}' not found in sample metadata.")
    return col_name

# ---------- Endpoint ----------
@pca_blueprint.route("/", methods=["POST"])
def run_pca():
    """
    Form-data:
      - expression_file: required (CSV/TSV). Rows=genes/features, Cols=samples.
                         First column may contain gene IDs.
      - sample_file:    required (CSV/TSV). Each row = one sample, must include a sample ID column or index.
      - color_col:      optional (string) -> name of metadata column (categorical) for point color
      - symbol_col:     optional (string) -> name of metadata column (categorical) for point symbol
      - size_col:       optional (string) -> name of metadata column (numeric) for point size
    Returns:
      JSON with base64 'png', 'pdf', 'pc_scores_csv', and the chosen mappings.
    """
    try:
        expr_file = request.files.get("expression_file", None)
        sample_file = request.files.get("sample_file", None)
        if expr_file is None or sample_file is None:
            return jsonify({"error": "Both 'expression_file' and 'sample_file' are required."}), 400

        # Read inputs
        expr_df = _read_table_auto(expr_file)
        sample_df = _read_table_auto(sample_file)

        # Make sensible indices
        sample_df = _coerce_sample_index(sample_df)
        expr_df = _ensure_expr_index(expr_df)

        # Align samples
        expr_df = _align_expr_samples(expr_df, sample_df.index)

        # CPM + log2
        # Drop columns with total 0 to avoid divide-by-zero
        nonzero_cols = expr_df.columns[(expr_df.sum(axis=0) > 0)]
        if len(nonzero_cols) == 0:
            return jsonify({"error": "All samples have zero total counts. Check your expression matrix."}), 400
        expr_df = expr_df[nonzero_cols]

        cpm = expr_df.div(expr_df.sum(axis=0), axis=1) * 1e6
        log_cpm = np.log2(cpm + 0.5).T  # samples x genes

        # PCA
        pca = PCA(n_components=2)
        pcs = pca.fit_transform(log_cpm)
        pca_df = pd.DataFrame(pcs, columns=["PC1", "PC2"], index=log_cpm.index)

        # Join with metadata (only those retained)
        meta = sample_df.loc[pca_df.index]
        final_df = pca_df.join(meta)

        # Variance explained
        var_exp = pca.explained_variance_ratio_ * 100.0
        pc1_var = round(float(var_exp[0]), 1)
        pc2_var = round(float(var_exp[1]), 1)

        # Column choices (user overrides > auto)
        user_color = request.form.get("color_col")
        user_symbol = request.form.get("symbol_col")
        user_size = request.form.get("size_col")

        auto_color, auto_symbol, auto_size = _auto_pick_columns(meta)

        color_col = _validate_choice(user_color, meta, "color") if user_color else auto_color
        symbol_col = _validate_choice(user_symbol, meta, "symbol") if user_symbol else auto_symbol
        size_col = _validate_choice(user_size, meta, "size") if user_size else auto_size

        # Build scatter kwargs only for provided columns
        scatter_kwargs = {
            "x": "PC1",
            "y": "PC2",
            "labels": {"PC1": f"PC1 ({pc1_var}%)", "PC2": f"PC2 ({pc2_var}%)"},
            "title": "PCA Plot",
        }
        if color_col:
            scatter_kwargs["color"] = color_col
        if symbol_col:
            scatter_kwargs["symbol"] = symbol_col
        if size_col:
            scatter_kwargs["size"] = size_col

        fig = px.scatter(final_df, **scatter_kwargs)

        # Export images
        buf_png = io.BytesIO()
        fig.write_image(buf_png, format="png")
        buf_png.seek(0)
        img_base64 = base64.b64encode(buf_png.read()).decode("utf-8")

        buf_pdf = io.BytesIO()
        fig.write_image(buf_pdf, format="pdf")
        buf_pdf.seek(0)
        pdf_base64 = base64.b64encode(buf_pdf.read()).decode("utf-8")

        # Return PC table too (for download)
        pcs_csv_buf = io.BytesIO()
        (pca_df.join(meta)).to_csv(pcs_csv_buf)
        pcs_csv_buf.seek(0)
        pcs_csv_b64 = base64.b64encode(pcs_csv_buf.read()).decode("utf-8")

        return jsonify({
            "png": img_base64,
            "pdf": pdf_base64,
            "pc_scores_csv": pcs_csv_b64,
            "mappings": {
                "color_col": color_col,
                "symbol_col": symbol_col,
                "size_col": size_col
            },
            "variance_explained": {"PC1": pc1_var, "PC2": pc2_var},
            "n_samples": int(final_df.shape[0]),
            "n_features": int(log_cpm.shape[1])
        })
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {e}"}), 500
