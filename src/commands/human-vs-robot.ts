import chalk from 'chalk'
import { Command } from 'commander'
import inquirer from 'inquirer'
import { ApiService } from '../services/api'
import { AuthService } from '../services/auth'

export class HumanVsRobotCommand extends Command {
  constructor() {
    super('human-vs-robot')
    this.description('Create a new human vs robot backgammon game').action(
      this.execute.bind(this)
    )
  }

  private async execute(): Promise<void> {
    try {
      console.log(chalk.whiteBright('🎮 Creating new human vs robot game...'))

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

      // Get available robots
      const usersResponse = await apiService.getUsers()
      if (!usersResponse.success) {
        console.error(
          chalk.redBright('❌ Failed to fetch robots:', usersResponse.error)
        )
        return
      }

      const users = usersResponse.data || []
      const robots = users.filter((user: any) => user.userType === 'robot')

      if (robots.length === 0) {
        console.error(chalk.redBright('❌ No robot players available'))
        return
      }

      // Let user choose which robot to play against
      const robotChoices = robots.map((robot: any) => ({
        name: `${robot.firstName} ${robot.lastName} (${robot.email})`,
        value: robot.id,
      }))

      const { selectedRobotId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedRobotId',
          message: 'Choose your robot opponent:',
          choices: robotChoices,
        },
      ])

      const response = await apiService.createHumanVsRobotGame(selectedRobotId)

      if (!response.success) {
        console.error(
          chalk.redBright(`❌ Failed to create game: ${response.error}`)
        )
        return
      }

      const game = response.data!

      console.log(chalk.greenBright('✅ Game created successfully!'))
      console.log(chalk.yellowBright(`🆔 Game ID: ${game.id}`))
      console.log(chalk.whiteBright(`🎲 State: ${game.stateKind}`))
      console.log(chalk.whiteBright(`🎯 Active Color: ${game.activeColor}`))

      console.log(chalk.cyanBright('\n👥 Players:'))

      game.players.forEach((player: any, index: number) => {
        // For human vs robot games, assume first player is human, second is robot
        // This matches the order we send in createHumanVsRobotGame (player1=human, player2=robot)
        const isHuman = index === 0

        const icon = isHuman ? '👤' : '🤖'
        const type = isHuman ? 'Human' : 'Robot'
        console.log(
          `${icon} ${type}: ${player.color.toUpperCase()} (${player.direction})`
        )
      })

      console.log(chalk.yellowBright('\n🎯 Next steps:'))
      console.log(
        chalk.whiteBright(
          `• Check status: nodots-backgammon game-status ${game.id}`
        )
      )
      console.log(
        chalk.whiteBright(`• Roll dice: nodots-backgammon game-roll ${game.id}`)
      )
      console.log(
        chalk.whiteBright(
          `• Interactive play: nodots-backgammon game-play ${game.id}`
        )
      )
    } catch (error: any) {
      console.error(chalk.redBright(`❌ Unexpected error: ${error.message}`))
    }
  }
}
