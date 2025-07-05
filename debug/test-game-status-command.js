const path = require('path')

async function testGameStatusCommand() {
  try {
    // Import the compiled GameStatusCommand
    const { GameStatusCommand } = require(path.join(
      __dirname,
      'dist',
      'commands',
      'game-status.js'
    ))

    const gameId = '73d9462b-3ba8-4ce2-a7c8-f70b83a82e8e'

    console.log('Testing GameStatusCommand...')
    console.log('Game ID:', gameId)

    // Create the command
    const command = new GameStatusCommand()

    // Override the process.argv to simulate command line arguments
    const originalArgv = process.argv
    process.argv = ['node', 'index.js', 'game-status', gameId]

    // Execute the command
    await command.parseAsync(['node', 'index.js', 'game-status', gameId])

    // Restore original argv
    process.argv = originalArgv
  } catch (error) {
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
  }
}

testGameStatusCommand()
