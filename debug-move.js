#!/usr/bin/env node

const axios = require('axios')
const https = require('https')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

async function debugMove() {
  const gameId = 'a33a7ecc-7a41-4dbe-828c-c0a6375e9ea0'
  const apiUrl = process.env.NODOTS_API_URL || 'https://localhost:3443'
  const apiVersion = process.env.NODOTS_API_VERSION || 'v3.2.1'

  console.log('🔍 Debug Move Command')
  console.log('====================')
  console.log(`Game ID: ${gameId}`)
  console.log(`API URL: ${apiUrl}`)
  console.log(`API Version: ${apiVersion}`)
  console.log('')

  // Get API key from auth service
  let apiKey
  try {
    const authDataPath = path.join(
      process.env.HOME || process.env.USERPROFILE,
      '.nodots-backgammon',
      'auth.json'
    )
    if (fs.existsSync(authDataPath)) {
      const authData = JSON.parse(fs.readFileSync(authDataPath, 'utf8'))
      apiKey = authData.token
      console.log(`API Key: ${apiKey ? 'Present' : 'Missing'}`)
    } else {
      console.log('❌ No auth data found. Please run: ndbg login')
      return
    }
  } catch (error) {
    console.log('❌ Error reading auth data:', error.message)
    return
  }

  console.log('')

  // Configure axios for self-signed certificates
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  })

  try {
    // Step 1: Get current game state
    console.log('📊 Step 1: Getting current game state...')
    const gameResponse = await axios.get(
      `${apiUrl}/api/${apiVersion}/games/${gameId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        httpsAgent,
      }
    )

    console.log('✅ Game state retrieved successfully')
    const game = gameResponse.data
    console.log(`Game state: ${game.stateKind}`)
    console.log(`Active color: ${game.activeColor}`)
    console.log('')

    // Step 2: Find checker at position 8
    console.log('🔍 Step 2: Looking for checker at position 8...')
    let checkerId = null

    if (game.board && game.board.points) {
      for (const point of game.board.points) {
        if (point.position?.clockwise === 8) {
          const checkers = point.checkers || []
          if (checkers.length > 0) {
            const lastChecker = checkers[checkers.length - 1]
            checkerId = lastChecker.id
            console.log(`✅ Found checker ID: ${checkerId}`)
            console.log(`Checker color: ${lastChecker.color}`)
            console.log(`Checkers at position 8: ${checkers.length}`)
            break
          }
        }
      }
    }

    if (!checkerId) {
      console.log('❌ No checker found at position 8')
      console.log('Available points:')
      if (game.board && game.board.points) {
        game.board.points.forEach((point) => {
          if (point.checkers && point.checkers.length > 0) {
            console.log(
              `  Position ${point.position?.clockwise}: ${point.checkers.length} checkers`
            )
          }
        })
      }
      return
    }

    console.log('')

    // Step 3: Make the move
    console.log('🎯 Step 3: Making move with checker ID...')
    const movePayload = { checkerId }
    console.log(`Request payload: ${JSON.stringify(movePayload, null, 2)}`)

    const moveResponse = await axios.post(
      `${apiUrl}/api/${apiVersion}/games/${gameId}/move`,
      movePayload,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        httpsAgent,
      }
    )

    console.log('✅ Move successful!')
    console.log('Response:', JSON.stringify(moveResponse.data, null, 2))
  } catch (error) {
    console.log('❌ Error occurred:')
    if (error.response) {
      console.log(`Status: ${error.response.status}`)
      console.log(`Error: ${JSON.stringify(error.response.data, null, 2)}`)
    } else {
      console.log(`Error: ${error.message}`)
    }
  }
}

debugMove()
