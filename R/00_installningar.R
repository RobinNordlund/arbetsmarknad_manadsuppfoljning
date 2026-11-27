# 00_installningar.R
# Gemensamma inställningar som läses av övriga skript: regioner och
# tabellernas adresser. Regionkoderna är kontrollerade mot SCB:s API.
# Källa för kommungrupperna: SKR, Kommungruppsindelning 2023.

library(tidyverse)

regioner <- tribble(
  ~region_kod, ~region,        ~grupp,
  "00",        "Riket",        "Riket",
  "0180",      "Stockholm",    "Storstad",
  "1280",      "Malmö",        "Storstad",
  "1480",      "Göteborg",     "Storstad",
  "0181",      "Södertälje",   "Större stad",
  "0380",      "Uppsala",      "Större stad",
  "0484",      "Eskilstuna",   "Större stad",
  "0580",      "Linköping",    "Större stad",
  "0581",      "Norrköping",   "Större stad",
  "0680",      "Jönköping",    "Större stad",
  "0780",      "Växjö",        "Större stad",
  "0880",      "Kalmar",       "Större stad",
  "1281",      "Lund",         "Större stad",
  "1283",      "Helsingborg",  "Större stad",
  "1290",      "Kristianstad", "Större stad",
  "1380",      "Halmstad",     "Större stad",
  "1488",      "Trollhättan",  "Större stad",
  "1490",      "Borås",        "Större stad",
  "1780",      "Karlstad",     "Större stad",
  "1880",      "Örebro",       "Större stad",
  "1980",      "Västerås",     "Större stad",
  "2081",      "Borlänge",     "Större stad",
  "2180",      "Gävle",        "Större stad",
  "2281",      "Sundsvall",    "Större stad",
  "2380",      "Östersund",    "Större stad",
  "2480",      "Umeå",         "Större stad",
  "2580",      "Luleå",        "Större stad"
)

url_bas <- "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0210"
url_arbstatus <- paste0(url_bas, "/AM0210A/ArbStatusM")
url_fat12     <- paste0(url_bas, "/AM0210A/ArbStatFAT12")
url_bransch   <- paste0(url_bas, "/AM0210B/ArbStDoNMNN")

forsta_manad <- "2020M01"

kalla <- paste("Källa: SCB, Befolkningens arbetsmarknadsstatus (BAS),",
               "preliminär månadsstatistik")

# --- Etiketter för webbappen ---
# Texter för koderna. Kön, födelseregion och branscher följer SCB:s
# texter i tabellernas metadata.

etikett_kon <- tribble(
  ~kod,  ~namn,
  "1+2", "Totalt",
  "2",   "Kvinnor",
  "1",   "Män"
)

etikett_fodelseregion <- tribble(
  ~kod,  ~namn,
  "tot", "Totalt",
  "in",  "Inrikes födda",
  "ut",  "Utrikes födda"
)

etikett_alder <- tribble(
  ~kod,    ~namn,
  "20-64", "20–64 år",
  "65-74", "65–74 år"
)

# typ: antal eller andel (procent). Förändring visas i procent för
# antal och i procentenheter för andelar.
etikett_matt <- tribble(
  ~kod,                     ~namn,                           ~typ,
  "arbetsloshet",           "Arbetslöshet",                  "andel",
  "sysselsattningsgrad",    "Sysselsättningsgrad",           "andel",
  "arbetskraftsdeltagande", "Arbetskraftsdeltagande",        "andel",
  "forankrade",             "Förankrade på arbetsmarknaden", "andel",
  "sysselsatta",            "Sysselsatta",                   "antal",
  "arbetslosa",             "Arbetslösa",                    "antal",
  "arbetskraften",          "Arbetskraften",                 "antal",
  "studerande",             "Studerande",                    "antal",
  "pensionarer",            "Pensionärer",                   "antal",
  "sjuka",                  "Sjuka",                         "antal",
  "ovriga",                 "Övriga",                        "antal",
  "totalt",                 "Befolkning",                    "antal"
)

etikett_bransch <- tribble(
  ~kod,      ~namn,
  "A-U+US",  "Total",
  "A",       "Företag inom jordbruk, skogsbruk och fiske",
  "B+C",     paste("Tillverkningsindustri; gruvor och",
                   "mineralutvinningsindustri"),
  "D+E",     "Företag inom energi och miljö",
  "F",       "Byggindustri",
  "G",       paste("Handel; serviceverkstäder för motorfordon och",
                   "motorcyklar"),
  "H",       "Transport- och magasineringsföretag",
  "I",       "Hotell och restauranger",
  "J",       "Informations- och kommunikationsföretag",
  "K",       "Kreditinstitut och försäkringsbolag m.m.",
  "L",       "Fastighetsbolag och fastighetsförvaltare",
  "M+N",     paste("Företag inom juridik, ekonomi, vetenskap och",
                   "teknik; företag inom uthyrning, fastighetsservice,",
                   "resetjänster och andra stödtjänster"),
  "O",       "Civila myndigheter och försvaret",
  "P",       "Utbildningsväsendet",
  "Q",       "Enheter för vård och omsorg, socialtjänst",
  "R+S+T+U", paste("Enheter för kultur, nöje och fritid; andra",
                   "serviceföretag m.m."),
  "US",      "Uppgift saknas"
)

# Korta namn för diagram i webbappen; SCB:s namn ovan används i tabeller
etikett_bransch <- etikett_bransch |>
  left_join(
    tribble(
      ~kod,      ~kort,
      "A-U+US",  "Totalt",
      "A",       "Jordbruk, skogsbruk och fiske",
      "B+C",     "Tillverkning och utvinning",
      "D+E",     "Energi och miljö",
      "F",       "Byggverksamhet",
      "G",       "Handel",
      "H",       "Transport och magasinering",
      "I",       "Hotell och restauranger",
      "J",       "Information och kommunikation",
      "K",       "Finans och försäkring",
      "L",       "Fastigheter",
      "M+N",     "Företagstjänster",
      "O",       "Offentlig förvaltning och försvar",
      "P",       "Utbildning",
      "Q",       "Vård och omsorg",
      "R+S+T+U", "Kultur, fritid och övrig service",
      "US",      "Uppgift saknas"
    ),
    by = "kod"
  )
stopifnot(!anyNA(etikett_bransch$kort))

etikett_belagenhet <- tribble(
  ~kod,           ~namn,
  "arbetsstalle", "Efter arbetsställets belägenhet",
  "bostad",       "Efter bostadens belägenhet"
)
