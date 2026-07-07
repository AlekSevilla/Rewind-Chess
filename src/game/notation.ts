// Algebraic-ish notation for the move history panel.

import { fileOf, rankOf, squareToAlgebraic } from './board';
import type { Move, Piece, PieceType } from './types';

function pieceLetter(type: PieceType): string {
  switch (type) {
    case 'n': return 'N';
    case 'b': return 'B';
    case 'r': return 'R';
    case 'q': return 'Q';
    case 'k': return 'K';
    default: return '';
  }
}

/**
 * Standard algebraic notation for a move. `siblingMoves` are the other legal moves
 * available to the mover *before* this move was made, used to disambiguate
 * (e.g. "Nbd2" when two knights could both reach d2).
 */
export function moveToNotation(move: Move, siblingMoves: Move[]): string {
  if (move.isCastle === 'K') return 'O-O';
  if (move.isCastle === 'Q') return 'O-O-O';

  const destination = squareToAlgebraic(move.to);
  const isCapture = Boolean(move.capturedId) || move.isEnPassant;

  if (move.pieceType === 'p') {
    const fromFile = String.fromCharCode('a'.charCodeAt(0) + fileOf(move.from));
    const base = isCapture ? `${fromFile}x${destination}` : destination;
    const promo = move.promotion ? `=${pieceLetter(move.promotion)}` : '';
    const ep = move.isEnPassant ? ' e.p.' : '';
    return `${base}${promo}${ep}`;
  }

  const ambiguous = siblingMoves.filter(
    (m) => m.pieceType === move.pieceType && m.to === move.to && m.from !== move.from,
  );

  let disambiguator = '';
  if (ambiguous.length > 0) {
    const sameFile = ambiguous.some((m) => fileOf(m.from) === fileOf(move.from));
    const sameRank = ambiguous.some((m) => rankOf(m.from) === rankOf(move.from));
    const fromFile = String.fromCharCode('a'.charCodeAt(0) + fileOf(move.from));
    const fromRank = String(rankOf(move.from) + 1);
    if (!sameFile) disambiguator = fromFile;
    else if (!sameRank) disambiguator = fromRank;
    else disambiguator = `${fromFile}${fromRank}`;
  }

  return `${pieceLetter(move.pieceType)}${disambiguator}${isCapture ? 'x' : ''}${destination}`;
}

/** Notation for a rewind action, e.g. "Nf3-g1 (rewind)". */
export function rewindToNotation(piece: Piece, from: number, to: number): string {
  const letter = pieceLetter(piece.type);
  return `${letter}${squareToAlgebraic(from)}-${squareToAlgebraic(to)} (rewind)`;
}

export function appendSuffix(notation: string, suffix: '' | '+' | '#'): string {
  return `${notation}${suffix}`;
}
