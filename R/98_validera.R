# 98_validera.R
# Valideringskontroller som stoppar körningen vid fel. Körs efter varje
# ändring i analysen och automatiskt av R/99_exportera_json.R.
# Kontrollerna fylls i när data och mått är bestämda (se CLAUDE.md,
# Validering). Ingen röjandekontroll: data som kommer in är redan
# sekretessgranskad.

library(tidyverse)
library(here)

# === Inställningar ===================================================

source(here("R", "00_installningar.R"))   # regioner, forsta_manad

# Mått som ska finnas per åldersgrupp. 65–74 saknar arbetslösa,
# arbetskraften, arbetslöshet och arbetskraftsdeltagande (redovisas
# inte av SCB) och studerande (0 i alla celler), se CLAUDE.md.
matt_6574 <- c("sysselsatta", "pensionarer", "sjuka", "ovriga",
               "totalt", "sysselsattningsgrad", "forankrade")
forvantade_matt <- list(
  "20-64" = c(matt_6574, "studerande", "arbetslosa", "arbetskraften",
              "arbetsloshet", "arbetskraftsdeltagande"),
  "65-74" = matt_6574
)
antal_branscher <- 17   # inkl. A-U+US och US
tolerans_andel  <- 0.051  # SCB:s andelar har en decimal
# SCB:s delar summerar inte exakt till totalerna (högst 24 personer i
# serien 2020M01–2026M08). Summakontrollerna godkänner avvikelser upp
# till tolerans_antal personer (beslut 2026-11-27).
tolerans_antal  <- 50

meta_falt   <- c("titel", "kalla", "enhet", "uppdaterad")
mappar_json <- here("app", "data")

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

# Största absoluta skillnad mellan två kolumner efter join; NA om
# någon rad saknar motsvarighet
max_avvikelse <- function(x, y, by) {
  j <- full_join(x, y, by = by)
  if (anyNA(j$a) || anyNA(j$b)) return(NA_real_)
  max(abs(j$a - j$b))
}

# Månader från forsta_manad t.o.m. senaste, utan luckor
manadsserie <- function(sista) {
  datum <- seq(as.Date(paste0(str_sub(forsta_manad, 1, 4), "-",
                              str_sub(forsta_manad, 6, 7), "-01")),
               as.Date(paste0(str_sub(sista, 1, 4), "-",
                              str_sub(sista, 6, 7), "-01")),
               by = "month")
  format(datum, "%YM%m")
}

# === Kontroller ======================================================

cat("\nValidering\n")

fil_am  <- here("data", "processed", "arbetsmarknad.rds")
fil_br  <- here("data", "processed", "bransch.rds")
fil_fat <- here("data", "raw", "fat12.rds")
fil_ast <- here("data", "raw", "arbstatus.rds")
filer_finns <- kontroll(all(file.exists(c(fil_am, fil_br, fil_fat,
                                          fil_ast))),
                        "Rådata och bearbetade data finns")

if (filer_finns) {
  am  <- read_rds(fil_am)
  br  <- read_rds(fil_br)
  fat <- read_rds(fil_fat)
  ast <- read_rds(fil_ast)
  manader <- manadsserie(max(am$manad))
  n_man   <- length(manader)

  # --- Regioner och månader ---
  for (d in list(list(am, "arbetsmarknad"), list(br, "bransch"))) {
    kontroll(setequal(unique(d[[1]]$region_kod), regioner$region_kod),
             str_glue("{d[[2]]}: de {nrow(regioner)} regionerna"))
    kontroll(identical(sort(unique(d[[1]]$manad)), manader),
             str_glue("{d[[2]]}: {n_man} månader {forsta_manad}–",
                      "{max(am$manad)} utan luckor"))
  }
  kontroll(max(br$manad) == max(am$manad),
           "Samma senaste månad i alla tabeller")

  # --- Fullständighet ---
  n_grupper <- nrow(regioner) * 3 * 3   # regioner × kön × födelseregion
  for (a in names(forvantade_matt)) {
    del <- filter(am, alder == a)
    kontroll(setequal(unique(del$matt), forvantade_matt[[a]]),
             str_glue("{a} år: förväntade mått"))
    kontroll(all(count(del, matt)$n == n_grupper * n_man),
             str_glue("{a} år: alla kombinationer finns för varje mått"))
  }
  kontroll(nrow(br) == n_grupper * antal_branscher * 2 * n_man,
           "Bransch: alla kombinationer finns")
  kontroll(nrow(distinct(am, region_kod, kon, fodelseregion, alder,
                         matt, manad)) == nrow(am),
           "Arbetsmarknad: inga dubbletter")

  # --- Saknade och orimliga värden ---
  # Förändring får saknas i början av serien och när föregående antal
  # är 0 (procentförändring går inte att räkna)
  forandring_ok <- function(x, kolumn, steg, start) {
    tidigare <- x |>
      transmute(across(-c(varde, forandring_manad, forandring_ar)),
                manad = manader[match(manad, manader) + steg],
                tidigare_noll = varde == 0 & (typ %||% "antal") == "antal")
    tidigare <- filter(tidigare, !is.na(manad))
    j <- left_join(x, tidigare,
                   by = setdiff(names(tidigare), "tidigare_noll"))
    vantat_na <- j$manad %in% start | coalesce(j$tidigare_noll, FALSE)
    all(is.na(j[[kolumn]]) == vantat_na) &&
      !any(is.infinite(j[[kolumn]]))
  }
  for (d in list(list(am, "arbetsmarknad"),
                 list(mutate(br, typ = "antal"), "bransch"))) {
    x <- d[[1]]
    kontroll(!anyNA(x$varde), str_glue("{d[[2]]}: inga NA i värden"))
    kontroll(forandring_ok(x, "forandring_manad", 1, manader[1]),
             str_glue("{d[[2]]}: förändring mot föregående månad saknas ",
                      "bara första månaden och efter 0"))
    kontroll(forandring_ok(x, "forandring_ar", 12, manader[1:12]),
             str_glue("{d[[2]]}: förändring mot föregående år saknas ",
                      "bara första året och efter 0"))
  }
  kontroll(all(between(am$varde[am$typ == "andel"], 0, 100)),
           "Andelar ligger mellan 0 och 100")
  kontroll(all(am$varde[am$typ == "antal"] >= 0) && all(br$varde >= 0),
           "Antal är inte negativa")

  # --- Interna summor (antal 20–64) ---
  bred <- am |>
    filter(typ == "antal", alder == "20-64") |>
    select(region_kod, kon, fodelseregion, manad, matt, varde) |>
    pivot_wider(names_from = matt, values_from = varde)
  avv_ak <- with(bred, max(abs(sysselsatta + arbetslosa - arbetskraften)))
  kontroll(avv_ak <= tolerans_antal,
           str_glue("20-64: sysselsatta + arbetslösa = arbetskraften ",
                    "(max avvikelse {avv_ak})"))
  avv_status <- with(bred, max(abs(sysselsatta + arbetslosa + studerande +
                                     pensionarer + sjuka + ovriga - totalt)))
  kontroll(avv_status <= tolerans_antal,
           str_glue("20-64: statusgrupperna summerar till totalt (max ",
                    "avvikelse {avv_status})"))

  # Kön och födelseregion summerar till totalen
  antal <- filter(am, typ == "antal")
  delsumma <- function(data, var, delar, total) {
    andra <- setdiff(c("region_kod", "kon", "fodelseregion", "alder",
                       "matt", "manad"), var)
    max_avvikelse(
      data |> filter(.data[[var]] %in% delar) |>
        summarise(a = sum(varde), .by = all_of(andra)),
      data |> filter(.data[[var]] == total) |>
        select(all_of(andra), b = varde),
      andra
    )
  }
  avv_kon <- delsumma(antal, "kon", c("1", "2"), "1+2")
  kontroll(isTRUE(avv_kon <= tolerans_antal),
           str_glue("Män + kvinnor = totalt (max avvikelse {avv_kon})"))
  avv_fod <- delsumma(antal, "fodelseregion", c("in", "ut"), "tot")
  kontroll(isTRUE(avv_fod <= tolerans_antal),
           str_glue("Inrikes + utrikes födda = totalt (max avvikelse ",
                    "{avv_fod})"))

  # --- SCB:s andelar mot beräknade (20–64) ---
  beraknad <- bred |>
    transmute(region_kod, kon, fodelseregion, manad,
              arbetsloshet = arbetslosa / arbetskraften * 100,
              arbetskraftsdeltagande = arbetskraften / totalt * 100,
              sysselsattningsgrad = sysselsatta / totalt * 100) |>
    pivot_longer(-c(region_kod, kon, fodelseregion, manad),
                 names_to = "matt", values_to = "b")
  avv_andel <- max_avvikelse(
    am |> filter(alder == "20-64", matt %in% unique(beraknad$matt)) |>
      select(region_kod, kon, fodelseregion, manad, matt, a = varde),
    beraknad, c("region_kod", "kon", "fodelseregion", "manad", "matt")
  )
  kontroll(isTRUE(avv_andel <= tolerans_andel),
           str_glue("20-64: SCB:s andelar stämmer med beräknade (max ",
                    "avvikelse {round(avv_andel, 3)} procentenheter)"))

  # --- Inkomstnivåer mot ArbStatusM ---
  fat_summa <- fat |>
    summarise(a = sum(varde),
              .by = c(region_kod, kon, fodelseregion, alder, manad,
                      tabellinnehall)) |>
    mutate(matt = recode(tabellinnehall, "000000QC" = "sysselsatta",
                         "000000QD" = "totalt")) |>
    select(-tabellinnehall)
  avv_fat <- max_avvikelse(
    fat_summa,
    am |> filter(matt %in% c("sysselsatta", "totalt")) |>
      select(region_kod, kon, fodelseregion, alder, manad, matt,
             b = varde),
    c("region_kod", "kon", "fodelseregion", "alder", "manad", "matt")
  )
  kontroll(isTRUE(avv_fat <= tolerans_antal),
           str_glue("Inkomstnivåer summerar till ArbStatusM (sysselsatta ",
                    "och totalt, 20-64 och 65-74; max avvikelse ",
                    "{avv_fat})"))

  # --- 65–74 år: 65–69 + 70–74 ---
  # Rimlighet: 65–74 år ska vara fler än var och en av delgrupperna
  delgrupp_max <- ast |>
    filter(alder %in% c("65-69", "70-74"), tabellinnehall == "000006I8") |>
    summarise(b = max(varde), .by = c(region_kod, kon, fodelseregion,
                                      manad))
  jfr_6574 <- am |>
    filter(alder == "65-74", matt == "totalt") |>
    select(region_kod, kon, fodelseregion, manad, a = varde) |>
    inner_join(delgrupp_max,
               by = c("region_kod", "kon", "fodelseregion", "manad"))
  kontroll(nrow(jfr_6574) == n_grupper * n_man && all(jfr_6574$a > jfr_6574$b),
           "65-74: totalt är större än 65-69 och 70-74 var för sig")

  # --- Branscher ---
  avv_br <- max_avvikelse(
    br |> filter(bransch != "A-U+US") |>
      summarise(a = sum(varde), .by = c(region_kod, kon, fodelseregion,
                                        belagenhet, manad)),
    br |> filter(bransch == "A-U+US") |>
      select(region_kod, kon, fodelseregion, belagenhet, manad,
             b = varde),
    c("region_kod", "kon", "fodelseregion", "belagenhet", "manad")
  )
  kontroll(isTRUE(avv_br <= tolerans_antal),
           str_glue("Summan av branscher = Total (A-U+US) (max ",
                    "avvikelse {avv_br})"))
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
