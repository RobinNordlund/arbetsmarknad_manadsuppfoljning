# 10_bearbeta.R – EXEMPEL: ersätt med projektets bearbetning
# Folkmängd per område och år på tre nivåer (mellan- och stadsområden
# summeras från primärområden med nyckeln i geo/), Göteborg totalt,
# förändring första–sista året och kartans klassgränser.
# "199 Ospecificerat" saknar geografi: ingår i Göteborg, inte i områden.
# Kräver R/05_geometrier.R. Resultat: data/processed/befolkning.rds

library(tidyverse)
library(here)

nivaer <- c(stadsomrade = "stadsomraden", mellanomrade = "mellanomraden",
            primaromrade = "primaromraden")

geo <- map(nivaer, \(fil) here("geo", paste0(fil, ".geojson")) |>
  sf::st_read(quiet = TRUE) |> sf::st_drop_geometry() |> as_tibble())

folkmangd <- read_csv(here("data", "raw", "folkmangd_pri.csv"),
                      col_types = "cid") |>
  mutate(kod = str_extract(omrade, "^\\d+"))

primar <- folkmangd |>
  inner_join(select(geo$primaromrade, kod, mellanomrade_kod,
                    stadsomrade_kod), by = "kod")

# Summerar primärområden till en nivå och hämtar namn från geo/
per_omrade <- function(niva, kodkolumn) {
  primar |>
    summarise(folkmangd = sum(folkmangd), .by = all_of(c(kodkolumn, "ar"))) |>
    rename(kod = all_of(kodkolumn)) |>
    left_join(select(geo[[niva]], kod, namn), by = "kod") |>
    select(kod, namn, ar, folkmangd) |>
    arrange(as.integer(kod), ar)
}

befolkning <- list(
  primaromrade = per_omrade("primaromrade", "kod"),
  mellanomrade = per_omrade("mellanomrade", "mellanomrade_kod"),
  stadsomrade  = per_omrade("stadsomrade", "stadsomrade_kod"),
  goteborg     = summarise(folkmangd, folkmangd = sum(folkmangd), .by = ar)
)

befolkning$forandring <- names(nivaer) |>
  map(\(niva) befolkning[[niva]] |>
    filter(ar %in% range(ar)) |>
    summarise(
      forandring_procent = round(100 * (last(folkmangd, order_by = ar) /
        first(folkmangd, order_by = ar) - 1), 1),
      .by = c(kod, namn)
    ) |>
    mutate(niva = niva, .before = 1)) |>
  list_rbind()

# Tre klasser med lika många områden (tertiler), se kartklasser i theme.js
befolkning$klassgranser <- befolkning$forandring |>
  reframe(grans = round(quantile(forandring_procent, c(1, 2) / 3,
                                 na.rm = TRUE, names = FALSE), 1),
          .by = niva)

write_rds(befolkning, here("data", "processed", "befolkning.rds"))
cat("Göteborg", max(befolkning$goteborg$ar), ":",
    format(last(befolkning$goteborg$folkmangd), big.mark = " "), "\n")
