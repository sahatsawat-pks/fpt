<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Context: FPT (Family Party Time) Game

This is a Thai-language party game app with 4 categories:
- 3 วินาที (3 Seconds): 25 questions, 1pt each, with multi-set mode
- ถาม-ตอบ (Q&A): Single question, 25pts, judge awards correct/incorrect
- จิ๊กซอว์ (Jigsaw): Puzzle image, 25pts, 5x5 grid with portrait/landscape/square modes
- คุณสมบัติ (Attribute): Single clue-based attribute guessing, 25pts

## Battle Mode (fully implemented)
- Per-player config data stored in `GAME_CONFIG.battle.player1` / `.player2`
- Config panel has 3 tabs: โหมดเดี่ยว / ผู้เล่น 1 (Battle) / ผู้เล่น 2 (Battle)
- Lock-judge flow for non-3sec games: Player 1 locks result → Player 2 plays → Judge phase with full game UI
- `handleBattleComplete(categoryKey, player, score)` - main callback from game components
- `finalizeBattleCategory(categoryKey, p1Score, p2Score)` - determines category winner
- End-game final result screen when all 4 categories completed

## Config Panel (page.js ~line 550-852)
- `configMode` state: "single" | "player1" | "player2"
- Per-player battle state: `battleP1*` / `battleP2*` variables for jigsaw, 3sec, QA, Attribute and `battleP1ThreeSecMode` / `battleP1JigsawMode` / `battleP2ThreeSecMode` / `battleP2JigsawMode`
- Save writes to both top-level and `GAME_CONFIG.battle.player1/2` (including `threeSecMode`, `jigsaw.mode`)
- Save writes to both top-level and `GAME_CONFIG.battle.player1/2`
- QA/Attribute config has per-player state (`battleP1QA`, `battleP2QA`, `battleP1Attribute`, `battleP2Attribute`) with default fallback to top-level GAME_CONFIG
- QA and Attribute sections in config panel show only in player1/player2 tabs (single mode shows a note to edit config.js directly)

## Build
- `npm run build` to verify
- No lint/typecheck commands beyond build
