Training Data Collection (Supervised)

The `ndbg collect` command runs fast local simulations using the core game engine, labeling each move with GNU Backgammon via `@nodots-llc/gnubg-hints`, and writes streaming JSONL and CSV shards suitable for training.

Examples
- ndbg collect --games 100  # writes to packages/ai/training/NDBG-AI-YYYYMMDDhhmmss
- ndbg collect --games 1000 --out packages/ai/training  # creates a timestamped subfolder under training
- ndbg collect --games 1000 --out packages/ai/training/nightly --shard-size 200000

Outputs
- JSONL shards: shard-00001.jsonl, shard-00002.jsonl, ... (one row per move)
- CSV shards: shard-00001.csv, etc. (compact columns for quick inspection)
- manifest.json: lists shards and sample counts (updated incrementally)

Sample fields (per move)
- gameId, turnIdx, plyIdx, positionId
- gnuColor, activeColor, dice, legalMovesCount
- teacher: rank, equity, steps (die/from/to)
- features: points[24], bar, off, sideToMove, pip counts
- featureHash for simple dedup strategies
  - Dedup by featureHash is enabled by default in the collector

Notes
- Requires `@nodots-llc/gnubg-hints` to be installed and available on your platform.
- Collection runs without the API; it uses local core + AI packages for speed.
- Dedup by `featureHash` is enabled by default to reduce near-identical positions.
 - Output directory behavior:
   - If `--out` is omitted, the collector writes under `$NDBG_TRAINING_ROOT` or defaults to `packages/ai/training`. When the output equals the training root, a timestamped subfolder is created with the pattern `NDBG-AI-YYYYMMDDhhmmss`.
   - If `--out` is a specific directory path, data is written directly there.

Troubleshooting
- If you see an error about GNU hints being unavailable, install `@nodots-llc/gnubg-hints` and retry.
- If nothing is written, verify the `--out` directory is writable and that `--games` > 0.
- To inspect records, open the CSV shard or stream the JSONL with `head`/`jq`.
