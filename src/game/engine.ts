// Game engine: the single entry point the UI (or a future network layer) talks to.
// Owns turn structure — optional Rewind Phase, then mandatory Move Phase — and all
// state bookkeeping (castling rights, en passant, move history, draw detection).

import { createInitialBoard, findKingSquare, squareToAlgebraic } from './board';
import { isKingInCheck } from './attacks';
import { applyMoveToBoard, generateAllLegalMoves } from './moves';
import { appendSuffix, moveToNotation, rewindToNotation } from './notation';
import { applyRewindToBoard, canRewindPiece, getPreviousSquare, hasEscape, isRewindLegalNow } from './rewind';
import type { CastlingRights, Color, GameState, Move, PieceType } from './types';

export { generateLegalMovesForSquare as getLegalMovesForSquare } from './moves';
export { getAllLegalRewindSquares, getPreviousSquare, isRewindLegalNow, canRewindPiece } from './rewind';

export function createInitialGameState(): GameState {
  const state: GameState = {
    board: createInitialBoard(),
    turn: 'w',
    castling: {
      w: { K: true, Q: true },
      b: { K: true, Q: true },
    },
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    history: [],
    status: 'active',
    positionCounts: {},
    winner: null,
  };
  return recordPosition(state);
}

/** Live check flag for UI display — true even mid-turn if a rewind has exposed the king. */
export function isCurrentPlayerInCheck(state: GameState): boolean {
  return isKingInCheck(state.board, state.turn);
}

function positionKey(state: GameState): string {
  const boardKey = state.board
    .map((p) => (p ? `${p.color}${p.type}` : '.'))
    .join('');
  const castlingKey = `${state.castling.w.K ? 1 : 0}${state.castling.w.Q ? 1 : 0}${state.castling.b.K ? 1 : 0}${state.castling.b.Q ? 1 : 0}`;
  return `${boardKey}|${state.turn}|${castlingKey}|${state.enPassantTarget ?? '-'}`;
}

function recordPosition(state: GameState): GameState {
  const key = positionKey(state);
  const positionCounts = { ...state.positionCounts, [key]: (state.positionCounts[key] ?? 0) + 1 };
  return { ...state, positionCounts };
}

function updateCastlingRights(state: GameState, move: Move): CastlingRights {
  const rights: CastlingRights = {
    w: { ...state.castling.w },
    b: { ...state.castling.b },
  };

  const clearForRookSquare = (square: number, color: Color) => {
    if (square === (color === 'w' ? 0 : 56)) rights[color].Q = false;
    if (square === (color === 'w' ? 7 : 63)) rights[color].K = false;
  };

  if (move.pieceType === 'k') {
    rights[move.color].K = false;
    rights[move.color].Q = false;
  }
  if (move.pieceType === 'r') {
    clearForRookSquare(move.from, move.color);
  }
  // A rook captured on its home square also permanently forfeits that side's castling right.
  if (move.capturedId) {
    const enemy: Color = move.color === 'w' ? 'b' : 'w';
    clearForRookSquare(move.to, enemy);
  }

  return rights;
}

function computeStatus(state: GameState): { status: GameState['status']; winner: Color | null } {
  const inCheck = isKingInCheck(state.board, state.turn);
  const canEscape = hasEscape(state);

  if (!canEscape) {
    if (inCheck) {
      const winner: Color = state.turn === 'w' ? 'b' : 'w';
      return { status: 'checkmate', winner };
    }
    return { status: 'stalemate', winner: null };
  }

  if (Object.values(state.positionCounts).some((count) => count >= 3)) {
    return { status: 'draw-repetition', winner: null };
  }
  if (state.halfmoveClock >= 100) {
    return { status: 'draw-fifty-move', winner: null };
  }

  return { status: inCheck ? 'check' : 'active', winner: null };
}

/**
 * Applies the mandatory Move Phase action. `move` must be one produced by
 * `getLegalMovesForSquare` for the current state (so promotion/en passant/castle
 * flags are already correct). Ends the turn.
 */
export function makeMove(state: GameState, move: Move): GameState {
  const siblingMoves = generateAllLegalMoves(state).filter((m) => m.from !== move.from || m.to !== move.to);
  const notationBase = moveToNotation(move, siblingMoves);

  const board = applyMoveToBoard(state.board, move);
  const isPawnMove = move.pieceType === 'p';
  const isCapture = Boolean(move.capturedId) || move.isEnPassant;

  const nextTurn: Color = state.turn === 'w' ? 'b' : 'w';
  const enPassantTarget = move.isDoublePawnPush
    ? (move.from + move.to) / 2
    : null;

  let nextState: GameState = {
    board,
    turn: nextTurn,
    castling: updateCastlingRights(state, move),
    enPassantTarget,
    halfmoveClock: isPawnMove || isCapture ? 0 : state.halfmoveClock + 1,
    fullmoveNumber: state.turn === 'b' ? state.fullmoveNumber + 1 : state.fullmoveNumber,
    history: state.history,
    status: 'active',
    positionCounts: state.positionCounts,
    winner: null,
  };

  nextState = recordPosition(nextState);
  const { status, winner } = computeStatus(nextState);
  const suffix = status === 'checkmate' ? '#' : status === 'check' ? '+' : '';
  const notation = appendSuffix(notationBase, suffix);

  nextState = {
    ...nextState,
    status,
    winner,
    history: [
      ...state.history,
      { kind: 'move', color: move.color, moveNumber: state.fullmoveNumber, notation },
    ],
  };

  return nextState;
}

/**
 * Applies one Rewind Phase action. Does not end the turn — the player still owes
 * the Move Phase afterward. Throws if the rewind isn't currently legal; callers
 * should gate the UI with `isRewindLegalNow`/`getAllLegalRewindSquares` first.
 */
export function makeRewind(state: GameState, from: number): GameState {
  const piece = state.board[from];
  if (!piece || !isRewindLegalNow(state, from)) {
    throw new Error(`Illegal rewind attempted from ${squareToAlgebraic(from)}`);
  }
  const destination = getPreviousSquare(piece);
  if (destination === null) {
    throw new Error('Rewind has no destination');
  }

  const board = applyRewindToBoard(state.board, from);
  const notation = rewindToNotation(piece, from, destination);

  const nextState: GameState = {
    ...state,
    board,
    status: isKingInCheck(board, state.turn) ? 'check' : 'active',
    history: [
      ...state.history,
      { kind: 'rewind', color: state.turn, moveNumber: state.fullmoveNumber, notation },
    ],
  };

  return nextState;
}

export function pieceHasRewindAvailable(state: GameState, square: number): boolean {
  const piece = state.board[square];
  return Boolean(piece && canRewindPiece(piece));
}

export function isGameOver(state: GameState): boolean {
  return (
    state.status === 'checkmate' ||
    state.status === 'stalemate' ||
    state.status === 'draw-repetition' ||
    state.status === 'draw-fifty-move'
  );
}

export function getKingSquare(state: GameState, color: Color): number {
  return findKingSquare(state.board, color);
}

export type { PieceType };
