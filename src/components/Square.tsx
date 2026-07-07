import type { DragEvent } from 'react';
import type { Piece } from '../game';
import PieceGlyph from './PieceGlyph';

interface SquareProps {
  square: number;
  squareName: string;
  piece: Piece | null;
  isLight: boolean;
  isSelected: boolean;
  isLegalMove: boolean;
  isLegalCapture: boolean;
  isRewindDestination: boolean;
  isLastMove: boolean;
  isKingInCheck: boolean;
  hasRewindAvailable: boolean;
  rewindMode: boolean;
  fileLabel?: string;
  rankLabel?: string;
  onSquareClick: (square: number) => void;
  onPieceDragStart: (square: number, event: DragEvent<HTMLDivElement>) => void;
  onDropOnSquare: (square: number) => void;
}

export default function Square({
  square,
  squareName,
  piece,
  isLight,
  isSelected,
  isLegalMove,
  isLegalCapture,
  isRewindDestination,
  isLastMove,
  isKingInCheck,
  hasRewindAvailable,
  rewindMode,
  fileLabel,
  rankLabel,
  onSquareClick,
  onPieceDragStart,
  onDropOnSquare,
}: SquareProps) {
  const classes = [
    'square',
    isLight ? 'square--light' : 'square--dark',
    isSelected && 'square--selected',
    isLastMove && 'square--last-move',
    isKingInCheck && 'square--check',
    isRewindDestination && 'square--rewind-target',
    rewindMode && hasRewindAvailable && 'square--rewind-selectable',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      onClick={() => onSquareClick(square)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDropOnSquare(square);
      }}
      role="button"
      tabIndex={0}
      aria-label={`Square ${squareName}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}`}
    >
      {fileLabel && <span className="square__label square__label--file">{fileLabel}</span>}
      {rankLabel && <span className="square__label square__label--rank">{rankLabel}</span>}

      {piece && (
        <div
          className="square__piece"
          draggable
          onDragStart={(e) => onPieceDragStart(square, e)}
        >
          <PieceGlyph type={piece.type} color={piece.color} glowing={hasRewindAvailable} />
        </div>
      )}

      {isLegalMove && !isLegalCapture && <div className="square__move-dot" />}
      {isLegalCapture && <div className="square__capture-ring" />}
      {isRewindDestination && <div className="square__rewind-marker" title="Rewind destination" />}
    </div>
  );
}
