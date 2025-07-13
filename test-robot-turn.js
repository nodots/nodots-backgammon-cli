#!/usr/bin/env node

const https = require('https')

// Disable SSL verification for localhost
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

const gameId = '40b9c2bb-ee99-4a8a-beee-2d858725110a'
const url = `https://localhost:3443/api/v3.2/games/${gameId}/robot-turn`

const postData = JSON.stringify({
  difficulty: 'intermediate',
})

const options = {
  hostname: 'localhost',
  port: 3443,
  path: `/api/v3.2/games/${gameId}/robot-turn`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
  rejectUnauthorized: false,
}

console.log('🤖 Triggering robot automation...')
console.log(`📡 URL: ${url}`)
console.log(`📦 Data: ${postData}`)

const req = https.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`)

  let data = ''
  res.on('data', (chunk) => {
    data += chunk
  })

  res.on('end', () => {
    console.log('📋 Response:')
    try {
      const parsed = JSON.parse(data)
      console.log(JSON.stringify(parsed, null, 2))
    } catch (e) {
      console.log(data)
    }
  })
})

req.on('error', (e) => {
  console.error(`❌ Error: ${e.message}`)
})

req.write(postData)
req.end()
