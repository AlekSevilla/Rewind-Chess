# Rewind Chess

A two-player chess variant played in the browser. Standard chess rules apply,
plus one addition: on your turn, you may rewind any number of your own
knights, bishops, rooks, or queens back to the square they occupied before
their last move, before making your mandatory move.

## Rules

Each turn has two phases:

1. **Rewind Phase (optional).** Rewind any number of your own eligible
   pieces. Pawns and kings can never rewind. Each piece remembers the square
   it occupied before its most recent move; rewinding sends it there and
   then "remembers" one step further back, so a piece with a long move
   history can be rewound again on a future turn. The landing square must be
   empty, though the piece may pass through occupied squares to get there.
   A rewound piece isn't "spent" — it can still move, capture, or deliver
   check later in the same turn.
2. **Move Phase (mandatory).** Make one legal chess move.

You may rewind into check if your move phase can still resolve it (block,
capture, or move the king), but you can never end your turn with your own
king in check — an unresolvable rewind is simply illegal. Castled rooks
can't rewind past the castling move.

Standard rules apply otherwise: check, checkmate, stalemate, castling, en
passant, pawn promotion, threefold repetition, and the fifty-move rule.

## Development

```bash
npm install
npm run dev      # start the dev server
npm test         # run the game-logic test suite (vitest)
npm run build    # typecheck + production build
```

## Project structure

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
