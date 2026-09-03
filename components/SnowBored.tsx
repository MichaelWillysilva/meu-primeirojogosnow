'use client'

import { useEffect, useRef, useState } from 'react'
import { GAME_CONSTANTS, COLORS, IMAGES, FONTS } from '../constants'
import { useIsMobile } from '../hooks/use-mobile'

interface Obstacle {
  x: number
  y: number
  sprite: HTMLImageElement
}

interface TrailPoint {
  x: number
  y: number
}

export default function SnowBored() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isMobile = useIsMobile()
  
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [gameTime, setGameTime] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const bgAudioRef = useRef<HTMLAudioElement | null>(null)
  const jumpAudioRef = useRef<HTMLAudioElement | null>(null)

  const gameStateRef = useRef({
    player: {
      x: 100,
      y: GAME_CONSTANTS.CANVAS_HEIGHT / 2,
      velocityY: 0,
      isMovingUp: false,
      sprite: null as HTMLImageElement | null
    },
    obstacles: [] as Obstacle[],
    trailPoints: [] as TrailPoint[],
    frameCount: 0,
    startTime: Date.now(),
    gameSpeedMultiplier: 1,
    obstacleGenerationInterval: GAME_CONSTANTS.TREE_GENERATION_INTERVAL,
    lastSpeedIncreaseTime: 0,
    score: 0,
    isGameOver: false
  })

  useEffect(() => {
    const savedHighScore = localStorage.getItem('snowbored_highscore')
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10))
    }

    bgAudioRef.current = new Audio('/background.mp3')
    bgAudioRef.current.loop = true
    bgAudioRef.current.volume = 0.4

    jumpAudioRef.current = new Audio('/jump.mp3')
    jumpAudioRef.current.volume = 1
    const loseAudio = new Audio('/gameover.mp3')
loseAudio.volume = 0.5
if (isMuted) loseAudio.muted = true
loseAudio.play().catch(() => {})

    return () => {
      if (bgAudioRef.current) bgAudioRef.current.pause()
    }
  }, [])

  useEffect(() => {
    if (bgAudioRef.current) bgAudioRef.current.muted = isMuted
    if (jumpAudioRef.current) jumpAudioRef.current.muted = isMuted
  }, [isMuted])

    const startMovingUp = () => {
    if (!gameStateRef.current.isGameOver) {
      gameStateRef.current.player.isMovingUp = true
      // Toca APENAS o som de pulo/subida
      if (jumpAudioRef.current) {
        jumpAudioRef.current.currentTime = 0
        jumpAudioRef.current.play().catch(() => {})
      }
      // Toca a música de fundo
      if (bgAudioRef.current && bgAudioRef.current.paused) {
        bgAudioRef.current.play().catch(() => {})
      }
    }
  }


  const stopMovingUp = () => {
    if (!gameStateRef.current.isGameOver) {
      gameStateRef.current.player.isMovingUp = false
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        startMovingUp()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        stopMovingUp()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const restartGame = () => {
    gameStateRef.current = {
      player: {
        x: 100,
        y: GAME_CONSTANTS.CANVAS_HEIGHT / 2,
        velocityY: 0,
        isMovingUp: false,
        sprite: gameStateRef.current.player.sprite
      },
      obstacles: [],
      trailPoints: [],
      frameCount: 0,
      startTime: Date.now(),
      gameSpeedMultiplier: 1,
      obstacleGenerationInterval: GAME_CONSTANTS.TREE_GENERATION_INTERVAL,
      lastSpeedIncreaseTime: Date.now(),
      score: 0,
      isGameOver: false
    }
    setScore(0)
    setGameOver(false)
    if (bgAudioRef.current) {
      bgAudioRef.current.currentTime = 0
      bgAudioRef.current.play().catch(() => {})
    }
  }
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const fontLink = document.createElement('link')
    fontLink.href = FONTS.PIXEL
    fontLink.rel = 'stylesheet'
    document.head.appendChild(fontLink)

    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.src = src
        img.onload = () => resolve(img)
        img.onerror = reject
      })
    }

    const loadObstacleSprites = async () => {
      const treeSprites = await Promise.all(IMAGES.TREES.map(loadImage))
      const snowmanSprites = await Promise.all(IMAGES.SNOWMEN.map(loadImage))
      return { treeSprites, snowmanSprites }
    }

    let animationFrameId: number

    const initGame = async () => {
      const playerSprite = await loadImage(IMAGES.PLAYER)
      const { treeSprites, snowmanSprites } = await loadObstacleSprites()

      gameStateRef.current.player.sprite = playerSprite
      gameStateRef.current.lastSpeedIncreaseTime = Date.now()

      const getRandomObstacleSprite = () => {
        const useTree = Math.random() > 0.3
        const sprites = useTree ? treeSprites : snowmanSprites
        return sprites[Math.floor(Math.random() * sprites.length)]
      }

      for (let i = 0; i < 6; i++) {
        gameStateRef.current.obstacles.push({
          x: Math.random() * GAME_CONSTANTS.CANVAS_WIDTH + 300,
          y: Math.random() * (GAME_CONSTANTS.CANVAS_HEIGHT - 100) + 50,
          sprite: getRandomObstacleSprite()
        })
      }

      const drawBackground = () => {
        ctx.fillStyle = COLORS.sky
        ctx.fillRect(0, 0, GAME_CONSTANTS.CANVAS_WIDTH, GAME_CONSTANTS.CANVAS_HEIGHT)
      }

      const drawPlayer = () => {
        const { player } = gameStateRef.current
        if (player.sprite) {
          ctx.save()
          ctx.translate(player.x, player.y)
          if (gameStateRef.current.isGameOver) ctx.rotate(-Math.PI / 2)
          ctx.drawImage(
            player.sprite,
            -GAME_CONSTANTS.PLAYER_WIDTH / 2,
            -GAME_CONSTANTS.PLAYER_HEIGHT / 2,
            GAME_CONSTANTS.PLAYER_WIDTH,
            GAME_CONSTANTS.PLAYER_HEIGHT
          )
          ctx.restore()
        }
      }

      const drawObstacles = () => {
        gameStateRef.current.obstacles.forEach(obstacle => {
          ctx.drawImage(
            obstacle.sprite,
            obstacle.x - GAME_CONSTANTS.OBSTACLE_WIDTH / 2,
            obstacle.y - GAME_CONSTANTS.OBSTACLE_HEIGHT,
            GAME_CONSTANTS.OBSTACLE_WIDTH,
            GAME_CONSTANTS.OBSTACLE_HEIGHT
          )
        })
      }

      const drawSkiTrail = () => {
        ctx.strokeStyle = COLORS.skiTrail
        ctx.lineWidth = 2
        ctx.beginPath()
        gameStateRef.current.trailPoints.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y)
          else ctx.lineTo(point.x, point.y)
        })
        ctx.stroke()
      }

      const checkCollision = () => {
        const { player, obstacles } = gameStateRef.current
        for (let obstacle of obstacles) {
          const dx = Math.abs(player.x - obstacle.x)
          const dy = Math.abs(player.y - (obstacle.y - GAME_CONSTANTS.OBSTACLE_HEIGHT / 2))
          if (dx < GAME_CONSTANTS.PLAYER_WIDTH / 2 && dy < GAME_CONSTANTS.PLAYER_HEIGHT / 2) {
            return true
          }
        }
        return false
      }

      const updateGame = () => {
        if (gameStateRef.current.isGameOver) return

        const { player, obstacles, trailPoints } = gameStateRef.current
        const currentTime = Date.now()
        
        if (currentTime - gameStateRef.current.lastSpeedIncreaseTime >= 2500) {
          gameStateRef.current.gameSpeedMultiplier += 0.05
          gameStateRef.current.obstacleGenerationInterval = Math.max(30, gameStateRef.current.obstacleGenerationInterval - 5)
          gameStateRef.current.lastSpeedIncreaseTime = currentTime
        }

        if (player.isMovingUp) {
          player.velocityY = Math.max(player.velocityY - 0.2, -GAME_CONSTANTS.MOVEMENT_SPEED)
        } else {
          player.velocityY = Math.min(player.velocityY + GAME_CONSTANTS.GRAVITY, GAME_CONSTANTS.MOVEMENT_SPEED)
        }

        player.y += player.velocityY

        if (player.y < 50) player.y = 50
        if (player.y > GAME_CONSTANTS.CANVAS_HEIGHT - 70) player.y = GAME_CONSTANTS.CANVAS_HEIGHT - 70

        trailPoints.unshift({ x: player.x, y: player.y + 10 })
        if (trailPoints.length > 50) trailPoints.pop()

        gameStateRef.current.obstacles = obstacles.map(obstacle => ({
          ...obstacle,
          x: obstacle.x - GAME_CONSTANTS.MOVEMENT_SPEED * gameStateRef.current.gameSpeedMultiplier
        })).filter(obstacle => obstacle.x > -50)

        gameStateRef.current.trailPoints = trailPoints.map(point => ({
          ...point,
          x: point.x - GAME_CONSTANTS.MOVEMENT_SPEED * gameStateRef.current.gameSpeedMultiplier
        })).filter(point => point.x > 0)

        if (gameStateRef.current.frameCount % gameStateRef.current.obstacleGenerationInterval === 0) {
          gameStateRef.current.obstacles.push({
            x: GAME_CONSTANTS.CANVAS_WIDTH + 50,
            y: Math.random() * (GAME_CONSTANTS.CANVAS_HEIGHT - 100) + 50,
            sprite: getRandomObstacleSprite()
          })
        }

                if (checkCollision()) {
          gameStateRef.current.isGameOver = true
          setGameOver(true)
          setGameTime(Math.floor((Date.now() - gameStateRef.current.startTime) / 1000))
          
          if (bgAudioRef.current) bgAudioRef.current.pause()

          // 🔊 Toca o som de derrota APENAS quando bater!
          const loseAudio = new Audio('/gameover.mp3')
          loseAudio.volume = 0.5
          if (isMuted) loseAudio.muted = true
          loseAudio.play().catch(() => {})

          // Lógica de Recorde
          const currentFinalScore = gameStateRef.current.score
          const savedHighScore = localStorage.getItem('snowbored_highscore')
          const currentHighScore = savedHighScore ? parseInt(savedHighScore, 10) : 0
          
          if (currentFinalScore > currentHighScore) {
            localStorage.setItem('snowbored_highscore', currentFinalScore.toString())
            setHighScore(currentFinalScore)
          }
          return
        }

        if (gameStateRef.current.frameCount % 60 === 0) {
          gameStateRef.current.score += 10
          setScore(gameStateRef.current.score)
        }

        gameStateRef.current.frameCount++
      }

      const gameLoop = () => {
        if (!canvasRef.current) return
        ctx.clearRect(0, 0, GAME_CONSTANTS.CANVAS_WIDTH, GAME_CONSTANTS.CANVAS_HEIGHT)
        updateGame()
        drawBackground()
        drawSkiTrail()
        drawObstacles()
        drawPlayer()
        animationFrameId = requestAnimationFrame(gameLoop)
      }

      gameLoop()
    }

    initGame()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 font-['Press_Start_2P'] text-white select-none">
      
      {/* Barra Superior Interativa */}
      <div className="w-full max-w-[800px] flex justify-between items-center px-4 mb-2 text-xs md:text-sm">
        <div className="flex gap-4">
          <div>🏆 RECORD: <span className="text-yellow-400">{highScore}</span></div>
          <div>✨ SCORE: <span className="text-cyan-400">{score}</span></div>
        </div>
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className="bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded border-2 border-slate-600 active:scale-95 transition-transform"
        >
          {isMuted ? '🔇 MUTED' : '🔊 SOUND'}
        </button>
      </div>

      {/* Área Principal do Jogo */}
      <div 
        className="relative border-4 border-white shadow-2xl rounded overflow-hidden touch-none"
        onMouseDown={startMovingUp}
        onMouseUp={stopMovingUp}
        onTouchStart={(e) => { e.preventDefault(); startMovingUp() }}
        onTouchEnd={(e) => { e.preventDefault(); stopMovingUp() }}
      >
        <canvas
          ref={canvasRef}
          width={GAME_CONSTANTS.CANVAS_WIDTH}
          height={GAME_CONSTANTS.CANVAS_HEIGHT}
          className="max-w-full h-auto block"
        />

        {/* Instrução Flutuante */}
        {!gameOver && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] md:text-xs text-slate-800 bg-white/70 px-3 py-1 rounded text-center pointer-events-none">
            {isMobile ? 'Toque e segure na tela para subir' : 'Segure ESPAÇO para subir'}
          </div>
        )}

        {/* Tela de Game Over */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-4">
            <h2 className="text-red-500 text-2xl md:text-4xl mb-4 animate-pulse">GAME OVER</h2>
            <p className="text-sm md:text-lg mb-2">Pontuação Final: <span className="text-cyan-400">{score}</span></p>
            <p className="text-xs md:text-sm text-slate-400 mb-6">Tempo de Jogo: {gameTime}s</p>
            <button
              onClick={restartGame}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 py-3 rounded text-sm md:text-base border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 transition-all"
            >
              Bora mais uma vez?!
            </button>
          </div>
        )}
      </div>

      {/* ✍️ Rodapé Personalizado */}
      <footer className="mt-6 text-[10px] md:text-xs text-slate-400 flex items-center gap-2">
        <span>🎮</span> 
        <span>Criado por</span>
        <a 
          href="https://github.com"
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-cyan-400 hover:underline hover:text-cyan-300 font-bold"
        >
          Michael Willy
        </a> 
        <span>🚀</span>
      </footer>
    </div>
  )
}
