# Technical Debug Information - Roll Dice API Issue

## 🚨 **Critical Error Details**

### HTTP Request That Fails:

```
POST https://localhost:3443/api/v3.2/games/{gameId}/roll
Authorization: Bearer {valid-token}
Content-Type: application/json
Body: {}
```

### Error Response:

```json
HTTP/1.1 500 Internal Server Error
{
  "error": "Failed to roll dice"
}
```

## 🔍 **Specific Test Game Data**

### Game 1:

- **ID**: `22057081-a09d-4115-9388-2c5e8ccf6ae5`
- **State**: `rolled-for-start`
- **Active Color**: `black`
- **Players**:
  - Player 1: Human (BLACK, clockwise)
  - Player 2: Robot (WHITE, counterclockwise)

### Game 2:

- **ID**: `d0626ae7-769e-4bb5-92f2-e10181f739fe`
- **State**: `rolled-for-start`
- **Active Color**: `white`
- **Players**:
  - Player 1: Human (BLACK, clockwise)
  - Player 2: Robot (WHITE, counterclockwise)

## 🧪 **Working API Calls (for comparison)**

### Game Creation (WORKING):

```bash
curl -k -X POST https://localhost:3443/api/v3.2/games \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"player1": {"userId": "{human-id}"}, "player2": {"userId": "{robot-id}"}}'
```

### Game Status (WORKING):

```bash
curl -k -X GET https://localhost:3443/api/v3.2/games/22057081-a09d-4115-9388-2c5e8ccf6ae5 \
  -H "Authorization: Bearer {token}"
```

### Roll Dice (FAILING):

```bash
curl -k -X POST https://localhost:3443/api/v3.2/games/22057081-a09d-4115-9388-2c5e8ccf6ae5/roll \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 🔧 **CLI Code Analysis**

### Working API Service Method:

```typescript
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
```

### Current API Configuration:

```typescript
this.config = {
  apiUrl: 'https://localhost:3443',
  userId: authConfig.userId,
  apiKey: authConfig.apiKey,
}
this.apiVersion = 'v3.2'
```

## 🕵️ **Debugging Steps for API Team**

### 1. Server Log Analysis

- Check server logs when POST `/api/v3.2/games/{gameId}/roll` is called
- Look for stack traces or detailed error messages
- Verify authentication and authorization are working

### 2. Game State Validation

- Ensure games in `rolled-for-start` state can accept roll dice requests
- Check if the issue is specific to human vs robot games
- Verify game state machine logic

### 3. Database Investigation

- Check if game records exist in database
- Verify player associations are correct
- Look for any database constraints or foreign key issues

### 4. Robot Player Handling

- Ensure the API can handle games with robot players
- Check if robot user IDs are properly recognized
- Verify robot player permissions

## 📋 **Expected API Response Format**

### Successful Roll Response Should Include:

```json
{
  "id": "22057081-a09d-4115-9388-2c5e8ccf6ae5",
  "stateKind": "rolled",
  "activeColor": "black",
  "players": [
    {
      "color": "black",
      "direction": "clockwise"
    },
    {
      "color": "white",
      "direction": "counterclockwise"
    }
  ],
  "lastRoll": [3, 5],
  "lastMove": null,
  "ascii": "board representation"
}
```

## 🎯 **Immediate Action Items**

### Priority 1: Server-Side Investigation

1. Enable detailed error logging for roll dice endpoint
2. Check server logs for the specific error when rolling dice
3. Verify game state validation logic
4. Test with a simple robot vs robot game to isolate the issue

### Priority 2: State Machine Validation

1. Ensure `rolled-for-start` state allows dice rolling
2. Verify state transitions are properly implemented
3. Check if the issue is specific to the initial roll

### Priority 3: Database Integrity

1. Verify game records are complete and valid
2. Check player associations and user types
3. Ensure no foreign key constraints are violated

## 🔄 **Quick Testing Commands**

### Test Roll Dice API:

```bash
# Test with first game
curl -k -X POST https://localhost:3443/api/v3.2/games/22057081-a09d-4115-9388-2c5e8ccf6ae5/roll \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{}'

# Test with second game
curl -k -X POST https://localhost:3443/api/v3.2/games/d0626ae7-769e-4bb5-92f2-e10181f739fe/roll \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Verify Game State:

```bash
# Check game state before roll attempt
curl -k -X GET https://localhost:3443/api/v3.2/games/22057081-a09d-4115-9388-2c5e8ccf6ae5 \
  -H "Authorization: Bearer {token}"
```

---

**Note**: Both test games are live and available for debugging. The CLI is fully functional and ready to test once the API issue is resolved.
