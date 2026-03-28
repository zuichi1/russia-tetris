import { useState, useEffect, useCallback, useRef } from 'react'
import './index.css'

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const CELL_SIZE = 30
const WARNING_LINE = 2

const SHAPES = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
  ],
  O: [
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]]
  ],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]]
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]]
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]]
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]]
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]]
  ]
}

const COLORS = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000'
}

const createEmptyBoard = () =>
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null))

const PIECES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

function getRandomPiece() {
  const type = PIECES[Math.floor(Math.random() * PIECES.length)]
  return {
    type,
    shapes: SHAPES[type],
    color: COLORS[type],
    rotation: 0
  }
}

function getShape(piece) {
  return piece.shapes[piece.rotation]
}

function App() {
  const [board, setBoard] = useState(createEmptyBoard)
  const [piece, setPiece] = useState(getRandomPiece)
  const [pos, setPos] = useState({ x: 3, y: 0 })
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [material, setMaterial] = useState('classic')
  const [clearingRows, setClearingRows] = useState([])
  const [droppingRows, setDroppingRows] = useState([])
  const [leaderboard, setLeaderboard] = useState(() => {
    const saved = localStorage.getItem('tetris-leaderboard')
    return saved ? JSON.parse(saved) : []
  })
  const [showNameInput, setShowNameInput] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const pendingScoreRef = useRef(0)

  const saveToLeaderboard = useCallback((finalScore, name) => {
    if (finalScore <= 0) return
    const newEntry = {
      score: finalScore,
      name: name.trim() || '匿名',
      date: new Date().toLocaleDateString()
    }
    setLeaderboard(prev => {
      const updated = [...prev, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
      localStorage.setItem('tetris-leaderboard', JSON.stringify(updated))
      return updated
    })
  }, [])

  const boardRef = useRef(board)
  const pieceRef = useRef(piece)
  const posRef = useRef(pos)
  const gameOverRef = useRef(gameOver)
  const isPausedRef = useRef(isPaused)

  useEffect(() => { boardRef.current = board }, [board])
  useEffect(() => { pieceRef.current = piece }, [piece])
  useEffect(() => { posRef.current = pos }, [pos])
  useEffect(() => { gameOverRef.current = gameOver }, [gameOver])
  useEffect(() => { isPausedRef.current = isPaused }, [isPaused])

  const isValidPosition = useCallback((newPiece, newPos, boardState = boardRef.current) => {
    const shape = getShape(newPiece)
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardX = newPos.x + x
          const boardY = newPos.y + y
          if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
            return false
          }
          if (boardY >= 0 && boardState[boardY][boardX]) {
            return false
          }
        }
      }
    }
    return true
  }, [])

  const lockPieceToBoard = useCallback(() => {
    const currentPiece = pieceRef.current
    const currentPos = posRef.current
    const newBoard = boardRef.current.map(row => [...row])
    const shape = getShape(currentPiece)
    let reachedWarningLine = false

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardY = currentPos.y + y
          const boardX = currentPos.x + x
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            newBoard[boardY][boardX] = currentPiece.color
          }
          if (boardY < WARNING_LINE) {
            reachedWarningLine = true
          }
        }
      }
    }

    if (reachedWarningLine) {
      return { board: newBoard, gameOver: true }
    }

    return { board: newBoard, gameOver: false }
  }, [])

  const clearLines = useCallback((boardState) => {
    const newBoard = boardState.filter(row => row.some(cell => cell === null))
    const clearedCount = BOARD_HEIGHT - newBoard.length
    const clearedRows = []
    for (let i = 0; i < clearedCount; i++) {
      clearedRows.push(clearedCount - 1 + i)
    }
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(null))
    }
    return { board: newBoard, clearedCount, clearedRows }
  }, [])

  const spawnNewPiece = useCallback(() => {
    const newPiece = getRandomPiece()
    const startX = Math.floor((BOARD_WIDTH - getShape(newPiece)[0].length) / 2)
    const startPos = { x: startX, y: 0 }

    if (!isValidPosition(newPiece, startPos, createEmptyBoard())) {
      return false
    }

    setPiece(newPiece)
    pieceRef.current = newPiece
    setPos(startPos)
    posRef.current = startPos
    return true
  }, [isValidPosition])

  const moveDown = useCallback(() => {
    if (gameOverRef.current || !gameStarted || isPausedRef.current) return

    const newPos = { x: posRef.current.x, y: posRef.current.y + 1 }

    if (isValidPosition(pieceRef.current, newPos)) {
      setPos(newPos)
      posRef.current = newPos
    } else {
      const { board: boardAfterLock, gameOver } = lockPieceToBoard()
      if (gameOver) {
        pendingScoreRef.current = score
        setGameOver(true)
        setBoard(boardAfterLock)
        setShowNameInput(true)
        return
      }
      const { board: clearedBoard, clearedCount, clearedRows } = clearLines(boardAfterLock)
      if (material === 'crystal' && clearedRows.length > 0) {
        setClearingRows(clearedRows)
        setTimeout(() => {
          setClearingRows([])
          setBoard(clearedBoard)
          boardRef.current = clearedBoard
          const dropRows = clearedRows.map(r => r - clearedRows.length).filter(r => r >= 0)
          if (dropRows.length > 0) {
            setDroppingRows(dropRows)
            setTimeout(() => setDroppingRows([]), 400)
          }
        }, 600)
      } else {
        setBoard(clearedBoard)
        boardRef.current = clearedBoard
      }
      if (clearedCount > 0) {
        setScore(s => s + clearedCount * 100)
      }
      if (!spawnNewPiece()) {
        pendingScoreRef.current = score + (clearedCount * 100)
        setGameOver(true)
        setShowNameInput(true)
        return
      }
    }
  }, [gameStarted, isValidPosition, lockPieceToBoard, clearLines, spawnNewPiece, score])

  const moveLeft = useCallback(() => {
    if (gameOverRef.current || !gameStarted || isPausedRef.current) return
    const newPos = { x: posRef.current.x - 1, y: posRef.current.y }
    if (isValidPosition(pieceRef.current, newPos)) {
      setPos(newPos)
      posRef.current = newPos
    }
  }, [gameStarted, isValidPosition])

  const moveRight = useCallback(() => {
    if (gameOverRef.current || !gameStarted || isPausedRef.current) return
    const newPos = { x: posRef.current.x + 1, y: posRef.current.y }
    if (isValidPosition(pieceRef.current, newPos)) {
      setPos(newPos)
      posRef.current = newPos
    }
  }, [gameStarted, isValidPosition])

  const rotate = useCallback(() => {
    if (gameOverRef.current || !gameStarted || isPausedRef.current) return

    const currentPiece = pieceRef.current
    const newPiece = {
      ...currentPiece,
      rotation: (currentPiece.rotation + 1) % 4
    }

    if (isValidPosition(newPiece, posRef.current)) {
      setPiece(newPiece)
      pieceRef.current = newPiece
      return
    }

    const kicks = [-1, 1, -2, 2]
    for (const kick of kicks) {
      const newPos = { x: posRef.current.x + kick, y: posRef.current.y }
      if (isValidPosition(newPiece, newPos)) {
        setPiece(newPiece)
        pieceRef.current = newPiece
        setPos(newPos)
        posRef.current = newPos
        return
      }
    }
  }, [gameStarted, isValidPosition])

  const hardDrop = useCallback(() => {
    if (gameOverRef.current || !gameStarted || isPausedRef.current) return

    let newPos = { ...posRef.current }
    while (isValidPosition(pieceRef.current, { x: newPos.x, y: newPos.y + 1 })) {
      newPos.y++
    }

    setPos(newPos)
    posRef.current = newPos

    const { board: boardAfterLock, gameOver } = lockPieceToBoard()
    if (gameOver) {
      setGameOver(true)
      setBoard(boardAfterLock)
      return
    }

    const { board: clearedBoard, clearedCount, clearedRows } = clearLines(boardAfterLock)
    if (material === 'crystal' && clearedRows.length > 0) {
      setClearingRows(clearedRows)
      setTimeout(() => {
        setClearingRows([])
        setBoard(clearedBoard)
        boardRef.current = clearedBoard
        const dropRows = clearedRows.map(r => r - clearedRows.length).filter(r => r >= 0)
        if (dropRows.length > 0) {
          setDroppingRows(dropRows)
          setTimeout(() => setDroppingRows([]), 400)
        }
      }, 600)
    } else {
      setBoard(clearedBoard)
      boardRef.current = clearedBoard
    }
    if (clearedCount > 0) {
      setScore(s => s + clearedCount * 100)
    }
    if (!spawnNewPiece()) {
      setGameOver(true)
    }
  }, [gameStarted, isValidPosition, lockPieceToBoard, clearLines, spawnNewPiece, material])

  const restartGame = useCallback(() => {
    const newBoard = createEmptyBoard()
    const newPiece = getRandomPiece()
    const startX = Math.floor((BOARD_WIDTH - getShape(newPiece)[0].length) / 2)

    setBoard(newBoard)
    boardRef.current = newBoard
    setPiece(newPiece)
    pieceRef.current = newPiece
    setPos({ x: startX, y: 0 })
    posRef.current = { x: startX, y: 0 }
    setScore(0)
    pendingScoreRef.current = 0
    setGameOver(false)
    gameOverRef.current = false
    setIsPaused(false)
    isPausedRef.current = false
    setGameStarted(true)
    setShowNameInput(false)
    setPlayerName('')
  }, [])

  const touchActiveRef = useRef(false)

  const handleRotateTouch = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (touchActiveRef.current) return
    touchActiveRef.current = true
    rotate()
    setTimeout(() => { touchActiveRef.current = false }, 150)
  }

  const handleLeftTouch = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (touchActiveRef.current) return
    touchActiveRef.current = true
    moveLeft()
    setTimeout(() => { touchActiveRef.current = false }, 150)
  }

  const handleRightTouch = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (touchActiveRef.current) return
    touchActiveRef.current = true
    moveRight()
    setTimeout(() => { touchActiveRef.current = false }, 150)
  }

  const handleDownTouch = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (touchActiveRef.current) return
    touchActiveRef.current = true
    moveDown()
    setTimeout(() => { touchActiveRef.current = false }, 150)
  }

  const handleHardDropTouch = (e) => {
    e.preventDefault()
    e.stopPropagation()
    hardDrop()
  }

  const handlePauseTouch = (e) => {
    e.preventDefault()
    e.stopPropagation()
    togglePause()
  }

  const startGame = useCallback(() => {
    restartGame()
  }, [restartGame])

  const togglePause = useCallback(() => {
    if (gameOverRef.current || !gameStarted) return
    setIsPaused(p => !p)
  }, [gameStarted])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameOverRef.current && e.key.toLowerCase() !== 'r') return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          moveLeft()
          break
        case 'ArrowRight':
          e.preventDefault()
          moveRight()
          break
        case 'ArrowDown':
          e.preventDefault()
          moveDown()
          break
        case 'ArrowUp':
          e.preventDefault()
          rotate()
          break
        case ' ':
          e.preventDefault()
          hardDrop()
          break
        case 'r':
        case 'R':
          e.preventDefault()
          restartGame()
          break
        case 'p':
        case 'P':
          e.preventDefault()
          togglePause()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [moveLeft, moveRight, moveDown, rotate, hardDrop, restartGame, togglePause])

  useEffect(() => {
    if (!gameStarted || gameOver) return

    const interval = setInterval(() => {
      moveDown()
    }, 500)

    return () => clearInterval(interval)
  }, [gameStarted, gameOver, moveDown])

  const renderBoard = () => {
    const displayBoard = board.map(row => [...row])
    const shape = getShape(piece)
    const fallingCells = new Set()

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardY = pos.y + y
          const boardX = pos.x + x
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            displayBoard[boardY][boardX] = piece.color
            fallingCells.add(`${boardX},${boardY}`)
          }
        }
      }
    }

    return { board: displayBoard, fallingCells }
  }

  const { board: displayBoard, fallingCells } = renderBoard()

  return (
    <div className="game-container">
      <h1 className="game-title">俄罗斯方块</h1>
      <div className="game-area">
        <div className="board-wrapper">
          <div className="board">
            {displayBoard.map((row, y) =>
              row.map((cell, x) => {
                const isFalling = fallingCells.has(`${x},${y}`)
                const isClearing = clearingRows.includes(y)
                const isDropping = droppingRows.includes(y)
                const isCrystal = material === 'crystal'
                const isPlush = material === 'plush'
                const cellClass = cell
                  ? isClearing && isCrystal
                    ? 'filled crystal crystal-dissolve'
                    : isDropping && isCrystal
                      ? 'filled crystal crystal-drop'
                      : isCrystal
                        ? 'filled crystal'
                        : isPlush
                          ? 'filled plush'
                          : 'filled'
                  : ''
                const cellStyle = cell ? { backgroundColor: cell } : undefined
                return (
                  <div
                    key={`${x}-${y}`}
                    className={`cell ${cellClass} ${y < WARNING_LINE && !cell ? 'warning-zone' : ''}`}
                    style={cellStyle}
                  />
                )
              })
            )}
          </div>
          <div className="warning-line" />
          {showNameInput && (
            <div className="game-over-overlay">
              <div className="name-input-title">恭喜！请输入你的名字</div>
              <div className="name-input-score">得分: {pendingScoreRef.current}</div>
              <input
                type="text"
                className="name-input"
                placeholder="输入名字"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={12}
              />
              <button className="restart-btn" onClick={() => { saveToLeaderboard(pendingScoreRef.current, playerName); setShowNameInput(false); }}>
                保存成绩
              </button>
            </div>
          )}
          {gameOver && !showNameInput && (
            <div className="game-over-overlay">
              <div className="game-over-text">游戏结束</div>
              <div className="final-score">最终得分: {score}</div>
              <button className="restart-btn" onClick={restartGame}>
                重新开始 (R)
              </button>
            </div>
          )}
          {isPaused && !gameOver && (
            <div className="game-over-overlay">
              <div className="pause-text">游戏暂停</div>
              <button className="restart-btn" onClick={togglePause}>
                继续游戏 (P)
              </button>
            </div>
          )}
          {!gameStarted && !gameOver && (
            <div className="game-over-overlay">
              <div className="material-selector">
                <div className="material-title">选择方块材质</div>
                <div className="material-options">
                  <div
                    className={`material-option ${material === 'classic' ? 'selected' : ''}`}
                    onClick={() => setMaterial('classic')}
                  >
                    <div className="material-preview classic">
                      <div className="preview-cell"></div>
                      <div className="preview-cell"></div>
                      <div className="preview-cell"></div>
                      <div className="preview-cell"></div>
                      <div className="preview-cell"></div>
                      <div className="preview-cell"></div>
                      <div className="preview-cell"></div>
                    </div>
                    <span className="material-name">经典</span>
                  </div>
                  <div
                    className={`material-option ${material === 'plush' ? 'selected' : ''}`}
                    onClick={() => setMaterial('plush')}
                  >
                    <div className="material-preview plush">
                      <div className="preview-cell"></div>
                      <div className="preview-cell"></div>
                      <div className="preview-cell"></div>
                      <div className="preview-cell"></div>
                      <div className="preview-cell"></div>
                      <div className="preview-cell"></div>
                      <div className="preview-cell"></div>
                    </div>
                    <span className="material-name">晶体</span>
                  </div>
                </div>
                <button className="start-btn" onClick={startGame}>
                  开始游戏
                </button>
              </div>
            </div>
          )}
          <div className="mobile-controls">
            <div className="mobile-score">
              <span>得分: {score}</span>
            </div>
            <div className="mobile-row">
              <button className="mobile-btn rotate-btn" onTouchStart={handleRotateTouch}>↻</button>
              <button className="mobile-btn pause-btn" onTouchStart={handlePauseTouch}>⏸</button>
            </div>
            <div className="mobile-row">
              <button className="mobile-btn" onTouchStart={handleLeftTouch}>←</button>
              <button className="mobile-btn" onTouchStart={handleDownTouch}>↓</button>
              <button className="mobile-btn" onTouchStart={handleRightTouch}>→</button>
            </div>
            <div className="mobile-row">
              <button className="mobile-btn drop-btn" onTouchStart={handleHardDropTouch}>↓↓</button>
            </div>
            <div className="mobile-row material-row">
              <button
                className={`mobile-btn material-btn ${material === 'classic' ? 'active' : ''}`}
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); setMaterial('classic') }}
              >经典</button>
              <button
                className={`mobile-btn material-btn ${material === 'plush' ? 'active' : ''}`}
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); setMaterial('plush') }}
              >晶体</button>
            </div>
            <div className="mobile-leaderboard">
              <div className="mobile-leaderboard-title">排行榜</div>
              {leaderboard.length === 0 ? (
                <div className="mobile-leaderboard-empty">暂无记录</div>
              ) : (
                <div className="mobile-leaderboard-list">
                  {leaderboard.slice(0, 5).map((entry, index) => (
                    <div key={index} className="mobile-leaderboard-item">
                      <span className="mobile-rank">{index + 1}</span>
                      <span className="mobile-rank-name">{entry.name}</span>
                      <span className="mobile-rank-score">{entry.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="side-panel">
          <div className="score-panel">
            <h2>得分</h2>
            <div className="score-value">{score}</div>
          </div>
          <div className="material-panel">
            <h2>材质</h2>
            <div className="material-options-side">
              <div
                className={`material-option-side ${material === 'classic' ? 'active' : ''}`}
                onClick={() => setMaterial('classic')}
              >
                <div className="material-preview-side classic"></div>
              </div>
              <div
                className={`material-option-side ${material === 'plush' ? 'active' : ''}`}
                onClick={() => setMaterial('plush')}
              >
                <div className="material-preview-side plush"></div>
              </div>
            </div>
          </div>
          <div className="controls-panel">
            <h2>操作说明</h2>
            <ul>
              <li><span className="key">←</span> 左移</li>
              <li><span className="key">→</span> 右移</li>
              <li><span className="key">↓</span> 下移</li>
              <li><span className="key">↑</span> 旋转</li>
              <li><span className="key">空格</span> 快速下落</li>
              <li><span className="key">P</span> 暂停/继续</li>
              <li><span className="key">R</span> 重新开始</li>
            </ul>
          </div>
          <div className="leaderboard-panel">
            <h2>排行榜</h2>
            {leaderboard.length === 0 ? (
              <div className="leaderboard-empty">暂无记录</div>
            ) : (
              <ol className="leaderboard-list">
                {leaderboard.map((entry, index) => (
                  <li key={index} className="leaderboard-item">
                    <span className="leaderboard-rank">{index + 1}</span>
                    <span className="leaderboard-name">{entry.name}</span>
                    <span className="leaderboard-score">{entry.score}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App