import type { Color, GameStatus } from '../game';

interface StatusBannerProps {
  status: GameStatus;
  winner: Color | null;
  turn: Color;
  onNewGame: () => void;
}

const colorName = (c: Color) => (c === 'w' ? 'White' : 'Black');

export default function StatusBanner({ status, winner, turn, onNewGame }: StatusBannerProps) {
  if (status === 'check') {
    return (
      <div className="status-bar status-bar--check" role="status">
        {colorName(turn)} is in check
      </div>
    );
  }

  if (status === 'active') return null;

  let message = '';
  if (status === 'checkmate' && winner) {
    message = `Checkmate — ${colorName(winner)} wins!`;
  } else if (status === 'stalemate') {
    message = 'Stalemate — Draw';
  } else if (status === 'draw-repetition') {
    message = 'Draw by threefold repetition';
  } else if (status === 'draw-fifty-move') {
    message = 'Draw by the fifty-move rule';
  }

  return (
    <div className="game-over-overlay">
      <div className="game-over-card">
        <p className="game-over-card__message">{message}</p>
        <button type="button" onClick={onNewGame}>
          New Game
        </button>
      </div>
    </div>
  );
}
