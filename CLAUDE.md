# Baloot Calculator (حاسبة بلوت)

Offline-capable Baloot score calculator PWA with Firebase-backed shared rooms — sibling to sibeet and konkan calculators in the الديوانية suite.

## Stack
- Single-file PWA (`index.html` ~3200 lines, `sibeet.html` ~750 lines)
- Firebase Realtime Database for shared rooms (host broadcasts state, viewers mirror)
- QRCode.js for room QR codes
- Service Worker (`sw.js`, cache `baloot-v9`) for offline caching
- Al Dewaniah visual identity (burgundy/gold/navy/cream, Cairo font)

## Commands
```bash
npx http-server . -p 8080    # Local dev server
```

## Live URLs
- **حاسبة بلوت:** https://ealhamed.github.io/baloot-calculator/
- **بنت السبيت (embedded view):** https://ealhamed.github.io/baloot-calculator/sibeet.html
- **بنت السبيت (standalone):** https://ealhamed.github.io/sibeet-calculator/
- **كنكان:** https://ealhamed.github.io/konkan-calculator/

## Files
| File | What |
|------|------|
| `index.html` | Baloot calculator + embedded بنت السبيت view |
| `sibeet.html` | Standalone بنت السبيت calculator |
| `sw.js` | Service worker (cache-first) |
| `manifest.json` | PWA manifest for baloot |
| `manifest-sibeet.json` | PWA manifest for sibeet |
| `firebase.json` / `database.rules.json` / `.firebaserc` | Firebase RTDB config for `baloot-calculator-al-dew` |
| `logo.png`, `icon-192.png`, `icon-512.png` | Branding |

## Architecture

### Baloot Calculator (index.html)
- **Scoring Engine** (`BalootScoring`): rawToBunt conversion, project values, failure rules, kabout, multipliers
- **State Manager** (`StateManager`): localStorage persistence, round/game/session lifecycle
- **Simple Mode**: Enter بنط directly for لنا/لهم, optional smart score interpreter
- **Advanced Mode**: Single-view form — type (صن/حكم), buyer, multiplier (عادي/دبل for صن; up to قهوة for حكم), bunt preset grid (0-26, greyed 17-26 for حكم), projects (سرا/خمسين/مية/أربعمية/بلوت), kabout, live preview
- **Buyer Failure Rule**: If opponent's score > buyer's score, opponent takes all
- **Session**: Best of 3 games to 152 بنط
- **Contextual Sayings**: Triggered by game events (comeback, blowout, close to win, etc.)

### بنت السبيت Calculator (sibeet.html)
- 4-player individual scoring; ♠Q / ♦10 three-state toggles; ♥ hearts stepper with 13 cap
- Editable target (default 200), progress bars, leader/danger states, round history, game-over ranking

### Multiplayer (Room System)
- **Firebase-only**: host generates a 4-char code, viewers scan QR or enter the code. No viewer cap beyond Firebase quota.
- State model: `rooms/{code}` holds `state`, `editUnlocked`, `presence/{id}`, and `messages/{id}` (viewer→host round pushes when edit unlocked)
- Host writes full state on every broadcast; viewers mirror via `onValue`. `onDisconnect` removes room on host exit and presence entry on viewer exit.
- **Viewers are read-only** by default — host can toggle edit-unlock to let viewers push rounds
- Firebase project: `baloot-calculator-al-dew` (isolated 100-concurrent quota)

### Shared Features (both calculators)
- In-app dialogs (`appConfirm`/`appPrompt`) replace native confirm/prompt
- SVG icons (Lucide-style, no emoji)
- Dark mode with CSS variables, iOS Safari bottom-strip fix
- Back button integration via `pushState` for menu/modals/dialogs
- Haptic feedback (`navigator.vibrate`) on key interactions
- Double-tap protection (400ms lock on submit)
- Accessibility: aria-pressed, aria-labels, role=radiogroup, aria-live on validation, `prefers-reduced-motion` respected
- PWA: offline-first, installable

## Menu
Links to all three sibling calculators (حاسبة بلوت / بنت السبيت / كنكان) in shared order across all three apps.

## Design Spec
See `docs/superpowers/specs/2026-04-06-baloot-calculator-design.md`

## Repos
- **baloot-calculator**: https://github.com/ealhamed/baloot-calculator
- **Siblings**: [sibeet-calculator](https://github.com/ealhamed/sibeet-calculator), [konkan-calculator](https://github.com/ealhamed/konkan-calculator)
