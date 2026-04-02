# Piano Trainer

A web-based piano learning app that helps you learn songs through visual waterfall guidance and guided progression.

## Tech Stack

- **Language:** TypeScript
- **Framework:** React + Vite
- **Rendering:** HTML Canvas (waterfall/falling notes)
- **Audio:** Tone.js (Web Audio API)
- **MIDI parsing:** @tonejs/midi
- **Styling:** Tailwind CSS
- **State:** Zustand

## Project Structure

```
src/
  components/     # React components
  engine/         # Learning engine (sections, progress, speed)
  parsers/        # MIDI, MusicXML parsers
  renderer/       # Canvas waterfall renderer
  models/         # TypeScript types/interfaces for song data
  hooks/          # React hooks
  utils/          # Shared utilities
  App.tsx
  main.tsx
public/
  songs/          # Pre-bundled MIDI files
```

## Commands

```bash
npm install       # install dependencies
npm run dev       # start dev server
npm run build     # production build
npm run preview   # preview production build
```

## Architecture

Songs are parsed into a normalized `Song` model (notes, timing, hand assignments). The Canvas renderer draws the waterfall view. The learning engine manages sections, progress, speed, and hand separation.

```
[MIDI File Import] --> [MIDI Parser] --> [Song Model] --> [Canvas Renderer]
                       (@tonejs/midi)   (seconds, not ms!)   (waterfall + keyboard)
                                              |               |
                                    [Learning Engine]    [Tone.js Playback]
                                    (sections, mastery)  (synced via Transport)
```

### Key Patterns

- **All times in seconds** (matches @tonejs/midi and Tone.Transport.seconds)
- **Canvas rAF loop reads Zustand via `getState()`** (non-reactive, avoids React re-renders)
- **Viewport culling:** Only draw notes within visible time window (current +/- ~5 seconds)
- **Tone.Draw.schedule()** for keyboard highlight sync (tighter than rAF polling)
- **Hand detection:** Filter to piano tracks (programs 0-7), remove drums (channel 9), then apply track-order or pitch-split heuristic

## Design Doc

Full design document: `~/.gstack/projects/piano-trainer/mabba-main-design-20260402-094500.md`

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming -> invoke office-hours
- Bugs, errors, "why is this broken", 500 errors -> invoke investigate
- Ship, deploy, push, create PR -> invoke ship
- QA, test the site, find bugs -> invoke qa
- Code review, check my diff -> invoke review
- Update docs after shipping -> invoke document-release
- Weekly retro -> invoke retro
- Design system, brand -> invoke design-consultation
- Visual audit, design polish -> invoke design-review
- Architecture review -> invoke plan-eng-review
