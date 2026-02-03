import React, { useState, useEffect } from 'react';
import { Crown, RotateCcw, User, Cpu, Palette } from 'lucide-react';

const ChessGame = () => {
  const [board, setBoard] = useState([]);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState('white');
  const [validMoves, setValidMoves] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });
  const [gameMode, setGameMode] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [promotionSquare, setPromotionSquare] = useState(null);
  const [isCheck, setIsCheck] = useState(false);
  const [isDraw, setIsDraw] = useState(false);
  const [theme, setTheme] = useState('classic');
  const [showThemePanel, setShowThemePanel] = useState(false);

  const themes = {
    classic: {
      name: 'Classic Wood',
      light: 'bg-[#f0d9b5]',
      dark: 'bg-[#b58863]',
      icon: '🪵'
    },
    ocean: {
      name: 'Ocean Blue',
      light: 'bg-[#e8f4f8]',
      dark: 'bg-[#4a90a4]',
      icon: '🌊'
    },
    forest: {
      name: 'Forest Green',
      light: 'bg-[#e8f5e9]',
      dark: 'bg-[#66bb6a]',
      icon: '🌲'
    },
    purple: {
      name: 'Purple Royale',
      light: 'bg-[#f3e5f5]',
      dark: 'bg-[#9c27b0]',
      icon: '👑'
    },
    dark: {
      name: 'Dark Mode',
      light: 'bg-[#4a5568]',
      dark: 'bg-[#1a202c]',
      icon: '🌙'
    }
  };

  useEffect(() => {
    if (gameMode) {
      initializeBoard();
    }
  }, [gameMode]);

  useEffect(() => {
    if (gameMode === 'ai' && currentPlayer === 'black' && !gameOver && !promotionSquare) {
      setIsThinking(true);
      const timeout = setTimeout(() => {
        makeAIMove();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [currentPlayer, gameMode, gameOver, promotionSquare]);

  const initializeBoard = () => {
    const newBoard = Array(8).fill(null).map(() => Array(8).fill(null));
    
    for (let i = 0; i < 8; i++) {
      newBoard[1][i] = { type: 'pawn', color: 'black' };
      newBoard[6][i] = { type: 'pawn', color: 'white' };
    }
    
    const setupRow = (row, color) => {
      newBoard[row][0] = { type: 'rook', color };
      newBoard[row][1] = { type: 'knight', color };
      newBoard[row][2] = { type: 'bishop', color };
      newBoard[row][3] = { type: 'queen', color };
      newBoard[row][4] = { type: 'king', color };
      newBoard[row][5] = { type: 'bishop', color };
      newBoard[row][6] = { type: 'knight', color };
      newBoard[row][7] = { type: 'rook', color };
    };
    
    setupRow(0, 'black');
    setupRow(7, 'white');
    
    setBoard(newBoard);
    setCurrentPlayer('white');
    setGameOver(false);
    setWinner(null);
    setSelectedSquare(null);
    setValidMoves([]);
    setCapturedPieces({ white: [], black: [] });
    setIsThinking(false);
    setPromotionSquare(null);
    setIsCheck(false);
    setIsDraw(false);
  };

  const getPieceSymbol = (piece) => {
    if (!piece) return '';
    const symbols = {
      king: '♔',
      queen: '♕',
      rook: '♖',
      bishop: '♗',
      knight: '♘',
      pawn: '♙'
    };
    return symbols[piece.type];
  };

  const getPieceValue = (type) => {
    const values = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 100 };
    return values[type] || 0;
  };

  const checkPromotion = (row, piece) => {
    if (piece.type === 'pawn') {
      if ((piece.color === 'white' && row === 0) || (piece.color === 'black' && row === 7)) {
        return true;
      }
    }
    return false;
  };

  const promotePawn = (row, col, pieceType) => {
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = { type: pieceType, color: newBoard[row][col].color };
    setBoard(newBoard);
    setPromotionSquare(null);
    
    const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
    
    if (isKingInCheck(newBoard, nextPlayer)) {
      setIsCheck(true);
      if (isCheckmate(newBoard, nextPlayer)) {
        setGameOver(true);
        setWinner(currentPlayer);
        return;
      }
    } else {
      setIsCheck(false);
      if (isStalemate(newBoard, nextPlayer)) {
        setGameOver(true);
        setIsDraw(true);
        return;
      }
    }
    
    setCurrentPlayer(nextPlayer);
  };

  const findKing = (testBoard, color) => {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece && piece.type === 'king' && piece.color === color) {
          return [row, col];
        }
      }
    }
    return null;
  };

  const isSquareAttacked = (testBoard, row, col, byColor) => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = testBoard[r][c];
        if (piece && piece.color === byColor) {
          if (isValidMoveIgnoringCheck(r, c, row, col, piece, testBoard)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const isKingInCheck = (testBoard, color) => {
    const kingPos = findKing(testBoard, color);
    if (!kingPos) return false;
    const [kingRow, kingCol] = kingPos;
    const opponentColor = color === 'white' ? 'black' : 'white';
    return isSquareAttacked(testBoard, kingRow, kingCol, opponentColor);
  };

  const wouldMoveCauseCheck = (fromRow, fromCol, toRow, toCol, testBoard, playerColor) => {
    const newBoard = testBoard.map(row => [...row]);
    const piece = newBoard[fromRow][fromCol];
    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = null;
    return isKingInCheck(newBoard, playerColor);
  };

  const isValidMoveIgnoringCheck = (fromRow, fromCol, toRow, toCol, piece, testBoard) => {
    if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;
    const targetPiece = testBoard[toRow][toCol];
    if (targetPiece && targetPiece.color === piece.color) return false;

    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);

    switch (piece.type) {
      case 'pawn':
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;
        if (colDiff === 0 && !targetPiece) {
          if (rowDiff === direction) return true;
          if (fromRow === startRow && rowDiff === 2 * direction && !testBoard[fromRow + direction][fromCol]) return true;
        }
        if (absColDiff === 1 && rowDiff === direction && targetPiece) return true;
        return false;
      case 'rook':
        if (rowDiff !== 0 && colDiff !== 0) return false;
        return isPathClear(fromRow, fromCol, toRow, toCol, testBoard);
      case 'knight':
        return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
      case 'bishop':
        if (absRowDiff !== absColDiff) return false;
        return isPathClear(fromRow, fromCol, toRow, toCol, testBoard);
      case 'queen':
        if (rowDiff !== 0 && colDiff !== 0 && absRowDiff !== absColDiff) return false;
        return isPathClear(fromRow, fromCol, toRow, toCol, testBoard);
      case 'king':
        return absRowDiff <= 1 && absColDiff <= 1;
      default:
        return false;
    }
  };

  const isValidMove = (fromRow, fromCol, toRow, toCol, piece, testBoard = board) => {
    if (!isValidMoveIgnoringCheck(fromRow, fromCol, toRow, toCol, piece, testBoard)) {
      return false;
    }
    return !wouldMoveCauseCheck(fromRow, fromCol, toRow, toCol, testBoard, piece.color);
  };

  const isPathClear = (fromRow, fromCol, toRow, toCol, testBoard) => {
    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    while (currentRow !== toRow || currentCol !== toCol) {
      if (testBoard[currentRow][currentCol]) return false;
      currentRow += rowStep;
      currentCol += colStep;
    }
    return true;
  };

  const getValidMovesForPiece = (row, col, testBoard = board) => {
    const moves = [];
    const piece = testBoard[row][col];
    if (!piece) return moves;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (isValidMove(row, col, r, c, piece, testBoard)) {
          moves.push([r, c]);
        }
      }
    }
    return moves;
  };

  const hasAnyLegalMoves = (testBoard, color) => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = testBoard[r][c];
        if (piece && piece.color === color) {
          const moves = getValidMovesForPiece(r, c, testBoard);
          if (moves.length > 0) return true;
        }
      }
    }
    return false;
  };

  const isCheckmate = (testBoard, color) => {
    if (!isKingInCheck(testBoard, color)) return false;
    return !hasAnyLegalMoves(testBoard, color);
  };

  const isStalemate = (testBoard, color) => {
    if (isKingInCheck(testBoard, color)) return false;
    return !hasAnyLegalMoves(testBoard, color);
  };

  const getAllPossibleMoves = (color, testBoard = board) => {
    const allMoves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = testBoard[r][c];
        if (piece && piece.color === color) {
          const moves = getValidMovesForPiece(r, c, testBoard);
          moves.forEach(([toR, toC]) => {
            allMoves.push({ from: [r, c], to: [toR, toC], piece });
          });
        }
      }
    }
    return allMoves;
  };

  const evaluateMove = (move, testBoard) => {
    const { from, to } = move;
    const [fromR, fromC] = from;
    const [toR, toC] = to;
    let score = 0;
    const targetPiece = testBoard[toR][toC];
    if (targetPiece) {
      score += getPieceValue(targetPiece.type) * 10;
    }
    const centerDistance = Math.abs(toR - 3.5) + Math.abs(toC - 3.5);
    score += (7 - centerDistance) * 0.5;
    if (move.piece.type === 'pawn') score += (7 - toR) * 0.3;
    score += Math.random() * 2;
    return score;
  };

  const makeAIMove = () => {
    const possibleMoves = getAllPossibleMoves('black', board);
    if (possibleMoves.length === 0) {
      setGameOver(true);
      setWinner('white');
      setIsThinking(false);
      return;
    }
    let bestMove = possibleMoves[0];
    let bestScore = -Infinity;
    possibleMoves.forEach(move => {
      const score = evaluateMove(move, board);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    });
    const { from, to } = bestMove;
    const [fromR, fromC] = from;
    const [toR, toC] = to;
    const newBoard = board.map(row => [...row]);
    const movingPiece = newBoard[fromR][fromC];
    const capturedPiece = newBoard[toR][toC];
    if (capturedPiece) {
      const newCaptured = { ...capturedPieces };
      newCaptured.black.push(capturedPiece);
      setCapturedPieces(newCaptured);
    }
    newBoard[toR][toC] = movingPiece;
    newBoard[fromR][fromC] = null;
    
    if (checkPromotion(toR, movingPiece)) {
      newBoard[toR][toC] = { type: 'queen', color: 'black' };
    }
    
    setBoard(newBoard);
    
    if (isKingInCheck(newBoard, 'white')) {
      setIsCheck(true);
      if (isCheckmate(newBoard, 'white')) {
        setGameOver(true);
        setWinner('black');
        setIsThinking(false);
        return;
      }
    } else {
      setIsCheck(false);
      if (isStalemate(newBoard, 'white')) {
        setGameOver(true);
        setIsDraw(true);
        setIsThinking(false);
        return;
      }
    }
    
    setCurrentPlayer('white');
    setIsThinking(false);
  };

  const handleSquareClick = (row, col) => {
    if (gameOver || promotionSquare || (gameMode === 'ai' && currentPlayer === 'black')) return;

    if (selectedSquare) {
      const [selectedRow, selectedCol] = selectedSquare;
      const isValid = validMoves.some(([r, c]) => r === row && c === col);
      if (isValid) {
        const newBoard = board.map(row => [...row]);
        const movingPiece = newBoard[selectedRow][selectedCol];
        const capturedPiece = newBoard[row][col];
        if (capturedPiece) {
          const newCaptured = { ...capturedPieces };
          newCaptured[currentPlayer].push(capturedPiece);
          setCapturedPieces(newCaptured);
        }
        newBoard[row][col] = movingPiece;
        newBoard[selectedRow][selectedCol] = null;
        setBoard(newBoard);
        
        if (checkPromotion(row, movingPiece)) {
          setPromotionSquare({ row, col });
        } else {
          const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
          
          if (isKingInCheck(newBoard, nextPlayer)) {
            setIsCheck(true);
            if (isCheckmate(newBoard, nextPlayer)) {
              setGameOver(true);
              setWinner(currentPlayer);
              setSelectedSquare(null);
              setValidMoves([]);
              return;
            }
          } else {
            setIsCheck(false);
            if (isStalemate(newBoard, nextPlayer)) {
              setGameOver(true);
              setIsDraw(true);
              setSelectedSquare(null);
              setValidMoves([]);
              return;
            }
          }
          
          setCurrentPlayer(nextPlayer);
        }
        setSelectedSquare(null);
        setValidMoves([]);
      } else if (board[row][col]?.color === currentPlayer) {
        setSelectedSquare([row, col]);
        setValidMoves(getValidMovesForPiece(row, col));
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    } else if (board[row][col]?.color === currentPlayer) {
      setSelectedSquare([row, col]);
      setValidMoves(getValidMovesForPiece(row, col));
    }
  };

  const isValidMoveSquare = (row, col) => {
    return validMoves.some(([r, c]) => r === row && c === col);
  };

  if (!gameMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl">
            <div className="text-center mb-8">
              <Crown className="text-yellow-400 mx-auto mb-4" size={64} />
              <h1 className="text-4xl font-bold text-white mb-2">ChessX</h1>
              <p className="text-slate-300">Choose your game mode</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setGameMode('pvp')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-3 transition-colors text-lg"
              >
                <User size={24} />
                2 Players (Local)
              </button>

              <button
                onClick={() => setGameMode('ai')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-3 transition-colors text-lg"
              >
                <Cpu size={24} />
                vs Computer (AI)
              </button>
            </div>

            <div className="mt-6 bg-slate-700 p-4 rounded-lg text-slate-300 text-sm">
              <p className="font-bold text-white mb-2">Game Modes:</p>
              <p className="mb-1">🎮 <strong>2 Players:</strong> Play with a friend locally</p>
              <p>🤖 <strong>vs Computer:</strong> Practice against AI</p>
            </div>
          </div>
        </div>

        <footer className="bg-slate-800 border-t border-slate-700 py-4">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
              <span>from Musfirah</span>
              <span className="text-lg" style={{ color: '#87CEEB' }}>🦋</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <div className="flex-grow p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <Crown className="text-yellow-400" size={36} />
              ChessX
              {gameMode === 'ai' && <Cpu className="text-purple-400" size={32} />}
            </h1>
            <p className="text-slate-300">
              {gameMode === 'ai' ? 'Playing vs Computer' : '2 Players Mode'}
            </p>
            <p className="text-slate-300 mt-1">
              Turn: <span className={`font-bold ${currentPlayer === 'white' ? 'text-white' : 'text-slate-400'}`}>
                {currentPlayer.toUpperCase()}
              </span>
              {isCheck && <span className="text-red-500 ml-2 font-bold">⚠️ CHECK!</span>}
              {isThinking && <span className="text-purple-400 ml-2 animate-pulse">🤔 AI thinking...</span>}
            </p>
          </div>

          {gameOver && !isDraw && (
            <div className="bg-green-600 text-white px-6 py-3 rounded-lg mb-4 text-center font-bold text-xl">
              Checkmate! {winner?.toUpperCase()} Wins! 🎉
            </div>
          )}

          {gameOver && isDraw && (
            <div className="bg-yellow-600 text-white px-6 py-3 rounded-lg mb-4 text-center font-bold text-xl">
              Stalemate! Game is a Draw! 🤝
            </div>
          )}

          {promotionSquare && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-slate-800 p-6 rounded-xl shadow-2xl">
                <h3 className="text-white text-xl font-bold mb-4 text-center">Promote Pawn</h3>
                <div className="flex gap-4">
                  {['queen', 'rook', 'bishop', 'knight'].map(pieceType => (
                    <button
                      key={pieceType}
                      onClick={() => promotionSquare && promotePawn(promotionSquare.row, promotionSquare.col, pieceType)}
                      className="bg-slate-700 hover:bg-slate-600 text-white p-4 rounded-lg transition-colors text-5xl"
                    >
                      {getPieceSymbol({ type: pieceType, color: currentPlayer })}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center mb-6">
            <div className="inline-block border-4 border-slate-700 bg-slate-800">
              {board.map((row, rowIndex) => (
                <div key={rowIndex} className="flex">
                  {row.map((piece, colIndex) => {
                    const isLight = (rowIndex + colIndex) % 2 === 0;
                    const isSelected = selectedSquare && selectedSquare[0] === rowIndex && selectedSquare[1] === colIndex;
                    const isValidMove = isValidMoveSquare(rowIndex, colIndex);
                    return (
                      <button
                        key={`${rowIndex}-${colIndex}`}
                        onClick={() => handleSquareClick(rowIndex, colIndex)}
                        disabled={isThinking || !!promotionSquare}
                        className={`
                          w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-3xl sm:text-5xl font-bold
                          transition-all duration-200 relative
                          ${isLight ? themes[theme].light : themes[theme].dark}
                          ${isSelected ? 'ring-4 ring-blue-500' : ''}
                          ${isValidMove ? 'ring-4 ring-green-400' : ''}
                          ${isThinking || promotionSquare ? 'opacity-70 cursor-not-allowed' : 'hover:brightness-110'}
                        `}
                      >
                        <span className={`
                          ${piece?.color === 'white' 
                            ? 'text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.9)]' 
                            : 'text-slate-900 drop-shadow-[0_0_3px_rgba(255,255,255,0.7)]'}
                        `}>
                          {getPieceSymbol(piece)}
                        </span>
                        {isValidMove && !piece && (
                          <div className="absolute w-3 h-3 bg-green-500 rounded-full opacity-60" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="text-center flex gap-3 justify-center mb-6">
            <button
              onClick={() => setGameMode(null)}
              className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
            >
              Change Mode
            </button>
            <button
              onClick={initializeBoard}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors"
            >
              <RotateCcw size={20} />
              New Game
            </button>
          </div>

          <div className="bg-slate-800 p-4 rounded-lg text-slate-300 text-sm mb-6">
            <h3 className="font-bold text-white mb-2">How to Play:</h3>
            <ul className="space-y-1">
              <li>• Tap piece to select (green shows valid moves)</li>
              <li>• King in danger = CHECK warning ⚠️</li>
              <li>• King trapped = CHECKMATE (you win!) 🎉</li>
              <li>• No legal moves but safe = STALEMATE (draw) 🤝</li>
              {gameMode === 'ai' && <li>• You play as WHITE vs computer</li>}
            </ul>
          </div>

          <button
            onClick={() => setShowThemePanel(!showThemePanel)}
            className="fixed bottom-24 right-6 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-40 animate-pulse"
            title="Change Theme"
          >
            <Palette size={28} />
          </button>

          {showThemePanel && (
            <div className="fixed right-6 bottom-40 bg-slate-800 rounded-xl shadow-2xl p-4 z-40 border-2 border-slate-700">
              <h3 className="text-white font-bold mb-3 text-center">Choose Theme</h3>
              <div className="space-y-2">
                {Object.entries(themes).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setTheme(key);
                      setShowThemePanel(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                      theme === key 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <span className="font-semibold">{t.name}</span>
                    {theme === key && <span className="ml-auto">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="bg-slate-800 border-t border-slate-700 py-4 mt-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
            <span>from Musfirah</span>
            <span className="text-lg" style={{ color: '#87CEEB' }}>🦋</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ChessGame;
