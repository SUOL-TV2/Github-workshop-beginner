# McSquishy Gameplay Decisions

Status: proposed for maintainer/stakeholder sign-off

This note resolves the open v1 gameplay questions identified in [issue #2](https://github.com/SUOL-TV2/Github-workshop-beginner/issues/2). It is intentionally limited to the first playable level and does not define later level designs.

## Decisions

### 1. Failure, attempts, and restart

V1 has no life counter and no permanent attempt limit. A hazard collision or fall outside the playable area transitions the game to **Game Over / Failure**. The player can immediately choose **Restart** (the restart key is the same input used by the game-state/UI implementation) to begin the level again.

Restarting resets transient level state and places McSquishy at the defined level-start position. It does not preserve progress because level 1 has no checkpoints. The game should not automatically restart without player input; the failure feedback and restart prompt must remain visible until the player restarts.

**Rationale and traceability:** Functional Requirements §4 permits either failing/losing a life and restarting from the beginning or a defined checkpoint; §6 requires restart after failure. A no-counter model keeps the short, accessible game focused on movement and timing, consistent with the description's emphasis on avoiding complex systems.

### 2. Level-1 checkpoints

Level 1 has **zero checkpoints**. Every restart returns McSquishy to the single level-start spawn. Checkpoints may be reconsidered when later levels or substantially longer stages are designed, but they are out of scope for this v1 decision.

**Rationale and traceability:** Functional Requirements §4 makes checkpoints optional by saying “from the beginning of the level or from a defined checkpoint.” The short-level focus in `src/DESCRIPTION.md` supports the simpler level-start restart and avoids introducing a progress system before it is needed.

### 3. Scoring, timer, and collectibles

V1 has **no score, countdown timer, time ranking, or collectibles**. Level completion is binary: the player either has reached the level goal or has not. The HUD should therefore show only information needed for play and the required game-state feedback; it should not reserve space for an unimplemented score or timer.

This is a deliberate deferral, not a prohibition on adding these systems later. Any future scoring or collection system should be specified separately rather than inferred by implementers.

**Rationale and traceability:** Neither `src/DESCRIPTION.md` nor Functional Requirements §§1–8 requires scoring, timing, or collectibles. The description explicitly prioritizes movement, timing, and platforming over complex systems; omitting these systems keeps v1 within that stated focus.

### 4. Level-1 hazards and their visual distinction

Level 1 may use these three hazard classes:

* **Spikes:** stationary pointed hazards attached to platforms or walls. They use a saturated red/orange warning color and a subtle repeating glint or pulse.
* **Pits:** gaps below the safe playable route. The gap is visually distinct from ordinary background space through a dark interior, contrasting rim, and warning edge treatment; falling below the level bounds is the failure trigger.
* **Moving enemies:** simple patrolling hazards with a visible repeated movement path. They use a contrasting warning color and a persistent motion cue (for example, a bob, wobble, or directional indicator) so they are not mistaken for solid scenery.

Ordinary obstacles such as platforms, walls, and non-damaging blocks remain solid collision geometry and use the normal environment palette. They must not use the hazard warning treatment, animated patrol cue, or damage effect. The level does not require any additional hazard type for v1.

**Rationale and traceability:** Functional Requirements §3 requires platforms, obstacles, and hazards, while §4 requires hazard contact and falling to cause failure. The concrete classes above satisfy those requirements and make the required distinction between navigational geometry and failure-triggering entities explicit. This detail extends the source requirements and is therefore a v1 design choice, not an existing requirement.

### 5. Visual feedback

Feedback is short, unmistakable, and consistent with the colourful, playful style:

* **Damage/failure:** On hazard contact or a fall, briefly flash the play area red/white, play a small burst of particles at McSquishy's last position, and freeze gameplay in the Game Over / Failure state. Show a clear `Game Over` / `Press Restart` banner until the player chooses to restart.
* **Goal reached:** Freeze normal gameplay, show a green/gold `Level Complete!` banner with a celebratory particle burst around the goal and McSquishy, and show a restart prompt. The completion state must remain visible until the player restarts.
* **Restart:** On restart input, show a brief blue/white screen-wipe or overlay labelled `Restarting`, reset McSquishy to the level-start spawn, and briefly blink the character after control resumes. This makes the reset visible without delaying play with a long animation.

The exact asset implementation is left to the UI/rendering work; the semantic cues, messages, and state timing above are the contract for v1. Feedback must be visible without relying on audio.

**Rationale and traceability:** Functional Requirements §5 requires completion to be communicated, §6 defines Game Over / failure and Level Completed states, and §7 requires visual feedback for failure, goal reached, and restart. The specified cues turn those requirements into implementable behavior while preserving the playful visual direction in `src/DESCRIPTION.md`.

## Dependent issue references

* [Issue #6: hazard contact, fall failure, and restart/checkpoint logic](https://github.com/SUOL-TV2/Github-workshop-beginner/issues/6) should implement no lives, zero level-1 checkpoints, and restart from the level-start spawn.
* [Issue #7: game state machine and level completion flow](https://github.com/SUOL-TV2/Github-workshop-beginner/issues/7) should use the Game Over / Failure and Level Completed states and binary completion described here.
* [Issue #9: start screen, instructions, and visual feedback](https://github.com/SUOL-TV2/Github-workshop-beginner/issues/9) should implement the three feedback treatments and messages described here.

These decisions are ready for maintainer/stakeholder review. Implementation issues should be considered unblocked once this proposal is signed off; any disagreement should be recorded on issue #2 and reflected here before implementation begins.
