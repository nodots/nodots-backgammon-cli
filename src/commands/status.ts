import chalk from 'chalk'
import { Command } from 'commander'
import { ApiService } from '../services/api'
import { CliConfig } from '../types'

export class StatusCommand extends Command {
  constructor() {
    super('status')
    this.description('Show game status')
      .argument('<game-id>', 'Game ID')
      .action(this.execute.bind(this))
  }

  private async execute(gameId: string): Promise<void> {
    try {
      const config: CliConfig = {
        apiUrl: process.env.NODOTS_API_URL || 'https://localhost:3443',
        userId: process.env.NODOTS_USER_ID,
        apiKey: process.env.NODOTS_API_KEY,
      }

      const apiService = new ApiService(config)

      // Get game status
      const gameResponse = await apiService.getGame(gameId)
      if (!gameResponse.success) {
        console.error(chalk.red('Failed to fetch game:', gameResponse.error))
        return
      }

      const game = gameResponse.data
      if (!game) {
        console.error(chalk.red('Game not found'))
        return
      }

      // Display the board - ALWAYS use API's asciiBoard
      const gameAny = game as any
      if (gameAny.asciiBoard) {
        console.log(chalk.cyanBright('📋 Board:'))
        console.log(gameAny.asciiBoard)
      } else {
        console.log(chalk.redBright('⚠️  No ASCII board available from API'))
      }
    } catch (error) {
      console.error(chalk.red('Error fetching game status:'), error)
    }
  }
}
