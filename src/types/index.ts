import {
  BackgammonBoard,
  BackgammonGame,
  BackgammonPlayer,
} from '@nodots/backgammon-types'

export interface CliConfig {
  apiUrl: string
  userId?: string
  apiKey?: string
}

export interface GameState {
  game: BackgammonGame
  board: BackgammonBoard
  currentPlayer: BackgammonPlayer
  possibleMoves: Array<{
    from: number
    to: number
    dieValue: number
  }>
}

export interface MoveResult {
  success: boolean
  message: string
  gameState?: GameState
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
