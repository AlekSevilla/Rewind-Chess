// Move generation: pseudo-legal moves per piece, special moves (castling, en passant,
// promotion), and the legal-move filter that rejects anything leaving your own king in check.

import { fileOf, isOnBoard, rankOf, toSquare } from './board';
import { isKingInCheck, isSquareAttacked } from './attacks';
import { REWIND_ELIGIBLE_TYPES } from './types';
import type { Board, CastleSide, Color, GameState, Move, PieceType } from './types';

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
const PROMOTION_TYPES: PieceType[] = ['q', 'r', 'b', 'n'];

function slidingMoves(board: Board, from: number, directions: number[][], color: Color): Move[] {
  const moves: Move[] = [];
  const piece = board[from];
  if (!piece) return moves;
  const file = fileOf(from);
  const rank = rankOf(from);
  for (const [df, dr] of directions) {
    let f = file + df;
    let r = rank + dr;
    while (isOnBoard(f, r)) {
      const to = toSquare(f, r);
      const occupant = board[to];
      if (!occupant) {
        moves.push(baseMove(piece.id, piece.type, color, from, to));
      } else {
        if (occupant.color !== color) {
          moves.push(baseMove(piece.id, piece.type, color, from, to, occupant.id));
        }
        break;
      }
      f += df;
      r += dr;
    }
  }
  return moves;
}

function baseMove(
  pieceId: string,
  pieceType: PieceType,
  color: Color,
  from: number,
  to: number,
  capturedId?: string,
): Move {
  return { from, to, pieceId, pieceType, color, capturedId };
}

function generatePawnMoves(state: GameState, from: number): Move[] {
  const { board, enPassantTarget } = state;
  const piece = board[from];
  if (!piece) return [];
  const moves: Move[] = [];
  const color = piece.color;
  const direction = color === 'w' ? 1 : -1;
  const startRank = color === 'w' ? 1 : 6;
  const promotionRank = color === 'w' ? 7 : 0;
  const file = fileOf(from);
  const rank = rankOf(from);

  const pushWithPromotion = (to: number, capturedId?: string, isEnPassant?: boolean) => {
    const toRank = rankOf(to);
    if (toRank === promotionRank) {
      for (const promo of PROMOTION_TYPES) {
        moves.push({ ...baseMove(piece.id, 'p', color, from, to, capturedId), promotion: promo, isEnPassant });
      }
    } else {
      moves.push({ ...baseMove(piece.id, 'p', color, from, to, capturedId), isEnPassant });
    }
  };

  // Single push
  const oneStepRank = rank + direction;
  if (isOnBoard(file, oneStepRank)) {
    const oneStep = toSquare(file, oneStepRank);
    if (!board[oneStep]) {
      pushWithPromotion(oneStep);
      // Double push from start rank, only if both squares are empty.
      const twoStepRank = rank + direction * 2;
      if (rank === startRank && isOnBoard(file, twoStepRank)) {
        const twoStep = toSquare(file, twoStepRank);
        if (!board[twoStep]) {
          moves.push({ ...baseMove(piece.id, 'p', color, from, twoStep), isDoublePawnPush: true });
        }
      }
    }
  }

  // Captures (including en passant)
  for (const df of [-1, 1]) {
    const f = file + df;
    const r = rank + direction;
    if (!isOnBoard(f, r)) continue;
    const to = toSquare(f, r);
    const occupant = board[to];
    if (occupant && occupant.color !== color) {
      pushWithPromotion(to, occupant.id);
    } else if (!occupant && to === enPassantTarget) {
      pushWithPromotion(to, undefined, true);
    }
  }

  return moves;
}

function generateKnightMoves(board: Board, from: number): Move[] {
  const piece = board[from];
  if (!piece) return [];
  const moves: Move[] = [];
  const file = fileOf(from);
  const rank = rankOf(from);
  for (const [df, dr] of KNIGHT_OFFSETS) {
    const f = file + df;
    const r = rank + dr;
    if (!isOnBoard(f, r)) continue;
    const to = toSquare(f, r);
    const occupant = board[to];
    if (!occupant || occupant.color !== piece.color) {
      moves.push(baseMove(piece.id, 'n', piece.color, from, to, occupant?.id));
    }
  }
  return moves;
}

function generateKingSteps(board: Board, from: number): Move[] {
  const piece = board[from];
  if (!piece) return [];
  const moves: Move[] = [];
  const file = fileOf(from);
  const rank = rankOf(from);
  for (const [df, dr] of KING_OFFSETS) {
    const f = file + df;
    const r = rank + dr;
    if (!isOnBoard(f, r)) continue;
    const to = toSquare(f, r);
    const occupant = board[to];
    if (!occupant || occupant.color !== piece.color) {
      moves.push(baseMove(piece.id, 'k', piece.color, from, to, occupant?.id));
    }
  }
  return moves;
}

function generateCastlingMoves(state: GameState, from: number): Move[] {
  const { board, castling, turn } = state;
  const king = board[from];
  if (!king || king.type !== 'k') return [];
  if (isKingInCheck(board, turn)) return [];

  const rank = rankOf(from);
  const enemy: Color = turn === 'w' ? 'b' : 'w';
  const moves: Move[] = [];
  const rights = castling[turn];

  const tryCastle = (side: CastleSide) => {
    if (!rights[side]) return;
    const rookFile = side === 'K' ? 7 : 0;
    const rookSquare = toSquare(rookFile, rank);
    const rook = board[rookSquare];
    if (!rook || rook.type !== 'r' || rook.color !== turn) return;

    const step = side === 'K' ? 1 : -1;
    const kingFile = fileOf(from);
    // Squares between king and rook must be empty.
    let f = kingFile + step;
    while (f !== rookFile) {
      if (board[toSquare(f, rank)]) return;
      f += step;
    }
    // King's path (current, transit, destination) must not be attacked.
    const kingTo = toSquare(kingFile + step * 2, rank);
    const kingTransit = toSquare(kingFile + step, rank);
    if (isSquareAttacked(board, kingTransit, enemy) || isSquareAttacked(board, kingTo, enemy)) return;

    moves.push(baseMove(king.id, 'k', turn, from, kingTo));
    moves[moves.length - 1].isCastle = side;
  };

  tryCastle('K');
  tryCastle('Q');
  return moves;
}

/** All pseudo-legal moves for the piece on `from`, ignoring whether they leave the king in check. */
export function generatePseudoLegalMovesForSquare(state: GameState, from: number): Move[] {
  const piece = state.board[from];
  if (!piece) return [];
  switch (piece.type) {
    case 'p':
      return generatePawnMoves(state, from);
    case 'n':
      return generateKnightMoves(state.board, from);
    case 'b':
      return slidingMoves(state.board, from, BISHOP_DIRECTIONS, piece.color);
    case 'r':
      return slidingMoves(state.board, from, ROOK_DIRECTIONS, piece.color);
    case 'q':
      return [
        ...slidingMoves(state.board, from, ROOK_DIRECTIONS, piece.color),
        ...slidingMoves(state.board, from, BISHOP_DIRECTIONS, piece.color),
      ];
    case 'k':
      return [...generateKingSteps(state.board, from), ...generateCastlingMoves(state, from)];
    default:
      return [];
  }
}

/** Applies a move to a cloned board without touching game-state bookkeeping (used for legality probes). */
export function applyMoveToBoard(board: Board, move: Move): Board {
  const next = board.map((p) => (p ? { ...p, moveStack: [...p.moveStack] } : null));
  const piece = next[move.from];
  if (!piece) return next;

  if (move.isEnPassant) {
    const captureRank = rankOf(move.from);
    const captureSquare = toSquare(fileOf(move.to), captureRank);
    next[captureSquare] = null;
  }

  // Rewind-eligible pieces push their origin onto their history stack on every real
  // move (rewinds pop instead of push — see rewind.ts). Pawns/kings never accumulate
  // history since they can never rewind; a newly-promoted piece starts with none.
  const nextMoveStack = REWIND_ELIGIBLE_TYPES.has(piece.type)
    ? [...piece.moveStack, move.from]
    : piece.moveStack;

  next[move.from] = null;
  next[move.to] = {
    ...piece,
    type: move.promotion ?? piece.type,
    hasMoved: true,
    moveStack: move.promotion ? [] : nextMoveStack,
  };

  if (move.isCastle) {
    const rank = rankOf(move.from);
    const rookFromFile = move.isCastle === 'K' ? 7 : 0;
    const rookToFile = move.isCastle === 'K' ? fileOf(move.to) - 1 : fileOf(move.to) + 1;
    const rookFrom = toSquare(rookFromFile, rank);
    const rookTo = toSquare(rookToFile, rank);
    const rook = next[rookFrom];
    if (rook) {
      next[rookFrom] = null;
      // Castling establishes a new baseline: the rook's rewind history is cleared.
      next[rookTo] = { ...rook, hasMoved: true, moveStack: [] };
    }
  }

  return next;
}

function wouldLeaveOwnKingInCheck(state: GameState, move: Move): boolean {
  const resultingBoard = applyMoveToBoard(state.board, move);
  return isKingInCheck(resultingBoard, move.color);
}

/** Legal moves for the piece on `from`: pseudo-legal moves filtered by king safety. */
export function generateLegalMovesForSquare(state: GameState, from: number): Move[] {
  const piece = state.board[from];
  if (!piece || piece.color !== state.turn) return [];
  return generatePseudoLegalMovesForSquare(state, from).filter((move) => !wouldLeaveOwnKingInCheck(state, move));
}

/** All legal moves for the side to move. */
export function generateAllLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  for (let square = 0; square < 64; square += 1) {
    const piece = state.board[square];
    if (piece && piece.color === state.turn) {
      moves.push(...generateLegalMovesForSquare(state, square));
    }
  }
  return moves;
}

export function hasAnyLegalMove(state: GameState): boolean {
  for (let square = 0; square < 64; square += 1) {
    const piece = state.board[square];
    if (piece && piece.color === state.turn) {
      if (generateLegalMovesForSquare(state, square).length > 0) return true;
    }
  }
  return false;
}
