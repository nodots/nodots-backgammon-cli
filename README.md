# @nodots-llc/backgammon-cli

Command-line interface for [Nodots Backgammon](https://backgammon.nodots.com). Play games, drive robot simulations, and inspect board state from your terminal.

> **Note:** This package is being migrated to `@nodots/backgammon-cli` as part of the 1.0 launch. Install the legacy package name for now; migration guidance will ship with the 1.0 release.

## Install

```sh
npm install -g @nodots-llc/backgammon-cli
```

The binary is `ndbg`:

```sh
ndbg --help
```

## Authentication

`ndbg login` opens a browser to authenticate via Auth0. Tokens are cached locally. Use `ndbg logout` to clear them.

```sh
ndbg login
ndbg logout
```

## Playing a game

Start a human-vs-robot game, then roll and move:

```sh
ndbg human-vs-robot
ndbg game-roll
ndbg move <from> <to>
ndbg game-status
```

Drive a game to completion against the default robot:

```sh
ndbg game-play
```

## Robot simulations

List available robots, run batch simulations, and inspect a robot's current game:

```sh
ndbg robot:list
ndbg robot:simulate --count 10
ndbg robot:batch --games 100
ndbg robot:status <gameId>
ndbg robot:board <gameId>
```

Control a running simulation:

```sh
ndbg robot:pause <gameId>
ndbg robot:stop <gameId>
ndbg robot:speed <gameId> <ms>
```

## Requirements

- Node.js >= 20
- Network access to the Nodots Backgammon API (`https://api.nodots.com`)

## License

MIT — see [LICENSE](./LICENSE).
