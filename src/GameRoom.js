'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { distributeRoles } from '../utils/gameLogic'

// ==========================================
// COMPOSANT 1 : AvatarSelector (Lobby)
// ==========================================
const AvatarSelector = ({ onJoin, players = [], isHost, onStart }) => {
    const [username, setUsername] = useState('')

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-200 p-4 font-sans">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 bg-slate-900 rounded-xl shadow-[0_0_40px_rgba(220,38,38,0.1)] border border-red-900/30 max-w-md w-full"
            >
                <h1 className="text-4xl font-serif text-red-600 mb-2 text-center tracking-widest uppercase">Mafia</h1>
                <p className="text-center text-slate-500 mb-8 italic text-sm">La nuit tombe sur la ville...</p>

                {!onJoin ? (
                    <div className="space-y-4">
                        <h3 className="text-xl text-slate-300 border-b border-slate-800 pb-2 mb-4">Joueurs présents ({players.length})</h3>
                        <ul className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            <AnimatePresence>
                                {players.map((p, i) => (
                                    <motion.li
                                        key={p.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center"
                                    >
                                        <span>{p.username}</span>
                                        {i === 0 && <span className="text-red-800 text-xs uppercase tracking-wider font-bold">Hôte</span>}
                                    </motion.li>
                                ))}
                            </AnimatePresence>
                            {players.length === 0 && <li className="text-slate-600 text-sm italic">En attente de joueurs...</li>}
                        </ul>

                        {isHost && players.length >= 3 ? (
                            <button
                                onClick={onStart}
                                className="w-full bg-red-700 hover:bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)] text-white font-bold py-3 rounded-lg transition-all"
                            >
                                Démarrer la partie
                            </button>
                        ) : isHost ? (
                            <p className="text-red-500 text-xs text-center mt-4">3 joueurs minimum requis pour commencer.</p>
                        ) : (
                            <p className="text-slate-400 text-sm text-center mt-4 animate-pulse">En attente du lancement par l'hôte...</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wide">Votre Pseudo</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                maxLength={15}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors placeholder:text-slate-700"
                                placeholder="Ex : Le Corbeau"
                            />
                        </div>
                        <button
                            onClick={() => username.trim() && onJoin(username.trim())}
                            disabled={!username.trim()}
                            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-red-600 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-700"
                        >
                            Rejoindre la salle
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    )
}

// ==========================================
// COMPOSANT 2 : RoleReveal
// ==========================================
const RoleReveal = ({ role, onAcknowledge }) => {
    const [flipped, setFlipped] = useState(false)

    const getRoleDetails = () => {
        switch (role) {
            case 'mafia': return { name: 'Mafia', color: 'text-red-600', desc: 'Éliminez les villageois chaque nuit sans être démasqué. Gardez votre identité secrète la journée.' }
            case 'doctor': return { name: 'Docteur', color: 'text-emerald-500', desc: 'Sauvez un citoyen par nuit. Vous pouvez vous protéger vous-même.' }
            case 'detective': return { name: 'Détective', color: 'text-blue-500', desc: 'Enquêtez sur un joueur chaque nuit pour découvrir s\'il est loyal ou de la Mafia.' }
            default: return { name: 'Villageois', color: 'text-slate-300', desc: 'Trouvez et éliminez la Mafia pendant la journée. Sur-vivez aux nuits.' }
        }
    }

    const { name, color, desc } = getRoleDetails()

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4" style={{ perspective: 1000 }}>
            <h2 className="text-2xl text-slate-400 mb-8 font-serif uppercase tracking-widest">Identité Secrète</h2>

            <div className="relative w-64 h-96 cursor-pointer" onClick={() => setFlipped(true)}>
                <motion.div
                    className="w-full h-full absolute"
                    initial={false}
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.8, type: "spring", stiffness: 200, damping: 20 }}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Card Back (Hidden) */}
                    <div className="absolute w-full h-full bg-slate-900 rounded-xl border-2 border-slate-800 flex items-center justify-center shadow-2xl" style={{ backfaceVisibility: 'hidden' }}>
                        <span className="text-6xl text-slate-700">?</span>
                        <p className="absolute bottom-6 text-slate-600 text-sm font-serif">Cliquez pour révéler</p>
                    </div>

                    {/* Card Front (Revealed) */}
                    <div className="absolute w-full h-full bg-slate-900 rounded-xl border-2 border-slate-800 flex flex-col items-center justify-center p-6 text-center shadow-[0_0_30px_rgba(0,0,0,0.5)]" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                        <div className={`text-4xl mb-6 ${color}`}>
                            {role === 'mafia' ? '🔪' : role === 'doctor' ? '💉' : role === 'detective' ? '🕵️' : '🧑‍🌾'}
                        </div>
                        <h3 className={`text-3xl font-serif font-bold mb-4 uppercase ${color}`}>{name}</h3>
                        <div className="w-12 h-px bg-slate-700 mb-4"></div>
                        <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                    </div>
                </motion.div>
            </div>

            <AnimatePresence>
                {flipped && (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.5 }}
                        onClick={onAcknowledge}
                        className="mt-12 bg-transparent hover:bg-slate-900 text-white px-10 py-3 rounded-full border border-slate-700 transition-colors uppercase tracking-widest text-sm"
                    >
                        Je suis prêt
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    )
}

// ==========================================
// COMPOSANT 3 : NightOverlay
// ==========================================
const NightOverlay = ({ playerRole, players, currentPhase, currentUserId, onAction }) => {
    const [selectedTarget, setSelectedTarget] = useState(null)

    const isMyTurn =
        (currentPhase === 'night_mafia' && playerRole === 'mafia') ||
        (currentPhase === 'night_doctor' && playerRole === 'doctor') ||
        (currentPhase === 'night_detective' && playerRole === 'detective')

    const getNightInstruction = () => {
        switch (playerRole) {
            case 'mafia': return 'La ville dort. Désignez votre prochaine victime.'
            case 'doctor': return 'Qui nécessitera vos soins cette nuit ?'
            case 'detective': return 'Sur qui se portent vos soupçons ?'
            default: return 'Fermez les yeux. Attendez le lever du soleil.'
        }
    }

    // Filtrer les cibles valides (vivants)
    const validTargets = players.filter(p => {
        if (!p.is_alive) return false
        if (playerRole === 'mafia' && p.role === 'mafia') return false // La mafia ne se tue pas elle-même en principe
        return true
    })

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-slate-300 p-4 transition-colors duration-1000">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl w-full flex flex-col items-center">

                <h2 className="text-3xl font-serif text-blue-900 mb-2 text-center uppercase tracking-[0.3em] font-bold">Nuit</h2>
                <div className="flex justify-center mb-10 mt-4">
                    <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center shadow-[0_0_50px_rgba(30,58,138,0.2)]">
                        <span className="text-5xl text-blue-800">☾</span>
                    </div>
                </div>

                {isMyTurn ? (
                    <motion.div className="w-full" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                        <p className="text-center text-red-700 mb-8 font-serif italic text-lg">{getNightInstruction()}</p>
                        <div className="grid grid-cols-2 gap-4">
                            {validTargets.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedTarget(p.id)}
                                    className={`p-4 rounded-lg border transition-all ${selectedTarget === p.id
                                            ? 'bg-red-900/40 border-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                                            : 'bg-slate-900 border-slate-800 hover:border-slate-600 text-slate-400'
                                        }`}
                                >
                                    {p.username} {p.user_id === currentUserId && "(Vous)"}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => { if (selectedTarget) onAction(selectedTarget) }}
                            disabled={!selectedTarget}
                            className="w-full mt-8 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide text-sm"
                        >
                            Confirmer l'action nocturne
                        </button>
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center h-48 justify-center">
                        <p className="text-slate-600 mb-6 font-serif italic text-lg hover:text-red-900 transition-colors cursor-default">Les rôles de la nuit agissent en secret...</p>
                        <div className="flex space-x-2">
                            <div className="w-2 h-2 bg-slate-800 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-slate-800 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-slate-800 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    )
}

// ==========================================
// COMPOSANT 4 : VotingSystem (Jour)
// ==========================================
const VotingSystem = ({ players, currentUserId, onVote, hasVoted }) => {
    const [selectedTarget, setSelectedTarget] = useState(null)

    const livingPlayers = players.filter(p => p.is_alive)

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-200 p-4 transition-colors duration-1000">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl w-full bg-slate-950 p-8 rounded-xl border border-slate-800 shadow-2xl"
            >
                <div className="flex justify-center mb-6">
                    <span className="text-6xl text-yellow-600 drop-shadow-[0_0_15px_rgba(202,138,4,0.5)] cursor-default">☀️</span>
                </div>
                <h2 className="text-3xl font-serif text-white mb-2 text-center uppercase tracking-widest font-bold">Jour de Jugement</h2>
                <p className="text-center text-slate-400 mb-8 italic text-sm">Débattez et votez pour éliminer un suspect.</p>

                {hasVoted ? (
                    <div className="text-center py-12 text-slate-500 italic font-serif">
                        Votre vote public a été enregistré. En attente de l'unanimité collective...
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                            {livingPlayers.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedTarget(p.id)}
                                    className={`flex items-center justify-center p-4 rounded-lg border transition-all ${selectedTarget === p.id
                                            ? 'bg-slate-800 border-yellow-600 text-white shadow-[0_0_15px_rgba(202,138,4,0.3)]'
                                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    <span className="font-medium">{p.username} {p.user_id === currentUserId && "(C'est vous)"}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => { if (selectedTarget) onVote(selectedTarget) }}
                            disabled={!selectedTarget}
                            className="w-full bg-yellow-700 hover:bg-yellow-600 text-white font-bold py-4 rounded-lg transition-colors border border-yellow-800 hover:border-yellow-500 disabled:opacity-50 uppercase tracking-wide shadow-lg"
                        >
                            Voter pour l'exécution
                        </button>
                    </>
                )}
            </motion.div>
        </div>
    )
}

// ==========================================
// COMPOSANT PRINCIPAL : GameRoom
// ==========================================
export default function GameRoom({ roomId }) {
    const [me, setMe] = useState(null)
    const [room, setRoom] = useState(null)
    const [players, setPlayers] = useState([])
    const [phase, setPhase] = useState('lobby') // lobby, roles, night_mafia, night_doctor, night_detective, day_discussion, day_vote
    const [roleAcknowledged, setRoleAcknowledged] = useState(false)
    const [hasVotedOrActed, setHasVotedOrActed] = useState(false)

    // 1. Initialisation et souscription au canal Supabase
    useEffect(() => {
        if (!roomId) return

        const fetchInitialData = async () => {
            // Récupération de la Room (lobby)
            const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single()
            if (roomData) {
                setRoom(roomData)
                setPhase(roomData.status)
            }

            // Récupération des Joueurs existants
            const { data: playersData } = await supabase.from('players').select('*').eq('room_id', roomId).order('created_at', { ascending: true })
            if (playersData) {
                setPlayers(playersData)
            }
        }

        fetchInitialData()

        // Configuration Supabase Realtime avec supabase.channel()
        const channel = supabase.channel(`game_room_${roomId}`)
            // Écoute des changements d'état de la salle (passage jour/nuit)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
                setRoom(payload.new)
                setPhase(payload.new.status)
                setHasVotedOrActed(false) // On permet de voter/agir à nouveau
            })
            // Écoute de l'entrée/sortie/décès des joueurs
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, (payload) => {
                setPlayers(prev => {
                    if (payload.eventType === 'INSERT') return [...prev, payload.new]
                    if (payload.eventType === 'UPDATE') return prev.map(p => p.id === payload.new.id ? payload.new : p)
                    if (payload.eventType === 'DELETE') return prev.filter(p => p.id !== payload.old.id)
                    return prev
                })

                // Met à jour l'instance locale 'me' si je suis affecté
                if (me && payload.new && payload.new.user_id === me.user_id) {
                    setMe(payload.new)
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [roomId])
    // on omet intentionnellement `me` pour éviter des resubscriptions, 
    // la synchonisation se fait via setPlayers/setMe dans les callbacks.

    // 2. Rejoindre la salle (Création ou rattachement)
    const handleJoinLobby = async (username) => {
        // Note: Dans une app complète, on utilise supabase.auth.getUser() pour l'user_id
        const mockUserId = 'user_' + Math.random().toString(36).substr(2, 9)

        // Le premier arrivé devient tacitement l'hôte si la room n'en a pas
        if (players.length === 0 && room && !room.host_id) {
            await supabase.from('rooms').update({ host_id: mockUserId }).eq('id', roomId)
        }

        const { data } = await supabase.from('players').insert([{
            room_id: roomId,
            user_id: mockUserId,
            username,
            is_alive: true,
            is_protected: false,
            role: 'villager'
        }]).select().single()

        if (data) setMe(data)
    }

    // 3. Démarrer la partie (Assigne les rôles et passe à la phase 'roles')
    const handleStartGame = async () => {
        const assignedPlayers = distributeRoles(players)

        // En production: On fait une Bulk Update ou une Edge Function
        for (const p of assignedPlayers) {
            await supabase.from('players').update({ role: p.role }).eq('id', p.id)
        }

        // Change l'état de la salle et avertit tout le monde via Realtime
        await supabase.from('rooms').update({ status: 'roles' }).eq('id', roomId)
    }

    // 4. Inscription de l'action en BDD
    const handleAction = async (targetId) => {
        setHasVotedOrActed(true)

        let actionType = 'vote' // Défaut (Jour)
        if (phase.startsWith('night')) {
            if (me.role === 'mafia') actionType = 'kill'
            else if (me.role === 'doctor') actionType = 'save'
            else if (me.role === 'detective') actionType = 'check'
        }

        await supabase.from('actions').insert([{
            room_id: roomId,
            phase_number: 1, // Devrait s'incrémenter par cycle dans la logique serveur
            action_type: actionType,
            target_id: targetId
            // L'actor_id est généralement important mais nous l'avons omis car non présent dans le schéma SQL fourni
        }])

        // La transition automatique vers la phase suivante si "Le vote doit être unanime..."
        // devrait être traitée nativement par un trigger PostgreSQL ou une Edge Function 
        // qui surveille la table 'actions'.
    }

    // ==========================
    // Rendu par machine à état
    // ==========================

    // Écran d'accueil - AvatarSelector (Avant rejoindre)
    if (!me) {
        return <AvatarSelector onJoin={handleJoinLobby} />
    }

    // Lobby - AvatarSelector (En attente)
    if (phase === 'lobby') {
        return <AvatarSelector
            players={players}
            isHost={room?.host_id === me?.user_id || players[0]?.id === me?.id}
            onStart={handleStartGame}
        />
    }

    // Phase Roles - RoleReveal
    if (phase === 'roles') {
        if (!roleAcknowledged) {
            return <RoleReveal role={me.role} onAcknowledge={() => setRoleAcknowledged(true)} />
        }
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 font-serif">
                <div className="w-8 h-8 border-4 border-slate-800 border-t-red-600 rounded-full animate-spin mb-6"></div>
                <p className="animate-pulse">En attente des autres joueurs...</p>
            </div>
        )
    }

    // État du Joueur s'il est Mort (applicable à toutes les phases post-lobby)
    if (!me.is_alive) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-slate-500 font-serif">
                <span className="text-6xl text-slate-800 mb-6 drop-shadow-lg">💀</span>
                <h2 className="text-2xl uppercase tracking-widest text-slate-600 mb-2">Vous êtes mort</h2>
                <p className="text-sm italic">Vous êtes désormais un spectre. Observez la chute de la ville en silence.</p>
                <p className="mt-8 text-xs text-slate-700 uppercase tracking-widest border border-slate-900 px-4 py-2 rounded-lg">
                    Phase en cours : {phase.replace('_', ' ')}
                </p>
            </div>
        ) // Le fantôme pourrait voir le chat plus tard, mais ne peut pas agir
    }

    // Phase Nuit - NightOverlay
    if (phase.startsWith('night')) {
        if (hasVotedOrActed && phase !== 'night_detective') { // Afficher l'attente sauf si fin de config
            return (
                <div className="min-h-screen bg-black flex flex-col items-center justify-center text-slate-600 italic font-serif text-center px-4">
                    <p>Votre action est enregistrée. La nuit poursuit son cours, dans l'ombre...</p>
                </div>
            )
        }
        return <NightOverlay playerRole={me.role} players={players} currentPhase={phase} currentUserId={me.user_id} onAction={handleAction} />
    }

    // Phase Jour / Vote - VotingSystem
    if (phase === 'day_discussion' || phase === 'day_vote') {
        // Le "Day Discussion" contiendrait normalement un Chat de groupe.
        // Pour l'intégration, l'interface du "Vote" est requise.
        return <VotingSystem players={players} currentUserId={me.user_id} onVote={handleAction} hasVoted={hasVotedOrActed} />
    }

    // Sécurité (Fallback par défaut)
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500 font-serif">
            <div className="w-8 h-8 border-4 border-slate-800 border-t-red-600 rounded-full animate-spin mb-6"></div>
            <p>Synchronisation en cours ({phase})...</p>
        </div>
    )
}
