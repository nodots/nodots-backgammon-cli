import chalk from 'chalk'
import { Command } from 'commander'
import inquirer from 'inquirer'
import { ApiService } from '../services/api'
import { AuthService } from '../services/auth'
import { logger } from '../utils/logger'

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

      logger.info('apiConfig', apiConfig)

      if (!apiConfig.apiKey) {
        console.log(
          chalk.redBright('❌ Not authenticated. Please run: ndbg login')
        )
        return
      }

      const apiService = new ApiService()

      // Get available robots
      const usersResponse = await apiService.getUsers()
      logger.info('usersResponse', usersResponse)
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

      const response = await apiService.createGame(
        apiConfig.userId!,
        selectedRobotId
      )

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

      // Use the already-fetched users list to identify human vs robot players
      for (const player of game.players) {
        const user = users.find((u: any) => u.id === player.userId) as any
        if (user) {
          const isHuman = user.userType === 'human'

          const icon = isHuman ? '👤' : '🤖'
          const type = isHuman ? 'Human' : 'Robot'
          console.log(
            `${icon} ${type}: ${player.color.toUpperCase()} (${
              player.direction
            })`
          )
        } else {
          // Fallback if user not found in the list
          console.log(
            `❓ Unknown: ${player.color.toUpperCase()} (${player.direction})`
          )
        }
      }

      console.log(chalk.yellowBright('\n🎯 Next steps:'))
      console.log(
        chalk.whiteBright(`• Check status: ndbg game-status ${game.id}`)
      )
      console.log(chalk.whiteBright(`• Roll dice: ndbg game-roll ${game.id}`))
      console.log(
        chalk.whiteBright(`• Interactive play: ndbg game-play ${game.id}`)
      )
    } catch (error: any) {
      console.error(chalk.redBright(`❌ Unexpected error: ${error.message}`))
    }
  }
}
