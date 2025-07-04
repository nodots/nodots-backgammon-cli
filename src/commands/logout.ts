import chalk from 'chalk'
import { Command } from 'commander'
import { AuthService } from '../services/auth'

export class LogoutCommand extends Command {
  constructor() {
    super('logout')
    this.description('Logout from Nodots Backgammon')
    this.action(this.execute.bind(this))
  }

  private async execute(): Promise<void> {
    try {
      const authService = new AuthService()

      if (!authService.isLoggedIn()) {
        console.log(chalk.yellowBright('You are not currently logged in.'))
        return
      }

      const currentUser = authService.getCurrentUser()
      authService.logout()

      console.log(chalk.greenBright('✅ Successfully logged out'))
      if (currentUser?.email) {
        console.log(chalk.whiteBright(`Goodbye, ${currentUser.email}!`))
      }
    } catch (error) {
      console.error(
        chalk.redBright('Error during logout:'),
        error instanceof Error ? error.message : error
      )
    }
  }
}
