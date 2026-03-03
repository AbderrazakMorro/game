// ─────────────────────────────────────────────
// Cookie Utilities — Session Persistence
// ─────────────────────────────────────────────
// Data schema: { userId: string, roomId: string, lastJoined: ISO8601 }
// Attributes:  Secure; SameSite=Lax; Max-Age=86400 (24 h)
// ─────────────────────────────────────────────

const COOKIE_NAME = 'mafia_session'
const MAX_AGE = 86400 // 24 hours in seconds

/**
 * Sanitize a room ID before storing it.
 * Allows only alphanumeric characters, hyphens, and underscores
 * (covers UUID format and any short codes used in this app).
 * @param {string} id
 * @returns {string}
 */
export function sanitizeRoomId(id) {
    if (typeof id !== 'string') return ''
    return id.replace(/[^a-zA-Z0-9\-_]/g, '')
}

/**
 * Sanitize a user ID before storing it.
 * @param {string} id
 * @returns {string}
 */
function sanitizeUserId(id) {
    if (typeof id !== 'string') return ''
    return id.replace(/[^a-zA-Z0-9\-_]/g, '')
}

/**
 * Write the session cookie.
 * Only call this AFTER the user has granted cookie consent.
 * @param {{ playerId: string, roomCode: string, lastJoined?: string }} data
 */
export function setSessionCookie({ playerId, roomCode, lastJoined }) {
    if (typeof document === 'undefined') return // SSR guard

    const payload = JSON.stringify({
        playerId: sanitizeUserId(playerId), // using same sanitizer
        roomCode: sanitizeRoomId(roomCode), // using same sanitizer
        lastJoined: lastJoined ?? new Date().toISOString(),
    })

    // Base64-encode to avoid JSON special characters conflicting with cookie syntax
    const encoded = btoa(payload)

    // Avoid 'Secure' flag on localhost (it would silently fail over plain http)
    const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'

    const secureFlag = isLocalhost ? '' : '; Secure'

    document.cookie = [
        `${COOKIE_NAME}=${encoded}`,
        `Max-Age=${MAX_AGE}`,
        'SameSite=Lax',
        'Path=/',
        secureFlag,
    ]
        .filter(Boolean)
        .join('; ')
}

/**
 * Read and parse the session cookie.
 * @returns {{ playerId: string, roomCode: string, lastJoined: string } | null}
 */
export function getSessionCookie() {
    if (typeof document === 'undefined') return null // SSR guard

    const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${COOKIE_NAME}=`))

    if (!match) return null

    try {
        const encoded = match.split('=').slice(1).join('=')
        const decoded = atob(encoded)
        const parsed = JSON.parse(decoded)

        // Validate shape
        if (
            typeof parsed.playerId === 'string' &&
            typeof parsed.roomCode === 'string' &&
            typeof parsed.lastJoined === 'string'
        ) {
            return {
                playerId: sanitizeUserId(parsed.playerId),
                roomCode: sanitizeRoomId(parsed.roomCode),
                lastJoined: parsed.lastJoined,
            }
        }
        return null
    } catch {
        // Malformed cookie — treat as no session
        return null
    }
}


/**
 * Delete the session cookie immediately (Max-Age=0).
 */
export function clearSessionCookie() {
    if (typeof document === 'undefined') return // SSR guard
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`
}

/**
 * Check whether the user has granted cookie consent.
 * Reads from localStorage so the preference itself is not a cookie.
 * @returns {'granted' | 'denied' | null}
 */
export function getCookieConsent() {
    if (typeof localStorage === 'undefined') return null
    const val = localStorage.getItem('cookieConsent')
    if (val === 'granted' || val === 'denied') return val
    return null
}

/**
 * Persist cookie consent decision to localStorage.
 * @param {'granted' | 'denied'} decision
 */
export function setCookieConsent(decision) {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem('cookieConsent', decision)
}
