'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { distributeRoles, getMafiaCount } from '../utils/gameLogic'

// ==========================================
// QR Code via API publique (sans lib)
// ==========================================
const QRCode = ({ url }) => {
    const encoded = encodeURIComponent(url)
    const src = `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=180x180&color=dc2626&bgcolor=0f172a&margin=10`
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="p-2 bg-slate-900 rounded-xl border border-red-900/40 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                <img src={src} alt="QR Code" width={180} height={180} className="rounded-lg block" />
            </div>
            <p className="text-slate-500 text-xs italic">Scannez pour rejoindre</p>
        </div>
    )
}

// ==========================================
// Composant CopyBadge — copie le texte
// ==========================================
const CopyBadge = ({ text }) => {
    const [copied, setCopied] = useState(false)
    const copy = () => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <button
            onClick={copy}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all text-sm"
        >
            <span className="font-mono text-slate-300">{text}</span>
            <span className="text-slate-500 group-hover:text-slate-300 transition-colors text-xs">
                {copied ? '✓ Copié !' : '⎘'}
            </span>
        </button>
    )
}

// ==========================================
// COMPOSANT LOBBY (re-écrit, enrichi)
// ==========================================
const Lobby = ({ room, players, isHost, onStart, onJoin, currentUserId }) => {
    const [username, setUsername] = useState('')
    const [joining, setJoining] = useState(false)
    const alreadyJoined = !!currentUserId
    const gameStarted = room?.status !== 'lobby'

    // Construit l'URL d'invitation
    const inviteUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/room/${room?.id}`
        : ''

    // Si pas encore dans la salle → formulaire d'entrée
    if (!alreadyJoined && !gameStarted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-900/10 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-900/10 blur-[80px] rounded-full" />
                </div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl"
                >
                    <h1 className="text-5xl font-serif text-red-700 text-center uppercase tracking-[0.2em] mb-1 drop-shadow-[0_0_15px_rgba(185,28,28,0.5)]">Mafia</h1>
                    <p className="text-center text-slate-500 italic text-sm mb-8 tracking-widest">Entrez dans l'ombre...</p>

                    <div className="space-y-4">
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && username.trim() && onJoin(username.trim())}
                            maxLength={15}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-red-700 focus:ring-1 focus:ring-red-700 rounded-xl px-4 py-3 text-white text-center text-lg placeholder:text-slate-700 outline-none transition-all"
                            placeholder="Votre alias..."
                        />
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => username.trim() && onJoin(username.trim())}
                            disabled={!username.trim() || joining}
                            className="w-full bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 uppercase tracking-widest"
                        >
                            {joining ? 'Entrée...' : 'Entrer dans la salle'}
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        )
    }

    // Si partie démarrée et quelqu'un essaie de rejoindre → bloqué
    if (gameStarted && !alreadyJoined) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-center p-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm">
                    <span className="text-7xl block mb-6">🚫</span>
                    <h2 className="text-2xl font-serif text-red-600 uppercase tracking-widest mb-3">Salle Verrouillée</h2>
                    <p className="text-slate-400 italic">Cette partie a déjà commencé. Vous ne pouvez plus rejoindre.</p>
                    <a href="/" className="mt-8 inline-block px-8 py-3 border border-slate-800 rounded-xl text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all text-sm uppercase tracking-wider">
                        ← Retour à l'accueil
                    </a>
                </motion.div>
            </div>
        )
    }

    // Lobby principal (joueur déjà dans la salle)
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-900/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-blue-900/8 blur-[100px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-2xl"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-serif text-red-700 uppercase tracking-[0.2em] drop-shadow-[0_0_15px_rgba(185,28,28,0.5)]">Mafia</h1>
                    <p className="text-slate-500 italic text-sm mt-1 tracking-widest">En attente des joueurs...</p>
                    {/* Composition dynamique basée sur le nombre actuel de joueurs */}
                    {players.length >= 4 && (() => {
                        const m = getMafiaCount(players.length)
                        const v = players.length - 2 - m
                        return (
                            <div className="flex justify-center gap-2 mt-4 flex-wrap text-xs">
                                <span className="px-3 py-1 rounded-full border border-red-900/50 bg-red-950/30 text-red-400 font-bold">🔪 {m} Mafia</span>
                                <span className="px-3 py-1 rounded-full border border-emerald-900/50 bg-emerald-950/30 text-emerald-400">💉 1 Docteur</span>
                                <span className="px-3 py-1 rounded-full border border-blue-900/50 bg-blue-950/30 text-blue-400">🕵️ 1 Détective</span>
                                <span className="px-3 py-1 rounded-full border border-slate-700 bg-slate-800 text-slate-400">🧑‍🌾 {v} Villageois</span>
                            </div>
                        )
                    })()}
                    {players.length < 4 && (
                        <div className="flex justify-center gap-2 mt-4 flex-wrap text-xs">
                            <span className="px-3 py-1 rounded-full border border-red-900/50 bg-red-950/30 text-red-400">🔪 Mafia(s)</span>
                            <span className="px-3 py-1 rounded-full border border-emerald-900/50 bg-emerald-950/30 text-emerald-400">💉 1 Docteur</span>
                            <span className="px-3 py-1 rounded-full border border-blue-900/50 bg-blue-950/30 text-blue-400">🕵️ 1 Détective</span>
                            <span className="px-3 py-1 rounded-full border border-slate-700 bg-slate-800 text-slate-400">🧑‍🌾 Villageois</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Colonne gauche — Joueurs */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
                        <h3 className="text-sm text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block"></span>
                            Joueurs ({players.length})
                        </h3>
                        <ul className="flex-1 space-y-2 overflow-y-auto max-h-64 custom-scrollbar pr-1">
                            <AnimatePresence>
                                {players.map((p, i) => (
                                    <motion.li
                                        key={p.id}
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 12 }}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${p.user_id === currentUserId
                                            ? 'bg-red-950/30 border-red-900/50 text-white'
                                            : 'bg-slate-950 border-slate-800 text-slate-300'
                                            }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-700 flex items-center justify-center text-sm font-bold text-red-500">
                                            {p.username[0].toUpperCase()}
                                        </div>
                                        <span className="flex-1 font-medium text-sm">{p.username}</span>
                                        {i === 0 && (
                                            <span className="text-xs bg-red-900/40 text-red-500 border border-red-900/60 px-2 py-0.5 rounded-full">Hôte</span>
                                        )}
                                        {p.user_id === currentUserId && i !== 0 && (
                                            <span className="text-xs text-slate-500 italic">vous</span>
                                        )}
                                    </motion.li>
                                ))}
                            </AnimatePresence>
                            {players.length === 0 && (
                                <li className="text-slate-600 text-sm italic text-center py-4">Aucun joueur pour l'instant...</li>
                            )}
                        </ul>

                        {/* Bouton de démarrage */}
                        <div className="mt-6">
                            {isHost ? (
                                players.length >= 4 ? (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={onStart}
                                        className="w-full py-3 rounded-xl font-bold uppercase tracking-widest text-sm bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 text-white shadow-[0_0_25px_rgba(220,38,38,0.4)] transition-all"
                                    >
                                        🎭 Lancer la Partie
                                    </motion.button>
                                ) : (
                                    <div className="text-center mt-2">
                                        <div className="flex justify-center gap-1 mb-2">
                                            {Array.from({ length: 4 }).map((_, i) => (
                                                <div key={i} className={`w-4 h-4 rounded-full border text-[8px] flex items-center justify-center ${i < players.length
                                                    ? 'bg-red-700 border-red-600'
                                                    : 'bg-slate-900 border-slate-700'
                                                    }`}>
                                                    {i < players.length ? '✓' : ''}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-red-800/80 text-xs italic">
                                            {4 - players.length} joueur{4 - players.length > 1 ? 's' : ''} supplémentaire{4 - players.length > 1 ? 's' : ''} requis
                                        </p>
                                    </div>
                                )
                            ) : (
                                <div className="text-center py-3 text-slate-500 text-sm italic animate-pulse">
                                    En attente de l'hôte pour démarrer...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Colonne droite — Invitation */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-6">
                        <h3 className="text-sm text-slate-400 uppercase tracking-widest self-start flex items-center gap-2">
                            📡 Inviter des joueurs
                        </h3>

                        {/* QR Code */}
                        <QRCode url={inviteUrl} />

                        {/* Code court */}
                        <div className="w-full flex flex-col items-center gap-2">
                            <p className="text-slate-500 text-xs uppercase tracking-widest">Code de la salle</p>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-3xl font-black tracking-[0.3em] text-white bg-slate-950 border border-slate-700 px-5 py-2 rounded-xl shadow-inner">
                                    {room?.code}
                                </span>
                            </div>
                        </div>

                        {/* URL copiable */}
                        <div className="w-full flex flex-col items-center gap-1.5">
                            <p className="text-slate-500 text-xs uppercase tracking-widest">Lien direct</p>
                            <CopyBadge text={inviteUrl} />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

// ==========================================
// COMPOSANT 2 : RoleReveal
// ==========================================
const RoleReveal = ({ role, onAcknowledge }) => {
    const [flipped, setFlipped] = useState(false)
    const roles = {
        mafia: { name: 'Mafia', color: 'text-red-500', icon: '🔪', desc: 'Éliminez les villageois chaque nuit. Gardez votre identité secrète la journée.', bg: 'from-red-950/60' },
        doctor: { name: 'Docteur', color: 'text-emerald-400', icon: '💉', desc: 'Sauvez un citoyen chaque nuit. Vous pouvez vous protéger vous-même.', bg: 'from-emerald-950/60' },
        detective: { name: 'Détective', color: 'text-blue-400', icon: '🕵️', desc: 'Enquêtez sur un joueur pour découvrir s\'il est loyal ou de la Mafia.', bg: 'from-blue-950/60' },
        villager: { name: 'Villageois', color: 'text-slate-300', icon: '🧑‍🌾', desc: 'Trouvez et éliminez la Mafia pendant le vote du jour.', bg: 'from-slate-800/60' },
    }
    const r = roles[role] || roles.villager

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4" style={{ perspective: 1200 }}>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-500 uppercase tracking-[0.3em] text-sm mb-10 font-serif">
                Identité Secrète
            </motion.p>
            <div className="relative w-64 h-96 cursor-pointer select-none" onClick={() => setFlipped(true)}>
                <motion.div
                    className="w-full h-full absolute"
                    initial={false}
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.9, type: 'spring', stiffness: 180, damping: 22 }}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Verso */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border-2 border-slate-700 flex flex-col items-center justify-center gap-4 shadow-2xl" style={{ backfaceVisibility: 'hidden' }}>
                        <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-3xl">🂠</div>
                        <p className="text-slate-600 text-sm font-serif italic">Touchez pour révéler</p>
                        <div className="absolute top-4 right-4 w-2 h-2 bg-red-800 rounded-full animate-pulse"></div>
                        <div className="absolute bottom-4 left-4 w-2 h-2 bg-red-800 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    </div>
                    {/* Recto */}
                    <div className={`absolute inset-0 bg-gradient-to-b ${r.bg} to-slate-950 rounded-2xl border-2 border-slate-700 flex flex-col items-center justify-center p-6 text-center shadow-2xl`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                        <div className="text-5xl mb-4">{r.icon}</div>
                        <h3 className={`text-3xl font-serif font-bold uppercase tracking-widest mb-3 ${r.color}`}>{r.name}</h3>
                        <div className="w-10 h-px bg-slate-700 mb-4"></div>
                        <p className="text-slate-400 text-sm leading-relaxed">{r.desc}</p>
                    </div>
                </motion.div>
            </div>
            <AnimatePresence>
                {flipped && (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2 }}
                        onClick={onAcknowledge}
                        className="mt-12 px-10 py-3 rounded-full border border-slate-700 hover:border-red-700 text-slate-400 hover:text-white text-sm uppercase tracking-widest transition-all"
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

    const instructions = {
        mafia: 'La ville dort. Choisissez votre victime.',
        doctor: 'Qui protégerez-vous cette nuit ?',
        detective: 'Sur qui portent vos soupçons ?',
    }

    const validTargets = players.filter(p => {
        if (!p.is_alive) return false
        if (playerRole === 'mafia' && p.role === 'mafia') return false
        return true
    })

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-slate-300 p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl w-full flex flex-col items-center">
                <div className="w-28 h-28 rounded-full bg-slate-950 border border-blue-900/30 shadow-[0_0_60px_rgba(30,58,138,0.3)] flex items-center justify-center mb-8">
                    <span className="text-6xl text-blue-900 leading-none">☾</span>
                </div>
                <h2 className="text-4xl font-serif text-blue-900/80 uppercase tracking-[0.4em] mb-2">Nuit</h2>

                {isMyTurn ? (
                    <motion.div className="w-full mt-8" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                        <p className="text-center text-red-700 mb-6 italic font-serif">{instructions[playerRole]}</p>
                        <div className="grid grid-cols-2 gap-3">
                            {validTargets.map(p => (
                                <motion.button
                                    key={p.id}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setSelectedTarget(p.id)}
                                    className={`p-4 rounded-xl border transition-all font-medium ${selectedTarget === p.id
                                        ? 'bg-red-900/40 border-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                                        }`}
                                >
                                    {p.username}
                                </motion.button>
                            ))}
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => selectedTarget && onAction(selectedTarget)}
                            disabled={!selectedTarget}
                            className="w-full mt-6 py-4 rounded-xl border border-slate-700 hover:border-red-700 bg-slate-900 hover:bg-slate-800 text-white font-semibold uppercase tracking-widest text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            Confirmer
                        </motion.button>
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center mt-12 gap-6">
                        <p className="text-slate-700 italic font-serif">Les ombres agissent en secret...</p>
                        <div className="flex gap-2">
                            {[0, 0.2, 0.4].map((d, i) => (
                                <div key={i} className="w-2 h-2 bg-slate-800 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    )
}

// ==========================================
// COMPOSANT 4 : VotingSystem
// ==========================================
const VotingSystem = ({ players, currentUserId, onVote, hasVoted }) => {
    const [selectedTarget, setSelectedTarget] = useState(null)
    const living = players.filter(p => p.is_alive)

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl w-full bg-slate-950 p-8 rounded-2xl border border-slate-800 shadow-2xl">
                <div className="text-6xl text-center mb-4">☀️</div>
                <h2 className="text-3xl font-serif text-white text-center uppercase tracking-widest mb-2">Jugement</h2>
                <p className="text-center text-slate-500 italic text-sm mb-8">Votez pour éliminer un suspect.</p>
                {hasVoted ? (
                    <p className="text-center text-slate-500 italic py-10 font-serif">Vote enregistré. En attente de l'unanimité...</p>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                            {living.map(p => (
                                <motion.button
                                    key={p.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setSelectedTarget(p.id)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${selectedTarget === p.id
                                        ? 'border-yellow-600 bg-yellow-900/20 text-white shadow-[0_0_12px_rgba(202,138,4,0.25)]'
                                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                                        }`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-yellow-600">
                                        {p.username[0].toUpperCase()}
                                    </div>
                                    <span className="font-medium">{p.username}</span>
                                    {p.user_id === currentUserId && <span className="ml-auto text-xs text-slate-600 italic">vous</span>}
                                </motion.button>
                            ))}
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => selectedTarget && onVote(selectedTarget)}
                            disabled={!selectedTarget}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 text-white font-bold uppercase tracking-widest shadow-lg disabled:opacity-50 transition-all"
                        >
                            Voter
                        </motion.button>
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
    const [phase, setPhase] = useState('lobby')
    const [roleAcknowledged, setRoleAcknowledged] = useState(false)
    const [hasVotedOrActed, setHasVotedOrActed] = useState(false)

    useEffect(() => {
        if (!roomId) return

        const fetchInitialData = async () => {
            const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single()
            if (roomData) { setRoom(roomData); setPhase(roomData.status) }

            const { data: playersData } = await supabase.from('players').select('*').eq('room_id', roomId).order('created_at', { ascending: true })
            if (playersData) setPlayers(playersData)
        }
        fetchInitialData()

        const channel = supabase.channel(`game_room_${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
                setRoom(payload.new); setPhase(payload.new.status); setHasVotedOrActed(false)
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, (payload) => {
                setPlayers(prev => {
                    if (payload.eventType === 'INSERT') return [...prev, payload.new]
                    if (payload.eventType === 'UPDATE') return prev.map(p => p.id === payload.new.id ? payload.new : p)
                    if (payload.eventType === 'DELETE') return prev.filter(p => p.id !== payload.old.id)
                    return prev
                })
                if (me && payload.new?.user_id === me.user_id) setMe(payload.new)
            })
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [roomId])

    const handleJoinLobby = async (username) => {
        // Bloque l'entrée si la partie a déjà commencé
        if (room && room.status !== 'lobby') return

        const mockUserId = 'user_' + Math.random().toString(36).substr(2, 9)
        if (players.length === 0 && room && !room.host_id) {
            await supabase.from('rooms').update({ host_id: mockUserId }).eq('id', roomId)
        }
        const { data } = await supabase.from('players').insert([{
            room_id: roomId, user_id: mockUserId, username,
            is_alive: true, is_protected: false, role: 'villager'
        }]).select().single()
        if (data) setMe(data)
    }

    const handleStartGame = async () => {
        const assignedPlayers = distributeRoles(players)
        for (const p of assignedPlayers) {
            await supabase.from('players').update({ role: p.role }).eq('id', p.id)
        }
        // Verrouille la salle en passant à la phase 'roles'
        await supabase.from('rooms').update({ status: 'roles' }).eq('id', roomId)
    }

    const handleAction = async (targetId) => {
        setHasVotedOrActed(true)
        let actionType = 'vote'
        if (phase.startsWith('night')) {
            if (me.role === 'mafia') actionType = 'kill'
            else if (me.role === 'doctor') actionType = 'save'
            else if (me.role === 'detective') actionType = 'check'
        }
        await supabase.from('actions').insert([{ room_id: roomId, phase_number: 1, action_type: actionType, target_id: targetId }])
    }

    const isHost = room?.host_id === me?.user_id || (!room?.host_id && players[0]?.id === me?.id)

    // === Machine à états ===

    // Phase lobby (ou joueur pas encore dans la salle)
    if (phase === 'lobby' || !me) {
        return (
            <Lobby
                room={room}
                players={players}
                isHost={isHost}
                onStart={handleStartGame}
                onJoin={handleJoinLobby}
                currentUserId={me?.user_id}
            />
        )
    }

    // Phase révélation des rôles
    if (phase === 'roles') {
        if (!roleAcknowledged) return <RoleReveal role={me.role} onAcknowledge={() => setRoleAcknowledged(true)} />
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-slate-500 font-serif">
                <div className="w-8 h-8 border-4 border-slate-800 border-t-red-600 rounded-full animate-spin mb-6"></div>
                <p className="animate-pulse">En attente des autres joueurs...</p>
            </div>
        )
    }

    // Joueur mort
    if (!me.is_alive) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-4">
                <span className="text-7xl mb-6">💀</span>
                <h2 className="text-2xl font-serif text-slate-600 uppercase tracking-widest mb-2">Vous êtes mort</h2>
                <p className="text-slate-700 italic text-sm">Observez la chute de la ville en silence.</p>
            </div>
        )
    }

    // Phases nuit
    if (phase.startsWith('night')) {
        if (hasVotedOrActed) {
            return (
                <div className="min-h-screen bg-black flex items-center justify-center text-slate-600 italic font-serif text-center px-4">
                    <p>Votre action est enregistrée. La nuit poursuit son cours...</p>
                </div>
            )
        }
        return <NightOverlay playerRole={me.role} players={players} currentPhase={phase} currentUserId={me.user_id} onAction={handleAction} />
    }

    // Phases jour
    if (phase === 'day_discussion' || phase === 'day_vote') {
        return <VotingSystem players={players} currentUserId={me.user_id} onVote={handleAction} hasVoted={hasVotedOrActed} />
    }

    // Fallback
    return (
        <div className="min-h-screen bg-black flex items-center justify-center text-slate-500 font-serif">
            <div className="w-8 h-8 border-4 border-slate-800 border-t-red-600 rounded-full animate-spin mr-4"></div>
            Synchronisation...
        </div>
    )
}
