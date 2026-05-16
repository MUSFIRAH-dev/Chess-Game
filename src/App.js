import React, { useState, useEffect, useRef } from 'react';
import { Crown, RotateCcw, User, Cpu, Undo, Clock, Trophy, TrendingUp, ArrowLeft } from 'lucide-react';

// Pink Heart Icon
const HeartIcon = ({ size = 18, glow = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"
    style={{ filter: glow ? 'drop-shadow(0 0 8px #f472b6)' : 'none', transition: 'filter 0.2s' }}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);

// ── PIECE SQUARE TABLES FOR SMARTER AI ───────────────────────────────────────
const PIECE_VALUES = { pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900, king: 20000 };

const PAWN_TABLE = [
  [0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],
  [5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],
  [5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]
];
const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],
  [-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],
  [-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],
  [-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]
];
const BISHOP_TABLE = [
  [-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
  [-10,0,5,10,10,5,0,-10],[-10,5,5,10,10,5,5,-10],
  [-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],
  [-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]
];
const ROOK_TABLE = [
  [0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],
  [-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],
  [-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],
  [-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]
];
const QUEEN_TABLE = [
  [-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
  [-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],
  [0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],
  [-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]
];

const getPST = (piece, row, col) => {
  const r = piece.color === 'white' ? row : 7 - row;
  switch(piece.type) {
    case 'pawn':   return PAWN_TABLE[r][col];
    case 'knight': return KNIGHT_TABLE[r][col];
    case 'bishop': return BISHOP_TABLE[r][col];
    case 'rook':   return ROOK_TABLE[r][col];
    case 'queen':  return QUEEN_TABLE[r][col];
    default: return 0;
  }
};

const evaluateBoard = (board) => {
  let score = 0;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = PIECE_VALUES[p.type] + getPST(p, r, c);
      score += p.color === 'black' ? val : -val;
    }
  return score;
};

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
  const [showSettings, setShowSettings] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]);
  const [boardHistory, setBoardHistory] = useState([]);
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [showMoveHistory, setShowMoveHistory] = useState(false);
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPreset, setTimerPreset] = useState(10);
  const [customMinutes, setCustomMinutes] = useState(10);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [stats, setStats] = useState({ gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winStreak: 0 });
  const [showStats, setShowStats] = useState(false);

  const themes = {
    classic: { name: 'Classic Wood', light: 'bg-[#f0d9b5]', dark: 'bg-[#b58863]', icon: '🪵', gradient: 'linear-gradient(135deg, #f0d9b5, #b58863)' },
    ocean:   { name: 'Ocean Blue',   light: 'bg-[#e8f4f8]', dark: 'bg-[#4a90a4]', icon: '🌊', gradient: 'linear-gradient(135deg, #e8f4f8, #4a90a4)' },
    forest: { name: 'Forest Green', light: 'bg-[#ECE3CE]', dark: 'bg-[#2D5A27]', icon: '🌲', gradient: 'linear-gradient(135deg, #ECE3CE, #2D5A27)', border: '#1a3d18' },
    purple:  { name: 'Purple Royale',light: 'bg-[#f3e5f5]', dark: 'bg-[#9c27b0]', icon: '👑', gradient: 'linear-gradient(135deg, #f3e5f5, #9c27b0)' },
    dark:    { name: 'Dark Mode',    light: 'bg-[#4a5568]', dark: 'bg-[#1a202c]',  icon: '🌙', gradient: 'linear-gradient(135deg, #4a5568, #1a202c)' },
    neon:    { name: 'Neon Cyber',   light: 'bg-[#1a1a2e]', dark: 'bg-[#0f3460]',  icon: '🌃', gradient: 'linear-gradient(135deg, #1a1a2e, #0f3460)' },
  };

  const vibrate = (pattern) => { if (navigator.vibrate) navigator.vibrate(pattern); };

  useEffect(() => {
    if (!timerEnabled || !timerRunning || gameOver) return;
    const interval = setInterval(() => {
      if (currentPlayer === 'white') {
        setWhiteTime(prev => {
          if (prev <= 1) { setGameOver(true); setWinner('black'); updateStats('black'); return 0; }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 1) { setGameOver(true); setWinner('white'); updateStats('white'); return 0; }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timerEnabled, timerRunning, currentPlayer, gameOver]);

  useEffect(() => {
    const savedStats = localStorage.getItem('chessStats');
    if (savedStats) setStats(JSON.parse(savedStats));
  }, []);

  useEffect(() => {
    if (gameMode && board.length > 0) {
      localStorage.setItem('chessGame', JSON.stringify({ board, currentPlayer, gameMode, capturedPieces, moveHistory, aiDifficulty, theme }));
    }
  }, [board, currentPlayer, gameMode, capturedPieces, moveHistory, aiDifficulty, theme]);

  useEffect(() => { localStorage.setItem('chessStats', JSON.stringify(stats)); }, [stats]);

  const updateStats = (winningPlayer) => {
    setStats(prev => {
      const s = { ...prev, gamesPlayed: prev.gamesPlayed + 1 };
      if (isDraw) { s.draws += 1; s.winStreak = 0; }
      else if (winningPlayer === 'white' && gameMode === 'ai') { s.wins += 1; s.winStreak += 1; }
      else if (winningPlayer === 'black' && gameMode === 'ai') { s.losses += 1; s.winStreak = 0; }
      return s;
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const applyTimerPreset = (minutes) => {
    setTimerPreset(minutes); setWhiteTime(minutes * 60); setBlackTime(minutes * 60); setTimerRunning(false);
  };

  useEffect(() => { if (gameMode) initializeBoard(); }, [gameMode]);

  useEffect(() => {
    if (gameMode === 'ai' && currentPlayer === 'black' && !gameOver && !promotionSquare) {
      setIsThinking(true);
      const delay = aiDifficulty === 'easy' ? 300 : aiDifficulty === 'medium' ? 600 : 1000;
      const timeout = setTimeout(() => makeAIMove(), delay);
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
      newBoard[row][0] = { type: 'rook', color }; newBoard[row][1] = { type: 'knight', color };
      newBoard[row][2] = { type: 'bishop', color }; newBoard[row][3] = { type: 'queen', color };
      newBoard[row][4] = { type: 'king', color }; newBoard[row][5] = { type: 'bishop', color };
      newBoard[row][6] = { type: 'knight', color }; newBoard[row][7] = { type: 'rook', color };
    };
    setupRow(0, 'black'); setupRow(7, 'white');
    setBoard(newBoard); setBoardHistory([JSON.parse(JSON.stringify(newBoard))]);
    setCurrentPlayer('white'); setGameOver(false); setWinner(null); setSelectedSquare(null);
    setValidMoves([]); setCapturedPieces({ white: [], black: [] }); setIsThinking(false);
    setPromotionSquare(null); setIsCheck(false); setIsDraw(false); setMoveHistory([]);
    setWhiteTime(timerPreset * 60); setBlackTime(timerPreset * 60); setTimerRunning(false);
  };

  const getPieceSymbol = (piece) => {
    if (!piece) return '';
    return { king:'♔', queen:'♕', rook:'♖', bishop:'♗', knight:'♘', pawn:'♙' }[piece.type];
  };

  const getSquareName = (row, col) => 'abcdefgh'[col] + (8 - row);

  const addMoveToHistory = (fromRow, fromCol, toRow, toCol, piece, captured) => {
    const moveNotation = `${getPieceSymbol(piece)} ${getSquareName(fromRow, fromCol)} ${captured ? 'x' : '→'} ${getSquareName(toRow, toCol)}`;
    setMoveHistory(prev => [...prev, { notation: moveNotation, player: currentPlayer }]);
  };

  const undoMove = () => {
    if (boardHistory.length <= 1 || gameOver) return;
    vibrate(30);
    const newHistory = [...boardHistory]; newHistory.pop();
    const previousBoard = newHistory[newHistory.length - 1];
    setBoardHistory(newHistory); setBoard(JSON.parse(JSON.stringify(previousBoard)));
    setMoveHistory(prev => prev.slice(0, -1));
    setCurrentPlayer(prev => prev === 'white' ? 'black' : 'white');
    setSelectedSquare(null); setValidMoves([]); setIsCheck(false);
  };

  const checkPromotion = (row, piece) => {
    if (piece.type !== 'pawn') return false;
    return (piece.color === 'white' && row === 0) || (piece.color === 'black' && row === 7);
  };

  const promotePawn = (row, col, pieceType) => {
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = { type: pieceType, color: newBoard[row][col].color };
    setBoard(newBoard); setPromotionSquare(null); vibrate(50);
    const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
    if (isKingInCheck(newBoard, nextPlayer)) {
      setIsCheck(true);
      if (isCheckmate(newBoard, nextPlayer)) { setGameOver(true); setWinner(currentPlayer); updateStats(currentPlayer); vibrate([100,50,100,50,100]); return; }
    } else {
      setIsCheck(false);
      if (isStalemate(newBoard, nextPlayer)) { setGameOver(true); setIsDraw(true); updateStats(null); return; }
    }
    setCurrentPlayer(nextPlayer);
    if (timerEnabled) setTimerRunning(true);
  };

  const findKing = (testBoard, color) => {
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece && piece.type === 'king' && piece.color === color) return [row, col];
      }
    return null;
  };

  const isSquareAttacked = (testBoard, row, col, byColor) => {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const piece = testBoard[r][c];
        if (piece && piece.color === byColor && isValidMoveIgnoringCheck(r, c, row, col, piece, testBoard)) return true;
      }
    return false;
  };

  const isKingInCheck = (testBoard, color) => {
    const kingPos = findKing(testBoard, color);
    if (!kingPos) return false;
    return isSquareAttacked(testBoard, kingPos[0], kingPos[1], color === 'white' ? 'black' : 'white');
  };

  const wouldMoveCauseCheck = (fromRow, fromCol, toRow, toCol, testBoard, playerColor) => {
    const newBoard = testBoard.map(row => [...row]);
    newBoard[toRow][toCol] = newBoard[fromRow][fromCol]; newBoard[fromRow][fromCol] = null;
    return isKingInCheck(newBoard, playerColor);
  };

  const isValidMoveIgnoringCheck = (fromRow, fromCol, toRow, toCol, piece, testBoard) => {
    if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;
    const targetPiece = testBoard[toRow][toCol];
    if (targetPiece && targetPiece.color === piece.color) return false;
    const rowDiff = toRow - fromRow, colDiff = toCol - fromCol;
    const absRowDiff = Math.abs(rowDiff), absColDiff = Math.abs(colDiff);
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
      case 'king': return absRowDiff <= 1 && absColDiff <= 1;
      default: return false;
    }
  };

  const isValidMove = (fromRow, fromCol, toRow, toCol, piece, testBoard = board) => {
    if (!isValidMoveIgnoringCheck(fromRow, fromCol, toRow, toCol, piece, testBoard)) return false;
    return !wouldMoveCauseCheck(fromRow, fromCol, toRow, toCol, testBoard, piece.color);
  };

  const isPathClear = (fromRow, fromCol, toRow, toCol, testBoard) => {
    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
    let currentRow = fromRow + rowStep, currentCol = fromCol + colStep;
    while (currentRow !== toRow || currentCol !== toCol) {
      if (testBoard[currentRow][currentCol]) return false;
      currentRow += rowStep; currentCol += colStep;
    }
    return true;
  };

  const getValidMovesForPiece = (row, col, testBoard = board) => {
    const moves = [], piece = testBoard[row][col];
    if (!piece) return moves;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (isValidMove(row, col, r, c, piece, testBoard)) moves.push([r, c]);
    return moves;
  };

  const hasAnyLegalMoves = (testBoard, color) => {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const piece = testBoard[r][c];
        if (piece && piece.color === color && getValidMovesForPiece(r, c, testBoard).length > 0) return true;
      }
    return false;
  };

  const isCheckmate = (testBoard, color) => isKingInCheck(testBoard, color) && !hasAnyLegalMoves(testBoard, color);
  const isStalemate = (testBoard, color) => !isKingInCheck(testBoard, color) && !hasAnyLegalMoves(testBoard, color);

  const getAllPossibleMoves = (color, testBoard = board) => {
    const allMoves = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const piece = testBoard[r][c];
        if (piece && piece.color === color)
          getValidMovesForPiece(r, c, testBoard).forEach(([toR, toC]) =>
            allMoves.push({ from: [r, c], to: [toR, toC], piece })
          );
      }
    return allMoves;
  };

  // ── IMPROVED AI with Minimax + Alpha-Beta ─────────────────────────────────────
  const applyMoveToBoard = (testBoard, from, to) => {
    const nb = testBoard.map(r => [...r]);
    nb[to[0]][to[1]] = nb[from[0]][from[1]];
    nb[from[0]][from[1]] = null;
    // Auto promote to queen
    const p = nb[to[0]][to[1]];
    if (p?.type === 'pawn' && ((p.color === 'white' && to[0] === 0) || (p.color === 'black' && to[0] === 7))) {
      nb[to[0]][to[1]] = { type: 'queen', color: p.color };
    }
    return nb;
  };

  const minimax = (testBoard, depth, alpha, beta, maximizing) => {
    if (depth === 0) return evaluateBoard(testBoard);
    const color = maximizing ? 'black' : 'white';
    const moves = getAllPossibleMoves(color, testBoard);
    if (moves.length === 0) return maximizing ? -99999 : 99999;
    if (maximizing) {
      let best = -Infinity;
      for (const m of moves) {
        const nb = applyMoveToBoard(testBoard, m.from, m.to);
        best = Math.max(best, minimax(nb, depth - 1, alpha, beta, false));
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const m of moves) {
        const nb = applyMoveToBoard(testBoard, m.from, m.to);
        best = Math.min(best, minimax(nb, depth - 1, alpha, beta, true));
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  };

  const makeAIMove = () => {
    const possibleMoves = getAllPossibleMoves('black', board);
    if (possibleMoves.length === 0) {
      setGameOver(true); setWinner('white'); updateStats('white'); setIsThinking(false); return;
    }

    let bestMove = possibleMoves[0];

    if (aiDifficulty === 'easy') {
      // Easy: random moves, occasionally captures
      const captures = possibleMoves.filter(m => board[m.to[0]][m.to[1]]);
      bestMove = captures.length && Math.random() > 0.6
        ? captures[Math.floor(Math.random() * captures.length)]
        : possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

    } else if (aiDifficulty === 'medium') {
      // Medium: depth 2 minimax + small randomness
      let bestScore = -Infinity;
      for (const m of possibleMoves) {
        const nb = applyMoveToBoard(board, m.from, m.to);
        const score = minimax(nb, 1, -Infinity, Infinity, false) + Math.random() * 50;
        if (score > bestScore) { bestScore = score; bestMove = m; }
      }

    } else {
      // Hard: depth 3 minimax with alpha-beta, almost no randomness
      let bestScore = -Infinity;
      for (const m of possibleMoves) {
        const nb = applyMoveToBoard(board, m.from, m.to);
        const score = minimax(nb, 2, -Infinity, Infinity, false) + Math.random() * 5;
        if (score > bestScore) { bestScore = score; bestMove = m; }
      }
    }

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
      vibrate(50);
    } else { vibrate(30); }

    addMoveToHistory(fromR, fromC, toR, toC, movingPiece, capturedPiece);
    newBoard[toR][toC] = movingPiece; newBoard[fromR][fromC] = null;
    if (checkPromotion(toR, movingPiece)) newBoard[toR][toC] = { type: 'queen', color: 'black' };

    setBoard(newBoard);
    setBoardHistory(prev => [...prev, JSON.parse(JSON.stringify(newBoard))]);

    if (isKingInCheck(newBoard, 'white')) {
      setIsCheck(true); vibrate([50,30,50]);
      if (isCheckmate(newBoard, 'white')) {
        setGameOver(true); setWinner('black'); updateStats('black'); setIsThinking(false);
        vibrate([100,50,100,50,100]); return;
      }
    } else {
      setIsCheck(false);
      if (isStalemate(newBoard, 'white')) {
        setGameOver(true); setIsDraw(true); updateStats(null); setIsThinking(false); return;
      }
    }
    setCurrentPlayer('white'); setIsThinking(false);
  };

  const handleSquareClick = (row, col) => {
    if (gameOver || promotionSquare || (gameMode === 'ai' && currentPlayer === 'black')) return;
    if (timerEnabled && !timerRunning && moveHistory.length === 0) setTimerRunning(true);
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
          setCapturedPieces(newCaptured); vibrate(50);
        } else { vibrate(30); }
        addMoveToHistory(selectedRow, selectedCol, row, col, movingPiece, capturedPiece);
        newBoard[row][col] = movingPiece; newBoard[selectedRow][selectedCol] = null;
        setBoard(newBoard);
        setBoardHistory(prev => [...prev, JSON.parse(JSON.stringify(newBoard))]);
        if (checkPromotion(row, movingPiece)) {
          setPromotionSquare({ row, col });
        } else {
          const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
          if (isKingInCheck(newBoard, nextPlayer)) {
            setIsCheck(true); vibrate([50,30,50]);
            if (isCheckmate(newBoard, nextPlayer)) {
              setGameOver(true); setWinner(currentPlayer); updateStats(currentPlayer);
              setSelectedSquare(null); setValidMoves([]); vibrate([100,50,100,50,100]); return;
            }
          } else {
            setIsCheck(false);
            if (isStalemate(newBoard, nextPlayer)) {
              setGameOver(true); setIsDraw(true); updateStats(null);
              setSelectedSquare(null); setValidMoves([]); return;
            }
          }
          setCurrentPlayer(nextPlayer);
        }
        setSelectedSquare(null); setValidMoves([]);
      } else if (board[row][col]?.color === currentPlayer) {
        vibrate(20); setSelectedSquare([row, col]); setValidMoves(getValidMovesForPiece(row, col));
      } else {
        vibrate(10); setSelectedSquare(null); setValidMoves([]);
      }
    } else if (board[row][col]?.color === currentPlayer) {
      vibrate(20); setSelectedSquare([row, col]); setValidMoves(getValidMovesForPiece(row, col));
    }
  };

  const isValidMoveSquare = (row, col) => validMoves.some(([r, c]) => r === row && c === col);

  // ── SETTINGS FULL SCREEN ──────────────────────────────────────────────────────
  if (showSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
        <div className="bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setShowSettings(false)} className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-700 hover:bg-slate-600 transition-all active:scale-95">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="flex items-center gap-2">
            <span style={{ color: '#f472b6' }}><HeartIcon size={18} glow /></span>
            <h1 className="text-white font-bold text-lg">Customize</h1>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-6 max-w-lg mx-auto w-full">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">🎨 Theme</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(themes).map(([key, t]) => (
                <button key={key} onClick={() => setTheme(key)}
                  style={{
                    background: theme === key ? t.gradient : 'rgba(255,255,255,0.04)',
                    border: theme === key ? '2px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s', boxShadow: theme === key ? '0 4px 20px rgba(0,0,0,0.4)' : 'none',
                  }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <p style={{ color: theme === key ? 'white' : '#94a3b8', fontSize: 13, fontWeight: theme === key ? 'bold' : 'normal', margin: 0 }}>{t.name}</p>
                      {theme === key && <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, margin: 0 }}>Active ✓</p>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {gameMode === 'ai' && (
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">🎯 AI Difficulty</p>
              <div className="grid grid-cols-3 gap-3">
                {[['easy','😊','Easy','#16a34a','Beginner friendly'],['medium','🧐','Medium','#ca8a04','Balanced challenge'],['hard','😈','Hard','#dc2626','Expert level']].map(([d,emoji,label,color,desc]) => (
                  <button key={d} onClick={() => setAiDifficulty(d)}
                    style={{
                      background: aiDifficulty === d ? `${color}33` : 'rgba(255,255,255,0.04)',
                      border: aiDifficulty === d ? `2px solid ${color}` : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 14, padding: '14px 8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                    }}>
                    <p style={{ fontSize: 24, margin: '0 0 4px' }}>{emoji}</p>
                    <p style={{ color: aiDifficulty === d ? color : '#94a3b8', fontSize: 13, fontWeight: 'bold', margin: '0 0 2px' }}>{label}</p>
                    <p style={{ color: '#64748b', fontSize: 10, margin: 0 }}>{desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">⏱️ Timer Per Player</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <button onClick={() => { setTimerEnabled(false); setTimerRunning(false); setShowCustomInput(false); }}
                style={{ background: !timerEnabled ? 'rgba(100,116,139,0.3)' : 'rgba(255,255,255,0.04)', border: !timerEnabled ? '2px solid #64748b' : '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                <p style={{ fontSize: 22, margin: '0 0 4px' }}>🚫</p>
                <p style={{ color: !timerEnabled ? 'white' : '#64748b', fontSize: 13, fontWeight: 'bold', margin: 0 }}>Off</p>
              </button>
              {[1, 3, 5, 10].map(min => (
                <button key={min} onClick={() => { applyTimerPreset(min); setTimerEnabled(true); setShowCustomInput(false); }}
                  style={{ background: timerEnabled && timerPreset === min && !showCustomInput ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.04)', border: timerEnabled && timerPreset === min && !showCustomInput ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                  <p style={{ fontSize: 22, margin: '0 0 4px' }}>⏱️</p>
                  <p style={{ color: timerEnabled && timerPreset === min && !showCustomInput ? '#93c5fd' : '#64748b', fontSize: 13, fontWeight: 'bold', margin: 0 }}>{min} min</p>
                </button>
              ))}
              <button onClick={() => setShowCustomInput(s => !s)}
                style={{ background: showCustomInput ? 'rgba(244,114,182,0.2)' : 'rgba(255,255,255,0.04)', border: showCustomInput ? '2px solid #f472b6' : '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                <p style={{ fontSize: 22, margin: '0 0 4px' }}>✏️</p>
                <p style={{ color: showCustomInput ? '#f472b6' : '#64748b', fontSize: 13, fontWeight: 'bold', margin: 0 }}>Custom</p>
              </button>
            </div>
            {showCustomInput && (
              <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-3">
                <span className="text-slate-400 text-sm">Minutes:</span>
                <input type="number" min={1} max={180} value={customMinutes} onChange={e => setCustomMinutes(Number(e.target.value))}
                  className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm text-center font-bold" />
                <button onClick={() => { applyTimerPreset(customMinutes); setTimerEnabled(true); setShowCustomInput(false); }}
                  style={{ background: '#f472b6', border: 'none', borderRadius: 10, padding: '8px 20px', color: 'white', fontSize: 13, fontWeight: 'bold', cursor: 'pointer' }}>Set ✓</button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-700">
          <button onClick={() => setShowSettings(false)} className="w-full py-3 rounded-xl font-bold text-white text-base transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, rgba(244,114,182,0.8), rgba(168,85,247,0.8))', border: '1px solid rgba(244,114,182,0.4)' }}>
            ← Back to Game
          </button>
        </div>
      </div>
    );
  }

  // ── HOME SCREEN ───────────────────────────────────────────────────────────────
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
              <button onClick={() => setGameMode('pvp')} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-3 transition-all active:scale-95 text-lg">
                <User size={24} /> 2 Players (Local)
              </button>
              <button onClick={() => setGameMode('ai')} className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-3 transition-all active:scale-95 text-lg">
                <Cpu size={24} /> vs Computer (AI)
              </button>
              <button onClick={() => setShowStats(true)} className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-3 transition-all active:scale-95 text-lg">
                <Trophy size={24} /> View Statistics
              </button>
            </div>
            <div className="mt-6 bg-slate-700 p-4 rounded-lg text-slate-300 text-sm">
              <p className="font-bold text-white mb-2">Game Modes:</p>
              <p className="mb-1">🎮 <strong>2 Players:</strong> Play with a friend locally</p>
              <p>🤖 <strong>vs Computer:</strong> Practice against AI</p>
            </div>
          </div>
        </div>

        {showStats && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Trophy className="text-yellow-400" /> Your Stats</h2>
                <button onClick={() => setShowStats(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-700 p-4 rounded-lg">
                  <p className="text-slate-400 text-sm">Games Played</p>
                  <p className="text-3xl font-bold text-white">{stats.gamesPlayed}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-600 bg-opacity-20 border-2 border-green-600 p-3 rounded-lg text-center">
                    <p className="text-green-400 text-sm font-semibold">Wins</p>
                    <p className="text-2xl font-bold text-white">{stats.wins}</p>
                  </div>
                  <div className="bg-red-600 bg-opacity-20 border-2 border-red-600 p-3 rounded-lg text-center">
                    <p className="text-red-400 text-sm font-semibold">Losses</p>
                    <p className="text-2xl font-bold text-white">{stats.losses}</p>
                  </div>
                  <div className="bg-yellow-600 bg-opacity-20 border-2 border-yellow-600 p-3 rounded-lg text-center">
                    <p className="text-yellow-400 text-sm font-semibold">Draws</p>
                    <p className="text-2xl font-bold text-white">{stats.draws}</p>
                  </div>
                </div>
                <div className="bg-slate-700 p-4 rounded-lg">
                  <p className="text-slate-400 text-sm">Current Win Streak</p>
                  <p className="text-3xl font-bold text-yellow-400">🔥 {stats.winStreak}</p>
                </div>
              </div>
              <button onClick={() => setShowStats(false)} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-all active:scale-95">Close</button>
            </div>
          </div>
        )}

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

  // ── GAME SCREEN ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <div className="bg-slate-900 bg-opacity-90 border-b border-slate-700 px-3 sm:px-4 py-2 flex items-center justify-between relative z-30">
        <div className="flex items-center gap-2">
          <Crown className="text-yellow-400" size={20} />
          <span className="text-white font-bold text-base sm:text-lg">ChessX</span>
          {gameMode === 'ai' && (
            <span className={`text-xs px-2 py-0.5 rounded font-bold text-white ${aiDifficulty === 'easy' ? 'bg-green-600' : aiDifficulty === 'medium' ? 'bg-yellow-600' : 'bg-red-600'}`}>
              {aiDifficulty.toUpperCase()}
            </span>
          )}
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
          <p className="text-slate-300 text-xs sm:text-sm">
            Turn: <span className={`font-bold ${currentPlayer === 'white' ? 'text-white' : 'text-slate-400'}`}>{currentPlayer.toUpperCase()}</span>
            {isCheck && <span className="text-red-500 ml-1 font-bold">⚠️ CHECK!</span>}
            {isThinking && <span className="text-purple-400 ml-1 animate-pulse">🤔...</span>}
          </p>
        </div>
        <button onClick={() => setShowSettings(true)}
          style={{ width:38, height:38, borderRadius:'50%', background:'rgba(244,114,182,0.1)', border:'1px solid rgba(244,114,182,0.4)', color:'#f472b6', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s', boxShadow:'0 0 10px rgba(244,114,182,0.4)' }}
          onMouseEnter={e => e.currentTarget.style.boxShadow='0 0 18px rgba(244,114,182,0.8)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow='0 0 10px rgba(244,114,182,0.4)'}>
          <HeartIcon size={17} glow />
        </button>
      </div>

      {timerEnabled && (
        <div className="bg-slate-900 border-b border-slate-700 px-4 py-1.5 flex justify-center gap-4">
          <div className={`px-4 py-1 rounded-lg text-sm font-mono font-bold ${currentPlayer === 'white' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'} ${whiteTime < 30 ? 'text-red-400' : ''}`}>♔ {formatTime(whiteTime)}</div>
          <div className={`px-4 py-1 rounded-lg text-sm font-mono font-bold ${currentPlayer === 'black' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'} ${blackTime < 30 ? 'text-red-400' : ''}`}>♚ {formatTime(blackTime)}</div>
        </div>
      )}

      <div className="flex-grow p-2 sm:p-3 md:p-4">
        <div className="max-w-5xl mx-auto">
          {gameOver && !isDraw && (
            <div className="bg-green-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg mb-3 md:mb-4 text-center font-bold text-sm sm:text-lg md:text-xl animate-pulse">
              Checkmate! {winner?.toUpperCase()} Wins! 🎉
            </div>
          )}
          {gameOver && isDraw && (
            <div className="bg-yellow-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg mb-3 md:mb-4 text-center font-bold text-sm sm:text-lg md:text-xl">
              Stalemate! Draw! 🤝
            </div>
          )}

          {promotionSquare && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 p-4 md:p-6 rounded-xl shadow-2xl">
                <h3 className="text-white text-lg md:text-xl font-bold mb-3 md:mb-4 text-center">Promote Pawn</h3>
                <div className="flex gap-3 md:gap-4">
                  {['queen','rook','bishop','knight'].map(pieceType => (
                    <button key={pieceType} onClick={() => promotionSquare && promotePawn(promotionSquare.row, promotionSquare.col, pieceType)}
                      className="bg-slate-700 hover:bg-slate-600 text-white p-3 md:p-4 rounded-lg transition-all active:scale-95 text-4xl md:text-5xl">
                      {getPieceSymbol({ type: pieceType, color: currentPlayer })}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-3 items-start justify-center">
            {showMoveHistory && (
              <div className="w-full lg:w-56 bg-slate-800 p-3 rounded-lg order-2 lg:order-1">
                <h3 className="text-white font-bold mb-2 flex items-center gap-2 text-sm"><TrendingUp size={16} /> Moves</h3>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {moveHistory.length === 0
                    ? <p className="text-slate-400 text-xs text-center">No moves yet</p>
                    : moveHistory.map((move, idx) => (
                      <div key={idx} className={`text-xs p-1.5 rounded ${move.player === 'white' ? 'bg-slate-700' : 'bg-slate-600'}`}>
                        <span className="text-slate-400 mr-1">{idx + 1}.</span>
                        <span className="text-white">{move.notation}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="flex justify-center order-1 lg:order-2">
              <div className="inline-block border-2 sm:border-4 border-slate-700 bg-slate-800 shadow-2xl">
                {board.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex">
                    {row.map((piece, colIndex) => {
                      const isLight = (rowIndex + colIndex) % 2 === 0;
                      const isSelected = selectedSquare && selectedSquare[0] === rowIndex && selectedSquare[1] === colIndex;
                      const isVM = isValidMoveSquare(rowIndex, colIndex);
                      return (
                        <button key={`${rowIndex}-${colIndex}`} onClick={() => handleSquareClick(rowIndex, colIndex)}
                          disabled={isThinking || !!promotionSquare}
                          className={`
                            w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20
                            flex items-center justify-center
                            text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl
                            font-bold transition-all duration-200 relative
                            ${isLight ? themes[theme].light : themes[theme].dark}
                            ${isSelected ? 'ring-2 ring-inset ring-blue-500 scale-95' : ''}
                            ${isVM ? 'ring-2 ring-inset ring-green-400' : ''}
                            ${isThinking || promotionSquare ? 'opacity-70 cursor-not-allowed' : 'hover:brightness-110 active:scale-95'}
                          `}>
                          <span className={piece?.color === 'white' ? 'text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.9)]' : 'text-slate-900 drop-shadow-[0_0_3px_rgba(255,255,255,0.7)]'}>
                            {getPieceSymbol(piece)}
                          </span>
                          {isVM && !piece && <div className="absolute w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-green-500 rounded-full opacity-70" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full lg:w-56 xl:w-64 bg-slate-800 p-3 md:p-4 rounded-lg order-3">
              <h3 className="text-white font-bold mb-2 md:mb-3 text-sm md:text-base">Captured</h3>
              <div className="space-y-2 md:space-y-3">
                <div>
                  <p className="text-xs md:text-sm text-slate-400 mb-1">White:</p>
                  <div className="flex flex-wrap gap-1">
                    {capturedPieces.white.map((piece, idx) => <span key={idx} className="text-xl md:text-2xl text-slate-900">{getPieceSymbol(piece)}</span>)}
                    {capturedPieces.white.length === 0 && <span className="text-slate-600 text-xs">None</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-slate-400 mb-1">Black:</p>
                  <div className="flex flex-wrap gap-1">
                    {capturedPieces.black.map((piece, idx) => <span key={idx} className="text-xl md:text-2xl text-white">{getPieceSymbol(piece)}</span>)}
                    {capturedPieces.black.length === 0 && <span className="text-slate-600 text-xs">None</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center flex flex-wrap gap-2 justify-center mt-4">
            <button onClick={() => setGameMode(null)} className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-2 md:px-4 md:py-2.5 rounded-lg font-bold transition-all active:scale-95 text-xs sm:text-sm md:text-base">
              <span className="hidden md:inline">Change </span>Mode
            </button>
            <button onClick={initializeBoard} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 md:px-4 md:py-2.5 rounded-lg font-bold flex items-center gap-1 md:gap-2 transition-all active:scale-95 text-xs sm:text-sm md:text-base">
              <RotateCcw size={16} className="md:w-5 md:h-5" /><span className="hidden sm:inline">New</span><span className="hidden md:inline"> Game</span>
            </button>
            <button onClick={undoMove} disabled={boardHistory.length <= 1 || gameOver || (gameMode === 'ai' && currentPlayer === 'black')}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 disabled:opacity-50 text-white px-3 py-2 md:px-4 md:py-2.5 rounded-lg font-bold flex items-center gap-1 md:gap-2 transition-all active:scale-95 text-xs sm:text-sm md:text-base">
              <Undo size={16} className="md:w-5 md:h-5" /> Undo
            </button>
            <button onClick={() => setShowMoveHistory(!showMoveHistory)}
              className={`${showMoveHistory ? 'bg-green-600' : 'bg-slate-600'} hover:opacity-90 text-white px-3 py-2 md:px-4 md:py-2.5 rounded-lg font-bold flex items-center gap-1 md:gap-2 transition-all active:scale-95 text-xs sm:text-sm md:text-base`}>
              <TrendingUp size={16} className="md:w-5 md:h-5" /><span className="hidden sm:inline">History</span>
            </button>
          </div>

          <div className="bg-slate-800 p-3 md:p-4 rounded-lg text-slate-300 text-xs md:text-sm mt-3 md:mt-4">
            <h3 className="font-bold text-white mb-2 text-sm md:text-base">How to Play:</h3>
            <ul className="space-y-0.5 md:space-y-1">
              <li className="md:hidden">• Tap piece (green = valid moves)</li>
              <li className="hidden md:block">• Tap piece to select (green shows valid moves)</li>
              <li className="md:hidden">• Check ⚠️ | Checkmate 🎉 | Stalemate 🤝</li>
              <li className="hidden md:block">• King in danger = CHECK warning ⚠️</li>
              <li className="hidden md:block">• King trapped = CHECKMATE (you win!) 🎉</li>
              <li className="hidden md:block">• No legal moves but safe = STALEMATE (draw) 🤝</li>
              <li>• Use UNDO to take back <span className="hidden md:inline">your last </span>move</li>
              {gameMode === 'ai' && <li>• You play as WHITE<span className="hidden md:inline"> vs computer</span></li>}
            </ul>
          </div>
        </div>
      </div>

      {showStats && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Trophy className="text-yellow-400" /> Your Stats</h2>
              <button onClick={() => setShowStats(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-700 p-4 rounded-lg">
                <p className="text-slate-400 text-sm">Games Played</p>
                <p className="text-3xl font-bold text-white">{stats.gamesPlayed}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-600 bg-opacity-20 border-2 border-green-600 p-3 rounded-lg text-center">
                  <p className="text-green-400 text-sm font-semibold">Wins</p>
                  <p className="text-2xl font-bold text-white">{stats.wins}</p>
                </div>
                <div className="bg-red-600 bg-opacity-20 border-2 border-red-600 p-3 rounded-lg text-center">
                  <p className="text-red-400 text-sm font-semibold">Losses</p>
                  <p className="text-2xl font-bold text-white">{stats.losses}</p>
                </div>
                <div className="bg-yellow-600 bg-opacity-20 border-2 border-yellow-600 p-3 rounded-lg text-center">
                  <p className="text-yellow-400 text-sm font-semibold">Draws</p>
                  <p className="text-2xl font-bold text-white">{stats.draws}</p>
                </div>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg">
                <p className="text-slate-400 text-sm">Current Win Streak</p>
                <p className="text-3xl font-bold text-yellow-400">🔥 {stats.winStreak}</p>
              </div>
            </div>
            <button onClick={() => setShowStats(false)} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-all active:scale-95">Close</button>
          </div>
        </div>
      )}

      <footer className="bg-slate-800 border-t border-slate-700 py-2 md:py-4 mt-4 md:mt-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400 text-xs md:text-sm">
            <span>from Musfirah</span>
            <span className="text-sm md:text-lg" style={{ color: '#87CEEB' }}>🦋</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ChessGame;
