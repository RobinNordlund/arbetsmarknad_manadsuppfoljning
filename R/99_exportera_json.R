# 99_exportera_json.R
# Validerar (R/98_validera.R) och exporterar sedan JSON till app/data/.
# Alla siffror är färdigberäknade och avrundade här; appen räknar inget.
#
# Alla filer: { "meta": { titel, kalla, enhet, uppdaterad,
#                         senaste_manad, ... }, "data": ... }
#
#   meta.json        data: listor med koder och texter (regioner, kön,
#                    födelseregion, ålder, mått, branscher,
#                    belägenhet) och alla månader
#   oversikt.json    data: en rad per region × kön × födelseregion ×
#                    ålder × mått för senaste månaden: varde,
#                    forandring_manad, forandring_ar
#   tidsserier.json  data: { manader: [...], serier: [ { region, kon,
#                    fodelseregion, alder, matt, varden: [...] } ] };
#                    varden följer ordningen i manader
#   branscher.json   data: en rad per region × kön × födelseregion ×
#                    bransch × belägenhet för senaste månaden
#   bransch_tidsserier.json
#                    data: { manader: [...], serier: [ { region, kon,
#                    fodelseregion, bransch, belagenhet,
#                    varden: [...] } ] }; bara Göteborg, antal
#
# Avrundning: andelar och förändringar med en decimal, antal heltal.
# Förändring som inte går att räkna (föregående antal 0) blir null.

library(tidyverse)
library(here)

source(here("R", "98_validera.R"))   # stoppar vid fel
source(here("R", "00_installningar.R"))

mappar <- here("app", "data")
walk(mappar, dir.create, showWarnings = FALSE)

am <- read_rds(here("data", "processed", "arbetsmarknad.rds"))
br <- read_rds(here("data", "processed", "bransch.rds"))

senaste <- max(am$manad)
manader <- sort(unique(am$manad))

# Månadstexter för appen, t.ex. "2026M08" -> "augusti 2026". Skrivs ut
# här i stället för med systemets locale, som kan skilja mellan datorer.
manadsnamn_sv <- c("januari", "februari", "mars", "april", "maj", "juni",
                   "juli", "augusti", "september", "oktober", "november",
                   "december")
manad_text <- function(m) {
  paste(manadsnamn_sv[as.integer(str_sub(m, 6, 7))], str_sub(m, 1, 4))
}
i_senaste <- match(senaste, manader)
manadstexter <- list(
  senaste_text = manad_text(senaste),
  jamfor_manad_text = manad_text(manader[i_senaste - 1]),
  jamfor_ar_text = manad_text(manader[i_senaste - 12])
)

skriv_json <- function(data, filnamn, titel, enhet, ...) {
  innehall <- list(
    meta = c(list(titel = titel, kalla = kalla, enhet = enhet,
                  uppdaterad = format(Sys.Date()),
                  senaste_manad = senaste),
             manadstexter, list(...)),
    data = data
  )
  for (mapp in mappar) {
    fil <- file.path(mapp, filnamn)
    jsonlite::write_json(innehall, fil, auto_unbox = TRUE, digits = NA,
                         na = "null")
    validera_json(fil)
  }
}

# + 0 gör -0 (avrundat från litet negativt tal) till 0
avrunda <- function(x, typ) if_else(typ == "andel", round(x, 1), round(x)) + 0
avrunda1 <- function(x) round(x, 1) + 0

# --- meta.json ---
skriv_json(
  list(
    regioner      = regioner,
    kon           = etikett_kon,
    fodelseregion = etikett_fodelseregion,
    alder         = etikett_alder,
    matt          = etikett_matt |>
      mutate(enhet = if_else(typ == "andel", "procent", "antal"),
             enhet_forandring = if_else(typ == "andel", "procentenheter",
                                        "procent"),
             # I() så att en ensam ålder ändå blir en array
             aldrar = map(kod, \(m) {
               I(sort(unique(am$alder[am$matt == m])))
             })),
    branscher     = etikett_bransch,
    belagenhet    = etikett_belagenhet,
    manader       = manader,
    manadsnamn    = manad_text(manader)
  ),
  "meta.json", "Koder, texter och månader", "–"
)

# --- oversikt.json ---
oversikt <- am |>
  filter(manad == senaste) |>
  transmute(region = region_kod, kon, fodelseregion, alder, matt,
            varde = avrunda(varde, typ),
            forandring_manad = avrunda1(forandring_manad),
            forandring_ar = avrunda1(forandring_ar))
skriv_json(oversikt, "oversikt.json",
           str_glue("Arbetsmarknaden {senaste}"),
           "se matt i meta.json")

# --- tidsserier.json ---
serier <- am |>
  arrange(manad) |>
  mutate(varde = avrunda(varde, typ)) |>
  summarise(varden = list(varde),
            .by = c(region_kod, kon, fodelseregion, alder, matt)) |>
  rename(region = region_kod)
skriv_json(list(manader = manader, serier = serier), "tidsserier.json",
           str_glue("Arbetsmarknaden {forsta_manad}–{senaste}"),
           "se matt i meta.json", forsta_manad = forsta_manad)

# --- branscher.json ---
branscher <- br |>
  filter(manad == senaste) |>
  transmute(region = region_kod, kon, fodelseregion, bransch,
            belagenhet, varde = round(varde),
            forandring_manad = avrunda1(forandring_manad),
            forandring_ar = avrunda1(forandring_ar))
skriv_json(branscher, "branscher.json",
           str_glue("Sysselsatta 15–74 år per bransch {senaste}"),
           "antal (förändring i procent)")

# --- bransch_tidsserier.json ---
# Bara Göteborg (1480), alla månader, samma kompakta format som
# tidsserier.json
bransch_serier <- br |>
  filter(region_kod == "1480") |>
  arrange(manad) |>
  mutate(varde = round(varde)) |>
  summarise(varden = list(varde),
            .by = c(region_kod, kon, fodelseregion, bransch, belagenhet)) |>
  rename(region = region_kod)
skriv_json(list(manader = manader, serier = bransch_serier),
           "bransch_tidsserier.json",
           str_glue("Sysselsatta 15–74 år per bransch i Göteborg ",
                    "{forsta_manad}–{senaste}"),
           "antal", forsta_manad = forsta_manad)

# --- Kontroll av formatet ---
cat("\nKontroll av exporterade filer\n")
las <- \(f) jsonlite::read_json(file.path(mappar, f))
ts <- las("tidsserier.json")
kontroll(length(ts$data$manader) == length(manader) &&
           all(map_int(ts$data$serier, \(s) length(s$varden)) ==
                 length(manader)),
         "tidsserier.json: varje serie har ett värde per månad")
kontroll(length(ts$data$serier) ==
           nrow(distinct(am, region_kod, kon, fodelseregion, alder, matt)),
         "tidsserier.json: alla serier finns")
kontroll(length(las("oversikt.json")$data) == nrow(oversikt),
         "oversikt.json: alla rader finns")
kontroll(length(las("branscher.json")$data) == nrow(branscher),
         "branscher.json: alla rader finns")
bts <- las("bransch_tidsserier.json")
kontroll(identical(sort(unique(br$manad)), manader) &&
           all(map_int(bts$data$serier, \(s) length(s$varden)) ==
                 length(manader)),
         "bransch_tidsserier.json: varje serie har ett värde per månad")
kontroll(length(bts$data$serier) ==
           nrow(distinct(filter(br, region_kod == "1480"), kon,
                         fodelseregion, bransch, belagenhet)),
         "bransch_tidsserier.json: alla serier för Göteborg finns")
mt <- las("meta.json")
kontroll(length(mt$data$regioner) == nrow(regioner) &&
           setequal(map_chr(mt$data$matt, "kod"), unique(am$matt)),
         "meta.json: regioner och mått stämmer med data")

if (length(fel) > 0) {
  stop("Exporterad JSON följer inte formatet:\n  - ",
       paste(fel, collapse = "\n  - "), call. = FALSE)
}
cat("Export klar till", paste(mappar, collapse = " och "), "\n")
walk(list.files(mappar, "\\.json$", full.names = TRUE),
     \(f) cat(" ", basename(f), round(file.size(f) / 1024), "kB\n"))
