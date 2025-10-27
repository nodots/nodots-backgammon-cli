import chalk from 'chalk'
import { Command } from 'commander'
import { ApiService } from '../services/api'
import { CliConfig } from '../types'

export class MoveCommand extends Command {
  constructor() {
    super('move')
    this.description(
      'Make a move from a position (engine determines destination)'
    )
      .argument('<game-id>', 'Game ID')
      .argument('<from>', 'From position')
      .action(this.execute.bind(this))
  }

  private async execute(gameId: string, from: string): Promise<void> {
    try {
      const config: CliConfig = {
        apiUrl: process.env.NODOTS_API_URL || 'https://localhost:3443',
        userId: process.env.NODOTS_USER_ID,
        apiKey: process.env.NODOTS_API_KEY,
      }

      const apiService = new ApiService(config)

      const fromPos = parseInt(from, 10)

      if (isNaN(fromPos)) {
        console.error(chalk.red('Invalid position. Must be a number.'))
        return
      }

      // First, get the current game state to find the checker ID
      const gameStateResponse = await apiService.getGame(gameId)
      if (!gameStateResponse.success) {
        console.error(
          chalk.red('Failed to get game state:', gameStateResponse.error)
        )
        return
      }

      const game = gameStateResponse.data
      if (!game) {
        console.error(chalk.red('Game not found'))
        return
      }

      // Find the checker ID from the specified position
      const checkerId = this.findCheckerIdFromPosition(game, fromPos)
      if (!checkerId) {
        console.error(chalk.red(`No checker found at position ${fromPos}`))
        return
      }

      console.log(
        chalk.blue(`Found checker ID: ${checkerId} at position ${fromPos}`)
      )

      // Make the move using the checker ID
      const gameResponse = await apiService.makeMoveWithCheckerId(
        gameId,
        checkerId
      )
      if (!gameResponse.success) {
        console.error(chalk.red('Failed to make move:', gameResponse.error))
        return
      }

      const updatedGame = gameResponse.data
      if (!updatedGame) {
        console.error(chalk.red('Game not found'))
        return
      }

      console.log(chalk.green('Move made successfully!'))

      // Display the updated board - ALWAYS use API's asciiBoard
      const updatedGameAny = updatedGame as any
      if (updatedGameAny.asciiBoard) {
        console.log(chalk.cyanBright('📋 Board:'))
        console.log(updatedGameAny.asciiBoard)
      } else {
        throw new Error(
          'API response missing asciiBoard property. This indicates an API endpoint issue.'
        )
      }
    } catch (error) {
      console.error(chalk.red('Error making move:'), error)
    }
  }

  private findCheckerIdFromPosition(
    game: any,
    position: number
  ): string | null {
    // Find the active player
    const activePlayer = game.players?.find(
      (p: any) => p.color === game.activeColor
    )
    if (!activePlayer) {
      console.error(chalk.red('No active player found'))
      return null
    }

    // Look through the board points to find the specified position
    if (game.board && game.board.points) {
      for (const point of game.board.points) {
        // Find the position that matches the active player's direction
        const positionMatches =
          point.position?.[activePlayer.direction] === position

        if (positionMatches) {
          // Find a checker on this point that belongs to the active player
          const checkers = point.checkers || []
          const activePlayerCheckers = checkers.filter(
            (c: any) => c.color === activePlayer.color
          )

          if (activePlayerCheckers.length > 0) {
            // Return the topmost checker (last in the array) that belongs to the active player
            const lastChecker =
              activePlayerCheckers[activePlayerCheckers.length - 1]
            return lastChecker.id
          }
        }
      }
    }
    return null
  }
}
