// Core data model for Rewind Chess. Pure types only — no logic here.

export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

/** Piece types that are allowed to rewind. Pawns and kings can never rewind. */
export const REWIND_ELIGIBLE_TYPES: ReadonlySet<PieceType> = new Set(['n', 'b', 'r', 'q']);

export interface Piece {
  /** Stable identity that survives moves/rewinds, used by React keys and history tracking. */
  id: string;
  type: PieceType;
  color: Color;
  /** True once the piece has ever moved (used for castling eligibility, pawn double-push). */
  hasMoved: boolean;
  /**
   * Stack of squares the piece occupied immediately before each of its past moves,
   * oldest first. The top of the stack (last element) is the piece's "previousSquare" —
   * where a rewind would send it. Rewinding pops the stack; moving pushes onto it.
   * Always empty for pawns and kings.
   */
  moveStack: number[];
}

/** 0-63, a1=0 ... h1=7, a2=8 ... h8=63 (little-endian rank-file). */
export type Square = number;

export type Board = (Piece | null)[];

export interface CastlingRights {
  w: { K: boolean; Q: boolean };
  b: { K: boolean; Q: boolean };
}

export type CastleSide = 'K' | 'Q';

/** A fully-specified, already-legal move ready to be applied to the board. */
export interface Move {
  from: Square;
  to: Square;
  pieceId: string;
  pieceType: PieceType;
  color: Color;
  capturedId?: string;
  promotion?: PieceType;
  isEnPassant?: boolean;
  isCastle?: CastleSide;
  isDoublePawnPush?: boolean;
}

/** A candidate move before promotion has been chosen (UI-facing). */
export interface MoveCandidate {
  from: Square;
  to: Square;
  requiresPromotion: boolean;
}

export interface RewindAction {
  pieceId: string;
  from: Square;
  to: Square;
}

export type HistoryEntryKind = 'move' | 'rewind';

export interface HistoryEntry {
  kind: HistoryEntryKind;
  color: Color;
  moveNumber: number;
  notation: string;
}

export type GameStatus =
  | 'active'
  | 'check'
  | 'checkmate'
  | 'stalemate'
  | 'draw-repetition'
  | 'draw-fifty-move';

export interface GameState {
  board: Board;
  turn: Color;
  castling: CastlingRights;
  /** Square a pawn can capture onto via en passant this move, or null. */
  enPassantTarget: Square | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  history: HistoryEntry[];
  status: GameStatus;
  /** Repetition counts keyed by a simplified position hash. */
  positionCounts: Record<string, number>;
  winner: Color | null;
}
