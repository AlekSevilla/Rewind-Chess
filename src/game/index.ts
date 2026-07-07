// Public surface of the game-logic module. UI code should import from here rather
// than reaching into individual files, so the engine can be swapped for a networked
// version later without touching component code.

export * from './types';
export {
  squareToAlgebraic,
  algebraicToSquare,
  fileOf,
  rankOf,
  toSquare,
} from './board';
export {
  createInitialGameState,
  makeMove,
  makeRewind,
  getLegalMovesForSquare,
  getAllLegalRewindSquares,
  getPreviousSquare,
  isRewindLegalNow,
  canRewindPiece,
  pieceHasRewindAvailable,
  isCurrentPlayerInCheck,
  isGameOver,
  getKingSquare,
} from './engine';
