const axios = require('axios')

async function debugPlayers() {
  try {
    const API_URL = process.env.NODOTS_API_URL || 'https://localhost:3443'
    const API_KEY = process.env.NODOTS_API_KEY
    const API_VERSION = process.env.NODOTS_API_VERSION || 'v3.2'
    const GAME_ID = '7647e8a1-840b-4e27-9a89-a6161a41abca'

    // Create auth config the same way our CLI does
    const path = require('path')
    const { AuthService } = require(path.join(
      __dirname,
      'dist',
      'services',
      'auth.js'
    ))

    const authService = new AuthService()
    const apiConfig = authService.getApiConfig()

    const headers = {}
    if (apiConfig.apiKey) {
      headers.Authorization = `Bearer ${apiConfig.apiKey}`
    }

    console.log('=== Current User ===')
    console.log('User ID:', apiConfig.userId)

    console.log('\n=== Game Data ===')
    const gameResponse = await axios.get(
      `${API_URL}/api/${API_VERSION}/games/${GAME_ID}`,
      {
        headers,
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false,
        }),
      }
    )

    const game = gameResponse.data
    console.log('Game ID:', game.id)
    console.log('State:', game.stateKind)

    console.log('\n=== Players ===')
    for (const player of game.players) {
      console.log(`\nPlayer ${player.id}:`)
      console.log('  Color:', player.color)
      console.log('  Direction:', player.direction)

      // Try to get user info for this player
      try {
        const userResponse = await axios.get(
          `${API_URL}/api/${API_VERSION}/users/${player.id}`,
          {
            headers,
            httpsAgent: new (require('https').Agent)({
              rejectUnauthorized: false,
            }),
          }
        )

        const user = userResponse.data
        console.log('  User Data:')
        console.log('    Email:', user.email)
        console.log('    UserType:', user.userType)
        console.log('    Is Current User:', user.id === apiConfig.userId)
      } catch (userError) {
        console.log(
          '  User lookup failed:',
          userError.response?.status || userError.message
        )
      }
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message)
  }
}

debugPlayers()
