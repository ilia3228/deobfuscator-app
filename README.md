# deobfuscator-app

React + Vite port of `deobfuscator.html`.

## Quick start

```bash
cd deobfuscator-app
npm install
npm run dev
```

Open http://localhost:5173.

## Build

```bash
npm run build
npm run preview
```

## Project structure

```
deobfuscator-app/
├── index.html              # Vite entry, loads Geist + Geist Mono
├── package.json            # vite + react-18.3.1
├── vite.config.js
└── src/
    ├── main.jsx            # ReactDOM root
    ├── App.jsx             # top-level layout + dev view/lang switcher
    ├── styles.css          # global resets, scrollbar, keyframes, hover classes
    ├── theme.js            # color tokens (C), getLangTheme(), colorize()
    ├── data.js             # SESSIONS, PHASES, LAYER_CARDS, IOCS, MITRE, code samples, LOG_ENTRIES
    └── components/
        ├── UI.jsx              # Ico, Tag, SevDot
        ├── Header.jsx
        ├── Footer.jsx
        ├── Sidebar.jsx
        ├── FileStrip.jsx
        ├── CodeViewer.jsx
        ├── IocRow.jsx
        ├── LogStrip.jsx
        ├── EmptyState.jsx
        ├── AnalyzingState.jsx
        └── ResultsState.jsx
```

## Notes on the port

- The original used Babel-in-browser; this uses Vite + `@vitejs/plugin-react` with proper ESM imports.
- The `useTweaks` / `TweaksPanel` host integration was replaced with a small in-app `DevControls` panel in `App.jsx` for switching `view` (`empty` | `analyzing` | `results`), `lang` (`js` | `py`), sidebar collapse, and IOC panel. Remove the `<DevControls />` JSX (and its definitions) to ship.
- All inline styles, animations and color tokens are preserved 1:1 from the source.
- React 18 strict mode is enabled in `main.jsx`.
