# Rewind Chess

A chess variant where knights, bishops, rooks, and queens can briefly rewind
to their most recent prior square before making their move — adding a layer
of tempo manipulation, bait-and-punish tactics, and calculated risk to
standard chess.

See [RULES.md](./RULES.md) (or the rules document in this repo) for the full
ruleset.

## Rules summary

Each turn has two phases:

1. **Rewind Phase (optional).** Rewind any number of your own eligible
   pieces — knights, bishops, rooks, and queens. Pawns and kings can never
   rewind. Each piece remembers the square it occupied before its most
   recent move; rewinding sends it there and then "remembers" one step
   further back, so a piece with a long move history can be rewound again
   on a future turn. The landing square must be empty, though the piece may
   pass through occupied squares to get there. A rewound piece isn't
   "spent" — it can still move, capture, or deliver check later in the same
   turn.
2. **Move Phase (mandatory).** Make one legal chess move.

You may rewind into check if your move phase can still resolve it (block,
capture, or move the king), but you can never end your turn with your own
king in check — an unresolvable rewind is simply illegal. Castled rooks
can't rewind past the castling move.

Standard rules apply otherwise: check, checkmate, stalemate, castling, en
passant, pawn promotion, threefold repetition, and the fifty-move rule.

## Development

This repository contains a local two-player, browser-based implementation.

```bash
npm install
npm run dev      # start the dev server
npm test         # run the game-logic test suite (vitest)
npm run build    # typecheck + production build
```

### Project structure

- `src/game/` — game logic, framework-agnostic. Board representation, move
  generation, check/checkmate detection, the rewind mechanic, and the turn
  engine. This layer has no React dependency, so it can be reused as-is if
  online multiplayer is added later (e.g. behind a server-authoritative
  engine).
- `src/components/` — the React UI: board rendering, piece glyphs, move
  history, controls, and dialogs.
- `src/game/__tests__/` — unit tests covering standard move generation
  (perft), castling, en passant, promotion, and the rewind mechanic's
  interaction with check/checkmate detection.

## License

Rewind Chess — including this repository's code, rules text, and diagrams —
is released under a **custom Noncommercial License** (see [LICENSE.md](./LICENSE.md)).

**In short:**
- ✅ Free to play, share, fork, and build on for personal, hobby, or
  educational purposes
- ✅ Attribution to the original creator required
- ❌ Commercial use (including integration into a paid product, monetized
  platform, or commercial chess site) is **not** permitted without a separate
  license

**Interested in a commercial license?**
If you represent a company or platform (including chess platforms looking to
add this as an official variant) and want to use Rewind Chess commercially,
please get in touch: **sevillalek@gmail.com**

---

© 2026 Alek Sevilla. All rights not expressly granted are reserved.
