import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import {
  createInitialGameState,
  getAllLegalRewindSquares,
  getKingSquare,
  getLegalMovesForSquare,
  getPreviousSquare,
  isGameOver,
  makeMove,
  makeRewind,
} from './game';
import type { GameState, PieceType } from './game';
import Board from './components/Board';
import Controls from './components/Controls';
import MoveHistory from './components/MoveHistory';
import StatusBanner from './components/StatusBanner';
import PromotionDialog from './components/PromotionDialog';
import './App.css';

interface PendingPromotion {
  from: number;
  to: number;
}

interface LastMove {
  from: number;
  to: number;
}

function App() {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState());
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [rewindMode, setRewindMode] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);

  const gameOver = isGameOver(gameState);

  const legalMoves = useMemo(
    () => (selectedSquare !== null ? getLegalMovesForSquare(gameState, selectedSquare) : []),
    [gameState, selectedSquare],
  );

  const rewindEligibleSquares = useMemo(() => new Set(getAllLegalRewindSquares(gameState)), [gameState]);

  const selectedPieceRewindDestination = useMemo(() => {
    if (selectedSquare === null || !rewindEligibleSquares.has(selectedSquare)) return null;
    const piece = gameState.board[selectedSquare];
    return piece ? getPreviousSquare(piece) : null;
  }, [gameState, selectedSquare, rewindEligibleSquares]);

  const kingInCheckSquare = useMemo(() => {
    if (gameState.status !== 'check' && gameState.status !== 'checkmate') return null;
    return getKingSquare(gameState, gameState.turn);
  }, [gameState]);

  function resetSelection() {
    setSelectedSquare(null);
  }

  function startNewGame() {
    setGameState(createInitialGameState());
    setSelectedSquare(null);
    setRewindMode(false);
    setPendingPromotion(null);
    setLastMove(null);
  }

  function attemptMoveTo(from: number, to: number) {
    const candidates = getLegalMovesForSquare(gameState, from).filter((m) => m.to === to);
    if (candidates.length === 0) return false;

    if (candidates.length > 1) {
      // Multiple candidates at the same destination only happens for promotion choices.
      setPendingPromotion({ from, to });
      return true;
    }

    setGameState(makeMove(gameState, candidates[0]));
    setLastMove({ from, to });
    resetSelection();
    return true;
  }

  function handleSquareClick(square: number) {
    if (gameOver) return;

    if (rewindMode) {
      if (rewindEligibleSquares.has(square) && gameState.board[square]?.color === gameState.turn) {
        setGameState(makeRewind(gameState, square));
        setRewindMode(false);
        resetSelection();
      } else {
        setRewindMode(false);
      }
      return;
    }

    const piece = gameState.board[square];

    if (selectedSquare !== null) {
      if (square === selectedSquare) {
        resetSelection();
        return;
      }
      if (attemptMoveTo(selectedSquare, square)) return;
      if (piece && piece.color === gameState.turn) {
        setSelectedSquare(square);
        return;
      }
      resetSelection();
      return;
    }

    if (piece && piece.color === gameState.turn) {
      setSelectedSquare(square);
    }
  }

  function handlePieceDragStart(square: number, event: DragEvent<HTMLDivElement>) {
    const piece = gameState.board[square];
    if (gameOver || rewindMode || !piece || piece.color !== gameState.turn) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', String(square));
    event.dataTransfer.effectAllowed = 'move';
    setSelectedSquare(square);
  }

  function handleDropOnSquare(square: number) {
    if (gameOver || rewindMode || selectedSquare === null) return;
    if (square === selectedSquare) return;
    attemptMoveTo(selectedSquare, square);
  }

  function handlePromotionChoice(type: PieceType) {
    if (!pendingPromotion) return;
    const move = getLegalMovesForSquare(gameState, pendingPromotion.from).find(
      (m) => m.to === pendingPromotion.to && m.promotion === type,
    );
    if (move) {
      setGameState(makeMove(gameState, move));
      setLastMove({ from: pendingPromotion.from, to: pendingPromotion.to });
    }
    setPendingPromotion(null);
    resetSelection();
  }

  function toggleRewindMode() {
    if (gameOver) return;
    setRewindMode((prev) => !prev);
    resetSelection();
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>Rewind Chess</h1>
        <p className="app__tagline">Standard chess, plus one twist: undo your own pieces before you move.</p>
      </header>

      <div className="app__layout">
        <div className="app__board-column">
          <StatusBanner status={gameState.status} winner={gameState.winner} turn={gameState.turn} onNewGame={startNewGame} />
          <div className="board-wrapper">
            <Board
              state={gameState}
              selectedSquare={selectedSquare}
              legalMoves={legalMoves}
              rewindMode={rewindMode}
              rewindEligibleSquares={rewindEligibleSquares}
              selectedPieceRewindDestination={selectedPieceRewindDestination}
              lastMoveSquares={lastMove}
              kingInCheckSquare={kingInCheckSquare}
              onSquareClick={handleSquareClick}
              onPieceDragStart={handlePieceDragStart}
              onDropOnSquare={handleDropOnSquare}
            />
            {pendingPromotion && (
              <PromotionDialog
                color={gameState.turn}
                onChoose={handlePromotionChoice}
                onCancel={() => {
                  setPendingPromotion(null);
                  resetSelection();
                }}
              />
            )}
          </div>
          {rewindMode && (
            <p className="rewind-hint">Click a glowing piece to rewind it back to its previous square.</p>
          )}
        </div>

        <aside className="app__sidebar">
          <Controls
            turn={gameState.turn}
            rewindMode={rewindMode}
            rewindAvailableCount={rewindEligibleSquares.size}
            gameOver={gameOver}
            onToggleRewind={toggleRewindMode}
            onNewGame={startNewGame}
          />
          <MoveHistory history={gameState.history} />
        </aside>
      </div>
    </div>
  );
}

export default App;
