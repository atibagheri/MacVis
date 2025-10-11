# plumber-transpca.R — PCA projection + one-marker overlay
suppressPackageStartupMessages({
  library(plumber)
  library(dplyr); library(tidyr); library(readr); library(tibble)
  library(ggplot2); library(ggrepel)
  library(base64enc); library(jsonlite)
  library(grid)
})

options(stringsAsFactors = FALSE)
options(plumber.maxRequestSize = 200 * 1024^2)  # 200 MB uploads

# ---------- CONFIG ----------
DEFAULT_MOUSE_TPM <- Sys.getenv(
  "MOUSE_TPM_PATH",
  unset = "./data/MedianNorm_TPMs_order_Mouse.txt"   # tab-delimited .txt
)
# Fixed color scale for marker expression (in TPM)
FIXED_TPM_MAX <- as.numeric(Sys.getenv("MARKER_TPM_MAX", "100"))

# Default marker panel (case-insensitive matching is handled below)
DEFAULT_MARKERS <- data.frame(
  Gene   = c("IL1B","IL6","IL23A","TNF","IL10","TGFB1","CCL1","CCL2","CCL17","CCL18","CCL22"),
  Class  = c("M1","M1","M1","M1","M2","M2","M2","M2","M2","M2","M2"),
  stringsAsFactors = FALSE
)

# ---------- SMALL HELPERS ----------
`%||%` <- function(x, y) if (is.null(x)) y else x
b64uri <- function(path, mime) base64enc::dataURI(file = path, mime = mime)

.norm <- function(x) toupper(gsub("[^A-Za-z0-9]+", "", x))
find_col <- function(df, candidates) {
  if (length(names(df)) == 0) return("")
  nm_std   <- .norm(names(df))
  cand_std <- .norm(candidates)
  idx <- match(cand_std, nm_std, nomatch = 0)
  if (any(idx > 0)) names(df)[idx[idx > 0][1]] else ""
}

clean_id <- function(x) {
  x <- as.character(x); x <- trimws(x)
  x <- gsub("[^A-Za-z0-9]+", "", x, perl = TRUE)
  toupper(x)
}

# Readers
read_table_auto <- function(path) {
  ext <- tolower(tools::file_ext(path))
  if (ext == "csv") readr::read_csv(path, show_col_types = FALSE)
  else              readr::read_tsv(path, show_col_types = FALSE)
}
read_table_preview <- function(path, n = 5) {
  ext <- tolower(tools::file_ext(path))
  if (ext == "csv") readr::read_csv(path, n_max = n, show_col_types = FALSE)
  else              readr::read_tsv(path, n_max = n, show_col_types = FALSE)
}

# JSON-escaped file → clean .txt with real tabs/newlines
canonicalize_table_path <- function(path) {
  if (!file.exists(path)) return(list(ok=FALSE, path=path, fixed=FALSE, reason="missing"))
  sz <- file.info(path)$size
  nread <- min(256 * 1024, sz)
  raw_head <- readBin(path, "raw", n = nread)
  txt_head <- tryCatch(rawToChar(raw_head), error=function(e) "")
  has_real_tab  <- any(raw_head == as.raw(9))
  looks_jsonish <- grepl("^\\s*\\[", txt_head) || grepl('^\\s*"', txt_head)
  has_esc_tabs  <- grepl("\\\\t", txt_head)

  if (has_real_tab && !looks_jsonish && !has_esc_tabs) {
    return(list(ok=TRUE, path=path, fixed=FALSE))
  }

  whole <- readChar(path, sz, useBytes = TRUE)
  decoded <- tryCatch(jsonlite::fromJSON(whole), error = function(e) NULL)
  if (is.character(decoded)) {
    lines <- if (length(decoded) == 1) {
      unlist(strsplit(decoded, "\\\\r?\\\\n", perl = TRUE), use.names = FALSE)
    } else decoded
    lines <- gsub("\\\\t", "\t", lines, perl = TRUE)
    tmp <- tempfile(fileext = ".txt")
    writeLines(lines, tmp, useBytes = TRUE)
    return(list(ok=TRUE, path=tmp, fixed=TRUE))
  }

  if (has_esc_tabs && !has_real_tab) {
    s <- gsub("\\\\r?\\\\n", "\n", whole, perl = TRUE)
    s <- gsub("\\\\t", "\t", s,  perl = TRUE)
    tmp <- tempfile(fileext = ".txt")
    writeChar(s, tmp, eos = NULL, useBytes = TRUE)
    return(list(ok=TRUE, path=tmp, fixed=FALSE))
  }

  list(ok=TRUE, path=path, fixed=FALSE)
}

collapse_dup_genes <- function(df) {
  stopifnot("Gene" %in% names(df))
  num_cols <- setdiff(names(df), "Gene")
  for (cn in num_cols) {
    if (!is.numeric(df[[cn]])) suppressWarnings(df[[cn]] <- as.numeric(df[[cn]]))
  }
  df %>%
    mutate(Gene = toupper(Gene)) %>%
    group_by(Gene) %>%
    summarise(across(where(is.numeric), ~ mean(.x, na.rm = TRUE)), .groups = "drop")
}

# choose aesthetics
pick_aes <- function(scr, explicit = list(size=NULL, color=NULL, shape=NULL, label=NULL)) {
  pc_cols <- grep("^PC\\d+$", names(scr), value = TRUE)
  ignore  <- unique(c("Sample", pc_cols))
  num_candidates <- setdiff(names(Filter(is.numeric, scr)), ignore)
  cat_candidates <- setdiff(names(Filter(function(v) is.character(v) || is.factor(v), scr)), ignore)

  size_col <- NULL
  if (!is.null(explicit$size) && explicit$size %in% names(scr) && is.numeric(scr[[explicit$size]])) {
    size_col <- explicit$size
  } else if ("Day" %in% names(scr) && is.numeric(scr$Day)) {
    size_col <- "Day"
  } else if (length(num_candidates)) size_col <- num_candidates[1]

  color_col <- NULL
  if (!is.null(explicit$color) && explicit$color %in% names(scr)) color_col <- explicit$color
  else for (cn in cat_candidates) { u <- length(unique(scr[[cn]][!is.na(scr[[cn]])])); if (u>=2 && u<=12) { color_col <- cn; break } }

  shape_col <- NULL
  if (!is.null(explicit$shape) && explicit$shape %in% names(scr)) shape_col <- explicit$shape
  else for (cn in setdiff(cat_candidates, color_col)) { u <- length(unique(scr[[cn]][!is.na(scr[[cn]])])); if (u>=2 && u<=6) { shape_col <- cn; break } }

  label_col <- NULL
  if (!is.null(explicit$label) && explicit$label %in% names(scr)) label_col <- explicit$label
  else if ("SampleName" %in% names(scr)) label_col <- "SampleName"
  else if ("Label" %in% names(scr)) label_col <- "Label"

  to_chr <- function(v) if (is.null(v) || !nzchar(v)) "" else as.character(v)
  list(size=to_chr(size_col), color=to_chr(color_col), shape=to_chr(shape_col), label=to_chr(label_col))
}

# build M1/M2 lookup (uppercased keys)
marker_class_map <- function(markers_df = DEFAULT_MARKERS) {
  m <- toupper(markers_df$Gene)
  setNames(as.list(markers_df$Class), m)
}

# ---------- CORE (final, single marker overlay in green) ----------
run_transpca_core <- function(user_path,
                              mouse_tpm = DEFAULT_MOUSE_TPM,
                              meta_path = NULL,
                              size_col = NULL, color_col = NULL,
                              shape_col = NULL, label_col = NULL,
                              marker = NULL,
                              markers_df = NULL) {

  # Canonicalize & read
  can <- canonicalize_table_path(mouse_tpm)
  if (!can$ok) stop("Mouse TPM file not found: ", mouse_tpm)
  mouse_path <- can$path
  if (!file.exists(user_path)) stop("User file not found: ", user_path)

  df_mouse <- read_table_auto(mouse_path) %>% collapse_dup_genes()
  df_user  <- read_table_auto(user_path)  %>% collapse_dup_genes()

  if (!("Gene" %in% names(df_mouse)) || !("Gene" %in% names(df_user)))
    stop("Both mouse and user files must contain a 'Gene' column.")

  df_all <- inner_join(df_mouse, df_user, by = "Gene")
  if (nrow(df_all) == 0) stop("No overlapping genes after join.")

  M <- df_all %>% column_to_rownames("Gene") %>% as.matrix()
  if (!all(vapply(as.data.frame(M), is.numeric, logical(1))))
    stop("Non-numeric columns after join.")
  X <- t(log10(M + 1))
  rownames(X) <- colnames(M)
  if (nrow(X) < 9) stop(sprintf("Need at least 9 samples; got %d.", nrow(X)))

  # --- Mouse (first 9) ---
  X9  <- X[1:9, , drop = FALSE]
  X9c <- scale(X9, center = TRUE, scale = FALSE)
  pc9 <- prcomp(X9c, center = FALSE, scale. = FALSE, rank. = 9)
  scores9 <- as.data.frame(pc9$x) %>% tibble::rownames_to_column("Sample")
  grp <- rep(c(-1,-1,-1,0,0,0,1,1,1), length.out = nrow(scores9))
  scores9$Group <- factor(dplyr::recode(as.character(grp), "-1"="M1","0"="M0","1"="M2"),
                          levels = c("M0","M1","M2"))
  cents <- scores9 %>% group_by(Group) %>% summarise(PC1=mean(PC1), PC2=mean(PC2), .groups="drop")

  p9 <- ggplot(scores9, aes(PC1, PC2)) +
    geom_point(aes(color = Group), size = 3.2, shape = 16) +
    scale_color_manual(values = c(M0="gray40", M1="red", M2="blue"), name = NULL) +
    ggrepel::geom_label_repel(data = cents, aes(label = Group, color = Group),
      fill = "white", label.size = 0.25, size = 4.2,
      box.padding = 0.4, point.padding = 0.8, max.overlaps = Inf,
      segment.color = "grey50", show.legend = FALSE) +
    theme_classic(base_size = 14) +
    labs(title = "Mouse Macrophages (in vitro)", x = "PC1", y = "PC2")

  png9 <- tempfile(fileext = ".png"); pdf9 <- tempfile(fileext = ".pdf"); csv9 <- tempfile(fileext = ".csv")
  ggsave(png9, p9, width = 6, height = 5, bg = "white")
  ggsave(pdf9, p9, width = 6, height = 5, device = "pdf", bg = "white")
  write.csv(scores9, csv9, row.names = FALSE)

  out <- list(
    status = "ok",
    plot9 = b64uri(png9, "image/png"),
    plot9_pdf = b64uri(pdf9, "application/pdf"),
    scores9_csv = b64uri(csv9, "text/csv"),
    notes = list(mouse_tpm_auto_fixed = can$fixed)
  )

  # --- Remaining (user) ---
  if (nrow(X) > 9) {
    Xr  <- X[10:nrow(X), , drop = FALSE]
    pcr <- prcomp(Xr, center = TRUE, scale. = FALSE,
                  rank. = max(2, min(30, nrow(Xr) - 1)))
    scr <- as.data.frame(pcr$x)
    colnames(scr) <- paste0("PC", seq_len(ncol(scr)))
    scr$Sample <- rownames(Xr)

    meta_preview <- NULL
    join_method  <- "none"
    matched_n    <- 0

    # --- metadata join (fuzzy) ---
    if (!is.null(meta_path) && file.exists(meta_path)) {
      meta <- tryCatch(read_table_auto(meta_path), error = function(e) NULL)
      if (!is.null(meta) && nrow(meta) > 0) {
        meta <- meta %>% mutate(across(where(is.character), ~ trimws(.x)))
        meta_preview <- unclass(as.data.frame(head(meta, 20)))

        key_guess <- find_col(meta, c("Sample","SampleName","Sample_ID","SampleID",
                                      "Sample_ID_clean","ID","Name"))
        best <- -1; best_key <- NA_character_
        scr_clean <- clean_id(scr$Sample)
        for (cn in names(meta)) if (is.character(meta[[cn]])) {
          ov <- sum(clean_id(meta[[cn]]) %in% scr_clean, na.rm = TRUE)
          if (ov > best) { best <- ov; best_key <- cn }
        }
        key <- if (best > 0) best_key else key_guess

        if (!is.na(key) && nzchar(key) && best > 0) {
          meta2 <- meta %>% mutate(.KEY = clean_id(.data[[key]]))
          scr2  <- data.frame(scr, check.names = FALSE) %>% mutate(.KEY = scr_clean)
          scr2  <- dplyr::left_join(scr2, meta2 %>% dplyr::select(-all_of(key)), by = ".KEY")
          scr2$.KEY <- NULL
          scr <- tibble::as_tibble(scr2)
          join_method <- sprintf("by_key:%s", key)
          matched_n   <- best
        } else if (nrow(meta) == nrow(scr)) {
          for (cn in names(meta)) scr[[cn]] <- meta[[cn]]
          join_method <- "by_order"
          matched_n   <- nrow(scr)
        } else {
          join_method <- "failed"
        }

        # coerce Day if numeric-like and normalize name
        day_col <- find_col(scr, "Day")
        if (nzchar(day_col) && !is.numeric(scr[[day_col]])) {
          suppressWarnings({
            dnum <- as.numeric(scr[[day_col]])
            if (sum(!is.na(dnum)) >= sum(!is.na(scr[[day_col]])) * 0.9)
              scr[[day_col]] <- dnum
          })
          names(scr)[names(scr) == day_col] <- "Day"
        }

        # small factorization of short character columns
        for (cn in names(scr)) {
          if (is.character(scr[[cn]])) {
            u <- unique(scr[[cn]][!is.na(scr[[cn]])])
            if (length(u) > 1 && length(u) <= 30) scr[[cn]] <- factor(scr[[cn]])
          }
        }
      } else {
        out$notes$metadata_read_failed <- TRUE
        join_method <- "read_failed"
      }
    }

    # preferred aesthetics (unchanged)
    preferred_color <- ""
    for (nm in c("WoundZone","Group","Condition","Treatment","Phenotype","Cluster")) {
      col <- find_col(scr, nm); if (nzchar(col)) { preferred_color <- col; break }
    }
    preferred_shape <- ""
    for (nm in c("Group","Condition","Treatment","Batch")) {
      col <- find_col(scr, nm); if (nzchar(col) && !identical(col, preferred_color)) { preferred_shape <- col; break }
    }

    used_cols <- pick_aes(
      scr,
      explicit = list(
        size  = find_col(scr, "Day"),
        color = color_col %||% preferred_color,
        shape = shape_col %||% preferred_shape,
        label = label_col %||% find_col(scr, c("SampleName","Label"))
      )
    )

    drop_if_bad <- function(name) {
      if (!nzchar(name) || !(name %in% names(scr))) return("")
      v <- scr[[name]]
      if (all(is.na(v))) return("")
      if (length(unique(v[!is.na(v)])) < 2) return("")
      name
    }
    used_cols$color <- drop_if_bad(used_cols$color)
    used_cols$shape <- drop_if_bad(used_cols$shape)

    # ----- BASE LAYER: keep metadata aesthetics (color/shape/size) -----
    base_aes <- list(x = "PC1", y = "PC2")
    if (nzchar(used_cols$size))  base_aes$size   <- used_cols$size
    if (nzchar(used_cols$color)) base_aes$colour <- used_cols$color
    if (nzchar(used_cols$shape)) base_aes$shape  <- used_cols$shape
    base_map <- do.call(ggplot2::aes_string, base_aes)

    p_rest <- ggplot(scr, base_map) +
      geom_point(alpha = 0.85) +
      theme_classic(base_size = 14) +
      labs(title = "PCA", x = "Macrophage Latent Space1", y = "Macrophage Latent Space2")
      

    # ------------------------ MARKER & BASE LOGIC ------------------------
    has_marker <- (!is.null(marker) && nzchar(marker))
    scr$MarkerExprScaled <- NA_real_

    if (has_marker) {
      gene_upper <- toupper(trimws(marker))
      gene_idx   <- match(gene_upper, toupper(colnames(Xr)))
      if (!is.na(gene_idx)) {
        expr_log <- suppressWarnings(as.numeric(Xr[, gene_idx]))  # log10(TPM+1)
        expr_tpm <- pmax(0, 10^expr_log - 1)
        scr$MarkerExprScaled <- pmin(pmax(expr_tpm / FIXED_TPM_MAX, 0), 1)
      } else {
        has_marker <- FALSE
        out$notes$marker_not_found <- gene_upper
      }
    }

    aes_list <- list(x = "PC1", y = "PC2 ")
    if (nzchar(used_cols$size))  aes_list$size  <- used_cols$size
    if (nzchar(used_cols$shape)) aes_list$shape <- used_cols$shape

    green_pal <- c("#cce7c9","#acd8a7","#8bca84","#72bf6a",
                   "#5bb450","#52a447","#46923c","#3b8132","#276221")

    if (!has_marker) {
      if (nzchar(used_cols$color)) aes_list$colour <- used_cols$color
      base_map <- do.call(ggplot2::aes_string, aes_list)

      p_rest <- ggplot(scr, base_map) +
        { if (nzchar(used_cols$color))
            geom_point(alpha = 0.85, shape = 16, stroke = 0)
          else
            geom_point(alpha = 0.85, colour = "black", shape = 16, stroke = 0)
        } +
        theme_classic(base_size = 14) +
        labs(title = "PCA", x = "Macrophage Latent Space 1", y = "Macrophage Latent Space 2")

    } else {
      aes_list$colour <- "MarkerExprScaled"
      base_map <- do.call(ggplot2::aes_string, aes_list)

      p_rest <- ggplot(scr, base_map) +
        geom_point(alpha = 0.95, shape = 16, stroke = 0) +
        scale_colour_gradientn(
          colours = green_pal, limits = c(0, 1),
          breaks  = c(0, .25, .5, .75, 1),
          labels  = function(v) sprintf("%.0f", v * FIXED_TPM_MAX),
          name    = sprintf("%s expr (TPM)", gene_upper)
        ) +
        theme_classic(base_size = 14) +
        labs(title = "PCA", x = "Macrophage Latent Space 1", y = "Macrophage Latent Space 2")

      top_i <- suppressWarnings(which.max(scr$MarkerExprScaled))
      if (length(top_i) == 1 && is.finite(top_i) && !is.na(scr$MarkerExprScaled[top_i])) {
        lab_txt <- if (nzchar(used_cols$label)) as.character(scr[[used_cols$label]][top_i]) else gene_upper
        p_rest <- p_rest + ggrepel::geom_label_repel(
          data = scr[top_i, , drop = FALSE],
          aes(PC1, PC2, label = lab_txt),
          inherit.aes = FALSE,
          size = 3.2, fill = "white", label.size = 0.25,
          box.padding = 0.35, point.padding = 0.7, segment.color = "grey60"
        )
      }

      out$notes$marker              <- gene_upper
      out$notes$marker_scale_tpmmax <- FIXED_TPM_MAX
    }

    # ---- COMPACT size legend: start at 1, include max ----
    if (nzchar(used_cols$size)) {
      day_vals <- sort(unique(scr[[used_cols$size]]))
      max_day  <- max(day_vals, na.rm = TRUE)

      # Candidate ticks: 1, then 5-step grid, always include max
      ticks <- unique(sort(c(1, seq(5, max_day, by = 5), max_day)))

      # If too many, keep 1 and max, pick evenly spaced mids (total <= 6)
      if (length(ticks) > 6) {
        mids <- ticks[ticks > 1 & ticks < max_day]
        keep_mids <- mids[round(seq(1, length(mids), length.out = 4))]
        ticks <- unique(c(1, keep_mids, max_day))
      }

      p_rest <- p_rest + scale_size_continuous(
        range  = c(2, 7),
        limits = c(1, max_day),
        breaks = ticks,
        labels = as.character(ticks),
        name   = "Day",
        guide  = guide_legend(
          title.position = "top",
          keyheight = grid::unit(4, "mm"),
          keywidth  = grid::unit(4, "mm"),
          override.aes = list(alpha = 1)
        )
      )
    }

    # Optional text labels
    if (nzchar(used_cols$label))
      p_rest <- p_rest + ggrepel::geom_text_repel(
        ggplot2::aes_string(label = used_cols$label),
        size = 3, max.overlaps = 50
      )

    # ----- export -----
    png_r <- tempfile(fileext = ".png"); pdf_r <- tempfile(fileext = ".pdf"); csv_r <- tempfile(fileext = ".csv")
    ggsave(png_r, p_rest, width = 6.5, height = 5.2, bg = "white")
    ggsave(pdf_r, p_rest, width = 6.5, height = 5.2, device = "pdf", bg = "white")
    write.csv(scr, csv_r, row.names = FALSE)

    out$plot_rest        <- b64uri(png_r, "image/png")
    out$plot_rest_pdf    <- b64uri(pdf_r, "application/pdf")
    out$scores_rest_csv  <- b64uri(csv_r, "text/csv")
    out$meta_preview     <- meta_preview
    out$meta_used_cols   <- used_cols
    out$notes$aes_chosen <- used_cols
    out$notes$matched    <- matched_n
    out$notes$meta_join  <- join_method
  }

  out
}
