# 01_hamta_data.R
# Hämtar SCB BAS, preliminär månadsstatistik, till data/raw/.
# Hela serien från 2020M01 hämtas vid varje körning.
# Variabelnamn och koder är kontrollerade mot tabellernas metadata i
# SCB:s API (2026-11-27).
#
# Utdata (lång form, koder i stället för texter):
#   data/raw/arbstatus.rds  ArbStatusM:   region, kon, fodelseregion,
#                           alder, tabellinnehall, manad, varde
#   data/raw/fat12.rds      ArbStatFAT12: + inkomstniva
#   data/raw/bransch.rds    ArbStDoNMNN:  + bransch (ingen ålder,
#                           tabellen avser 15–74 år)

library(pxweb)
library(tidyverse)
library(here)

source(here("R", "00_installningar.R"))

kon           <- c("1", "2", "1+2")
fodelseregion <- c("tot", "in", "ut")

# Hämtar en tabell och returnerar lång form med koder. Tabellinnehållet
# kommer som en kolumn per ContentsCode och vänds till en kolumn.
hamta <- function(url, fraga) {
  px <- pxweb_get(url = url, query = fraga)
  as.data.frame(px, column.name.type = "code",
                variable.value.type = "code") |>
    as_tibble() |>
    pivot_longer(any_of(fraga$ContentsCode),
                 names_to = "tabellinnehall", values_to = "varde") |>
    rename(manad = Tid) |>
    filter(manad >= forsta_manad)
}

# --- Arbetsmarknadsstatus (ArbStatusM) --------------------------------
# Alla elva tabellinnehåll: antalen per status, antal totalt och SCB:s
# andelar. 65–74 år byggs i 10_bearbeta.R av 65-69 och 70-74.
arbstatus <- hamta(url_arbstatus, list(
  Region        = regioner$region_kod,
  Kon           = kon,
  Alder         = c("20-64", "65-69", "70-74"),
  Fodelseregion = fodelseregion,
  ContentsCode  = c(
    "000006HI",  # antal sysselsatta
    "000004YH",  # antal arbetslösa
    "000006IU",  # antal i arbetskraften
    "000006IE",  # antal studerande
    "000006IF",  # antal pensionärer
    "000006IG",  # antal sjuka
    "000006IH",  # antal övriga
    "000006I8",  # antal totalt
    "000006II",  # arbetslöshet
    "000006IJ",  # arbetskraftsdeltagande
    "000006IK"   # sysselsättningsgrad
  ),
  Tid = c("*")
)) |>
  rename(region_kod = Region, kon = Kon, alder = Alder,
         fodelseregion = Fodelseregion)

# --- Arbetsrelaterad inkomstnivå (ArbStatFAT12) ------------------------
# Alla fem inkomstnivåer hämtas så att antal totalt kan summeras.
fat12 <- hamta(url_fat12, list(
  Region        = regioner$region_kod,
  FAT12m        = c("0", "1", "1-2", "2-3", "3"),
  Kon           = kon,
  Alder         = c("20-64", "65-74"),
  Fodelseregion = fodelseregion,
  ContentsCode  = c(
    "000000QC",  # antal sysselsatta
    "000000QD"   # antal totalt
  ),
  Tid = c("*")
)) |>
  rename(region_kod = Region, inkomstniva = FAT12m, kon = Kon,
         alder = Alder, fodelseregion = Fodelseregion)

# --- Sysselsatta per bransch (ArbStDoNMNN) -----------------------------
bransch <- hamta(url_bransch, list(
  Region        = regioner$region_kod,
  Kon           = kon,
  SNI2007       = c("A-U+US", "A", "B+C", "D+E", "F", "G", "H", "I", "J",
                    "K", "L", "M+N", "O", "P", "Q", "R+S+T+U", "US"),
  Fodelseregion = fodelseregion,
  ContentsCode  = c(
    "0000054D",  # efter arbetsställets belägenhet
    "0000056A"   # efter bostadens belägenhet
  ),
  Tid = c("*")
)) |>
  rename(region_kod = Region, kon = Kon, bransch = SNI2007,
         fodelseregion = Fodelseregion)

# --- Spara ---------------------------------------------------------------
dir.create(here("data", "raw"), showWarnings = FALSE)
write_rds(arbstatus, here("data", "raw", "arbstatus.rds"))
write_rds(fat12,     here("data", "raw", "fat12.rds"))
write_rds(bransch,   here("data", "raw", "bransch.rds"))

cat("Hämtat t.o.m.", max(arbstatus$manad), "\n",
    " arbstatus:", nrow(arbstatus), "rader\n",
    " fat12:    ", nrow(fat12), "rader\n",
    " bransch:  ", nrow(bransch), "rader\n")
