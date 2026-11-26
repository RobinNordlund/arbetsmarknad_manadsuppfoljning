# 98_validera.R
# Valideringskontroller som stoppar körningen vid fel. Körs efter varje
# ändring i analysen och automatiskt av R/99_exportera_json.R.
# Anpassa inställningarna och kontrollerna till projektets data.
# Ingen röjandekontroll: data som kommer in är redan sekretessgranskad.

library(tidyverse)
library(here)

# === Inställningar ===================================================

# Antal områden per nivå (utan "Ospecificerat Göteborg")
antal_omraden <- c(stadsomrade = 4, mellanomrade = 36, primaromrade = 96)
forvantade_ar <- 2020:2025

# Summor mot källan (statistikdatabasen)
summor_kalla <- tribble(~ar, ~folkmangd, 2025, 613276)

# Kolumner där NA respektive negativa värden är tillåtna
na_tillatet       <- character(0)
negativa_tillatna <- c("forandring_procent", "grans")

meta_falt   <- c("titel", "kalla", "enhet", "uppdaterad")
mappar_json <- c(here("app", "data"), here("rapport", "data"))
geo_filer   <- c(stadsomrade = "stadsomraden",
                 mellanomrade = "mellanomraden",
                 primaromrade = "primaromraden")

# === Hjälpfunktioner =================================================

fel <- character(0)
kontroll <- function(villkor, meddelande) {
  ok <- isTRUE(villkor)
  cat(if (ok) "  OK  " else "  FEL ", meddelande, "\n", sep = "")
  if (!ok) fel <<- c(fel, meddelande)
  invisible(ok)
}

# Kontrollerar en exporterad JSON-fil; används även av 99
validera_json <- function(fil) {
  j <- tryCatch(jsonlite::read_json(fil), error = \(e) NULL)
  kontroll(
    !is.null(j) && all(c("meta", "data") %in% names(j)) &&
      all(meta_falt %in% names(j$meta)) &&
      str_starts(j$meta$kalla %||% "", "Källa:") && length(j$data) > 0,
    str_glue("{basename(fil)}: meta ({paste(meta_falt, collapse = ', ')}",
             "), källrad och data")
  )
}

# === Kontroller ======================================================

cat("\nValidering\n")
fil_data <- here("data", "processed", "befolkning.rds")
if (!kontroll(file.exists(fil_data), "Bearbetade data finns")) {
  stop("Validering avbruten", call. = FALSE)
}
b <- read_rds(fil_data)

# Antal områden, år och en rad per område och år
for (niva in names(antal_omraden)) {
  df <- b[[niva]]
  n <- antal_omraden[[niva]]
  kontroll(
    n_distinct(df$kod) == n && setequal(df$ar, forvantade_ar) &&
      nrow(df) == n * length(forvantade_ar) &&
      nrow(distinct(df, kod, ar)) == nrow(df),
    str_glue("{niva}: {n_distinct(df$kod)} områden (förväntat {n}), ",
             "år {paste(range(df$ar), collapse = '-')}, {nrow(df)} rader")
  )
}

# Inga oväntade NA eller negativa värden
for (tabell in names(b)) {
  df <- b[[tabell]]
  na_kol <- setdiff(names(df)[map_lgl(df, anyNA)], na_tillatet)
  tal <- select(df, where(is.numeric), -any_of(negativa_tillatna))
  kontroll(length(na_kol) == 0 && all(unlist(tal) >= 0),
           str_glue("{tabell}: inga oväntade NA eller negativa värden"))
}

# Alla nivåer summerar lika; områden <= Göteborg (ospecificerat utanför)
summa <- \(df) df |> summarise(s = sum(folkmangd), .by = ar) |> arrange(ar)
for (niva in c("mellanomrade", "stadsomrade")) {
  kontroll(isTRUE(all.equal(summa(b[[niva]]), summa(b$primaromrade))),
           str_glue("{niva}: summa per år = primärområden"))
}
kontroll(all(summa(b$primaromrade)$s <= summa(b$goteborg)$s),
         "Områdenas summa överstiger inte Göteborg")

# Summor mot källan
for (i in seq_len(nrow(summor_kalla))) {
  faktisk <- b$goteborg |> filter(ar == summor_kalla$ar[i]) |>
    pull(folkmangd)
  kontroll(
    identical(faktisk, summor_kalla$folkmangd[i]),
    str_glue("Göteborg {summor_kalla$ar[i]}: ",
             "{format(faktisk, big.mark = ' ')}, källan ",
             "{format(summor_kalla$folkmangd[i], big.mark = ' ')}")
  )
}

# Geometrier: antal, unika koder, polygoner i WGS84, koder matchar data
for (niva in names(geo_filer)) {
  fil <- here("geo", paste0(geo_filer[[niva]], ".geojson"))
  if (!file.exists(fil)) next
  g <- sf::st_read(fil, quiet = TRUE)
  typer <- unique(as.character(sf::st_geometry_type(g)))
  kontroll(
    nrow(g) == antal_omraden[[niva]] && !anyDuplicated(g$kod) &&
      all(typer %in% c("POLYGON", "MULTIPOLYGON")) &&
      sf::st_crs(g)$epsg == 4326 && all(b[[niva]]$kod %in% g$kod),
    str_glue("geo/{geo_filer[[niva]]}: {nrow(g)} polygonområden i ",
             "WGS84 som matchar data")
  )
}

# Kartans klassgränser: två stigande per nivå (tre klasser)
for (niva in names(antal_omraden)) {
  g <- b$klassgranser |> filter(niva == .env$niva) |> pull(grans)
  kontroll(length(g) == 2 && !is.unsorted(g, strictly = TRUE),
           str_glue("klassgränser {niva}: {paste(g, collapse = ', ')}"))
}

# Redan exporterade JSON-filer
mappar_json[dir.exists(mappar_json)] |>
  map(\(m) list.files(m, "\\.json$", full.names = TRUE)) |>
  unlist() |>
  walk(validera_json)

# === Resultat ========================================================

if (length(fel) > 0) {
  stop("Valideringen hittade ", length(fel), " fel:\n  - ",
       paste(fel, collapse = "\n  - "), call. = FALSE)
}
cat("Validering godkänd\n\n")
