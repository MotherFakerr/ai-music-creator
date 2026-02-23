# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start all packages (Vite dev server + TS watchers)
pnpm build            # Build all packages via Turborepo
pnpm lint             # Lint all packages
pnpm test             # Run tests (framework not yet configured)
```

Turborepo orchestrates builds with `^build` dependency ordering. Each package can also be developed independently by running scripts inside its directory. No test framework is set up yet.

## Architecture

PNPM monorepo with Turborepo. The app is a browser-based FL Studio-style music creator built with React + Vite.

### Package Dependency Graph

```
web (React/Vite app entry point)
├── ui         → Reusable React components (keyboard, knobs, audio player)
├── sequencer  → Channel Rack + Piano Roll editor
├── audio      → Web Audio API engine (smplr SoundFont)
├── midi       → MIDI file parsing/generation (@tonejs/midi)
├── ai         → AI continuation service (stub only)
└── core       → Shared domain types (Sequence, Recording, keyboard mapping)
```

### Key Architectural Patterns

**Audio Engine Singleton** (`packages/audio/src/engine.ts`): `getAudioEngine()` returns a shared instance used by both the performance page and the sequencer. It lazy-initializes the Web Audio context on first user interaction (browser requirement). Instruments are loaded on-demand via smplr and cached. Drums use an Oscillator fallback.

**Sequencer State** (`packages/sequencer/src/usePatternEditor.ts`): All sequencer state lives in a single `usePatternEditor()` hook that returns `PatternState` (channels + notes + config). State updates go through `applyWithHistory()` which pushes snapshots onto an undo stack (max 120 levels). Multi-step edits are batched via `transactionRef`. ChannelRack and PianoRoll are presentational components that receive state and callbacks as props.

**Playback Scheduler** (`packages/sequencer/src/PatternEditor.tsx`): Uses `setInterval` at step duration `(60 / BPM / stepsPerBar) * 1000` ms. Each tick finds notes at the current step, checks channel mute/solo, calculates velocity, and calls `audioEngine.playNote()`.

**Piano Roll Canvas Rendering**: The piano roll renders on HTML canvas (not DOM). A scrollable inner `div` drives scroll position while the canvas stays fixed-size.

**No Global State Library**: State management uses React hooks (`useState`, `useRef`, `useMemo`, `useCallback`) with prop drilling. No Redux, Zustand, or Context API.

### Data Flow

Performance page: keyboard input → `useKeyboard()` hook → QWERTY-to-MIDI mapping via `generateKeyboardMap(baseNote)` in core → `audioEngine.playNote(note, velocity)` → Web Audio API → particle trace visualization.

Sequencer: PatternEditor owns state → ChannelRack/PianoRoll render from props → user edits trigger callbacks → `applyWithHistory()` updates state → playback scheduler reads current state each tick.

MIDI: `packages/sequencer/src/midi.ts` handles conversion between `PatternState` and @tonejs/midi format. `packages/midi/src/` handles conversion between `Sequence` (core type) and MIDI bytes.

### Pages

- **App.tsx** (`packages/web`): Performance page — keyboard playback, instrument selection, backing tracks, particle visualization
- **SequencerPage.tsx** (`packages/web`): Composition page — wraps the PatternEditor from the sequencer package

## Project Language

README, docs, and commit messages are in Chinese (Mandarin). Code identifiers and comments are in English. Documentation lives in `docs/` (PRODUCT.md, TECHNICAL.md, milestones/, ADR/).
