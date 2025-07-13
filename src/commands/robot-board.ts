import chalk from 'chalk'
import { Command } from 'commander'
import { ApiService } from '../services/api'
import { CliConfig } from '../types'

export class RobotBoardCommand extends Command {
  constructor() {
    super('robot-board')
    this.description('Display enhanced ASCII board for a robot simulation')
      .argument('<simulationId>', 'ID of the simulation to show board for')
      .option(
        '-g, --game-id <gameId>',
        'Use specific game ID instead of simulation ID'
      )
      .option('-r, --raw', 'Show raw API response instead of enhanced board')
      .action(this.execute.bind(this))
  }

  private async execute(simulationId: string, options: any): Promise<void> {
    try {
      const config: CliConfig = {
        apiUrl: process.env.NODOTS_API_URL || 'https://localhost:3443',
        userId: process.env.NODOTS_USER_ID,
        apiKey: process.env.NODOTS_API_KEY,
      }

      const apiService = new ApiService(config)
      let gameId = options.gameId

      // If no game ID provided, get it from the simulation
      if (!gameId) {
        console.log(chalk.blue(`Fetching simulation ${simulationId}...`))

        const simulationResponse = await apiService.getSimulationStatus(
          simulationId
        )
        if (!simulationResponse.success) {
          console.error(
            chalk.red(
              'Failed to get simulation status:',
              simulationResponse.error
            )
          )
          return
        }

        gameId = simulationResponse.data.gameId
        if (!gameId) {
          console.error(chalk.red('No game ID found in simulation data'))
          return
        }

        console.log(chalk.gray(`Found game ID: ${gameId}`))
      }

      // Fetch game data
      console.log(chalk.blue('Fetching game data...'))
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

      if (options.raw) {
        // Show raw API response
        console.log(chalk.yellow('\n=== Raw Game Data ==='))
        console.log(JSON.stringify(game, null, 2))
      } else {
        // Show board - ALWAYS use API's asciiBoard
        const gameAny = game as any
        if (gameAny.asciiBoard) {
          console.log(chalk.cyanBright('📋 Board:'))
          console.log(gameAny.asciiBoard)
        } else {
          console.log(chalk.redBright('⚠️  No ASCII board available from API'))
        }

        // Show additional robot simulation info
        this.showSimulationInfo(simulationId, apiService)
      }
    } catch (error) {
      console.error(chalk.red('Error displaying board:'), error)
    }
  }

  private async showSimulationInfo(
    simulationId: string,
    apiService: ApiService
  ): Promise<void> {
    try {
      const simulationResponse = await apiService.getSimulationStatus(
        simulationId
      )
      if (!simulationResponse.success) return

      const status = simulationResponse.data

      console.log(
        chalk.blue('┌─ SIMULATION INFO ') +
          chalk.blue('─'.repeat(50)) +
          chalk.blue('┐')
      )
      console.log(
        chalk.blue('│ ') +
          chalk.cyan(`Simulation ID: ${simulationId}`.padEnd(66)) +
          chalk.blue('│')
      )
      console.log(
        chalk.blue('│ ') +
          chalk.cyan(`Status: ${status.status || 'Unknown'}`.padEnd(66)) +
          chalk.blue('│')
      )

      if (status.currentTurn) {
        console.log(
          chalk.blue('│ ') +
            chalk.cyan(`Current Turn: ${status.currentTurn}`.padEnd(66)) +
            chalk.blue('│')
        )
      }

      if (status.totalMoves) {
        console.log(
          chalk.blue('│ ') +
            chalk.cyan(`Total Moves: ${status.totalMoves}`.padEnd(66)) +
            chalk.blue('│')
        )
      }

      if (status.speed) {
        console.log(
          chalk.blue('│ ') +
            chalk.cyan(`Speed: ${status.speed}ms between moves`.padEnd(66)) +
            chalk.blue('│')
        )
      }

      if (status.robot1Difficulty || status.robot2Difficulty) {
        const r1Diff = status.robot1Difficulty || 'Unknown'
        const r2Diff = status.robot2Difficulty || 'Unknown'
        console.log(
          chalk.blue('│ ') +
            chalk.yellow(`Difficulties: ${r1Diff} vs ${r2Diff}`.padEnd(66)) +
            chalk.blue('│')
        )
      }

      console.log(
        chalk.blue('└') + chalk.blue('─'.repeat(68)) + chalk.blue('┘')
      )

      // Show usage hints
      console.log(chalk.dim('\nCommands:'))
      console.log(chalk.dim(`  ndbg robot-status ${simulationId} --watch`))
      console.log(chalk.dim(`  ndbg robot-pause ${simulationId}`))
      console.log(chalk.dim(`  ndbg robot-speed ${simulationId} --interactive`))
    } catch (error) {
      // Silently ignore simulation info errors
    }
  }
}
