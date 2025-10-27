import inquirer from 'inquirer'
import { HumanVsRobotCommand } from '../commands/human-vs-robot'
import { ApiService } from '../services/api'
import { AuthService } from '../services/auth'
import { BoardDisplay } from '../utils/board-display'

// Mock dependencies
jest.mock('../services/api')
jest.mock('../services/auth')
jest.mock('inquirer')

describe('Human vs Robot Game Integration Test', () => {
  let mockApiService: jest.Mocked<ApiService>
  let mockAuthService: jest.Mocked<AuthService>
  let mockInquirer: jest.Mocked<typeof inquirer>

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Mock AuthService
    mockAuthService = {
      getApiConfig: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: jest.fn(),
    } as any

    // Mock ApiService
    mockApiService = {
      getUsers: jest.fn(),
      createGame: jest.fn(),
      getGame: jest.fn(),
    } as any

    // Mock inquirer
    mockInquirer = inquirer as jest.Mocked<typeof inquirer>
  })

  it('should complete the full human vs robot game flow', async () => {
    // Step 1: Human logs in (mock authentication)
    mockAuthService.getApiConfig.mockReturnValue({
      apiKey: 'test-api-key',
      userId: 'human-user-id-123',
    })

    // Step 2: Mock available robots and users from API
    const mockUsers = [
      {
        id: 'human-user-id-123',
        name: 'Ken Riley',
        email: 'kenr@nodots.com',
        userType: 'human',
      },
      {
        id: 'robot-1',
        firstName: 'Beginner',
        lastName: 'Bot',
        email: 'beginner-bot@nodots.com',
        userType: 'robot',
      },
      {
        id: 'robot-2',
        firstName: 'Intermediate',
        lastName: 'Bot',
        email: 'intermediate-bot@nodots.com',
        userType: 'robot',
      },
      {
        id: 'robot-3',
        firstName: 'Advanced',
        lastName: 'Bot',
        email: 'advanced-bot@nodots.com',
        userType: 'robot',
      },
      {
        id: 'robot-4',
        firstName: 'GNU',
        lastName: 'Bot',
        email: 'gnu-bot@nodots.com',
        userType: 'robot',
      },
    ]

    mockApiService.getUsers.mockResolvedValue({
      success: true,
      data: mockUsers as any,
    })

    // Step 3: "Human" selects a random robot from the list
    const robots = mockUsers.filter((user) => user.userType === 'robot')
    const randomRobotIndex = Math.floor(Math.random() * robots.length)
    const selectedRobot = robots[randomRobotIndex]

    console.log(
      `Test: Randomly selected robot: ${selectedRobot.firstName} ${selectedRobot.lastName}`
    )

    mockInquirer.prompt.mockResolvedValue({
      selectedRobotId: selectedRobot.id,
    })

    // Step 4: Mock game creation response
    const mockGame: any = {
      id: 'test-game-id-456',
      stateKind: 'rolled-for-start',
      activeColor: 'white',
      players: [
        {
          userId: 'human-user-id-123',
          color: 'black',
          direction: 'clockwise',
          userType: 'human',
          email: 'kenr@nodots.com',
        },
        {
          userId: selectedRobot.id,
          color: 'white',
          direction: 'counterclockwise',
          userType: 'robot',
          email: selectedRobot.email,
        },
      ],
      board: {
        points: [
          // Standard backgammon starting position
          {
            position: { clockwise: 1 },
            checkers: [{ color: 'black' }, { color: 'black' }],
          },
          { position: { clockwise: 2 }, checkers: [] },
          { position: { clockwise: 3 }, checkers: [] },
          { position: { clockwise: 4 }, checkers: [] },
          { position: { clockwise: 5 }, checkers: [] },
          {
            position: { clockwise: 6 },
            checkers: [
              { color: 'white' },
              { color: 'white' },
              { color: 'white' },
              { color: 'white' },
              { color: 'white' },
            ],
          },
          { position: { clockwise: 7 }, checkers: [] },
          {
            position: { clockwise: 8 },
            checkers: [
              { color: 'white' },
              { color: 'white' },
              { color: 'white' },
            ],
          },
          { position: { clockwise: 9 }, checkers: [] },
          { position: { clockwise: 10 }, checkers: [] },
          { position: { clockwise: 11 }, checkers: [] },
          {
            position: { clockwise: 12 },
            checkers: [
              { color: 'black' },
              { color: 'black' },
              { color: 'black' },
              { color: 'black' },
              { color: 'black' },
            ],
          },
          {
            position: { clockwise: 13 },
            checkers: [
              { color: 'white' },
              { color: 'white' },
              { color: 'white' },
              { color: 'white' },
              { color: 'white' },
            ],
          },
          { position: { clockwise: 14 }, checkers: [] },
          { position: { clockwise: 15 }, checkers: [] },
          { position: { clockwise: 16 }, checkers: [] },
          {
            position: { clockwise: 17 },
            checkers: [
              { color: 'black' },
              { color: 'black' },
              { color: 'black' },
            ],
          },
          { position: { clockwise: 18 }, checkers: [] },
          {
            position: { clockwise: 19 },
            checkers: [
              { color: 'black' },
              { color: 'black' },
              { color: 'black' },
              { color: 'black' },
              { color: 'black' },
            ],
          },
          { position: { clockwise: 20 }, checkers: [] },
          { position: { clockwise: 21 }, checkers: [] },
          { position: { clockwise: 22 }, checkers: [] },
          { position: { clockwise: 23 }, checkers: [] },
          {
            position: { clockwise: 24 },
            checkers: [{ color: 'white' }, { color: 'white' }],
          },
        ],
        bar: {
          clockwise: { checkers: [] },
          counterclockwise: { checkers: [] },
        },
        off: {
          clockwise: { checkers: [] },
          counterclockwise: { checkers: [] },
        },
      },
    }

    mockApiService.createGame.mockResolvedValue({
      success: true,
      data: mockGame,
    })

    // Mock the constructor implementations
    ;(AuthService as jest.MockedClass<typeof AuthService>).mockImplementation(
      () => mockAuthService
    )
    ;(ApiService as jest.MockedClass<typeof ApiService>).mockImplementation(
      () => mockApiService
    )

    // Create command instance and execute
    const command = new HumanVsRobotCommand()

    // Capture console output
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    // Execute the command
    await (command as any).execute()

    // Verify the flow
    expect(mockAuthService.getApiConfig).toHaveBeenCalled()
    expect(mockApiService.getUsers).toHaveBeenCalled()
    expect(mockInquirer.prompt).toHaveBeenCalledWith([
      {
        type: 'list',
        name: 'selectedRobotId',
        message: 'Choose your robot opponent:',
        choices: expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('Beginner Bot'),
            value: 'robot-1',
          }),
          expect.objectContaining({
            name: expect.stringContaining('Intermediate Bot'),
            value: 'robot-2',
          }),
          expect.objectContaining({
            name: expect.stringContaining('Advanced Bot'),
            value: 'robot-3',
          }),
          expect.objectContaining({
            name: expect.stringContaining('GNU Bot'),
            value: 'robot-4',
          }),
        ]),
      },
    ])
    expect(mockApiService.createGame).toHaveBeenCalledWith(
      'human-user-id-123',
      selectedRobot.id
    )

    // Verify game creation success messages
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Game created successfully!')
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Game ID: test-game-id-456')
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('State: rolled-for-start')
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Active Color: white')
    )

    // Verify player display
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('👥 Players:')
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('👤 Human: BLACK (')
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('🤖 Robot: WHITE (')
    )

    // Verify next steps
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('🎯 Next steps:')
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('game-status test-game-id-456')
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('game-roll test-game-id-456')
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('game-play test-game-id-456')
    )

    // Step 5: Display ASCII board
    const boardDisplay = BoardDisplay.renderBoard(mockGame)
    expect(boardDisplay).toContain('24') // Board positions
    expect(boardDisplay).toContain('BAR') // Bar section
    expect(boardDisplay).toContain('Game ID') // Game info

    console.log('\n=== Test: ASCII Board Display ===')
    console.log(boardDisplay)
    console.log('=== End Board Display ===\n')

    // Cleanup
    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('should handle authentication failure', async () => {
    // Mock unauthenticated state
    mockAuthService.getApiConfig.mockReturnValue({
      apiKey: undefined,
      userId: undefined,
    })
    ;(AuthService as jest.MockedClass<typeof AuthService>).mockImplementation(
      () => mockAuthService
    )

    const command = new HumanVsRobotCommand()
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

    await (command as any).execute()

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Not authenticated')
    )
    expect(mockApiService.getUsers).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should handle no robots available', async () => {
    // Mock authenticated state
    mockAuthService.getApiConfig.mockReturnValue({
      apiKey: 'test-api-key',
      userId: 'human-user-id-123',
    })

    // Mock no robots available - only human users
    mockApiService.getUsers.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'human-user-id-123',
          name: 'Ken Riley',
          email: 'kenr@nodots.com',
          userType: 'human',
        },
      ] as any,
    })
    ;(AuthService as jest.MockedClass<typeof AuthService>).mockImplementation(
      () => mockAuthService
    )
    ;(ApiService as jest.MockedClass<typeof ApiService>).mockImplementation(
      () => mockApiService
    )

    const command = new HumanVsRobotCommand()
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    await (command as any).execute()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('No robot players available')
    )
    expect(mockInquirer.prompt).not.toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('should handle game creation failure', async () => {
    // Mock authenticated state
    mockAuthService.getApiConfig.mockReturnValue({
      apiKey: 'test-api-key',
      userId: 'human-user-id-123',
    })

    // Mock robots available
    mockApiService.getUsers.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'human-user-id-123',
          name: 'Ken Riley',
          email: 'kenr@nodots.com',
          userType: 'human',
        },
        {
          id: 'robot-1',
          firstName: 'Beginner',
          lastName: 'Bot',
          email: 'beginner-bot@nodots.com',
          userType: 'robot',
        },
      ] as any,
    })

    mockInquirer.prompt.mockResolvedValue({
      selectedRobotId: 'robot-1',
    })

    // Mock game creation failure
    mockApiService.createGame.mockResolvedValue({
      success: false,
      error: 'API Error: Cannot create game',
    })
    ;(AuthService as jest.MockedClass<typeof AuthService>).mockImplementation(
      () => mockAuthService
    )
    ;(ApiService as jest.MockedClass<typeof ApiService>).mockImplementation(
      () => mockApiService
    )

    const command = new HumanVsRobotCommand()
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    await (command as any).execute()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to create game: API Error: Cannot create game'
      )
    )

    consoleErrorSpy.mockRestore()
  })
})
