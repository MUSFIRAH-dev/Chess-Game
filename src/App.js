import React, { useState, useEffect, useRef } from 'react';
import { Crown, RotateCcw, User, Cpu, Undo, Clock, Trophy, TrendingUp, X, Check } from 'lucide-react';

// ── THEMES ────────────────────────────────────────────────────────────────────
const THEMES = {
  classic:  { name: 'Classic',  light: '#f0d9b5', dark: '#b58863', bg: '#1e293b', accent: '#f0d9b5' },
  midnight: { name: 'Midnight', light: '#c4b5fd', dark: '#1e1b4b', bg: '#0f0c29', accent: '#c4b5fd' },
  sakura:   { name: 'Sakura',   light: '#fda4af', dark: '#be123c', bg: '#1a0a10', accent: '#f472b6' },
  matrix:   { name: 'Matrix',   light: '#bbf7d0', dark: '#14532d', bg: '#0d1117', accent: '#00ff88' },
  ocean:    { name: 'Ocean',    light: '#bae6fd', dark: '#1e3a5f', bg: '#050d1a', accent: '#00d4ff' },
  galaxy:   { name: 'Galaxy',   light: '#fef3c7', dark: '#78350f', bg: '#2d1b69', accent: '#f59e0b' },
};

// ── SOUNDS (Advanced Web Audio) ───────────────────────────────────────────────
const createSoundEngine = () => {
  let ctx = null;
  const getCtx = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  };
  const play = (type) => {
    try {
      const c = getCtx();
      const master = c.createGain();
      master.connect(c.destination);
      const now = c.currentTime;
      switch (type) {
        case 'move': {
          const o = c.createOscillator(); const g = c.createGain();
          o.connect(g); g.connect(master);
          o.type = 'sine'; o.frequency.setValueAtTime(520, now); o.frequency.exponentialRampToValueAtTime(420, now + 0.08);
          g.gain.setValueAtTime(0.18, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          o.start(now); o.stop(now + 0.12); break;
        }
        case 'capture': {
          [200, 180, 160].forEach((f, i) => {
            const o = c.createOscillator(); const g = c.createGain();
            o.connect(g); g.connect(master);
            o.type = 'sawtooth'; o.frequency.value = f;
            g.gain.setValueAtTime(0.15, now + i * 0.04); g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.1);
            o.start(now + i * 0.04); o.stop(now + i * 0.04 + 0.1);
          }); break;
        }
        case 'check': {
          [700, 900].forEach((f, i) => {
            const o = c.createOscillator(); const g = c.createGain();
            o.connect(g); g.connect(master);
            o.type = 'square'; o.frequency.value = f;
            g.gain.setValueAtTime(0.12, now + i * 0.1); g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.15);
            o.start(now + i * 0.1); o.stop(now + i * 0.1 + 0.15);
          }); break;
        }
        case 'win': {
          [400, 500, 630, 800].forEach((f, i) => {
            const o = c.createOscillator(); const g = c.createGain();
            o.connect(g); g.connect(master);
            o.type = 'sine'; o.frequency.value = f;
            g.gain.setValueAtTime(0.14, now + i * 0.13); g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.13 + 0.22);
            o.start(now + i * 0.13); o.stop(now + i * 0.13 + 0.22);
          }); break;
        }
        case 'select': {
          const o = c.createOscillator(); const g = c.createGain();
          o.connect(g); g.connect(master);
          o.type = 'sine'; o.frequency.setValueAtTime(660, now); o.frequency.exponentialRampToValueAtTime(880, now + 0.06);
          g.gain.setValueAtTime(0.1, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          o.start(now); o.stop(now + 0.08); break;
        }
        case 'error': {
          const o = c.createOscillator(); const g = c.createGain();
          o.connect(g); g.connect(master);
          o.type = 'sawtooth'; o.frequency.value = 120;
          g.gain.setValueAtTime(0.1, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          o.start(now); o.stop(now + 0.1); break;
        }
      }
    } catch(e) {}
  };
  return { play };
};

// ── AI (Minimax with alpha-beta for Hard) ─────────────────────────────────────
const PIECE_VALUES = { pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900, king: 20000 };

const PAWN_TABLE = [
  [0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],
  [5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],
  [5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]
];
const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],
  [-30,5,15,20,20,15,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],
  [-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]
];

const getPieceSquareValue = (piece, row, col) => {
  if (piece.type === 'pawn') {
    const r = piece.color === 'white' ? row : 7 - row;
    return PAWN_TABLE[r][col];
  }
  if (piece.type === 'knight') {
    const r = piece.color === 'white' ? row : 7 - row;
    return KNIGHT_TABLE[r][col];
  }
  return 0;
};

const evaluateBoard = (board) => {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = PIECE_VALUES[p.type] + getPieceSquareValue(p, r, c);
      score += p.color === 'black' ? val : -val;
    }
  }
  return score;
};

// ── CHESS LOGIC HELPERS ───────────────────────────────────────────────────────
const isPathClear = (fromRow, fromCol, toRow, toCol, board) => {
  const rs = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
  const cs = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
  let r = fromRow + rs, c = fromCol + cs;
  while (r !== toRow || c !== toCol) {
    if (board[r][c]) return false;
    r += rs; c += cs;
  }
  return true;
};

const isValidMoveIgnoringCheck = (fromRow, fromCol, toRow, toCol, piece, board) => {
  if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;
  const target = board[toRow][toCol];
  if (target && target.color === piece.color) return false;
  const rd = toRow - fromRow, cd = toCol - fromCol;
  const ar = Math.abs(rd), ac = Math.abs(cd);
  switch (piece.type) {
    case 'pawn': {
      const dir = piece.color === 'white' ? -1 : 1;
      const start = piece.color === 'white' ? 6 : 1;
      if (cd === 0 && !target) {
        if (rd === dir) return true;
        if (fromRow === start && rd === 2 * dir && !board[fromRow + dir][fromCol]) return true;
      }
      if (ac === 1 && rd === dir && target) return true;
      return false;
    }
    case 'rook': return (rd === 0 || cd === 0) && isPathClear(fromRow, fromCol, toRow, toCol, board);
    case 'knight': return (ar === 2 && ac === 1) || (ar === 1 && ac === 2);
    case 'bishop': return ar === ac && isPathClear(fromRow, fromCol, toRow, toCol, board);
    case 'queen': return (rd === 0 || cd === 0 || ar === ac) && isPathClear(fromRow, fromCol, toRow, toCol, board);
    case 'king': return ar <= 1 && ac <= 1;
    default: return false;
  }
};

const findKing = (board, color) => {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.type === 'king' && board[r][c]?.color === color) return [r, c];
  return null;
};

const isSquareAttacked = (board, row, col, byColor) => {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === byColor && isValidMoveIgnoringCheck(r, c, row, col, p, board)) return true;
    }
  return false;
};

const isKingInCheck = (board, color) => {
  const pos = findKing(board, color);
  if (!pos) return false;
  return isSquareAttacked(board, pos[0], pos[1], color === 'white' ? 'black' : 'white');
};

const wouldCauseCheck = (fromRow, fromCol, toRow, toCol, board, color) => {
  const nb = board.map(r => [...r]);
  nb[toRow][toCol] = nb[fromRow][fromCol];
  nb[fromRow][fromCol] = null;
  return isKingInCheck(nb, color);
};

const isValidMove = (fromRow, fromCol, toRow, toCol, piece, board) => {
  if (!isValidMoveIgnoringCheck(fromRow, fromCol, toRow, toCol, piece, board)) return false;
  return !wouldCauseCheck(fromRow, fromCol, toRow, toCol, board, piece.color);
};

const getValidMoves = (row, col, board) => {
  const piece = board[row][col];
  if (!piece) return [];
  const moves = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (isValidMove(row, col, r, c, piece, board)) moves.push([r, c]);
  return moves;
};

const getAllMoves = (color, board) => {
  const moves = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color) {
        getValidMoves(r, c, board).forEach(([tr, tc]) => moves.push({ from: [r,c], to: [tr,tc] }));
      }
    }
  return moves;
};

const hasLegalMoves = (board, color) => getAllMoves(color, board).length > 0;
const isCheckmate = (board, color) => isKingInCheck(board, color) && !hasLegalMoves(board, color);
const isStalemate = (board, color) => !isKingInCheck(board, color) && !hasLegalMoves(board, color);

const applyMove = (board, from, to) => {
  const nb = board.map(r => [...r]);
  nb[to[0]][to[1]] = nb[from[0]][from[1]];
  nb[from[0]][from[1]] = null;
  if (nb[to[0]][to[1]]?.type === 'pawn') {
    if ((nb[to[0]][to[1]].color === 'white' && to[0] === 0) ||
        (nb[to[0]][to[1]].color === 'black' && to[0] === 7))
      nb[to[0]][to[1]] = { type: 'queen', color: nb[to[0]][to[1]].color };
  }
  return nb;
};

// Minimax with alpha-beta pruning for Hard AI
const minimax = (board, depth, alpha, beta, maximizing) => {
  if (depth === 0) return evaluateBoard(board);
  const color = maximizing ? 'black' : 'white';
  const moves = getAllMoves(color, board);
  if (moves.length === 0) return maximizing ? -99999 : 99999;
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const nb = applyMove(board, m.from, m.to);
      best = Math.max(best, minimax(nb, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const nb = applyMove(board, m.from, m.to);
      best = Math.min(best, minimax(nb, depth - 1, alpha, beta, true));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
};

const getBestMove = (board, difficulty) => {
  const moves = getAllMoves('black', board);
  if (!moves.length) return null;
  if (difficulty === 'easy') {
    // Random with slight preference for captures
    const captures = moves.filter(m => board[m.to[0]][m.to[1]]);
    return captures.length && Math.random() > 0.5
      ? captures[Math.floor(Math.random() * captures.length)]
      : moves[Math.floor(Math.random() * moves.length)];
  }
  const depth = difficulty === 'medium' ? 2 : 3;
  let best = null, bestScore = -Infinity;
  for (const m of moves) {
    const nb = applyMove(board, m.from, m.to);
    let score = minimax(nb, depth - 1, -Infinity, Infinity, false);
    if (difficulty === 'medium') score += Math.random() * 40;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
};

// ── PIECE SYMBOLS ─────────────────────────────────────────────────────────────
const SYMBOLS = { king:'♔', queen:'♕', rook:'♖', bishop:'♗', knight:'♘', pawn:'♙' };
const getPieceSymbol = (p) => p ? SYMBOLS[p.type] : '';

const getSquareName = (row, col) => 'abcdefgh'[col] + (8 - row);

// ── HEART ICON (SVG) ──────────────────────────────────────────────────────────
const HeartIcon = ({ size = 20, glow = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"
    style={{ filter: glow ? 'drop-shadow(0 0 6px #f472b6)' : 'none' }}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
const ChessGame = () => {
  const [board, setBoard] = useState([]);
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState('white');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [isDraw, setIsDraw] = useState(false);
  const [isCheck, setIsCheck] = useState(false);
  const [captured, setCaptured] = useState({ white: [], black: [] });
  const [gameMode, setGameMode] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [promotionSquare, setPromotionSquare] = useState(null);
  const [boardHistory, setBoardHistory] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [showMoveHistory, setShowMoveHistory] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState('classic');
  const [difficulty, setDifficulty] = useState('medium');
  const [soundMode, setSoundMode] = useState('advanced');
  const [timerPreset, setTimerPreset] = useState(null); // null = off
  const [customTime, setCustomTime] = useState(10);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [timerRunning, setTimerRunning] = useState(false);

  const [stats, setStats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chessStats')) || { gamesPlayed:0, wins:0, losses:0, draws:0, winStreak:0 }; }
    catch { return { gamesPlayed:0, wins:0, losses:0, draws:0, winStreak:0 }; }
  });

  const soundRef = useRef(null);
  const settingsRef = useRef(null);

  const getSound = () => {
    if (!soundRef.current) soundRef.current = createSoundEngine();
    return soundRef.current;
  };

  const playSound = (type) => {
    if (soundMode === 'off') return;
    getSound().play(type);
  };

  const vibrate = (p) => navigator.vibrate && navigator.vibrate(p);

  const t = THEMES[theme];

  // Close settings on outside click
  useEffect(() => {
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Timer
  useEffect(() => {
    if (!timerPreset || !timerRunning || gameOver) return;
    const interval = setInterval(() => {
      if (currentPlayer === 'white') {
        setWhiteTime(prev => {
          if (prev <= 1) { endGame('black'); return 0; }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 1) { endGame('white'); return 0; }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timerPreset, timerRunning, currentPlayer, gameOver]);

  // Save stats
  useEffect(() => {
    localStorage.setItem('chessStats', JSON.stringify(stats));
  }, [stats]);

  // AI move
  useEffect(() => {
    if (gameMode === 'ai' && currentPlayer === 'black' && !gameOver && !promotionSquare && board.length) {
      setIsThinking(true);
      const delay = difficulty === 'easy' ? 300 : difficulty === 'medium' ? 600 : 1000;
      const t = setTimeout(() => {
        makeAIMove();
      }, delay);
      return () => clearTimeout(t);
    }
  }, [currentPlayer, gameMode, gameOver, promotionSquare, board]);

  const endGame = (w, draw = false) => {
    setGameOver(true);
    setTimerRunning(false);
    if (draw) {
      setIsDraw(true);
      setStats(p => ({ ...p, gamesPlayed: p.gamesPlayed+1, draws: p.draws+1, winStreak: 0 }));
    } else {
      setWinner(w);
      if (gameMode === 'ai') {
        if (w === 'white') setStats(p => ({ ...p, gamesPlayed: p.gamesPlayed+1, wins: p.wins+1, winStreak: p.winStreak+1 }));
        else setStats(p => ({ ...p, gamesPlayed: p.gamesPlayed+1, losses: p.losses+1, winStreak: 0 }));
      } else {
        setStats(p => ({ ...p, gamesPlayed: p.gamesPlayed+1 }));
      }
    }
    playSound('win');
    vibrate([100,50,100,50,100]);
  };

  const formatTime = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  const initBoard = () => {
    const nb = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let i = 0; i < 8; i++) {
      nb[1][i] = { type:'pawn', color:'black' };
      nb[6][i] = { type:'pawn', color:'white' };
    }
    const setup = (row, color) => {
      ['rook','knight','bishop','queen','king','bishop','knight','rook'].forEach((t,i) => {
        nb[row][i] = { type:t, color };
      });
    };
    setup(0,'black'); setup(7,'white');
    const secs = timerPreset ? timerPreset * 60 : 600;
    setBoard(nb);
    setBoardHistory([JSON.parse(JSON.stringify(nb))]);
    setCurrentPlayer('white');
    setGameOver(false); setWinner(null); setIsDraw(false); setIsCheck(false);
    setSelected(null); setValidMoves([]);
    setCaptured({ white:[], black:[] });
    setIsThinking(false); setPromotionSquare(null);
    setMoveHistory([]);
    setWhiteTime(secs); setBlackTime(secs);
    setTimerRunning(false);
  };

  useEffect(() => { if (gameMode) initBoard(); }, [gameMode]);

  const makeAIMove = () => {
    const move = getBestMove(board, difficulty);
    if (!move) { endGame('white'); setIsThinking(false); return; }
    const { from, to } = move;
    const nb = applyMove(board, from, to);
    const cap = board[to[0]][to[1]];
    if (cap) {
      setCaptured(p => ({ ...p, black: [...p.black, cap] }));
      playSound('capture');
    } else { playSound('move'); }
    setMoveHistory(p => [...p, {
      notation: `${getPieceSymbol(board[from[0]][from[1]])} ${getSquareName(...from)} ${cap?'x':'→'} ${getSquareName(...to)}`,
      player: 'black'
    }]);
    setBoard(nb);
    setBoardHistory(p => [...p, JSON.parse(JSON.stringify(nb))]);
    if (isCheckmate(nb, 'white')) { endGame('black'); setIsThinking(false); return; }
    if (isStalemate(nb, 'white')) { endGame(null, true); setIsThinking(false); return; }
    if (isKingInCheck(nb, 'white')) { setIsCheck(true); playSound('check'); vibrate([50,30,50]); }
    else setIsCheck(false);
    setCurrentPlayer('white');
    setIsThinking(false);
  };

  const handleSquareClick = (row, col) => {
    if (gameOver || promotionSquare || (gameMode === 'ai' && currentPlayer === 'black')) return;
    if (timerPreset && !timerRunning && moveHistory.length === 0) setTimerRunning(true);

    if (selected) {
      const [sr, sc] = selected;
      const isValid = validMoves.some(([r,c]) => r===row && c===col);
      if (isValid) {
        const nb = board.map(r => [...r]);
        const moving = nb[sr][sc];
        const cap = nb[row][col];
        if (cap) { setCaptured(p => ({ ...p, [currentPlayer]: [...p[currentPlayer], cap] })); playSound('capture'); vibrate(50); }
        else { playSound('move'); vibrate(30); }
        setMoveHistory(p => [...p, {
          notation: `${getPieceSymbol(moving)} ${getSquareName(sr,sc)} ${cap?'x':'→'} ${getSquareName(row,col)}`,
          player: currentPlayer
        }]);
        nb[row][col] = moving; nb[sr][sc] = null;
        // Promotion
        if (moving.type === 'pawn' && ((moving.color==='white'&&row===0)||(moving.color==='black'&&row===7))) {
          setBoard(nb); setBoardHistory(p => [...p, JSON.parse(JSON.stringify(nb))]);
          setPromotionSquare({ row, col }); setSelected(null); setValidMoves([]); return;
        }
        setBoard(nb); setBoardHistory(p => [...p, JSON.parse(JSON.stringify(nb))]);
        const next = currentPlayer === 'white' ? 'black' : 'white';
        if (isCheckmate(nb, next)) { endGame(currentPlayer); setSelected(null); setValidMoves([]); return; }
        if (isStalemate(nb, next)) { endGame(null, true); setSelected(null); setValidMoves([]); return; }
        if (isKingInCheck(nb, next)) { setIsCheck(true); playSound('check'); vibrate([50,30,50]); }
        else setIsCheck(false);
        setCurrentPlayer(next);
        setSelected(null); setValidMoves([]);
      } else if (board[row][col]?.color === currentPlayer) {
        playSound('select'); setSelected([row,col]); setValidMoves(getValidMoves(row, col, board));
      } else {
        playSound('error'); setSelected(null); setValidMoves([]);
      }
    } else if (board[row][col]?.color === currentPlayer) {
      playSound('select'); vibrate(20); setSelected([row,col]); setValidMoves(getValidMoves(row, col, board));
    }
  };

  const promotePawn = (type) => {
    if (!promotionSquare) return;
    const nb = board.map(r => [...r]);
    nb[promotionSquare.row][promotionSquare.col] = { type, color: currentPlayer };
    setBoard(nb); setBoardHistory(p => [...p, JSON.parse(JSON.stringify(nb))]);
    setPromotionSquare(null);
    const next = currentPlayer === 'white' ? 'black' : 'white';
    if (isCheckmate(nb, next)) { endGame(currentPlayer); return; }
    if (isStalemate(nb, next)) { endGame(null, true); return; }
    if (isKingInCheck(nb, next)) { setIsCheck(true); playSound('check'); }
    else setIsCheck(false);
    setCurrentPlayer(next);
    playSound('move');
  };

  const undoMove = () => {
    if (boardHistory.length <= 1 || gameOver) return;
    const hist = [...boardHistory]; hist.pop();
    const prev = hist[hist.length - 1];
    setBoardHistory(hist);
    setBoard(JSON.parse(JSON.stringify(prev)));
    setMoveHistory(p => p.slice(0,-1));
    setCurrentPlayer(p => p === 'white' ? 'black' : 'white');
    setSelected(null); setValidMoves([]); setIsCheck(false);
    playSound('move'); vibrate(30);
  };

  // ── HOME SCREEN ──────────────────────────────────────────────────────────────
  if (!gameMode) {
    return (
      <div style={{ minHeight:'100vh', background: t.bg, display:'flex', flexDirection:'column', fontFamily:"'Georgia', serif" }}>
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ maxWidth:380, width:'100%', background:'rgba(255,255,255,0.05)', borderRadius:20, padding:'2rem', border:'1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ textAlign:'center', marginBottom:'2rem' }}>
              <div style={{ fontSize:56, marginBottom:8 }}>♔</div>
              <h1 style={{ color:'white', fontSize:36, fontWeight:'bold', margin:'0 0 4px' }}>ChessX</h1>
              <p style={{ color:'rgba(255,255,255,0.5)', margin:0 }}>Choose your game mode</p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:16 }}>
              <button onClick={() => setGameMode('pvp')} style={{ background:'#3b82f6', color:'white', border:'none', borderRadius:12, padding:'14px', fontSize:16, fontWeight:'bold', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                <User size={20}/> 2 Players (Local)
              </button>
              <button onClick={() => setGameMode('ai')} style={{ background:'#8b5cf6', color:'white', border:'none', borderRadius:12, padding:'14px', fontSize:16, fontWeight:'bold', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                <Cpu size={20}/> vs Computer (AI)
              </button>
              <button onClick={() => setShowStats(true)} style={{ background:'#16a34a', color:'white', border:'none', borderRadius:12, padding:'14px', fontSize:16, fontWeight:'bold', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                <Trophy size={20}/> Statistics
              </button>
            </div>
          </div>
        </div>

        {showStats && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:'1rem' }}>
            <div style={{ background:'#1e293b', borderRadius:20, padding:'2rem', maxWidth:360, width:'100%' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <h2 style={{ color:'white', margin:0, fontSize:22 }}>📊 Your Stats</h2>
                <button onClick={() => setShowStats(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', fontSize:20, cursor:'pointer' }}>✕</button>
              </div>
              <div style={{ display:'grid', gap:10 }}>
                <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:10, padding:14 }}>
                  <p style={{ color:'rgba(255,255,255,0.5)', margin:'0 0 4px', fontSize:12 }}>Games Played</p>
                  <p style={{ color:'white', margin:0, fontSize:28, fontWeight:'bold' }}>{stats.gamesPlayed}</p>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  {[['Wins','#16a34a',stats.wins],['Losses','#dc2626',stats.losses],['Draws','#ca8a04',stats.draws]].map(([l,c,v]) => (
                    <div key={l} style={{ background:`${c}22`, border:`1px solid ${c}`, borderRadius:10, padding:10, textAlign:'center' }}>
                      <p style={{ color:c, margin:'0 0 4px', fontSize:11 }}>{l}</p>
                      <p style={{ color:'white', margin:0, fontSize:22, fontWeight:'bold' }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:10, padding:14 }}>
                  <p style={{ color:'rgba(255,255,255,0.5)', margin:'0 0 4px', fontSize:12 }}>Win Streak</p>
                  <p style={{ color:'#f59e0b', margin:0, fontSize:28, fontWeight:'bold' }}>🔥 {stats.winStreak}</p>
                </div>
              </div>
              <button onClick={() => setShowStats(false)} style={{ width:'100%', marginTop:16, background:'#3b82f6', color:'white', border:'none', borderRadius:10, padding:12, fontSize:15, fontWeight:'bold', cursor:'pointer' }}>Close</button>
            </div>
          </div>
        )}

        <footer style={{ background:'rgba(0,0,0,0.3)', padding:'12px', textAlign:'center' }}>
          <span style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>from Musfirah </span>
          <span style={{ color:'#87CEEB' }}>🦋</span>
        </footer>
      </div>
    );
  }

  // ── GAME SCREEN ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:t.bg, display:'flex', flexDirection:'column', fontFamily:"'Georgia', serif" }}>

      {/* ── TOP NAVBAR ── */}
      <div style={{ background:'rgba(0,0,0,0.4)', borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Crown size={22} style={{ color:'#facc15' }}/>
          <span style={{ color:'white', fontWeight:'bold', fontSize:18 }}>ChessX</span>
          {gameMode === 'ai' && (
            <span style={{ background: difficulty==='easy'?'#16a34a':difficulty==='medium'?'#ca8a04':'#dc2626', color:'white', fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:'bold' }}>
              {difficulty.toUpperCase()}
            </span>
          )}
        </div>

        {/* Status */}
        <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', textAlign:'center' }}>
          <span style={{ color:'white', fontSize:12 }}>
            {isThinking ? '🤔 Thinking...' : `${currentPlayer.toUpperCase()}'s turn`}
          </span>
          {isCheck && <span style={{ color:'#ef4444', fontSize:11, fontWeight:'bold', marginLeft:6 }}>⚠️ CHECK</span>}
        </div>

        {/* Heart Settings Button */}
        <div style={{ position:'relative' }} ref={settingsRef}>
          <button
            onClick={() => setShowSettings(s => !s)}
            style={{
              background: showSettings ? 'rgba(244,114,182,0.25)' : 'rgba(244,114,182,0.1)',
              border: `1px solid ${showSettings ? '#f472b6' : 'rgba(244,114,182,0.4)'}`,
              borderRadius:'50%', width:40, height:40, cursor:'pointer', color:'#f472b6',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.2s',
              boxShadow: showSettings ? '0 0 12px rgba(244,114,182,0.6)' : '0 0 6px rgba(244,114,182,0.3)'
            }}
          >
            <HeartIcon size={18} glow={showSettings}/>
          </button>

          {/* Settings Dropdown */}
          {showSettings && (
            <div style={{
              position:'absolute', right:0, top:48, width:280, background:'#0f172a',
              borderRadius:16, border:'1px solid rgba(244,114,182,0.3)', padding:16, zIndex:100,
              boxShadow:'0 20px 60px rgba(0,0,0,0.8)'
            }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14, paddingBottom:10, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ color:'#f472b6', fontSize:16 }}><HeartIcon size={14} glow/></span>
                <span style={{ color:'white', fontWeight:'bold', fontSize:13 }}>Customize</span>
              </div>

              {/* Theme */}
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:10, letterSpacing:'0.08em', margin:'0 0 8px' }}>THEME</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:14 }}>
                {Object.entries(THEMES).map(([key, th]) => (
                  <button key={key} onClick={() => setTheme(key)} style={{
                    background: key===theme ? th.accent+'33' : 'rgba(255,255,255,0.05)',
                    border: key===theme ? `2px solid ${th.accent}` : '1px solid rgba(255,255,255,0.08)',
                    borderRadius:8, padding:'7px 4px', cursor:'pointer', textAlign:'center', position:'relative'
                  }}>
                    <div style={{ display:'flex', gap:2, justifyContent:'center', marginBottom:3 }}>
                      <div style={{ width:8, height:8, background:th.light, borderRadius:1 }}/>
                      <div style={{ width:8, height:8, background:th.dark, borderRadius:1 }}/>
                    </div>
                    <p style={{ color: key===theme ? th.accent : 'rgba(255,255,255,0.4)', fontSize:9, margin:0, fontWeight: key===theme?'bold':'normal' }}>{th.name}</p>
                    {key===theme && <span style={{ position:'absolute', top:2, right:4, color:th.accent, fontSize:8 }}>✓</span>}
                  </button>
                ))}
              </div>

              {/* Difficulty (AI only) */}
              {gameMode === 'ai' && <>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:10, letterSpacing:'0.08em', margin:'0 0 8px' }}>DIFFICULTY</p>
                <div style={{ display:'flex', gap:6, marginBottom:14 }}>
                  {[['easy','😊','#16a34a'],['medium','🧐','#ca8a04'],['hard','😈','#dc2626']].map(([d,e,c]) => (
                    <button key={d} onClick={() => setDifficulty(d)} style={{
                      flex:1, background: difficulty===d?`${c}33`:'rgba(255,255,255,0.05)',
                      border: difficulty===d?`1px solid ${c}`:'1px solid rgba(255,255,255,0.08)',
                      borderRadius:8, padding:'7px 4px', color: difficulty===d?c:'rgba(255,255,255,0.4)',
                      fontSize:10, fontWeight:'bold', cursor:'pointer'
                    }}>{e} {d.charAt(0).toUpperCase()+d.slice(1)}</button>
                  ))}
                </div>
              </>}

              {/* Timer */}
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:10, letterSpacing:'0.08em', margin:'0 0 8px' }}>TIMER PER PLAYER</p>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom: showCustomTime?8:14 }}>
                {[null,1,3,5,10,'custom'].map(v => (
                  <button key={String(v)} onClick={() => {
                    if (v === 'custom') { setShowCustomTime(s => !s); return; }
                    setTimerPreset(v); setShowCustomTime(false);
                    const secs = v ? v*60 : 600;
                    setWhiteTime(secs); setBlackTime(secs); setTimerRunning(false);
                  }} style={{
                    background: (v==='custom'?showCustomTime:timerPreset===v) ? 'rgba(59,130,246,0.3)':'rgba(255,255,255,0.05)',
                    border: (v==='custom'?showCustomTime:timerPreset===v) ? '1px solid #3b82f6':'1px solid rgba(255,255,255,0.08)',
                    borderRadius:6, padding:'5px 8px',
                    color: (v==='custom'?showCustomTime:timerPreset===v) ? '#93c5fd':'rgba(255,255,255,0.5)',
                    fontSize:10, cursor:'pointer', fontWeight:'bold'
                  }}>{v===null?'Off':v==='custom'?'Custom':`${v}m`}</button>
                ))}
              </div>
              {showCustomTime && (
                <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center' }}>
                  <input type="number" min={1} max={60} value={customTime}
                    onChange={e => setCustomTime(Number(e.target.value))}
                    style={{ flex:1, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, padding:'5px 8px', color:'white', fontSize:12 }}/>
                  <span style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>min</span>
                  <button onClick={() => {
                    setTimerPreset(customTime); setShowCustomTime(false);
                    setWhiteTime(customTime*60); setBlackTime(customTime*60); setTimerRunning(false);
                  }} style={{ background:'#3b82f6', border:'none', borderRadius:6, padding:'5px 10px', color:'white', fontSize:11, cursor:'pointer', fontWeight:'bold' }}>
                    Set
                  </button>
                </div>
              )}

              {/* Sound */}
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:10, letterSpacing:'0.08em', margin:'0 0 8px' }}>SOUND</p>
              <div style={{ display:'flex', gap:6 }}>
                {[['off','Off','#64748b'],['simple','Simple','#8b5cf6'],['advanced','Advanced','#f472b6']].map(([m,l,c]) => (
                  <button key={m} onClick={() => setSoundMode(m)} style={{
                    flex:1, background: soundMode===m?`${c}33`:'rgba(255,255,255,0.05)',
                    border: soundMode===m?`1px solid ${c}`:'1px solid rgba(255,255,255,0.08)',
                    borderRadius:8, padding:'7px 4px', color: soundMode===m?c:'rgba(255,255,255,0.4)',
                    fontSize:10, fontWeight:'bold', cursor:'pointer'
                  }}>{l}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timer Bar */}
      {timerPreset && (
        <div style={{ background:'rgba(0,0,0,0.3)', padding:'6px 16px', display:'flex', justifyContent:'center', gap:16 }}>
          <div style={{ background: currentPlayer==='white'?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.08)', borderRadius:8, padding:'4px 14px', display:'flex', gap:6, alignItems:'center' }}>
            <span style={{ color:'rgba(255,255,255,0.6)', fontSize:11 }}>White</span>
            <span style={{ color:'white', fontFamily:'monospace', fontWeight:'bold', fontSize:14, color: whiteTime<30?'#ef4444':'white' }}>{formatTime(whiteTime)}</span>
          </div>
          <div style={{ background: currentPlayer==='black'?'rgba(59,130,246,0.4)':'rgba(255,255,255,0.08)', borderRadius:8, padding:'4px 14px', display:'flex', gap:6, alignItems:'center' }}>
            <span style={{ color:'rgba(255,255,255,0.6)', fontSize:11 }}>Black</span>
            <span style={{ fontFamily:'monospace', fontWeight:'bold', fontSize:14, color: blackTime<30?'#ef4444':'white' }}>{formatTime(blackTime)}</span>
          </div>
        </div>
      )}

      {/* Game Over Banner */}
      {gameOver && (
        <div style={{ background: isDraw?'#854d0e':'#166534', color:'white', padding:'10px', textAlign:'center', fontWeight:'bold', fontSize:16, animation:'pulse 1s infinite' }}>
          {isDraw ? 'Stalemate — Draw! 🤝' : `Checkmate! ${winner?.toUpperCase()} Wins! 🎉`}
        </div>
      )}

      <div style={{ flex:1, padding:'8px', overflowX:'auto' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>

            {/* Promotion Modal */}
            {promotionSquare && (
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
                <div style={{ background:'#1e293b', borderRadius:16, padding:24, textAlign:'center' }}>
                  <h3 style={{ color:'white', marginBottom:16 }}>Promote Pawn</h3>
                  <div style={{ display:'flex', gap:12 }}>
                    {['queen','rook','bishop','knight'].map(type => (
                      <button key={type} onClick={() => promotePawn(type)} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:10, padding:12, cursor:'pointer', fontSize:42, color: currentPlayer==='white'?'white':'#1e293b' }}>
                        {SYMBOLS[type]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Board + Side panels */}
            <div style={{ display:'flex', gap:12, alignItems:'flex-start', flexWrap:'wrap', justifyContent:'center' }}>

              {/* Move History */}
              {showMoveHistory && (
                <div style={{ width:160, background:'rgba(0,0,0,0.3)', borderRadius:12, padding:12, border:'1px solid rgba(255,255,255,0.08)' }}>
                  <h3 style={{ color:'white', fontSize:13, fontWeight:'bold', margin:'0 0 8px', display:'flex', alignItems:'center', gap:4 }}><TrendingUp size={14}/>Moves</h3>
                  <div style={{ maxHeight:320, overflowY:'auto' }}>
                    {moveHistory.length === 0
                      ? <p style={{ color:'rgba(255,255,255,0.3)', fontSize:11, textAlign:'center' }}>No moves yet</p>
                      : moveHistory.map((m,i) => (
                        <div key={i} style={{ background: m.player==='white'?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.04)', borderRadius:4, padding:'3px 6px', marginBottom:2 }}>
                          <span style={{ color:'rgba(255,255,255,0.3)', fontSize:10 }}>{i+1}. </span>
                          <span style={{ color:'white', fontSize:10 }}>{m.notation}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Chess Board */}
              <div style={{ border:`3px solid rgba(255,255,255,0.15)`, borderRadius:4, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.6)' }}>
                {board.map((row, ri) => (
                  <div key={ri} style={{ display:'flex' }}>
                    {row.map((piece, ci) => {
                      const isLight = (ri+ci)%2===0;
                      const isSel = selected && selected[0]===ri && selected[1]===ci;
                      const isVM = validMoves.some(([r,c]) => r===ri && c===ci);
                      const sqColor = isLight ? t.light : t.dark;
                      return (
                        <button key={ci} onClick={() => handleSquareClick(ri,ci)}
                          disabled={isThinking||!!promotionSquare}
                          style={{
                            width:'clamp(36px,10vw,72px)', height:'clamp(36px,10vw,72px)',
                            background: isSel ? '#f59e0b' : sqColor,
                            border: isSel ? '2px inset rgba(0,0,0,0.3)' : isVM ? '2px inset rgba(74,222,128,0.8)' : 'none',
                            outline:'none', cursor: isThinking?'not-allowed':'pointer',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            position:'relative', transition:'background 0.1s',
                            boxShadow: isSel ? 'inset 0 0 0 3px rgba(245,158,11,0.8)' : isVM ? 'inset 0 0 0 2px rgba(74,222,128,0.6)' : 'none'
                          }}>
                          <span style={{
                            fontSize:'clamp(20px,6vw,44px)', lineHeight:1,
                            color: piece?.color==='white' ? '#ffffff' : '#111111',
                            textShadow: piece?.color==='white' ? '0 1px 3px rgba(0,0,0,0.9)' : '0 1px 3px rgba(255,255,255,0.6)',
                            userSelect:'none'
                          }}>{getPieceSymbol(piece)}</span>
                          {isVM && !piece && (
                            <div style={{ position:'absolute', width:'28%', height:'28%', background:'rgba(74,222,128,0.6)', borderRadius:'50%', pointerEvents:'none' }}/>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Captured Pieces */}
              <div style={{ width:140, background:'rgba(0,0,0,0.3)', borderRadius:12, padding:12, border:'1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ color:'white', fontSize:13, fontWeight:'bold', margin:'0 0 8px' }}>Captured</h3>
                {[['White','white'],['Black','black']].map(([label,color]) => (
                  <div key={color} style={{ marginBottom:10 }}>
                    <p style={{ color:'rgba(255,255,255,0.4)', fontSize:11, margin:'0 0 4px' }}>{label}:</p>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:2 }}>
                      {captured[color].length === 0
                        ? <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10 }}>None</span>
                        : captured[color].map((p,i) => (
                          <span key={i} style={{ fontSize:18, color: p.color==='white'?'white':'#111', textShadow: p.color==='white'?'0 1px 2px rgba(0,0,0,0.8)':'0 1px 2px rgba(255,255,255,0.5)' }}>
                            {getPieceSymbol(p)}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
              {[
                { label:'Mode', icon:<RotateCcw size={15}/>, action:()=>setGameMode(null), color:'#475569' },
                { label:'New Game', icon:<RotateCcw size={15}/>, action:initBoard, color:'#3b82f6' },
                { label:'Undo', icon:<Undo size={15}/>, action:undoMove, color:'#ca8a04', disabled: boardHistory.length<=1||gameOver },
                { label:'History', icon:<TrendingUp size={15}/>, action:()=>setShowMoveHistory(s=>!s), color: showMoveHistory?'#16a34a':'#475569' },
                { label:'Stats', icon:<Trophy size={15}/>, action:()=>setShowStats(true), color:'#8b5cf6' },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action} disabled={btn.disabled}
                  style={{ background: btn.disabled?'#374151':btn.color, color:'white', border:'none', borderRadius:10, padding:'8px 14px', fontSize:12, fontWeight:'bold', cursor:btn.disabled?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:6, opacity:btn.disabled?0.5:1, transition:'all 0.15s' }}>
                  {btn.icon}{btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Modal */}
      {showStats && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:'1rem' }}>
          <div style={{ background:'#1e293b', borderRadius:20, padding:'2rem', maxWidth:360, width:'100%' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ color:'white', margin:0 }}>📊 Stats</h2>
              <button onClick={() => setShowStats(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', fontSize:20, cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ display:'grid', gap:10 }}>
              <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:10, padding:14 }}>
                <p style={{ color:'rgba(255,255,255,0.5)', margin:'0 0 4px', fontSize:12 }}>Games Played</p>
                <p style={{ color:'white', margin:0, fontSize:28, fontWeight:'bold' }}>{stats.gamesPlayed}</p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                {[['Wins','#16a34a',stats.wins],['Losses','#dc2626',stats.losses],['Draws','#ca8a04',stats.draws]].map(([l,c,v]) => (
                  <div key={l} style={{ background:`${c}22`, border:`1px solid ${c}`, borderRadius:10, padding:10, textAlign:'center' }}>
                    <p style={{ color:c, margin:'0 0 4px', fontSize:11 }}>{l}</p>
                    <p style={{ color:'white', margin:0, fontSize:22, fontWeight:'bold' }}>{v}</p>
                  </div>
                ))}
              </div>
              <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:10, padding:14 }}>
                <p style={{ color:'rgba(255,255,255,0.5)', margin:'0 0 4px', fontSize:12 }}>Win Streak</p>
                <p style={{ color:'#f59e0b', margin:0, fontSize:28, fontWeight:'bold' }}>🔥 {stats.winStreak}</p>
              </div>
            </div>
            <button onClick={() => setShowStats(false)} style={{ width:'100%', marginTop:16, background:'#3b82f6', color:'white', border:'none', borderRadius:10, padding:12, fontSize:15, fontWeight:'bold', cursor:'pointer' }}>Close</button>
          </div>
        </div>
      )}

      <footer style={{ background:'rgba(0,0,0,0.3)', padding:'10px', textAlign:'center', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ color:'rgba(255,255,255,0.3)', fontSize:12 }}>from Musfirah </span>
        <span style={{ color:'#87CEEB' }}>🦋</span>
      </footer>
    </div>
  );
};

export default ChessGame;
