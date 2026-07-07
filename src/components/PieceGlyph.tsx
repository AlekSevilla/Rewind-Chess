import type { Color, PieceType } from '../game';

const GLYPHS: Record<Color, Record<PieceType, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

interface PieceGlyphProps {
  type: PieceType;
  color: Color;
  glowing?: boolean;
}

export default function PieceGlyph({ type, color, glowing }: PieceGlyphProps) {
  return (
    <span
      className={`piece-glyph piece-glyph--${color}${glowing ? ' piece-glyph--glowing' : ''}`}
      aria-label={`${color === 'w' ? 'White' : 'Black'} ${type}`}
    >
      {GLYPHS[color][type]}
    </span>
  );
}
