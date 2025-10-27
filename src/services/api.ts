import { BackgammonGame, BackgammonPlayer } from '@nodots-llc/backgammon-types'
import axios, { AxiosInstance } from 'axios'
import chalk from 'chalk'
import { ApiResponse, CliConfig } from '../types'
import { AuthService } from './auth'

export class ApiService {
  private client: AxiosInstance
  private config: CliConfig
  private authService: AuthService
  private apiVersion: string

  constructor(config?: Partial<CliConfig>) {
    this.authService = new AuthService()
    const authConfig = this.authService.getApiConfig()

    this.config = {
      apiUrl:
        config?.apiUrl ||
        process.env.NODOTS_API_URL ||
        'https://localhost:3443',
      userId: config?.userId || authConfig.userId,
      apiKey: config?.apiKey || authConfig.apiKey,
    }

    this.apiVersion = process.env.NODOTS_API_VERSION || 'v3.2'

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: 10000,
      ...this.getSSLConfig(),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add request interceptor for authentication
    this.client.interceptors.request.use((config: any) => {
      if (this.config.apiKey) {
        config.headers.Authorization = `Bearer ${this.config.apiKey}`
      }
      return config
    })
  }

  private getSSLConfig() {
    // Handle HTTPS with self-signed certificates in development
    if (this.config.apiUrl.startsWith('https://')) {
      try {
        const https = require('https')
        return {
          httpsAgent: new https.Agent({
            rejectUnauthorized: process.env.NODE_ENV === 'production',
          }),
        }
      } catch (error) {
        // If https module is not available, continue without SSL configuration
        console.warn(
          'Warning: HTTPS module not available, SSL configuration skipped'
        )
        return {}
      }
    }
    return {}
  }

  async createGame(
    player1Id: string,
    player2Id: string
  ): Promise<ApiResponse<BackgammonGame>> {
    try {
      const response = await this.client.post(`/api/${this.apiVersion}/games`, {
        player1: { userId: player1Id },
        player2: { userId: player2Id },
      })
      return { success: true, data: response.data }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async getGame(gameId: string): Promise<ApiResponse<BackgammonGame>> {
    try {
      const response = await this.client.get(
        `/api/${this.apiVersion}/games/${gameId}`
      )
      return { success: true, data: response.data }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async rollDice(gameId: string): Promise<ApiResponse<BackgammonGame>> {
    try {
      const response = await this.client.post(
        `/api/${this.apiVersion}/games/${gameId}/roll`
      )
      return { success: true, data: response.data }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async makeMove(
    gameId: string,
    from: number,
    to: number
  ): Promise<ApiResponse<BackgammonGame>> {
    try {
      const response = await this.client.post(
        `/api/${this.apiVersion}/games/${gameId}/move`,
        {
          from,
          to,
        }
      )
      return { success: true, data: response.data }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async makeMoveWithCheckerId(
    gameId: string,
    checkerId: string
  ): Promise<ApiResponse<BackgammonGame>> {
    try {
      console.log(chalk.blue(`Making move with checkerId: ${checkerId}`))
      console.log(chalk.blue(`Game ID: ${gameId}`))

      const payload = { checkerId }
      console.log(
        chalk.blue(`Request payload:`, JSON.stringify(payload, null, 2))
      )

      const response = await this.client.post(
        `/api/${this.apiVersion}/games/${gameId}/move`,
        payload
      )

      console.log(chalk.green(`Move successful!`))
      return { success: true, data: response.data }
    } catch (error) {
      console.log(chalk.red(`Move failed with error:`, error))
      return this.handleError(error)
    }
  }

  async getUsers(): Promise<ApiResponse<BackgammonPlayer[]>> {
    try {
      const response = await this.client.get(`/api/${this.apiVersion}/users`)
      return { success: true, data: response.data }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async createOrUpdateUser(userData: {
    source: string
    externalId: string
    email: string
    given_name: string
    family_name: string
    locale: string
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post(
        `/api/${this.apiVersion}/users`,
        userData
      )
      return { success: true, data: response.data }
    } catch (error) {
      return this.handleError(error)
    }
  }

  // Robot Simulation Methods
  async getRobots(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.client.get(`/api/${this.apiVersion}/robots`)
      return { success: true, data: response.data }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async startSimulation(config: {
    speed?: number
    robot1Difficulty?: string
    robot2Difficulty?: string
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post(
        `/api/${this.apiVersion}/robots/simulations`,
        {
          speed: 1000,
          robot1Difficulty: 'beginner',
          robot2Difficulty: 'beginner',
          ...config,
        }
      )
      return { success: true, data: response.data }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async getSimulationStatus(simulationId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get(
        `/api/${this.apiVersion}/robots/simulations/${simulationId}`
      )
      return { success: true, data: response.data }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async pauseSimulation(simulationId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post(
        `/api/${this.apiVersion}/robots/simulations/${simulationId}/pause`
      )
      return { success: true, data: response.data }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async stopSimulation(simulationId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.delete(
        `/api/${this.apiVersion}/robots/simulations/${simulationId}`
      )
      return { success: true, data: response.data }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async changeSimulationSpeed(
    simulationId: string,
    speed: number
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post(
        `/api/${this.apiVersion}/robots/simulations/${simulationId}/speed`,
        {
          speed,
        }
      )
      return { success: true, data: response.data }
    } catch (error) {
      return this.handleError(error)
    }
  }

  private handleError(error: any): ApiResponse<any> {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message,
      }
    }
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}
