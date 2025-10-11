# plumber.R
# Enable CORS

library(plumber)
library(jsonlite)
library(clusterProfiler)
library(enrichplot)
library(org.Mm.eg.db)
library(org.Hs.eg.db)
library(VennDiagram)
library(UpSetR)
library(futile.logger)
library(pathview)
library(ggplot2)
library(readr)
library(dplyr)
library(openxlsx)
library(zip)
library(rentrez)
library(httr)
library(tibble)
library(stringr)
library(circlize)
library(tools)
library(base64enc)

source("Transpca.R")
source("Venn.R")
source("TextMining.R")
source("Gomap.R")
source("Keggmap.R")
source("Circos.R")

`%||%` <- function(a, b) if (!is.null(a)) a else b


#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 200
    return(list())
  } else {
    plumber::forward()
  }
}



########################################################
#TransPCA
#######################################################

#* @post /transpca
#* @serializer unboxedJSON
function(req, res) {
  # DEBUG logging
  cat("[DEBUG] Request method:", req$REQUEST_METHOD, "\n")
  cat("[DEBUG] req$args:\n"); str(req$args)
  cat("[DEBUG] req$files:\n"); str(req$files)
  
  if (is.null(req$args$file)) {
    res$status <- 400
    return(list(status="error", message="No file uploaded."))
  }

  # ---------- Save uploaded file ----------
  tmp_file <- tempfile(fileext=".txt")
  uploaded_name <- names(req$args$file)[1]
  uploaded_content <- req$args$file[[uploaded_name]]
  
  if (!is.character(uploaded_content)) {
    res$status <- 400
    return(list(status="error", message="Uploaded file content is invalid."))
  }
  writeLines(uploaded_content, con=tmp_file)
  
  # ---------- Read uploaded data ----------
  user_df <- tryCatch({
    df <- readr::read_delim(tmp_file, delim="\t", col_types=readr::cols()) %>%
      dplyr::mutate(Gene = toupper(Gene)) %>%
      dplyr::group_by(Gene) %>%
      dplyr::summarise(dplyr::across(where(is.numeric), ~ mean(.x, na.rm=TRUE)), .groups="drop")
    df
  }, error = function(e){
    res$status <- 400
    return(list(status="error", message=paste("Failed to read uploaded file:", e$message)))
  })

  # ---------- Load mouse TPM ----------
  mouse_file <- "./data/MedianNorm_TPMs_order_Mouse.txt"
  mouse_df <- readr::read_delim(mouse_file, delim="\t", col_types=readr::cols()) %>%
    dplyr::mutate(Gene = toupper(Gene)) %>%
    dplyr::group_by(Gene) %>%
    dplyr::summarise(dplyr::across(where(is.numeric), ~ mean(.x, na.rm=TRUE)), .groups="drop")
  
  df_all <- dplyr::inner_join(mouse_df, user_df, by="Gene")
  cat("[DEBUG] Genes after inner join:", nrow(df_all), "\n")

  X <- df_all %>% tibble::column_to_rownames("Gene") %>% as.matrix()
  X <- log10(X + 1)
  X <- t(X)  # samples x genes

  # ---------- First 9 samples PCA ----------
  X_9 <- X[1:9,,drop=FALSE]
  X_9c <- scale(X_9, center=TRUE, scale=FALSE)
  pc9 <- prcomp(X_9c, center=FALSE, scale.=FALSE, rank.=9)
  scores9 <- as.data.frame(pc9$x)
  scores9$Group <- factor(dplyr::recode(as.character(c(-1,-1,-1,0,0,0,1,1,1)),
                                        "-1"="M1","0"="M0","1"="M2"),
                          levels=c("M0","M1","M2"))
  centroids <- scores9 %>% dplyr::group_by(Group) %>%
    dplyr::summarise(PC1=mean(PC1), PC2=mean(PC2), .groups="drop")

  p9 <- ggplot2::ggplot(scores9, ggplot2::aes(PC1, PC2)) +
    ggplot2::geom_point(ggplot2::aes(color=Group), size=3.2) +
    ggplot2::scale_color_manual(values=c(M0="gray40", M1="red", M2="blue")) +
    ggrepel::geom_label_repel(data=centroids, ggplot2::aes(label=Group, color=Group),
                     fill="white", label.size=0.25, size=4.2,
                     box.padding=0.4, point.padding=0.8, max.overlaps=Inf,
                     segment.color="grey50", show.legend=FALSE) +
    ggplot2::theme_classic(base_size=14) + ggplot2::theme(legend.position="top") +
    ggplot2::labs(title="Mouse Macrophages (in vitro)", x="PC1", y="PC2")
  
  tmp_png9 <- tempfile(fileext=".png")
  tmp_pdf9 <- tempfile(fileext=".pdf")
  ggplot2::ggsave(tmp_png9, p9, width=6, height=5, bg="white")
  ggplot2::ggsave(tmp_pdf9, p9, width=6, height=5, device="pdf", bg="white")

  tmp_csv9 <- tempfile(fileext=".csv")
  write.csv(scores9, tmp_csv9, row.names=FALSE)

  # ---------- Remaining samples PCA ----------
  p_rest_b64 <- NULL
  p_rest_pdf_b64 <- NULL
  scores_rest_csv_b64 <- NULL
  if (nrow(X) > 9) {
    X_rest <- X[10:nrow(X),,drop=FALSE]
    pc_rest <- prcomp(X_rest, center=TRUE, scale.=FALSE,
                      rank.=min(30, nrow(X_rest)-1))
    scores_rest <- as.data.frame(pc_rest$x)
    colnames(scores_rest) <- paste0("PC", seq_len(ncol(scores_rest)))

    p_rest <- ggplot2::ggplot(scores_rest, ggplot2::aes(PC1, PC2)) +
      ggplot2::geom_point(size=2.8, alpha=0.7, color="steelblue") +
      ggplot2::  theme_classic(base_size=14) +
      ggplot2::labs(x="PC1", y="PC2")
    
    tmp_png_rest <- tempfile(fileext=".png")
    tmp_pdf_rest <- tempfile(fileext=".pdf")
    tmp_csv_rest <- tempfile(fileext=".csv")

    ggplot2::ggsave(tmp_png_rest, p_rest, width=6, height=5, bg="white")
    ggplot2::ggsave(tmp_pdf_rest, p_rest, width=6, height=5, device="pdf", bg="white")
    write.csv(scores_rest, tmp_csv_rest, row.names=FALSE)

    p_rest_b64 <- base64enc::dataURI(file=tmp_png_rest, mime="image/png")
    p_rest_pdf_b64 <- base64enc::dataURI(file=tmp_pdf_rest, mime="application/pdf")
    scores_rest_csv_b64 <- base64enc::dataURI(file=tmp_csv_rest, mime="text/csv")
  }

  # ---------- Return JSON ----------
  list(
    status="ok",
    plot9 = base64enc::dataURI(file=tmp_png9, mime="image/png"),
    plot9_pdf = base64enc::dataURI(file=tmp_pdf9, mime="application/pdf"),
    scores9_csv = base64enc::dataURI(file=tmp_csv9, mime="text/csv"),
    plot_rest = p_rest_b64,
    plot_rest_pdf = p_rest_pdf_b64,
    scores_rest_csv = scores_rest_csv_b64
  )
}

########################################################
#Venn/UpSet
########################################################


#* @post /venn-upset
function(req, res) {
  cat("==== /venn-upset CALLED ====\n")
  parsed <- tryCatch({ jsonlite::fromJSON(req$postBody) }, error = function(e) NULL)
  if (is.null(parsed) || is.null(parsed$paths) || length(parsed$paths) < 2) {
    res$status <- 400
    return(list(error = "At least two file paths required"))
  }

  output_path_png <- tempfile(fileext = ".png")
  output_path_pdf <- tempfile(fileext = ".pdf")
  # open the first file to inspect
  result <- generate_venn_or_upset(parsed$paths, output_path_png, output_path_pdf)

  # After saving both PNG and PDF
  pdf_bytes <- readBin(output_path_pdf, what = "raw", n = file.info(output_path_pdf)$size)
  pdf_base64 <- base64enc::base64encode(pdf_bytes)
  png_bytes <- readBin(output_path_png, what = "raw", n = file.info(output_path_png)$size)
  png_base64 <- base64enc::base64encode(png_bytes)

return(list(
  success = TRUE,
  output_png = result$output_png,
  output_pdf = result$output_pdf,
  png_base64 = result$png_base64,
  pdf_base64 = pdf_base64
  ))
}


########################################################
#GOMAP 
########################################################
#* @param mode The mode: "genelist" or "genelist_fc"
#* @param species The species: "mouse" or "human"
#* @param file_path Path to the input gene file
#* @param output_dir Path to the output folder
#* @post /gomap
function(req, res) {
  cat("==== /gomap CALLED ====\n")
  
  # Parse JSON input
  parsed <- tryCatch({ jsonlite::fromJSON(req$postBody) }, error = function(e) NULL)
  
  # Validate required parameters
  if (is.null(parsed) || is.null(parsed$file_path) || is.null(parsed$mode) || is.null(parsed$species)) {
    res$status <- 400
    return(list(success = FALSE, error = "Missing required parameters: file_path, mode, species"))
  }
  
  mode <- parsed$mode
  species <- parsed$species
  file_path <- parsed$file_path
  
  cat("📄 file_path: ", file_path, "\n")
  cat("🔧 mode: ", mode, "\n")
  cat("🧬 species: ", species, "\n")
  
  # Run GO analysis
  tryCatch({
    if (mode == "genelist") {
      cat("==== Running in genelist mode ====\n")
      result <- run_go_from_gene_list(file_path, species)
    } else if (mode == "genelist_fc") {
      cat("==== Running in genelist_fc mode ====\n")
      result <- run_go_from_gene_list_fc(file_path, species)
    } else {
      stop("Invalid mode. Use 'genelist' or 'genelist_fc'.")
    }
    
    # ✅ Return results
    return(list(
      success = TRUE,
      mode = mode,
      barplot_base64 = result$barplot_base64,
      cnetplot_base64 = result$cnetplot_base64,
      unmapped = result$unmapped,
      csv_path = result$csv_path,
      zip_file = basename(result$zip_file),
      output_dir = result$output_dir
          

      
    ))
    
  }, error = function(e) {
    cat("❌ ERROR: ", e$message, "\n")
    res$status <- 500
    return(list(success = FALSE, error = e$message))
  })
}

########################################################
#KEGGMAP 
########################################################
#* @get /downloads/<filename>
function(filename, res) {
  filepath <- file.path("Keggmap_output", filename)
  if (!file.exists(filepath)) {
    res$status <- 404
    return(list(error = "File not found"))
  }
  # Tell browser it's a zip file
  res$setHeader("Content-Type", "application/zip")
  res$setHeader("Content-Disposition", paste0("attachment; filename=", filename))
  readBin(filepath, "raw", n = file.info(filepath)$size)
}
#* @param mode The mode: "genelist" or "genelist_fc"
#* @param species The species: "mouse" or "human"
#* @param file_path Path to the input gene file
#* @param output_dir Path to the output folder
#* @post /keggmap
function(req, res) {
  cat("==== /keggmap CALLED ====\n")
  
  parsed <- tryCatch({ jsonlite::fromJSON(req$postBody) }, error = function(e) NULL)
  if (is.null(parsed) || is.null(parsed$file_path) || is.null(parsed$mode) ||
      is.null(parsed$species)) {
    res$status <- 400
    return(list(success = FALSE, error = "Missing required parameters"))
  }
  
  mode <- parsed$mode
  species <- parsed$species
  file_path <- parsed$file_path
  output_dir <- './Keggmap_output'


  # run KEGG analysis
  tryCatch({
    if (mode == "genelist") {
      cat("==== genelist mode ====\n")
      result <- run_kegg_from_gene_list(file_path, species)
    } else if (mode == "genelist_fc") {
      cat("==== genelist_fc mode ====\n")
      result <- run_kegg_from_gene_list_fc(file_path, species)
    } else {
      stop("Invalid mode. Use 'genelist' or 'genelist_fc'.")
    }

    return(list(
      success = TRUE,
      mode = mode,
      barplot_base64 = result$barplot_base64,
      top10_csv = result$top10_csv,
      full_csv = result$full_csv,
      unmapped = result$unmapped,
      maps = result$maps,
      foldchange_maps = result$foldchange_maps,
      zip_file = result$zip_file,     # ✅ path to zip file
      output_dir = result$output_dir
    ))
    
  }, error = function(e) {
    res$status <- 500
    return(list(success = FALSE, error = e$message))
  })
}

########################################################
#Circos
#######################################################
# plumber.R
# Run (example):
# Rscript -e "pr <- plumber::plumb('plumber.R'); options(plumber.debug=TRUE); pr$run(host='0.0.0.0', port=8000)"

suppressPackageStartupMessages({
  library(plumber)
  library(base64enc)
  library(jsonlite)
})

# Your pipeline should provide: run_circos(files, labels=NULL, gene_col_user=NULL, min_shared=1, output_prefix=...)
source("Circos.R")

# ===================== Config =====================
OUT_DIR <- normalizePath("outputs", mustWork = FALSE)
if (!dir.exists(OUT_DIR)) dir.create(OUT_DIR, recursive = TRUE)

# Serve OUT_DIR at /outputs for easy downloads/testing
#* @plumber
function(pr) {
  pr %>% pr_static("/outputs", OUT_DIR)
}

# ===================== Utils =====================
dbg <- function(...) {
  ts <- format(Sys.time(), "%Y-%m-%d %H:%M:%S")
  cat(paste0("[", ts, "] [circos] ", paste(..., collapse = " ")), "\n", file = stderr())
}
`%||%` <- function(a,b) if (!is.null(a) && length(a)>0) a else b

# Normalize many upload shapes to (paths, names_guess)
normalize_uploads_to_paths <- function(uploads) {
  paths <- character(length(uploads))
  names_guess <- character(length(uploads))
  for (i in seq_along(uploads)) {
    u  <- uploads[[i]]
    nm <- names(uploads)[i] %||% paste0("#", i)

    # A) plumber form_file
    if (is.list(u) && !is.null(u$datapath) && file.exists(u$datapath)) {
      paths[i] <- u$datapath
      names_guess[i] <- u$filename %||% basename(u$datapath)
      next
    }
    # B) list(raw)
    if (is.list(u) && length(u) == 1 && is.raw(u[[1]])) {
      tmp <- tempfile(fileext = ".bin"); writeBin(u[[1]], tmp)
      paths[i] <- tmp; names_guess[i] <- nm; next
    }
    # C) raw
    if (is.raw(u)) {
      tmp <- tempfile(fileext = ".bin"); writeBin(u, tmp)
      paths[i] <- tmp; names_guess[i] <- nm; next
    }
    # D) path on disk
    if (is.character(u) && length(u) == 1 && file.exists(u)) {
      paths[i] <- u; names_guess[i] <- basename(u); next
    }
    # E) character payload (multipart parsed as text)
    if (is.character(u) && length(u) == 1) {
      tmp <- tempfile(fileext = ".txt"); writeLines(u, tmp, useBytes = TRUE)
      paths[i] <- tmp; names_guess[i] <- nm; next
    }

    stop(sprintf("Part %s is not a valid file upload.", nm))
  }
  list(paths = paths, names_guess = names_guess)
}

# Flatten odd list params to a scalar
to_scalar <- function(x, default = NULL) {
  if (is.null(x)) return(default)
  if (is.list(x)) {
    if (!length(x)) return(default)
    x <- x[[1]]
  }
  if (!length(x)) return(default)
  x
}

# Preferred: labels_json (any shape). Fallback: repeated 'labels' or single CSV string.
parse_labels <- function(labels, labels_json, names_guess, n_paths) {
  stems <- sub("\\.[^.]+$", "", basename(names_guess))

  coerce_to_labels <- function(obj) {
    if (is.null(obj)) return(NULL)

    # Unwrap lists (Plumber may give list-of-vectors)
    if (is.list(obj)) obj <- unlist(obj, use.names = FALSE)

    # raw -> text
    if (is.raw(obj)) obj <- rawToChar(obj)

    # Character cases
    if (is.character(obj)) {
      # Already a character vector of labels
      if (length(obj) > 1) {
        lbl <- trimws(obj)
        return(lbl)
      }
      # Single string: try JSON array then CSV then single label
      s <- as.character(obj[1])

      # JSON?
      lbl <- tryCatch(jsonlite::fromJSON(s), error = function(e) NULL)
      if (is.character(lbl)) {
        return(trimws(lbl))
      }
      # CSV?
      if (grepl(",", s, fixed = TRUE)) {
        lbl <- strsplit(s, ",", fixed = TRUE)[[1]]
        return(trimws(lbl))
      }
      # Single scalar label
      return(trimws(s))
    }

    NULL
  }

  # 1) Try labels_json first (any shape)
  lbl <- coerce_to_labels(labels_json)

  # 2) Fallback: repeated labels or CSV
  if (is.null(lbl) || !length(lbl)) {
    lbl <- coerce_to_labels(labels)
  }

  # 3) If still empty, default to stems
  if (is.null(lbl) || !length(lbl)) {
    lbl <- stems
  }

  # 4) Pad/trim to n_paths and fill blanks with stems
  length(lbl) <- n_paths
  need <- which(!nzchar(lbl) | is.na(lbl))
  if (length(need)) lbl[need] <- stems[need]

  lbl
}

# ===================== Logger filter =====================
#* @filter logger
function(req, res) {
  dbg("REQ", req$REQUEST_METHOD, req$PATH_INFO, "ct:", req$HEADERS[["content-type"]] %||% "<none>")
  forward()
}

# ===================== Endpoint =====================
#* Upload ≥2 files (CSV/TSV/TXT). Returns labels_used, plot URLs/base64, link counts.
#* @post /circos
#* @serializer json
function(req, res,
         files = "",                 # repeat 'files=@path' (avoid NULL default warnings)
         labels = "",                # repeated OR comma-separated
         labels_json = "",           # JSON array (preferred; can also arrive as list/vector)
         gene_col_user = "",         # empty => NULL
         min_shared = "1",           # parse to int
         ...) {

  # 1) Gather uploads from explicit args, dots, and req$files
  uploads <- list()
  if (!identical(files, "") && !is.null(files)) {
    if (!is.list(files)) files <- list(files)
    uploads <- c(uploads, files)
  }
  dots <- list(...)
  if (length(dots)) {
    dots <- dots[!names(dots) %in% c("req","res")]
    uploads <- c(uploads, dots)
  }
  if (!is.null(req$files) && length(req$files)) {
    uploads <- c(uploads, unname(req$files))
  }
  dbg("uploads_n =", length(uploads))
  if (length(uploads) < 2) {
    res$status <- 400
    return(list(error = "Upload at least 2 files via multipart/form-data (repeat 'files=@path')."))
  }

  # 2) Normalize uploads to temp paths
  norm <- tryCatch(normalize_uploads_to_paths(uploads),
                   error = function(e){ res$status <- 400; return(list(error=e$message)) })
  if (!is.null(norm$error)) return(norm)
  paths <- norm$paths
  names_guess <- norm$names_guess
  dbg("paths:", paste(paths, collapse=" | "))
  dbg("names:", paste(names_guess, collapse=" | "))

  # 3) Raw debug (to see shapes arriving)
  dbg("RAW labels:",      paste0(capture.output(str(labels)), collapse=" "))
  dbg("RAW labels_json:", paste0(capture.output(str(labels_json)), collapse=" "))

  # 4) Parse labels (robust to all shapes)
  labels_in <- parse_labels(
    labels       = if (identical(labels, "")) NULL else labels,
    labels_json  = labels_json,
    names_guess  = names_guess,
    n_paths      = length(paths)
  )
  dbg("labels_in:", paste(labels_in, collapse = " | "))

  # 5) Other params
  gcol <- to_scalar(gene_col_user, default = "")
  gcol <- as.character(gcol); if (!nzchar(gcol)) gcol <- NULL

  ms_input <- to_scalar(min_shared, default = "1")
  ms <- suppressWarnings(as.integer(as.character(ms_input)[1]))
  if (is.na(ms) || ms < 1L) ms <- 1L
  dbg("min_shared:", ms)

  # sanity: non-empty files
  readable <- vapply(paths, function(p) file.exists(p) && file.info(p)$size > 0, logical(1))
  if (!all(readable)) {
    res$status <- 400
    return(list(error = "One or more uploaded files are missing or empty.", paths = paths, readable = as.list(readable)))
  }

  # 6) Run pipeline (write into OUT_DIR for stable URLs)
  prefix <- file.path(OUT_DIR, paste0("circos_", as.integer(Sys.time())))
  result <- tryCatch({
    run_circos(
      files          = paths,
      labels         = as.character(labels_in),   # <-- use parsed labels
      gene_col_user  = gcol,
      min_shared     = ms,
      output_prefix  = prefix
    )
  }, error = function(e) {
    res$status <- 500
    return(list(error = paste("run_circos failed:", e$message)))
  })
  if (!is.list(result) || is.null(result$plot_paths)) return(result)

  png_path <- result$plot_paths$png_path
  pdf_path <- result$plot_paths$pdf_path
  png_url  <- paste0("/outputs/", basename(png_path))
  pdf_url  <- paste0("/outputs/", basename(pdf_path))

  # Base64 (optional for proxying through Flask)
  png_b64 <- tryCatch(base64encode(png_path), error = function(e) NULL)
  pdf_b64 <- tryCatch(base64encode(pdf_path), error = function(e) NULL)

  # 7) Response
  list(
    success      = TRUE,
    labels_used  = as.list(as.character(labels_in)),  # verify in UI
    n_genes      = nrow(result$binary_df),
    n_links      = nrow(result$links_df),
    plots        = list(
      png_path   = png_path,
      pdf_path   = pdf_path,
      png_url    = png_url,
      pdf_url    = pdf_url,
      png_base64 = png_b64,
      pdf_base64 = pdf_b64
    ),
    preview      = head(result$links_df, 50)
  )
}


########################################################
#Text Mining
########################################################

# ---------- Health check ----------
#* Health check
#* @get /health
function() {
  list(ok = TRUE, time = as.character(Sys.time()))
}

# ---------- Main endpoint ----------
#* PubMed text mining (genes file + optional term)
#*
#* @serializer json list(na="null", auto_unbox=TRUE, pretty=FALSE)
#* @post /api/textmining
function(req, res) {
  # Multipart form fields:
  # - genes: file (required)
  # - mode: "gene_only" | "gene_term" (optional, default gene_only)
  # - term: string (optional when mode=gene_term)

  # Validate upload
  if (is.null(req$files) || is.null(req$files$genes) || is.na(req$files$genes$datapath)) {
    res$status <- 400
    return(list(success = FALSE, error = "Missing 'genes' file (multipart/form-data)."))
  }

  genes_path <- req$files$genes$datapath
  mode <- req$body$mode %||% "gene_only"
  term <- req$body$term %||% ""

  # Sanity checks
  if (!file.exists(genes_path)) {
    res$status <- 400
    return(list(success = FALSE, error = "Uploaded file not found on server."))
  }
  if (!(mode %in% c("gene_only", "gene_term"))) {
    res$status <- 400
    return(list(success = FALSE, error = "Invalid 'mode'. Use 'gene_only' or 'gene_term'."))
  }

  # Run analysis (wrap in tryCatch to return JSON errors)
  out <- tryCatch({
    run_pubmed_analysis(
      file_path = genes_path,
      mode      = mode,
      term      = term,
      # You can tune these defaults if needed:
      top_n_per_gene          = 3,
      sleep_sec               = 0.34,
      wc_seed                 = 42,
      wc_max_words            = 200,
      wc_min_freq             = 1,
      wc_scale                = c(4, 0.7),
      summaries_for_zero_hits = FALSE
    )
  }, error = function(e) {
    res$status <- 500
    list(success = FALSE, error = paste("Server error:", conditionMessage(e)))
  })

  # Ensure response is always JSON serializable
  out
}

# helper for null-coalescing (keeps this file self-contained)
`%||%` <- function(a, b) if (!is.null(a) && length(a) > 0) a else b

