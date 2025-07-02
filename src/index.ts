#!/usr/bin/env node

import chalk from 'chalk'
import { Command } from 'commander'
import { version } from '../package.json'
// TODO: Create command classes and import them
// import { JoinCommand } from './commands/join'
// import { MoveCommand } from './commands/move'
// import { NewCommand } from './commands/new'
// import { PlayCommand } from './commands/play'
// import { RollCommand } from './commands/roll'
// import { StatusCommand } from './commands/status'

// Robot simulation commands
import { RobotBatchCommand } from './commands/robot-batch'
import { RobotBoardCommand } from './commands/robot-board'
import { RobotListCommand } from './commands/robot-list'
import { RobotPauseCommand } from './commands/robot-pause'
import { RobotSimulateCommand } from './commands/robot-simulate'
import { RobotSpeedCommand } from './commands/robot-speed'
import { RobotStatusCommand } from './commands/robot-status'
import { RobotStopCommand } from './commands/robot-stop'

const program = new Command()

program
  .name('nodots-backgammon')
  .description('Command-line interface for Nodots Backgammon')
  .version(version)

// Add commands
// program.addCommand(new NewCommand())
// program.addCommand(new JoinCommand())
// program.addCommand(new StatusCommand())
// program.addCommand(new MoveCommand())
// program.addCommand(new RollCommand())
// program.addCommand(new PlayCommand())

// Add robot simulation commands
program.addCommand(new RobotListCommand())
program.addCommand(new RobotSimulateCommand())
program.addCommand(new RobotStatusCommand())
program.addCommand(new RobotPauseCommand())
program.addCommand(new RobotStopCommand())
program.addCommand(new RobotSpeedCommand())
program.addCommand(new RobotBatchCommand())
program.addCommand(new RobotBoardCommand())

// Global error handler
program.exitOverride()

try {
  program.parse()
} catch (err) {
  if (err instanceof Error) {
    console.error(chalk.red('Error:'), err.message)
  } else {
    console.error(chalk.red('An unexpected error occurred'))
  }
  process.exit(1)
}
