# Baloot Calculator (حاسبة بلوت)

Offline-capable Baloot score calculator PWA with P2P multiplayer.

## Stack
- Single-file PWA (`index.html` ~3200 lines, `sibeet.html` ~750 lines)
- PeerJS v1.5.4 for P2P multiplayer (both calculators)
- QRCode.js for room QR codes
- Service Worker (`sw.js`) for offline caching
- Al Dewaniah visual identity (burgundy/gold/navy/cream, Cairo font)

## Commands
```bash
npx http-server . -p 8080    # Local dev server
```

## Live URLs
- **حاسبة بلوت:** https://ealhamed.github.io/baloot-calculator/
- **بنت السبيت:** https://ealhamed.github.io/baloot-calculator/sibeet.html
- **بنت السبيت (standalone):** https://ealhamed.github.io/sibeet-calculator/

## Files
| File | What |
|------|------|
| `index.html` | Baloot calculator + embedded بنت السبيت view |
| `sibeet.html` | Standalone بنت السبيت calculator |
| `sw.js` | Service worker (cache-first, v3) |
| `manifest.json` | PWA manifest for baloot |
| `manifest-sibeet.json` | PWA manifest for sibeet |
| `logo.png` | Al Dewaniah logo |
| `icon-192.png`, `icon-512.png` | PWA icons |

## Architecture

### Baloot Calculator (index.html)
- **Scoring Engine** (`BalootScoring`): rawToBunt conversion, project values, failure rules, kabout, multipliers
- **State Manager** (`StateManager`): localStorage persistence, round/game/session lifecycle
- **Simple Mode**: Enter بنط directly for لنا/لهم, optional smart score interpreter
- **Advanced Mode**: Single-view form — type (صن/حكم), buyer, multiplier (عادي/دبل for صن; up to قهوة for حكم), bunt preset grid (0-26, greyed 17-26 for حكم), projects (سرا/خمسين/مية/أربعمية/بلوت), kabout, live preview
- **Buyer Failure Rule**: If opponent's score > buyer's score, opponent takes all
- **Session**: Best of 3 games to 152 بنط
- **Contextual Sayings**: Triggered by game events (comeback, blowout, close to win, etc.)
- **P2P Rooms**: PeerJS WebRTC, 4-digit room code + QR, host lock/unlock editing
- **بنت السبيت View**: Embedded view switchable from burger menu (same code as sibeet.html)

### بنت السبيت Calculator (sibeet.html)
- **4-player individual scoring**: Each player card has ♠Q toggle, ♦10 toggle, ♥ hearts stepper
- **Three-state card toggles**: Off → ×1 (burgundy) → ×2 doubled (gold border) → Off
- **Hearts**: SVG heart shape with white count, global 13 limit enforced in real-time
- **Target**: Single editable input, default 200, changeable mid-game
- **Progress bars**: Per-player, turn burgundy at 80% of target
- **Leader/danger states**: Visual indicators on player cards
- **Round history**: Table with highest scorer highlighted per round
- **Game over**: Ranked overlay with medals and score bars
- **P2P Rooms**: Same pattern as baloot — host creates, others join, host controls editing

### Shared Features (both calculators)
- **In-app dialogs**: `appConfirm()` / `appPrompt()` replace native confirm/prompt
- **SVG icons**: Lucide-style, no emoji icons
- **Dark mode**: Full theme with CSS variables
- **Back button**: pushState for menu/modals/dialogs
- **Haptic feedback**: navigator.vibrate on key interactions
- **Double-tap protection**: 400ms lock on submit buttons
- **Accessibility**: aria-pressed, aria-labels, role=radiogroup, aria-live on validation
- **prefers-reduced-motion**: Respected
- **PWA**: Offline-first, installable

## Design Spec
See `docs/superpowers/specs/2026-04-06-baloot-calculator-design.md`

## Repos
- **baloot-calculator**: https://github.com/ealhamed/baloot-calculator (public)
- **sibeet-calculator**: https://github.com/ealhamed/sibeet-calculator (public, standalone copy)
