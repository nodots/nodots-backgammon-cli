import chalk from 'chalk'
import { Command } from 'commander'
import { ApiService } from '../services/api'
import { AuthService } from '../services/auth'

export class GameRollCommand extends Command {
  constructor() {
    super('game-roll')
    this.description('Roll dice for your turn')
      .argument('<gameId>', 'ID of the game to roll dice for')
      .action(this.execute.bind(this))
  }

  private async execute(gameId: string): Promise<void> {
    try {
      console.log(chalk.whiteBright(`🎲 Rolling dice for game: ${gameId}`))

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

      const apiService = new ApiService()
      const response = await apiService.rollDice(gameId)

      if (!response.success) {
        throw new Error(response.error || 'Failed to roll dice')
      }

      const result: any = response.data

      console.log(chalk.greenBright('✅ Dice rolled!'))

      if (result.roll) {
        console.log(chalk.yellowBright(`🎲 Roll: [${result.roll.join(', ')}]`))
      }

      console.log(chalk.whiteBright(`🎯 New State: ${result.stateKind}`))
      console.log(chalk.whiteBright(`🎮 Active Color: ${result.activeColor}`))

      if (result.message) {
        console.log(chalk.cyanBright(`💬 ${result.message}`))
      }

      console.log(chalk.yellowBright('\n🎯 Next steps:'))
      if (result.stateKind === 'rolled') {
        console.log(
          chalk.whiteBright(
            `• Interactive play: nodots-backgammon game-play ${gameId}`
          )
        )
      }
      console.log(
        chalk.whiteBright(
          `• Check status: nodots-backgammon game-status ${gameId}`
        )
      )
    } catch (error: any) {
      if (error.message && error.message.includes('401')) {
        console.error(
          chalk.redBright(
            '❌ Authentication failed. Please run: nodots-backgammon login'
          )
        )
      } else if (error.message && error.message.includes('400')) {
        console.error(
          chalk.redBright(`❌ ${error.message || 'Invalid roll request'}`)
        )
      } else if (error.message && error.message.includes('404')) {
        console.error(chalk.redBright('❌ Game not found'))
      } else {
        console.error(
          chalk.redBright(`❌ Failed to roll dice: ${error.message}`)
        )
      }
    }
  }
}
