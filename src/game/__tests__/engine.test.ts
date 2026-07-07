import { describe, expect, it } from 'vitest';
import { algebraicToSquare, squareToAlgebraic } from '../board';
import { createInitialGameState, getLegalMovesForSquare, isGameOver, makeMove, makeRewind } from '../engine';
import { generateAllLegalMoves } from '../moves';
import { getAllLegalRewindSquares, hasEscape, isRewindLegalNow } from '../rewind';
import type { Color, GameState, Move, Piece, PieceType } from '../types';

// ---- Test helpers -------------------------------------------------------

let idCounter = 0;
function makePiece(type: PieceType, color: Color, moveStack: number[] = []): Piece {
  idCounter += 1;
  return { id: `${color}${type}${idCounter}`, type, color, hasMoved: moveStack.length > 0, moveStack };
}

function emptyState(turn: Color, overrides: Partial<GameState> = {}): GameState {
  return {
    board: new Array(64).fill(null),
    turn,
    castling: { w: { K: false, Q: false }, b: { K: false, Q: false } },
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    history: [],
    status: 'active',
    positionCounts: {},
    winner: null,
    ...overrides,
  };
}

function place(state: GameState, square: string, piece: Piece): GameState {
  const board = [...state.board];
  board[algebraicToSquare(square)] = piece;
  return { ...state, board };
}

function findMove(state: GameState, from: string, to: string, promotion?: PieceType): Move {
  const moves = getLegalMovesForSquare(state, algebraicToSquare(from));
  const move = moves.find((m) => m.to === algebraicToSquare(to) && (!promotion || m.promotion === promotion));
  if (!move) throw new Error(`No legal move ${from}-${to} found`);
  return move;
}

function perft(state: GameState, depth: number): number {
  if (depth === 0) return 1;
  const moves = generateAllLegalMoves(state);
  if (depth === 1) return moves.length;
  let nodes = 0;
  for (const move of moves) {
    nodes += perft(makeMove(state, move), depth - 1);
  }
  return nodes;
}

// ---- Standard chess correctness (perft) ---------------------------------

describe('standard move generation (perft)', () => {
  it('matches known perft values from the starting position', () => {
    const state = createInitialGameState();
    expect(perft(state, 1)).toBe(20);
    expect(perft(state, 2)).toBe(400);
    expect(perft(state, 3)).toBe(8902);
  });
});

describe('square helpers', () => {
  it('round-trips algebraic notation', () => {
    expect(squareToAlgebraic(algebraicToSquare('e4'))).toBe('e4');
    expect(squareToAlgebraic(0)).toBe('a1');
    expect(squareToAlgebraic(63)).toBe('h8');
  });
});

// ---- Special standard rules ----------------------------------------------

describe('castling', () => {
  it('allows kingside castling when squares are clear and safe', () => {
    let state = emptyState('w', { castling: { w: { K: true, Q: true }, b: { K: true, Q: true } } });
    state = place(state, 'e1', makePiece('k', 'w'));
    state = place(state, 'h1', makePiece('r', 'w'));
    state = place(state, 'e8', makePiece('k', 'b'));

    const move = findMove(state, 'e1', 'g1');
    const next = makeMove(state, move);
    expect(next.board[algebraicToSquare('g1')]?.type).toBe('k');
    expect(next.board[algebraicToSquare('f1')]?.type).toBe('r');
    expect(next.board[algebraicToSquare('h1')]).toBeNull();
  });

  it('forbids castling through an attacked square', () => {
    let state = emptyState('w', { castling: { w: { K: true, Q: true }, b: { K: true, Q: true } } });
    state = place(state, 'e1', makePiece('k', 'w'));
    state = place(state, 'h1', makePiece('r', 'w'));
    state = place(state, 'e8', makePiece('k', 'b'));
    state = place(state, 'f8', makePiece('r', 'b')); // attacks f1, the king's transit square

    const moves = getLegalMovesForSquare(state, algebraicToSquare('e1'));
    expect(moves.some((m) => m.to === algebraicToSquare('g1'))).toBe(false);
  });

  it('clears a castled rook rewind history (new baseline)', () => {
    let state = emptyState('w', { castling: { w: { K: true, Q: true }, b: { K: true, Q: true } } });
    state = place(state, 'e1', makePiece('k', 'w'));
    state = place(state, 'h1', makePiece('r', 'w'));
    state = place(state, 'e8', makePiece('k', 'b'));

    const move = findMove(state, 'e1', 'g1');
    const next = makeMove(state, move);
    const rook = next.board[algebraicToSquare('f1')];
    expect(rook?.moveStack).toEqual([]);
    expect(isRewindLegalNow(next, algebraicToSquare('f1'))).toBe(false);
  });
});

describe('en passant', () => {
  it('sets and consumes the en passant target square correctly', () => {
    let state = emptyState('w');
    state = place(state, 'e2', makePiece('p', 'w'));
    state = place(state, 'd4', makePiece('p', 'b'));
    state = place(state, 'a1', makePiece('k', 'w'));
    state = place(state, 'a8', makePiece('k', 'b'));

    const doublePush = findMove(state, 'e2', 'e4');
    let next = makeMove(state, doublePush);
    expect(next.enPassantTarget).toBe(algebraicToSquare('e3'));

    const epCapture = findMove(next, 'd4', 'e3');
    expect(epCapture.isEnPassant).toBe(true);
    next = makeMove(next, epCapture);
    expect(next.board[algebraicToSquare('e4')]).toBeNull();
    expect(next.board[algebraicToSquare('e3')]?.color).toBe('b');
  });
});

describe('promotion', () => {
  it('promotes a pawn reaching the last rank and offers all four choices', () => {
    let state = emptyState('w');
    state = place(state, 'e7', makePiece('p', 'w'));
    state = place(state, 'a1', makePiece('k', 'w'));
    state = place(state, 'a8', makePiece('k', 'b'));

    const moves = getLegalMovesForSquare(state, algebraicToSquare('e7'));
    const promotions = moves.filter((m) => m.to === algebraicToSquare('e8'));
    expect(promotions.map((m) => m.promotion).sort()).toEqual(['b', 'n', 'q', 'r']);

    const next = makeMove(state, promotions.find((m) => m.promotion === 'q')!);
    const promoted = next.board[algebraicToSquare('e8')];
    expect(promoted?.type).toBe('q');
    expect(promoted?.moveStack).toEqual([]);
  });
});

// ---- Rewind mechanic -------------------------------------------------------

describe('rewind mechanic', () => {
  it('has no rewind available for a piece that has never moved', () => {
    let state = emptyState('w');
    state = place(state, 'b1', makePiece('n', 'w'));
    state = place(state, 'a1', makePiece('k', 'w'));
    state = place(state, 'a8', makePiece('k', 'b'));
    expect(getAllLegalRewindSquares(state).length).toBe(0);
  });

  it('rewinds a knight back to its previous square and updates the stack', () => {
    let state = emptyState('w');
    state = place(state, 'g1', makePiece('n', 'w'));
    state = place(state, 'a1', makePiece('k', 'w'));
    state = place(state, 'a8', makePiece('k', 'b'));

    const move = findMove(state, 'g1', 'f3');
    let next = makeMove(state, move); // knight now on f3, stack=[g1], turn -> b
    next = { ...next, turn: 'w' }; // pretend it's white's turn again for this isolated test

    expect(isRewindLegalNow(next, algebraicToSquare('f3'))).toBe(true);
    const rewound = makeRewind(next, algebraicToSquare('f3'));
    expect(rewound.board[algebraicToSquare('g1')]?.type).toBe('n');
    expect(rewound.board[algebraicToSquare('f3')]).toBeNull();
    expect(rewound.board[algebraicToSquare('g1')]?.moveStack).toEqual([]);
  });

  it('allows a rewound piece to move again in the same turn (not spent)', () => {
    let state = emptyState('w');
    state = place(state, 'g1', makePiece('n', 'w'));
    state = place(state, 'a1', makePiece('k', 'w'));
    state = place(state, 'a8', makePiece('k', 'b'));

    let next = makeMove(state, findMove(state, 'g1', 'f3'));
    next = { ...next, turn: 'w' };
    next = makeRewind(next, algebraicToSquare('f3')); // knight back on g1
    const followUp = findMove(next, 'g1', 'h3');
    const after = makeMove(next, followUp);
    expect(after.board[algebraicToSquare('h3')]?.type).toBe('n');
  });

  it('requires the landing square to be empty', () => {
    let state = emptyState('w');
    state = place(state, 'g1', makePiece('n', 'w'));
    state = place(state, 'a1', makePiece('k', 'w'));
    state = place(state, 'a8', makePiece('k', 'b'));
    let next = makeMove(state, findMove(state, 'g1', 'f3'));
    next = { ...next, turn: 'w' };
    next = place(next, 'g1', makePiece('p', 'w')); // block the landing square
    expect(isRewindLegalNow(next, algebraicToSquare('f3'))).toBe(false);
  });

  it('forbids a rewind that would leave the king in inescapable check', () => {
    // King a1 is boxed in by its own pawns on a2/b2. A white knight sits on b1,
    // incidentally blocking a black queen's rank-1 check from h1. Its rewind target
    // (d4) can't reach back to rank 1, so rewinding it away is a discovered check
    // with no block, no capture, and no flight square (b1 becomes attacked too) — illegal.
    let state = emptyState('w');
    state = place(state, 'a1', makePiece('k', 'w'));
    state = place(state, 'a2', makePiece('p', 'w'));
    state = place(state, 'b2', makePiece('p', 'w'));
    state = place(state, 'b1', makePiece('n', 'w', [algebraicToSquare('d4')]));
    state = place(state, 'h1', makePiece('q', 'b'));
    state = place(state, 'a8', makePiece('k', 'b'));

    expect(isRewindLegalNow(state, algebraicToSquare('b1'))).toBe(false);
  });

  it('allows rewinding into check when the move phase can still resolve it', () => {
    // Same discovered-check setup, but a white rook on h4 can swoop down to h1 and
    // capture the queen once the check is revealed, so the combination is legal.
    let state = emptyState('w');
    state = place(state, 'a1', makePiece('k', 'w'));
    state = place(state, 'a2', makePiece('p', 'w'));
    state = place(state, 'b2', makePiece('p', 'w'));
    state = place(state, 'b1', makePiece('n', 'w', [algebraicToSquare('d4')]));
    state = place(state, 'h1', makePiece('q', 'b'));
    state = place(state, 'h4', makePiece('r', 'w'));
    state = place(state, 'a8', makePiece('k', 'b'));

    expect(isRewindLegalNow(state, algebraicToSquare('b1'))).toBe(true);
  });
});

// ---- Check / checkmate / stalemate -----------------------------------------

describe('game end detection', () => {
  it('detects fool\'s mate', () => {
    let state = createInitialGameState();
    state = makeMove(state, findMove(state, 'f2', 'f3'));
    state = makeMove(state, findMove(state, 'e7', 'e5'));
    state = makeMove(state, findMove(state, 'g2', 'g4'));
    state = makeMove(state, findMove(state, 'd8', 'h4'));
    expect(state.status).toBe('checkmate');
    expect(state.winner).toBe('b');
    expect(isGameOver(state)).toBe(true);
    expect(state.history.at(-1)?.notation).toMatch(/#$/);
  });

  it('detects stalemate', () => {
    // Classic minimal stalemate: black king a8, white king c7, white queen b6 to move.
    let state = emptyState('b');
    state = place(state, 'a8', makePiece('k', 'b'));
    state = place(state, 'c7', makePiece('k', 'w'));
    state = place(state, 'b6', makePiece('q', 'w'));
    expect(state.status).toBe('active');
    const moves = generateAllLegalMoves(state);
    expect(moves.length).toBe(0);
  });

  it('lets a rewind rescue a position that would otherwise be checkmate', () => {
    // King a1 boxed in by its own pawn/rook. A black knight on c2 delivers an
    // unblockable check. White's bishop on g4 can't reach c2 to capture it — but its
    // rewind target (b3) can. Plain move generation sees no escape at all (a real
    // checkmate under standard rules); hasEscape must find the rewind-then-capture line.
    let state = emptyState('w');
    state = place(state, 'a1', makePiece('k', 'w'));
    state = place(state, 'a2', makePiece('p', 'w'));
    state = place(state, 'b1', makePiece('r', 'w'));
    state = place(state, 'b2', makePiece('p', 'w'));
    state = place(state, 'g4', makePiece('b', 'w', [algebraicToSquare('b3')]));
    state = place(state, 'c2', makePiece('n', 'b'));
    state = place(state, 'h8', makePiece('k', 'b'));

    // Sanity: without considering rewinds, white has no legal move at all — this is
    // exactly the case that plain checkmate detection would misreport.
    expect(generateAllLegalMoves(state).length).toBe(0);

    expect(getAllLegalRewindSquares(state)).toContain(algebraicToSquare('g4'));
    expect(hasEscape(state)).toBe(true);
  });
});
