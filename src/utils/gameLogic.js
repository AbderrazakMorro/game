/**
 * Distribution des rôles pour le jeu Mafia.
 *
 * Règles FIXES :
 *  - 1 Docteur   : exactement 1, toujours présent
 *  - 1 Détective : exactement 1, toujours présent
 *  - Mafia       : floor(N / 3), minimum 1
 *                  → Garantit que (village + docteur + détective) > mafia
 *  - Villageois  : le reste
 *
 * Exemples :
 *  4 joueurs  → 1 Mafia, 1 Docteur, 1 Détective, 1 Villageois  (village=3 > mafia=1 ✓)
 *  5 joueurs  → 1 Mafia, 1 Docteur, 1 Détective, 2 Villageois  (village=4 > mafia=1 ✓)
 *  6 joueurs  → 2 Mafia, 1 Docteur, 1 Détective, 2 Villageois  (village=4 > mafia=2 ✓)
 *  9 joueurs  → 3 Mafia, 1 Docteur, 1 Détective, 4 Villageois  (village=6 > mafia=3 ✓)
 *
 * Minimum requis : 4 joueurs.
 *
 * @param {Array} players - Liste des joueurs [{id, username, ...}]
 * @returns {Array} - Joueurs avec role, is_alive, is_protected assignés
 */
export function distributeRoles(players) {
    if (!players || players.length < 4) {
        throw new Error(
            'Il faut au moins 4 joueurs pour lancer une partie (1 Mafia + 1 Docteur + 1 Détective + 1 Villageois minimum).'
        )
    }

    const N = players.length
    const mafiaCount = Math.max(1, Math.floor(N / 3))

    // Vérification de sécurité : le village doit toujours être majoritaire
    if (N - mafiaCount <= mafiaCount) {
        throw new Error(`Configuration invalide : ${mafiaCount} mafia contre ${N - mafiaCount} villageois.`)
    }

    // Construction de la liste des rôles
    const roles = [
        'doctor',     // exactement 1
        'detective',  // exactement 1
        ...Array(mafiaCount).fill('mafia'),               // 1 à N/3
        ...Array(N - 2 - mafiaCount).fill('villager'),    // le reste
    ]

    // Mélange aléatoire (Fisher-Yates)
    const shuffled = [...players]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // On mélange aussi les rôles pour éviter que docteur soit toujours au premier index
    for (let i = roles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[roles[i], roles[j]] = [roles[j], roles[i]]
    }

    return shuffled.map((player, index) => ({
        ...player,
        role: roles[index],
        is_alive: true,
        is_protected: false,
    }))
}

/**
 * Calcule le nombre de mafia prévu pour N joueurs.
 * Utile pour afficher l'info dans le lobby.
 * @param {number} n - Nombre de joueurs
 * @returns {number}
 */
export function getMafiaCount(n) {
    return Math.max(1, Math.floor(n / 3))
}

/**
 * Vérifie les conditions de victoire.
 * @param {Array} players - Tous les joueurs
 * @returns {'mafia'|'village'|null}
 */
export function checkWinCondition(players) {
    const alive = players.filter(p => p.is_alive)
    const aliveMafia = alive.filter(p => p.role === 'mafia')
    const aliveVillage = alive.filter(p => p.role !== 'mafia')

    if (aliveMafia.length === 0) return 'village'
    if (aliveMafia.length >= aliveVillage.length) return 'mafia'
    return null
}
