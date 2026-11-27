# 10_bearbeta.R
# Bearbetar data/raw/ (från 01_hamta_data.R) till data/processed/.
# Definitioner: se CLAUDE.md, Mått och definitioner.
#
# Utdata (lång form, koder för kön och födelseregion):
#   data/processed/arbetsmarknad.rds
#     region_kod, kon, fodelseregion, alder (20-64, 65-74), manad,
#     matt, typ (antal/andel), varde, forandring_manad, forandring_ar
#   data/processed/bransch.rds
#     region_kod, kon, fodelseregion, bransch, belagenhet, manad,
#     varde, forandring_manad, forandring_ar
#
# Förändring: procent för antal, procentenheter för andelar. Saknas
# jämförelsemånaden (början av serien), eller är föregående antal 0,
# blir förändringen NA.

library(tidyverse)
library(here)

source(here("R", "00_installningar.R"))

arbstatus <- read_rds(here("data", "raw", "arbstatus.rds"))
fat12     <- read_rds(here("data", "raw", "fat12.rds"))
bransch   <- read_rds(here("data", "raw", "bransch.rds"))

matt_koder <- c(
  "000006HI" = "sysselsatta",
  "000004YH" = "arbetslosa",
  "000006IU" = "arbetskraften",
  "000006IE" = "studerande",
  "000006IF" = "pensionarer",
  "000006IG" = "sjuka",
  "000006IH" = "ovriga",
  "000006I8" = "totalt",
  "000006II" = "arbetsloshet",
  "000006IJ" = "arbetskraftsdeltagande",
  "000006IK" = "sysselsattningsgrad"
)
antal_matt <- c("sysselsatta", "arbetslosa", "arbetskraften",
                "studerande", "pensionarer", "sjuka", "ovriga", "totalt")
andel_matt <- c("arbetsloshet", "arbetskraftsdeltagande",
                "sysselsattningsgrad", "forankrade")

nycklar <- c("region_kod", "kon", "fodelseregion", "alder")

# --- Hjälpfunktioner ---

manad_till_datum <- function(manad) {
  as.Date(paste0(str_sub(manad, 1, 4), "-", str_sub(manad, 6, 7), "-01"))
}

# Lägger till förändring mot föregående månad och samma månad året
# innan. Jämförelsemånaden hämtas med join på datum, inte med lag(), så
# att en lucka i serien aldrig ger fel jämförelse.
lagg_till_forandring <- function(data, grupp) {
  data <- mutate(data, datum = manad_till_datum(manad))
  jamfor <- function(steg) {
    data |>
      transmute(across(all_of(grupp)),
                datum = datum %m+% months(steg),
                varde_tidigare = varde)
  }
  # Procentförändring går inte att räkna när föregående antal är 0;
  # då blir den NA i stället för Inf/NaN
  forandring <- function(nu, tidigare, typ) {
    case_when(
      typ == "andel" ~ nu - tidigare,
      tidigare == 0  ~ NA_real_,
      .default       = (nu / tidigare - 1) * 100
    )
  }
  data |>
    left_join(jamfor(1), by = c(grupp, "datum")) |>
    mutate(forandring_manad = forandring(varde, varde_tidigare, typ)) |>
    select(-varde_tidigare) |>
    left_join(jamfor(12), by = c(grupp, "datum")) |>
    mutate(forandring_ar = forandring(varde, varde_tidigare, typ)) |>
    select(-varde_tidigare, -datum)
}

# --- Arbetsmarknadsstatus ---

status <- arbstatus |>
  mutate(matt = unname(matt_koder[tabellinnehall])) |>
  select(-tabellinnehall)

# 20–64 år: SCB:s antal och andelar direkt
status_2064 <- status |>
  filter(alder == "20-64")

# 65–74 år: antal = 65–69 + 70–74. Mått som SCB inte redovisar för
# åldrarna (arbetslösa, arbetskraften) blir NA i summan och tas bort.
# Studerande är 0 i alla celler för åldrarna och visas inte heller
# (beslut 2026-11-27).
status_6574_antal <- status |>
  filter(alder %in% c("65-69", "70-74"),
         matt %in% setdiff(antal_matt, "studerande")) |>
  summarise(varde = sum(varde),
            .by = c(region_kod, kon, fodelseregion, manad, matt)) |>
  filter(!is.na(varde)) |>
  mutate(alder = "65-74")

status_6574_andel <- status_6574_antal |>
  pivot_wider(names_from = matt, values_from = varde) |>
  transmute(region_kod, kon, fodelseregion, alder, manad,
            matt = "sysselsattningsgrad",
            varde = sysselsatta / totalt * 100)

# --- Förankrade på arbetsmarknaden (ArbStatFAT12) ---

forankrade <- fat12 |>
  summarise(
    varde = sum(varde[tabellinnehall == "000000QC" & inkomstniva == "3"]) /
      sum(varde[tabellinnehall == "000000QD"]) * 100,
    .by = c(region_kod, kon, fodelseregion, alder, manad)
  ) |>
  mutate(matt = "forankrade")

# --- Samman och förändringar ---

arbetsmarknad <- bind_rows(status_2064, status_6574_antal,
                           status_6574_andel, forankrade) |>
  mutate(typ = if_else(matt %in% andel_matt, "andel", "antal")) |>
  lagg_till_forandring(c(nycklar, "matt")) |>
  select(all_of(nycklar), manad, matt, typ, varde,
         forandring_manad, forandring_ar) |>
  arrange(across(c(all_of(nycklar), matt, manad)))

# --- Branscher ---

bransch_bearb <- bransch |>
  mutate(belagenhet = recode(tabellinnehall,
                             "0000054D" = "arbetsstalle",
                             "0000056A" = "bostad"),
         typ = "antal") |>
  select(-tabellinnehall) |>
  lagg_till_forandring(c("region_kod", "kon", "fodelseregion",
                         "bransch", "belagenhet")) |>
  select(region_kod, kon, fodelseregion, bransch, belagenhet, manad,
         varde, forandring_manad, forandring_ar) |>
  arrange(region_kod, kon, fodelseregion, belagenhet, bransch, manad)

# --- Spara ---

dir.create(here("data", "processed"), showWarnings = FALSE)
write_rds(arbetsmarknad, here("data", "processed", "arbetsmarknad.rds"))
write_rds(bransch_bearb, here("data", "processed", "bransch.rds"))

cat("Bearbetat t.o.m.", max(arbetsmarknad$manad), "\n",
    " arbetsmarknad:", nrow(arbetsmarknad), "rader\n",
    " bransch:      ", nrow(bransch_bearb), "rader\n")
