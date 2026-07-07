import type { DragEvent } from 'react';
import type { GameState, Move } from '../game';
import { fileOf, rankOf, squareToAlgebraic, toSquare } from '../game';
import Square from './Square';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

interface BoardProps {
  state: GameState;
  selectedSquare: number | null;
  legalMoves: Move[];
  rewindMode: boolean;
  rewindEligibleSquares: Set<number>;
  selectedPieceRewindDestination: number | null;
  lastMoveSquares: { from: number; to: number } | null;
  kingInCheckSquare: number | null;
  onSquareClick: (square: number) => void;
  onPieceDragStart: (square: number, event: DragEvent<HTMLDivElement>) => void;
  onDropOnSquare: (square: number) => void;
}

export default function Board({
  state,
  selectedSquare,
  legalMoves,
  rewindMode,
  rewindEligibleSquares,
  selectedPieceRewindDestination,
  lastMoveSquares,
  kingInCheckSquare,
  onSquareClick,
  onPieceDragStart,
  onDropOnSquare,
}: BoardProps) {
  const legalMoveTargets = new Map(legalMoves.map((m) => [m.to, m]));

  const squares = [];
  for (let rank = 7; rank >= 0; rank -= 1) {
    for (let file = 0; file < 8; file += 1) {
      const square = toSquare(file, rank);
      const piece = state.board[square];
      const move = legalMoveTargets.get(square);
      squares.push(
        <Square
          key={square}
          square={square}
          squareName={squareToAlgebraic(square)}
          piece={piece}
          isLight={(fileOf(square) + rankOf(square)) % 2 === 1}
          isSelected={selectedSquare === square}
          isLegalMove={Boolean(move)}
          isLegalCapture={Boolean(move && (move.capturedId || move.isEnPassant))}
          isRewindDestination={selectedPieceRewindDestination === square}
          isLastMove={lastMoveSquares?.from === square || lastMoveSquares?.to === square}
          isKingInCheck={kingInCheckSquare === square}
          hasRewindAvailable={rewindEligibleSquares.has(square)}
          rewindMode={rewindMode}
          fileLabel={rank === 0 ? FILES[file] : undefined}
          rankLabel={file === 0 ? String(rank + 1) : undefined}
          onSquareClick={onSquareClick}
          onPieceDragStart={onPieceDragStart}
          onDropOnSquare={onDropOnSquare}
        />,
      );
    }
  }

  return <div className={`board${rewindMode ? ' board--rewind-mode' : ''}`}>{squares}</div>;
}
