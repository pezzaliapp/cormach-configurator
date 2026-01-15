# CORMACH Configuratore — Smontagomme & Equilibratrici (No Prezzi)

Web app statica per GitHub Pages: selezioni **flag** → ottieni **modello + codice**.
I dati arrivano dal file `data/products.json` (importato dal listino Excel).

## Come pubblicare su GitHub Pages
1. Crea un repo (es. `cormach-configurator`)
2. Carica questi file nella root del repo
3. GitHub → Settings → Pages → Deploy from branch → `main` / root
4. Apri l’URL di GitHub Pages

## Dati
- `data/products.json`: modelli (codice, descrizione, famiglia, tag)
- `data/accessori.json`: optional suggeriti (es. 21100303, 21100397)

## Note
- Nessun prezzo mostrato.
- La logica “Preset” è un aiuto iniziale (non vincolante).
- Puoi aggiungere/modificare tag e modelli direttamente nei JSON.
