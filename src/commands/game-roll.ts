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
        console.log(chalk.redBright('❌ Not authenticated. Please run: nodots-backgammon login'))
        return
      }

      const apiService = new ApiService()
      const response = await apiService.rollDice(gameId)

      if (!response.success) {
        console.error(chalk.redBright(`❌ Failed to roll dice: ${response.error}`))
        return
      }

      const result = response.data!
      const resultAny = result as any // Type assertion for accessing optional properties

      console.log(chalk.greenBright('✅ Dice rolled!'))
      
      if (resultAny.lastRoll) {
        console.log(chalk.yellowBright(`🎲 Roll: [${resultAny.lastRoll.join(', ')}]`))
      }
      
      console.log(chalk.whiteBright(`🎯 New State: ${result.stateKind}`))
      console.log(chalk.whiteBright(`🎮 Active Color: ${result.activeColor}`))
      
      if (resultAny.message) {
        console.log(chalk.cyanBright(`💬 ${resultAny.message}`))
      }

      console.log(chalk.yellowBright('\n🎯 Next steps:'))
      if (result.stateKind === 'rolled') {
        console.log(chalk.whiteBright(`• Interactive play: nodots-backgammon game-play ${gameId}`))
      }
      console.log(chalk.whiteBright(`• Check status: nodots-backgammon game-status ${gameId}`))

    } catch (error: any) {
      console.error(chalk.redBright(`❌ Unexpected error: ${error.message}`))
    }
  }
}