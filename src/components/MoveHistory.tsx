import { useEffect, useRef } from 'react';
import type { HistoryEntry } from '../game';

interface MoveHistoryProps {
  history: HistoryEntry[];
}

export default function MoveHistory({ history }: MoveHistoryProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [history.length]);

  return (
    <div className="move-history">
      <h2 className="move-history__title">Move History</h2>
      <div className="move-history__list" ref={listRef}>
        {history.length === 0 && <p className="move-history__empty">No moves yet.</p>}
        {history.map((entry, index) => (
          <div
            key={index}
            className={`move-history__entry move-history__entry--${entry.kind} move-history__entry--${entry.color}`}
          >
            {entry.kind === 'move' && entry.color === 'w' && (
              <span className="move-history__number">{entry.moveNumber}.</span>
            )}
            <span className="move-history__notation">
              {entry.kind === 'rewind' && <span className="move-history__rewind-icon" aria-hidden>⟲</span>}
              {entry.notation}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
