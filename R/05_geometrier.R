# 05_geometrier.R
# Gör om stadens shp-filer till GeoJSON för kartor på webben.
#
#   data/raw/geo/<nivå>/*.shp  (SWEREF99 12 00, EPSG:3007)
#     -> SWEREF99 TM (EPSG:3006): förenkling och kopplingar
#     -> WGS84 (EPSG:4326): geo/<nivå>.geojson
#
# Ringarnas riktning (medurs/moturs) är inte garanterad i filen; d3
# kräver medurs, och kartkomponenten i webbappen rättar det.
#
# Egenskaper per område:
#   kod, namn, area_km2, och för lägre nivåer koden för nivån ovanför
#   (mellanomrade_kod, stadsomrade_kod), så att data kan summeras upp.
# Koder skrivs som text utan inledande nollor: "101", "10", "1".

library(sf)
library(tidyverse)
library(here)

# --- Parametrar ---
crs_analys <- 3006    # SWEREF99 TM
crs_webb   <- 4326    # WGS84
tolerans_m <- 25      # förenkling i meter; 0 = ingen förenkling
min_yta_m2 <- 2000    # polygondelar (skär, remsor) mindre än detta tas bort
decimaler  <- 4       # koordinatprecision i GeoJSON (~10 m)

kallor <- list(
  stadsomraden = list(
    mapp = "Stadsområde", kod = "STADSOMRAD", namn = "NAMN"
  ),
  mellanomraden = list(
    mapp = "Mellanområde", kod = "MELLANOMRA", namn = "NAMN"
  ),
  primaromraden = list(
    mapp = "Pri_med_öar", kod = "PRIMÄROMRÅ", namn = "PRIMÄRNAMN"
  )
)

mapp_ut <- here("geo")

# --- Funktioner ---
las_niva <- function(kalla) {
  fil <- list.files(
    here("data", "raw", "geo", kalla$mapp),
    pattern = "\\.shp$", full.names = TRUE
  )
  stopifnot("En shp-fil per mapp" = length(fil) == 1)

  st_read(fil, quiet = TRUE) |>
    st_transform(crs_analys) |>
    transmute(
      kod      = as.character(as.integer(.data[[kalla$kod]])),
      namn     = .data[[kalla$namn]],
      area_km2 = round(as.numeric(st_area(geometry)) / 1e6, 2)
    ) |>
    arrange(as.integer(kod))
}

# Förenklar konturerna och tar bort mycket små polygondelar, som annars
# kan falla ihop till linjer när koordinaterna avrundas i GeoJSON.
forenkla <- function(geo) {
  egenskaper <- setdiff(names(geo), attr(geo, "sf_column"))
  geo |>
    st_simplify(preserveTopology = TRUE, dTolerance = tolerans_m) |>
    st_make_valid() |>
    st_collection_extract("POLYGON") |>   # släng linjer och punkter
    st_set_agr("constant") |>
    st_cast("POLYGON") |>
    filter(as.numeric(st_area(geometry)) >= min_yta_m2) |>
    group_by(across(all_of(egenskaper))) |>
    summarise(geometry = st_combine(geometry), .groups = "drop") |>
    st_cast("MULTIPOLYGON") |>
    arrange(as.integer(kod))
}

# Läser tillbaka en skriven fil och stoppar om något inte är polygoner
kontrollera_fil <- function(fil, antal) {
  g <- st_read(fil, quiet = TRUE)
  typer <- unique(as.character(st_geometry_type(g)))
  stopifnot(
    "Bara polygoner i GeoJSON" = all(typer %in% c("POLYGON", "MULTIPOLYGON")),
    "Alla områden finns kvar" = nrow(g) == antal
  )
}

skriv_geojson <- function(geo, niva) {
  fil <- file.path(mapp_ut, paste0(niva, ".geojson"))
  if (file.exists(fil)) file.remove(fil)
  # Avrunda och laga i R (plant, utan s2) så att inget faller ihop till
  # linjer när GDAL skriver med samma precision
  s2 <- sf_use_s2(FALSE)
  on.exit(suppressMessages(sf_use_s2(s2)))
  geo <- st_transform(geo, crs_webb)
  st_geometry(geo) <- st_sfc(
    lapply(st_geometry(geo), \(g) st_multipolygon(
      rapply(unclass(g), \(m) round(m, decimaler), how = "replace")
    )),
    crs = crs_webb
  )
  geo |>
    st_make_valid() |>
    st_collection_extract("POLYGON") |>
    st_cast("MULTIPOLYGON") |>
    st_write(
      fil,
      driver = "GeoJSON",
      # Inte RFC7946=YES: det läget skapar linjer av smala delar.
      # Ringarnas riktning rättas i stället i kartkomponenten.
      layer_options = paste0("COORDINATE_PRECISION=", decimaler),
      quiet = TRUE
    )
  kontrollera_fil(fil, nrow(geo))
  cat("Skrev", fil, "(", round(file.size(fil) / 1024), "kB )\n")
}

# --- Läs in ---
geo <- map(kallor, las_niva)

# --- Koppla överordnad nivå via en punkt inuti varje område ---
koppla_uppat <- function(lagre, hogre, nytt_namn) {
  nyckel <- lagre |>
    st_set_agr("constant") |>
    st_point_on_surface() |>
    st_join(select(hogre, overordnad = kod), join = st_within) |>
    st_drop_geometry() |>
    select(kod, overordnad)
  stopifnot(
    "Varje område ska ligga i exakt ett överordnat område" =
      nrow(nyckel) == nrow(lagre) && !anyNA(nyckel$overordnad)
  )
  lagre |>
    left_join(nyckel, by = "kod") |>
    rename(!!nytt_namn := overordnad)
}

geo$mellanomraden <- geo$mellanomraden |>
  koppla_uppat(geo$stadsomraden, "stadsomrade_kod")

geo$primaromraden <- geo$primaromraden |>
  koppla_uppat(geo$mellanomraden, "mellanomrade_kod") |>
  left_join(
    st_drop_geometry(geo$mellanomraden) |>
      select(mellanomrade_kod = kod, stadsomrade_kod),
    by = "mellanomrade_kod"
  )

# --- Förenkla och skriv ---
dir.create(mapp_ut, showWarnings = FALSE)
iwalk(geo, \(g, niva) skriv_geojson(forenkla(g), niva))

# --- Kontroll ---
iwalk(geo, \(g, niva) {
  cat(niva, ":", nrow(g), "områden, ",
      n_distinct(g$kod), "unika koder\n")
})
