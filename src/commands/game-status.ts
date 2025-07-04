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
        console.log(chalk.redBright('❌ Not authenticated. Please run: nodots-backgammon login'))
        return
      }

      const apiService = new ApiService()
      const response = await apiService.getGame(gameId)

      if (!response.success) {
        console.error(chalk.redBright(`❌ Failed to get game status: ${response.error}`))
        return
      }

      const game = response.data!
      const gameAny = game as any // Type assertion for accessing optional properties

      console.log(chalk.whiteBright(`\n🎮 Game: ${game.id}`))
      console.log(chalk.whiteBright(`🎲 State: ${game.stateKind}`))
      console.log(chalk.whiteBright(`🎯 Active Color: ${game.activeColor}`))
      
      if (gameAny.lastRoll) {
        console.log(chalk.whiteBright(`🎲 Last Roll: [${gameAny.lastRoll.join(', ')}]`))
      }
      
      if (gameAny.lastMove) {
        console.log(chalk.whiteBright(`📍 Last Move: ${gameAny.lastMove.from} → ${gameAny.lastMove.to}`))
      }

      console.log(chalk.cyanBright('\n👥 Players:'))
      game.players.forEach((player: any) => {
        const isActive = player.color === game.activeColor
        const isHuman = player.email !== 'robot@nodots.com'
        const icon = isHuman ? '👤' : '🤖'
        const type = isHuman ? 'Human' : 'Robot'
        const activeIndicator = isActive ? chalk.greenBright(' ← ACTIVE') : ''
        
        console.log(`${icon} ${type}: ${player.color.toUpperCase()} (${player.direction})${activeIndicator}`)
      })

      console.log(chalk.yellowBright('\n🎯 Available actions:'))
      if (game.stateKind === 'rolling' || game.stateKind === 'rolling-for-start') {
        console.log(chalk.whiteBright(`• Roll dice: nodots-backgammon game-roll ${gameId}`))
      }
      if (game.stateKind === 'rolled') {
        console.log(chalk.whiteBright(`• Interactive play: nodots-backgammon game-play ${gameId}`))
      }

      // Show ASCII board if available
      if (gameAny.ascii) {
        console.log(chalk.cyanBright('\n📋 Board:'))
        console.log(gameAny.ascii)
      }

    } catch (error: any) {
      console.error(chalk.redBright(`❌ Unexpected error: ${error.message}`))
    }
  }
}