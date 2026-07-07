// Board representation helpers: square<->coordinate conversion, initial setup, cloning.

import type { Board, Color, Piece, PieceType } from './types';

export const BOARD_SIZE = 8;

export function fileOf(square: number): number {
  return square % BOARD_SIZE;
}

export function rankOf(square: number): number {
  return Math.floor(square / BOARD_SIZE);
}

export function toSquare(file: number, rank: number): number {
  return rank * BOARD_SIZE + file;
}

export function isOnBoard(file: number, rank: number): boolean {
  return file >= 0 && file < BOARD_SIZE && rank >= 0 && rank < BOARD_SIZE;
}

/** Algebraic name for a square index, e.g. 0 -> "a1", 63 -> "h8". */
export function squareToAlgebraic(square: number): string {
  const file = String.fromCharCode('a'.charCodeAt(0) + fileOf(square));
  const rank = rankOf(square) + 1;
  return `${file}${rank}`;
}

export function algebraicToSquare(name: string): number {
  const file = name.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(name.slice(1), 10) - 1;
  return toSquare(file, rank);
}

let pieceIdCounter = 0;
/** Reset the id counter so piece ids are deterministic across fresh games (helps tests/snapshots). */
export function resetPieceIdCounter(): void {
  pieceIdCounter = 0;
}

function makePiece(type: PieceType, color: Color): Piece {
  pieceIdCounter += 1;
  return {
    id: `${color}${type}${pieceIdCounter}`,
    type,
    color,
    hasMoved: false,
    moveStack: [],
  };
}

const BACK_RANK: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

export function createInitialBoard(): Board {
  resetPieceIdCounter();
  const board: Board = new Array(64).fill(null);

  for (let file = 0; file < BOARD_SIZE; file += 1) {
    board[toSquare(file, 0)] = makePiece(BACK_RANK[file], 'w');
    board[toSquare(file, 1)] = makePiece('p', 'w');
    board[toSquare(file, 6)] = makePiece('p', 'b');
    board[toSquare(file, 7)] = makePiece(BACK_RANK[file], 'b');
  }

  return board;
}

export function cloneBoard(board: Board): Board {
  return board.map((piece) => (piece ? { ...piece, moveStack: [...piece.moveStack] } : null));
}

export function findKingSquare(board: Board, color: Color): number {
  const square = board.findIndex((p) => p !== null && p.type === 'k' && p.color === color);
  if (square === -1) {
    throw new Error(`King not found for color ${color}`);
  }
  return square;
}

export function pieceAt(board: Board, square: number): Piece | null {
  return board[square];
}
