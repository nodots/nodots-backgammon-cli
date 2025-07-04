const axios = require('axios')

async function testGameCreation() {
  try {
    const response = await axios.post('http://localhost:3000/api/v1/games', {
      player1: { userId: 'f25eaccd-1b88-4606-a8a3-bd95d604ecfa' },
      player2: { userId: 'fca7b680-aa66-4255-bc35-a870a4b6bcd0' },
    })
    console.log('Success:', response.data)
    console.log('Game ID:', response.data.id)
  } catch (error) {
    console.log('Error:', error.response?.status, error.response?.data)
  }
}

testGameCreation()
