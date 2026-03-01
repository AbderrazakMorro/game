/**
 * Mafia Game Logic — v2
 *
 * Role distribution rules:
 *  - Doctor   : always 1
 *  - Detective : 1 if players >= 4, optional at 3 (included if present)
 *  - Mafia    : floor(N / 3), minimum 1
 *  - Villager : remainder
 *
 * Minimum: 3 players (1 Mafia + 1 Doctor + 1 Villager — no detective)
 *           4+ players always get a detective
 */

/**
 * Distribute roles randomly among players.
 * @param {Array} players - [{id, username, ...}]
 * @returns {Array} - players with role, is_alive, is_protected
 */
export function distributeRoles(players) {
    if (!players || players.length < 3) {
        throw new Error('Il faut au minimum 3 joueurs pour lancer une partie.')
    }

    const N = players.length
    const mafiaCount = Math.max(1, Math.floor(N / 3))
    const hasDetective = N >= 4

    // Validate: non-mafia must outnumber mafia
    if ((N - mafiaCount) <= mafiaCount) {
        throw new Error(`Configuration invalide : ${mafiaCount} mafia contre ${N - mafiaCount} non-mafia.`)
    }

    // Build role pool
    const specialRoles = ['doctor']
    if (hasDetective) specialRoles.push('detective')

    const villagerCount = N - mafiaCount - specialRoles.length
    const roles = [
        ...specialRoles,
        ...Array(mafiaCount).fill('mafia'),
        ...Array(Math.max(0, villagerCount)).fill('villager'),
    ]

    // Fisher-Yates shuffle on players
    const shuffled = [...players]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    // Fisher-Yates shuffle on roles
    for (let i = roles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[roles[i], roles[j]] = [roles[j], roles[i]]
    }

    return shuffled.map((player, index) => ({
        ...player,
        role: roles[index],
        is_alive: true,
        is_protected: false,
        is_ready: false,
    }))
}

/**
 * Get the expected mafia count for N players.
 * @param {number} n
 * @returns {number}
 */
export function getMafiaCount(n) {
    return Math.max(1, Math.floor(n / 3))
}

/**
 * Check win conditions.
 * @param {Array} players - all players
 * @returns {'mafia' | 'village' | null}
 */
export function checkWinCondition(players) {
    const alive = players.filter(p => p.is_alive)
    const aliveMafia = alive.filter(p => p.role === 'mafia')
    const aliveVillage = alive.filter(p => p.role !== 'mafia')

    if (aliveMafia.length === 0) return 'village'
    if (aliveMafia.length >= aliveVillage.length) return 'mafia'
    return null
}

/**
 * Resolve all night actions.
 * Order: Doctor protection → Mafia kill resolution → Detective check
 *
 * @param {Array} actions - actions for this phase: [{action_type, actor_id, target_id}]
 * @param {Array} players - all players (with roles)
 * @returns {{
 *   eliminatedId: string|null,    // player eliminated tonight
 *   savedId: string|null,         // player doctor saved (if kill was blocked)
 *   detectiveResult: boolean|null, // true=mafia, false=not mafia. null if no detective
 *   detectiveTargetId: string|null
 * }}
 */
export function resolveNightActions(actions, players) {
    const killAction = actions.find(a => a.action_type === 'kill')
    const saveAction = actions.find(a => a.action_type === 'save')
    const checkAction = actions.find(a => a.action_type === 'check')

    const mafiaTargetId = killAction?.target_id || null
    const doctorTargetId = saveAction?.target_id || null
    const detectiveTargetId = checkAction?.target_id || null

    // Doctor saves if their target matches mafia's target
    const wasProtected = mafiaTargetId && doctorTargetId && mafiaTargetId === doctorTargetId

    let eliminatedId = null
    let savedId = null

    if (mafiaTargetId) {
        if (wasProtected) {
            savedId = doctorTargetId
        } else {
            eliminatedId = mafiaTargetId
        }
    }

    // Detective result
    let detectiveResult = null
    if (detectiveTargetId) {
        const target = players.find(p => p.id === detectiveTargetId)
        detectiveResult = target ? target.role === 'mafia' : false
    }

    return {
        eliminatedId,
        savedId,
        detectiveResult,
        detectiveTargetId,
    }
}

/**
 * Tally votes and find who should be eliminated.
 * The player with the MOST votes is eliminated.
 * Ties result in no elimination (null).
 *
 * @param {Array} votes - actions with action_type='vote': [{target_id}]
 * @returns {string|null} - id of eliminated player, or null if tie
 */
export function tallyVotes(votes) {
    if (!votes || votes.length === 0) return null

    const counts = {}
    for (const v of votes) {
        counts[v.target_id] = (counts[v.target_id] || 0) + 1
    }

    let maxVotes = 0
    let winner = null
    let tied = false

    for (const [id, count] of Object.entries(counts)) {
        if (count > maxVotes) {
            maxVotes = count
            winner = id
            tied = false
        } else if (count === maxVotes) {
            tied = true
        }
    }

    return tied ? null : winner
}

/**
 * Determine the next phase after the current one.
 * Returns null if the game should check for win condition.
 *
 * @param {string} currentPhase
 * @param {Array} players - alive players (to check if detective exists)
 * @returns {string}
 */
export function getNextPhase(currentPhase, players) {
    const aliveDetective = players.find(p => p.is_alive && p.role === 'detective')

    switch (currentPhase) {
        case 'roles': return 'night_mafia'
        case 'night_mafia': return 'night_doctor'
        case 'night_doctor': return aliveDetective ? 'night_detective' : 'day_discussion'
        case 'night_detective': return 'day_discussion'
        case 'day_discussion': return 'day_vote'
        case 'day_vote': return 'night_mafia'
        default: return 'lobby'
    }
}
