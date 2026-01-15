# CORMACH Configuratore — Smontagomme & Equilibratrici (No Prezzi)

Web app statica per GitHub Pages: selezioni **flag** → ottieni **modello + codice**.
I dati arrivano dai file in `data/` (importati dal listino Excel).

## Modelli inclusi
- Prodotti totali: **63**
- Famiglie: equilibratrici_auto, equilibratrici_truck, smontagomme_auto, smontagomme_moto, smontagomme_truck  
- Accessori suggeriti: **13** (regole in `app.js`)

## Pubblicazione su GitHub Pages
1. Crea un repo (es. `cormach-configurator`)
2. Carica questi file nella root del repo
3. GitHub → Settings → Pages → Deploy from branch → `main` / root
4. Apri l’URL di GitHub Pages

## Dati
- `data/products.json`: modelli (codice, descrizione, famiglia, tag)
- `data/accessori.json`: optional con regole di suggerimento (uso + flag)

## Note
- Nessun prezzo mostrato.
- La funzione **Preset** pre-seleziona i flag tipici in base all’uso.
