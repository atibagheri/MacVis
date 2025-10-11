# keep your base as-is (on M1, don't force amd64)
FROM rocker/r-ver:4.5.1
ENV DEBIAN_FRONTEND=noninteractive

RUN set -eux; \
  sed -i 's|http://|https://|g' /etc/apt/sources.list; \
  apt-get update; \
  apt-get install -y --no-install-recommends \
    build-essential gfortran pkg-config \
    libcurl4-openssl-dev libssl-dev libxml2-dev libgit2-dev \
    zlib1g-dev libsodium-dev \
    libpng-dev libjpeg-dev libtiff5-dev \
    libfreetype6-dev libfontconfig1-dev libharfbuzz-dev libfribidi-dev \
    libudunits2-dev \
    libglpk-dev \
    fonts-dejavu-core curl git unzip; \
  apt-get clean; rm -rf /var/lib/apt/lists/*

# (keep your Bioc/CRAN install RUN steps the same)


# --- R / Bioconductor pkgs ---
RUN R -q -e "options(Ncpus=max(1, parallel::detectCores()-1)); \
  if (!requireNamespace('BiocManager', quietly=TRUE)) \
    install.packages('BiocManager', repos='https://cloud.r-project.org'); \
  BiocManager::install(version='3.21', ask=FALSE, update=TRUE)"

RUN R -q -e "pkgs <- c('clusterProfiler','enrichplot','org.Mm.eg.db','org.Hs.eg.db','pathview'); \
  BiocManager::install(pkgs, ask=FALSE, update=TRUE); \
  missing <- pkgs[!vapply(pkgs, requireNamespace, logical(1), quietly=TRUE)]; \
  if(length(missing)) stop(sprintf('Missing Bioc pkgs: %s', paste(missing, collapse=', ')))"

RUN R -q -e "pkgs <- c('plumber','jsonlite','dplyr','tidyr','readr','tibble','ggplot2','ggrepel', \
  'base64enc','rentrez','wordcloud','RColorBrewer','stringr','purrr','zip','openxlsx','circlize', \
  'tools','gridExtra','VennDiagram','UpSetR','futile.logger','ggplotify','ggnewscale'); \
  install.packages(pkgs, repos='https://cloud.r-project.org'); \
  missing <- pkgs[!vapply(pkgs, requireNamespace, logical(1), quietly=TRUE)]; \
  if(length(missing)) stop(sprintf('Missing CRAN pkgs: %s', paste(missing, collapse=', ')))"

# --- App ---
WORKDIR /app
COPY . /app

EXPOSE 8000
CMD ["Rscript","run_api.R"]
