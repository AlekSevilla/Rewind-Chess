import type { Color } from '../game';

interface ControlsProps {
  turn: Color;
  rewindMode: boolean;
  rewindAvailableCount: number;
  gameOver: boolean;
  onToggleRewind: () => void;
  onNewGame: () => void;
}

export default function Controls({
  turn,
  rewindMode,
  rewindAvailableCount,
  gameOver,
  onToggleRewind,
  onNewGame,
}: ControlsProps) {
  return (
    <div className="controls">
      <div className={`turn-indicator turn-indicator--${turn}`}>
        <span className="turn-indicator__swatch" />
        {turn === 'w' ? 'White' : 'Black'} to move
      </div>

      <button
        type="button"
        className={`rewind-toggle${rewindMode ? ' rewind-toggle--active' : ''}`}
        onClick={onToggleRewind}
        disabled={gameOver || rewindAvailableCount === 0}
        title={
          rewindAvailableCount === 0
            ? 'No pieces are eligible to rewind right now'
            : 'Rewind an eligible piece before your move'
        }
      >
        <span className="rewind-toggle__icon" aria-hidden>⟲</span>
        {rewindMode ? 'Cancel Rewind' : 'Rewind'}
        {rewindAvailableCount > 0 && <span className="rewind-toggle__badge">{rewindAvailableCount}</span>}
      </button>

      <button type="button" className="new-game" onClick={onNewGame}>
        New Game
      </button>
    </div>
  );
}
