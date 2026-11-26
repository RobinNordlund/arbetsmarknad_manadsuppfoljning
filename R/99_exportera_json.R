# 99_exportera_json.R
# Validerar (R/98_validera.R) och exporterar sedan JSON till app/data/
# och/eller rapport/data/, beroende på vilken mapp som finns. Kopierar
# också geo/*.geojson dit så att publicerade sidor når geometrierna.
#
# JSON-format: { "meta": { titel, kalla, enhet, uppdaterad, ... },
#                "data": [ { ... en rad per post ... } ] }

library(tidyverse)
library(here)

source(here("R", "98_validera.R"))   # stoppar vid fel

mappar <- c(here("app", "data"), here("rapport", "data"))
mappar <- mappar[dir.exists(dirname(mappar))]
if (length(mappar) == 0) stop("Hittar varken app/ eller rapport/.")
walk(mappar, dir.create, showWarnings = FALSE)

kalla <- "Källa: SCB och Göteborgs Stads statistikdatabas"

skriv_json <- function(data, filnamn, titel, enhet, ...) {
  innehall <- list(
    meta = list(titel = titel, kalla = kalla, enhet = enhet,
                uppdaterad = format(Sys.Date()), ...),
    data = data
  )
  for (mapp in mappar) {
    fil <- file.path(mapp, filnamn)
    jsonlite::write_json(innehall, fil, auto_unbox = TRUE, digits = NA)
    validera_json(fil)
  }
}

# --- EXEMPEL: ersätt med projektets filer ---
b <- read_rds(here("data", "processed", "befolkning.rds"))

skriv_json(b$goteborg, "befolkning_goteborg.json",
           "Folkmängd i Göteborg", "antal personer")
skriv_json(b$stadsomrade, "befolkning_stadsomrade.json",
           "Folkmängd per stadsområde", "antal personer")

for (niva in names(geo_filer)) {
  skriv_json(
    b$forandring |> filter(niva == .env$niva) |> select(-niva),
    str_glue("forandring_{niva}.json"),
    str_glue("Befolkningsförändring {min(b$goteborg$ar)}–",
             "{max(b$goteborg$ar)}"),
    "procent",
    # I() så att gränserna alltid blir en lista i JSON
    klassgranser = I(b$klassgranser |> filter(niva == .env$niva) |>
                       pull(grans))
  )
}

# --- Geometrier ---
for (mapp in mappar) {
  dir.create(file.path(mapp, "geo"), showWarnings = FALSE)
  file.copy(list.files(here("geo"), "\\.geojson$", full.names = TRUE),
            file.path(mapp, "geo"), overwrite = TRUE)
}

if (length(fel) > 0) {
  stop("Exporterad JSON följer inte formatet:\n  - ",
       paste(fel, collapse = "\n  - "), call. = FALSE)
}
cat("Export klar till", paste(mappar, collapse = " och "), "\n")
