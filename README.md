# BTC Tracker App – Frontend Skeleton

Modernes Frontend-Grundgerüst mit **Vite + React + TypeScript** für ein BTC-Dashboard.

## Setup & Start

```bash
npm install
npm run dev
```

App lokal: `http://localhost:5173`

## Build

```bash
npm run build
npm run preview
```

## Quality Gates

```bash
npm run lint
npm run format
```

## Architektur

```text
src/
  app/                # App shell + Layout
  components/         # Wiederverwendbare UI-Bausteine (Basis)
  features/
    btc/              # BTC KPI/Chart-Feature (Modelle/Daten)
    news/             # News-Feature (Modelle/Daten)
    theme/            # Theme-Logik (Light/Dark)
  shared/
    styles/           # Design Tokens (Farben, Spacing, Radius, Schatten, Typografie)
```

## Layout-Struktur

Die Anwendung ist als 3-Spalten-Layout angelegt:

1. **Links**: Navigation + Theme-Toggle
2. **Mitte**: KPI-Karten + Preis-Chart
3. **Rechts**: News-Spalte

## Design System

Zentrale Tokens liegen in:

- `src/shared/styles/tokens.css`

Enthalten sind:

- Light/Dark Farbvariablen
- Spacing-Skala
- Border-Radii
- Schattenstufen
- Typografie-Grundwerte

## Tech Stack

- React 19
- TypeScript (strict)
- Vite
- ESLint (TypeScript + React Hooks + Prettier kompatibel)
- Prettier

## Hinweis zu Assets

- Das Projekt enthält keine binären Bilddateien im Quellbaum (z. B. `.png`); es werden textbasierte SVG-Assets verwendet.
