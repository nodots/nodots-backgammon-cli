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
          chalk.redBright('❌ Not authenticated. Please run: ndbg login')
        )
        return
      }

      const apiService = new ApiService()

      // Get users list to properly identify human vs robot players
      const usersResponse = await apiService.getUsers()
      if (!usersResponse.success) {
        console.error(
          chalk.redBright('❌ Failed to fetch users:', usersResponse.error)
        )
        return
      }

      const users = usersResponse.data || []

      const response = await apiService.getGame(gameId)

      if (!response.success) {
        console.error(
          chalk.redBright(`❌ Failed to get game status: ${response.error}`)
        )
        return
      }

      const game = response.data!
      const gameAny = game as any // Type assertion for accessing optional properties

      console.log(chalk.whiteBright(`\n🎮 Game: ${game.id}`))
      console.log(chalk.whiteBright(`🎲 State: ${game.stateKind}`))
      console.log(chalk.whiteBright(`🎯 Active Color: ${game.activeColor}`))

      // Show current roll for active player
      if (gameAny.activePlayer?.dice?.currentRoll) {
        const currentRoll = gameAny.activePlayer.dice.currentRoll
        const total =
          gameAny.activePlayer.dice.total ||
          currentRoll.reduce((a: number, b: number) => a + b, 0)
        console.log(
          chalk.yellowBright(
            `🎲 Current Roll: [${currentRoll.join(', ')}] (Total: ${total})`
          )
        )
      }

      if (gameAny.lastRoll) {
        console.log(
          chalk.whiteBright(`🎲 Last Roll: [${gameAny.lastRoll.join(', ')}]`)
        )
      }

      if (gameAny.lastMove) {
        console.log(
          chalk.whiteBright(
            `📍 Last Move: ${gameAny.lastMove.from} → ${gameAny.lastMove.to}`
          )
        )
      }

      console.log(chalk.cyanBright('\n👥 Players:'))

      game.players.forEach((player: any, index: number) => {
        const isActive = player.color === game.activeColor

        // Fix: Use player.userId to match against users list and identify human vs robot
        const user = users.find((u: any) => u.id === player.userId) as any
        const isHuman = user ? user.userType === 'human' : false

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
        game.stateKind === 'rolling-for-start' ||
        game.stateKind === 'rolled-for-start'
      ) {
        console.log(chalk.whiteBright(`• Roll dice: ndbg game-roll ${gameId}`))
      }

      if (game.stateKind === 'rolled-for-start') {
        console.log(chalk.whiteBright(`• Continue: ndbg game-roll ${gameId}`))
      }

      // Show ASCII board from API - ALWAYS use API's asciiBoard
      if (gameAny.asciiBoard) {
        console.log(chalk.cyanBright('\n📋 Board:'))
        console.log(gameAny.asciiBoard)
      } else {
        console.log(chalk.redBright('\n⚠️  No ASCII board available from API'))
      }
    } catch (error: any) {
      console.error(chalk.redBright(`❌ Unexpected error: ${error.message}`))
    }
  }
}
