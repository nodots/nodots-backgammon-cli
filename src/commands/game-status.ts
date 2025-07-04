import chalk from 'chalk'
import { Command } from 'commander'
import { ApiService } from '../services/api'
import { AuthService } from '../services/auth'

export class GameStatusCommand extends Command {
  constructor() {
    super('game-status')
    this.description('Show current game status')
      .argument('<gameId>', 'ID of the game to check')
      .action(this.execute.bind(this))
  }

  private async execute(gameId: string): Promise<void> {
    try {
      console.log(chalk.whiteBright(`📊 Game Status: ${gameId}`))

      const authService = new AuthService()
      const apiConfig = authService.getApiConfig()

      if (!apiConfig.apiKey) {
        console.log(
          chalk.redBright(
            '❌ Not authenticated. Please run: nodots-backgammon login'
          )
        )
        return
      }

      console.log('DEBUG: Creating API service...')
      const apiService = new ApiService()
      console.log('DEBUG: Making API call...')
      const response = await apiService.getGame(gameId)
      console.log('DEBUG: API response received:', response.success)

      if (!response.success) {
        console.log('DEBUG: API response failed:', response.error)
        throw new Error(response.error || 'Failed to get game')
      }

      const game: any = response.data
      console.log('DEBUG: Game data received:', !!game)

      console.log(chalk.whiteBright(`\n🎮 Game: ${game.id}`))
      console.log(chalk.whiteBright(`🎲 State: ${game.stateKind}`))
      console.log(chalk.whiteBright(`🎯 Active Color: ${game.activeColor}`))

      if (game.lastRoll) {
        console.log(
          chalk.whiteBright(`🎲 Last Roll: [${game.lastRoll.join(', ')}]`)
        )
      }

      if (game.lastMove) {
        console.log(
          chalk.whiteBright(
            `📍 Last Move: ${game.lastMove.from} → ${game.lastMove.to}`
          )
        )
      }

      console.log(chalk.cyanBright('\n👥 Players:'))
      game.players.forEach((player: any) => {
        const isActive = player.color === game.activeColor
        const isHuman = player.email !== 'robot@nodots.com'
        const icon = isHuman ? '👤' : '🤖'
        const type = isHuman ? 'Human' : 'Robot'
        const activeIndicator = isActive ? chalk.greenBright(' ← ACTIVE') : ''

        console.log(
          `${icon} ${type}: ${player.color.toUpperCase()} (${
            player.direction
          })${activeIndicator}`
        )
      })

      console.log(chalk.yellowBright('\n🎯 Available actions:'))
      if (
        game.stateKind === 'rolling' ||
        game.stateKind === 'rolling-for-start'
      ) {
        console.log(
          chalk.whiteBright(
            `• Roll dice: nodots-backgammon game-roll ${gameId}`
          )
        )
      }
      if (game.stateKind === 'rolled') {
        console.log(
          chalk.whiteBright(
            `• Interactive play: nodots-backgammon game-play ${gameId}`
          )
        )
      }

      // Show ASCII board if available
      if (game.ascii) {
        console.log(chalk.cyanBright('\n📋 Board:'))
        console.log(game.ascii)
      }
    } catch (error: any) {
      console.log('DEBUG: Error caught:', error.message)
      if (error.message && error.message.includes('401')) {
        console.error(
          chalk.redBright(
            '❌ Authentication failed. Please run: nodots-backgammon login'
          )
        )
      } else if (error.message && error.message.includes('404')) {
        console.error(chalk.redBright('❌ Game not found'))
      } else {
        console.error(
          chalk.redBright(`❌ Failed to get game status: ${error.message}`)
        )
      }
    }
  }
}
