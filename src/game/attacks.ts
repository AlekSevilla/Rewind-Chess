// Attack detection: "does color X attack square Y" — the basis for check detection
// and for forbidding kings from moving through/into attacked squares.

import { fileOf, isOnBoard, rankOf, toSquare } from './board';
import type { Board, Color } from './types';

const KNIGHT_OFFSETS = [
  [1, 2], [2, 1], [2, -1], [1, -2],
  [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];

const KING_OFFSETS = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
];

const ROOK_DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRECTIONS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

/**
 * Casts rays outward from `target` in the given directions; returns true if the first
 * piece hit along any ray is an enemy sliding piece of one of `slidingTypes`.
 */
function isSlidingAttackOn(
  board: Board,
  target: number,
  directions: number[][],
  slidingTypes: string[],
  attackerColor: Color,
): boolean {
  const file = fileOf(target);
  const rank = rankOf(target);
  for (const [df, dr] of directions) {
    let f = file + df;
    let r = rank + dr;
    while (isOnBoard(f, r)) {
      const occupant = board[toSquare(f, r)];
      if (occupant) {
        if (occupant.color === attackerColor && slidingTypes.includes(occupant.type)) return true;
        break;
      }
      f += df;
      r += dr;
    }
  }
  return false;
}

/** Returns true if `square` is attacked by any piece of `byColor` on the given board. */
export function isSquareAttacked(board: Board, square: number, byColor: Color): boolean {
  const file = fileOf(square);
  const rank = rankOf(square);

  // Pawns: attack diagonally forward relative to their own color.
  const pawnRankOffset = byColor === 'w' ? -1 : 1;
  for (const df of [-1, 1]) {
    const f = file + df;
    const r = rank + pawnRankOffset;
    if (isOnBoard(f, r)) {
      const occupant = board[toSquare(f, r)];
      if (occupant && occupant.color === byColor && occupant.type === 'p') return true;
    }
  }

  // Knights
  for (const [df, dr] of KNIGHT_OFFSETS) {
    const f = file + df;
    const r = rank + dr;
    if (isOnBoard(f, r)) {
      const occupant = board[toSquare(f, r)];
      if (occupant && occupant.color === byColor && occupant.type === 'n') return true;
    }
  }

  // King (adjacency only — used for detecting "square controlled by enemy king")
  for (const [df, dr] of KING_OFFSETS) {
    const f = file + df;
    const r = rank + dr;
    if (isOnBoard(f, r)) {
      const occupant = board[toSquare(f, r)];
      if (occupant && occupant.color === byColor && occupant.type === 'k') return true;
    }
  }

  // Sliding pieces: rook/queen on orthogonal rays, bishop/queen on diagonal rays.
  if (isSlidingAttackOn(board, square, ROOK_DIRECTIONS, ['r', 'q'], byColor)) return true;
  if (isSlidingAttackOn(board, square, BISHOP_DIRECTIONS, ['b', 'q'], byColor)) return true;

  return false;
}

export function isKingInCheck(board: Board, color: Color): boolean {
  const kingSquare = board.findIndex((p) => p !== null && p.type === 'k' && p.color === color);
  if (kingSquare === -1) return false;
  const enemy: Color = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(board, kingSquare, enemy);
}
