# 01_hamta_data.R – EXEMPEL: ersätt med projektets hämtning
# Folkmängd per primärområde och år från Göteborgs Stads
# statistikdatabas. Ålder och kön utelämnas och summeras av databasen.
# Resultat: data/raw/folkmangd_pri.csv

library(pxweb)
library(tidyverse)
library(here)

url <- paste0(
  "https://statistikdatabas.goteborg.se/api/v1/sv/",
  "1.%20G%C3%B6teborg%20och%20dess%20delomr%C3%A5den/",
  "Prim%C3%A4romr%C3%A5den/Befolkning/Folkm%C3%A4ngd/",
  "Folkm%C3%A4ngd%20hel%C3%A5r/10_FolkmHelar_PRI.px"
)
ar <- as.character(2020:2025)

folkmangd <- pxweb_get(url, query = list("Område" = "*", "År" = ar)) |>
  as.data.frame(column.name.type = "text", variable.value.type = "text") |>
  as_tibble() |>
  rename(omrade = `Område`, ar = `År`, folkmangd = `Folkmängd`)

write_csv(folkmangd, here("data", "raw", "folkmangd_pri.csv"))

cat("Rader:", nrow(folkmangd), "| År:", paste(range(folkmangd$ar),
    collapse = "-"), "| Områden:", n_distinct(folkmangd$omrade), "\n")
