// Rewind mechanic: the one addition on top of standard chess rules.
//
// Every knight/bishop/rook/queen carries a `moveStack` of squares it occupied before
// each of its past moves (oldest first). The top of that stack is the piece's
// "previousSquare" — rewinding pops it off and teleports the piece there directly,
// ignoring anything in between (only the landing square must be empty).

import { isKingInCheck } from './attacks';
import { hasAnyLegalMove } from './moves';
import type { Board, GameState, Piece } from './types';
import { REWIND_ELIGIBLE_TYPES } from './types';

/** The square a rewind would send this piece to, or null if it has no history. */
export function getPreviousSquare(piece: Piece): number | null {
  if (piece.moveStack.length === 0) return null;
  return piece.moveStack[piece.moveStack.length - 1];
}

/** Whether this piece type/history combination could ever rewind (ignores board occupancy). */
export function canRewindPiece(piece: Piece): boolean {
  return REWIND_ELIGIBLE_TYPES.has(piece.type) && piece.moveStack.length > 0;
}

/** Pure board transform: pop the piece's history stack and move it back. Assumes pre-validated. */
export function applyRewindToBoard(board: Board, from: number): Board {
  const next = board.map((p) => (p ? { ...p, moveStack: [...p.moveStack] } : null));
  const piece = next[from];
  if (!piece) return next;
  const destination = piece.moveStack[piece.moveStack.length - 1];
  const newStack = piece.moveStack.slice(0, -1);
  next[from] = null;
  next[destination] = { ...piece, moveStack: newStack };
  return next;
}

/**
 * Whether rewinding the piece on `from` is a legal action right now:
 * - It must be the mover's own eligible piece with rewind history.
 * - The landing square must be empty.
 * - The rewind must not strand the mover in an inescapable check (self-checkmate),
 *   since the upcoming mandatory Move Phase would then have no way to resolve it.
 *   Rewinding into an *escapable* check, or into stalemate, is allowed.
 */
export function isRewindLegalNow(state: GameState, from: number): boolean {
  const piece = state.board[from];
  if (!piece || piece.color !== state.turn) return false;
  if (!canRewindPiece(piece)) return false;

  const destination = getPreviousSquare(piece);
  if (destination === null || state.board[destination] !== null) return false;

  const resultingBoard = applyRewindToBoard(state.board, from);
  const hypotheticalState: GameState = { ...state, board: resultingBoard };
  if (isKingInCheck(resultingBoard, state.turn) && !hasAnyLegalMove(hypotheticalState)) {
    return false;
  }
  return true;
}

/** All squares (of the current player's pieces) with a legal rewind available right now. */
export function getAllLegalRewindSquares(state: GameState): number[] {
  const squares: number[] = [];
  for (let square = 0; square < 64; square += 1) {
    const piece = state.board[square];
    if (piece && piece.color === state.turn && isRewindLegalNow(state, square)) {
      squares.push(square);
    }
  }
  return squares;
}

/**
 * True checkmate/stalemate detection must account for the Rewind Phase: a player is
 * only truly stuck if no legal move exists *and* no sequence of legal rewinds (each
 * eligible piece may rewind at most once per phase, per the rules) would open one up.
 * Explores the small search space of rewind orderings (bounded by ~7 eligible pieces
 * per side) via depth-first search, short-circuiting as soon as any escape is found.
 */
export function hasEscape(state: GameState, rewoundPieceIds: ReadonlySet<string> = new Set()): boolean {
  if (hasAnyLegalMove(state)) return true;

  for (let square = 0; square < 64; square += 1) {
    const piece = state.board[square];
    if (!piece || piece.color !== state.turn) continue;
    if (!canRewindPiece(piece) || rewoundPieceIds.has(piece.id)) continue;

    const destination = getPreviousSquare(piece);
    if (destination === null || state.board[destination] !== null) continue;

    const nextBoard = applyRewindToBoard(state.board, square);
    const nextState: GameState = { ...state, board: nextBoard };
    const nextRewound = new Set(rewoundPieceIds);
    nextRewound.add(piece.id);
    if (hasEscape(nextState, nextRewound)) return true;
  }

  return false;
}
