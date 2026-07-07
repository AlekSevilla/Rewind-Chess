import type { Color, PieceType } from '../game';
import PieceGlyph from './PieceGlyph';

interface PromotionDialogProps {
  color: Color;
  onChoose: (type: PieceType) => void;
  onCancel: () => void;
}

const CHOICES: PieceType[] = ['q', 'r', 'b', 'n'];

export default function PromotionDialog({ color, onChoose, onCancel }: PromotionDialogProps) {
  return (
    <div className="promotion-overlay" onClick={onCancel}>
      <div className="promotion-card" onClick={(e) => e.stopPropagation()}>
        <p className="promotion-card__title">Promote pawn to:</p>
        <div className="promotion-card__choices">
          {CHOICES.map((type) => (
            <button key={type} type="button" className="promotion-choice" onClick={() => onChoose(type)}>
              <PieceGlyph type={type} color={color} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
