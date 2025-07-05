const axios = require('axios')

async function testGameStatus() {
  try {
    const API_URL = process.env.NODOTS_API_URL || 'https://localhost:3443'
    const API_KEY = process.env.NODOTS_API_KEY
    const API_VERSION = process.env.NODOTS_API_VERSION || 'v3.2'
    const USER_ID = process.env.NODOTS_USER_ID
    const GAME_ID = '83cbafc2-fec5-447c-987b-03c17aed1304'

    console.log('Testing game status...')
    console.log('API URL:', API_URL)
    console.log('API Version:', API_VERSION)
    console.log('User ID:', USER_ID)
    console.log('Game ID:', GAME_ID)

    const headers = {}
    if (API_KEY) {
      headers.Authorization = `Bearer ${API_KEY}`
    }

    const response = await axios.get(
      `${API_URL}/api/${API_VERSION}/games/${GAME_ID}`,
      {
        headers,
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false,
        }),
      }
    )

    const game = response.data
    console.log('\n=== Game Data ===')
    console.log('ID:', game.id)
    console.log('State:', game.stateKind)
    console.log('Active Color:', game.activeColor)

    console.log('\n=== Players ===')
    game.players.forEach((player, index) => {
      console.log(`Player ${index + 1}:`)
      console.log('  ID:', player.id)
      console.log('  Color:', player.color)
      console.log('  Direction:', player.direction)
      console.log('  Email:', player.email)
      console.log('  UserType:', player.userType)
      console.log('  Is Active:', player.color === game.activeColor)
    })
  } catch (error) {
    console.error('Error:', error.response?.data || error.message)
  }
}

testGameStatus()
