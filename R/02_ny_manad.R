# 02_ny_manad.R
# Kontrollerar om SCB har publicerat en ny månad sedan appen senast
# uppdaterades. Används av den schemalagda körningen
# (.github/workflows/manadskorning.yml) men kan också köras lokalt.
#
# Jämför senaste månaden i alla tre tabellerna med senaste_manad i
# app/data/meta.json. Ny månad räknas bara när alla tre tabellerna har
# den, så att appen aldrig blandar månader mellan flikarna.
#
# Skriver ny_manad=true|false och manad=ÅÅÅÅMmm till $GITHUB_OUTPUT
# när skriptet körs i GitHub Actions, och skriver alltid ut resultatet.

library(pxweb)
library(here)

source(here("R", "00_installningar.R"))   # url_arbstatus m.fl.

# Senaste månaden i en tabell enligt API:ts metadata
senaste_i_tabell <- function(url) {
  meta <- pxweb_get(url)
  tid <- Filter(\(v) v$code == "Tid", meta$variables)[[1]]
  max(unlist(tid$values))
}

tabeller <- c(ArbStatusM = url_arbstatus, ArbStatFAT12 = url_fat12,
              ArbStDoNMNN = url_bransch)
i_scb <- vapply(tabeller, senaste_i_tabell, character(1))
scb <- min(i_scb)   # månaden som alla tre tabellerna har

i_appen <- jsonlite::read_json(
  here("app", "data", "meta.json"))$meta$senaste_manad

# "2026M09" > "2026M08" fungerar som textjämförelse
ny <- scb > i_appen

cat("Senaste månad i SCB:",
    paste(names(i_scb), i_scb, sep = " ", collapse = ", "), "\n")
cat("Senaste månad i appen:", i_appen, "\n")
cat(if (ny) paste("Ny månad:", scb) else "Ingen ny månad", "\n")

utfil <- Sys.getenv("GITHUB_OUTPUT")
if (nzchar(utfil)) {
  cat(sprintf("ny_manad=%s\nmanad=%s\n", tolower(ny), scb),
      file = utfil, append = TRUE)
}
