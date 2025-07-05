const path = require('path')

// Add the dist directory to the module path
const distPath = path.join(__dirname, 'dist')

try {
  // Import the compiled AuthService
  const { AuthService } = require(path.join(distPath, 'services/auth.js'))

  console.log('=== Auth Service Debug ===')

  const authService = new AuthService()
  console.log('AuthService created successfully')

  const config = authService.getApiConfig()
  console.log('API Config:', config)

  const isAuthenticated = authService.isAuthenticated()
  console.log('Is Authenticated:', isAuthenticated)
} catch (error) {
  console.error('Error:', error.message)
  console.log('\n=== Environment Variables ===')
  console.log('NODOTS_USER_ID:', process.env.NODOTS_USER_ID)
  console.log('NODOTS_API_KEY:', process.env.NODOTS_API_KEY ? 'SET' : 'NOT SET')
  console.log('NODOTS_API_URL:', process.env.NODOTS_API_URL)
}
