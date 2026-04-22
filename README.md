# @nodots/backgammon-cli

Terminal client for [Nodots Backgammon](https://backgammon.nodots.com). Log in, play a game, and drive robot simulations from your shell.

## Install

```sh
npm install -g @nodots/backgammon-cli
```

The binary is `ndbg`:

```sh
ndbg --help
```

## Authentication

`ndbg login` opens a browser to authenticate via Auth0. Tokens are cached locally.

```sh
ndbg login
ndbg logout
```

## Play a game

Start a human-vs-robot game, then roll and move:

```sh
ndbg human-vs-robot
ndbg game-roll
ndbg move <from> <to>
ndbg game-status
```

Drive a game turn-by-turn against the default robot:

```sh
ndbg game-play
```

## Robot simulations

```sh
ndbg robot-list                      # show available robot configs
ndbg robot-simulate --count 10       # run one robot on N games
ndbg robot-batch --games 100         # batch simulation
ndbg robot-status <gameId>           # inspect a running robot's game
ndbg robot-board <gameId>            # render the current board
```

Control a running simulation:

```sh
ndbg robot-pause <gameId>
ndbg robot-stop  <gameId>
ndbg robot-speed <gameId> <ms>
```

Robot-vs-robot end-to-end:

```sh
ndbg robot-vs-robot
```

## Requirements

- Node.js >= 20
- Network access to the Nodots Backgammon API (`https://api.nodots.com`)

## Ecosystem

| Package | Role |
| --- | --- |
| [`@nodots/backgammon-types`](https://www.npmjs.com/package/@nodots/backgammon-types) | Discriminated-union type contracts. |
| [`@nodots/backgammon-core`](https://www.npmjs.com/package/@nodots/backgammon-core) | Game logic. |
| [`@nodots/backgammon-ai`](https://www.npmjs.com/package/@nodots/backgammon-ai) | GNU-backed robot move selection. |
| [`@nodots/backgammon-api-utils`](https://www.npmjs.com/package/@nodots/backgammon-api-utils) | Request, response, and WebSocket contracts. |
| [`@nodots/backgammon-cli`](https://www.npmjs.com/package/@nodots/backgammon-cli) | Terminal client (this package). |
| [`@nodots/gnubg-hints`](https://www.npmjs.com/package/@nodots/gnubg-hints) | Native GNU Backgammon hints addon. |

Hosted product: [backgammon.nodots.com](https://backgammon.nodots.com).

## License

GPL-3.0. See [`LICENSE`](./LICENSE).
