'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { getMafiaCount } from '../utils/gameLogic'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const api = async (path, body) => {
    const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'API error')
    return json
}

const ROLE_META = {
    mafia: { label: 'Mafia', color: 'text-red-500', bg: 'from-red-950/60', icon: '🔪', border: 'border-red-900/50' },
    doctor: { label: 'Docteur', color: 'text-emerald-400', bg: 'from-emerald-950/60', icon: '💉', border: 'border-emerald-900/50' },
    detective: { label: 'Détective', color: 'text-blue-400', bg: 'from-blue-950/60', icon: '🕵️', border: 'border-blue-900/50' },
    villager: { label: 'Villageois', color: 'text-slate-300', bg: 'from-slate-800/60', icon: '🧑‍🌾', border: 'border-slate-700' },
}

// ─────────────────────────────────────────────
// QR Code (external API)
// ─────────────────────────────────────────────
const QRCode = ({ url }) => {
    const src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=180x180&color=dc2626&bgcolor=0f172a&margin=10`
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="p-2 bg-slate-900 rounded-xl border border-red-900/40 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                <img src={src} alt="QR Code" width={180} height={180} className="rounded-lg block" />
            </div>
            <p className="text-slate-500 text-xs italic">Scannez pour rejoindre</p>
        </div>
    )
}

// ─────────────────────────────────────────────
// CopyBadge
// ─────────────────────────────────────────────
const CopyBadge = ({ text }) => {
    const [copied, setCopied] = useState(false)
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all text-sm"
        >
            <span className="font-mono text-slate-300 truncate max-w-[220px]">{text}</span>
            <span className="text-slate-500 group-hover:text-slate-300 text-xs shrink-0">{copied ? '✓ Copié !' : '⎘'}</span>
        </button>
    )
}

// ─────────────────────────────────────────────
// LOBBY
// ─────────────────────────────────────────────
const Lobby = ({ room, players, isHost, onStart, onJoin, currentUserId }) => {
    const [username, setUsername] = useState('')
    const [joining, setJoining] = useState(false)
    const alreadyJoined = !!currentUserId
    const gameStarted = room?.status !== 'lobby'
    const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/room/${room?.id}` : ''

    const handleJoin = async () => {
        if (!username.trim()) return
        setJoining(true)
        await onJoin(username.trim())
        setJoining(false)
    }

    if (!alreadyJoined && !gameStarted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 relative overflow-hidden font-sans">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-600/30 blur-[120px] rounded-full" />
                    <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-600/20 blur-[100px] rounded-full" />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                </div>
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 w-full max-w-sm bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]"
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-[2rem] pointer-events-none" />
                    <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-500 via-rose-400 to-orange-500 text-center uppercase tracking-tighter mb-1 drop-shadow-lg">Mafia</h1>
                    <p className="text-center text-purple-200/70 font-medium text-sm mb-8 tracking-[0.2em] uppercase">Entrez dans l'ombre...</p>
                    <div className="space-y-4 relative z-10">
                        <input
                            type="text" value={username} onChange={e => setUsername(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleJoin()}
                            maxLength={15} placeholder="Votre alias..."
                            className="w-full bg-black/40 border border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 rounded-2xl px-6 py-4 text-white text-center text-lg font-bold placeholder:text-white/30 placeholder:font-normal outline-none transition-all backdrop-blur-md"
                        />
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            onClick={handleJoin} disabled={!username.trim() || joining}
                            className="w-full bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-500 hover:to-red-500 text-white font-bold py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50 uppercase tracking-widest"
                        >
                            {joining ? 'Entrée...' : 'Rejoindre la partie'}
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        )
    }

    if (gameStarted && !alreadyJoined) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-center p-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm">
                    <span className="text-7xl block mb-6">🚫</span>
                    <h2 className="text-2xl font-serif text-red-600 uppercase tracking-widest mb-3">Salle Verrouillée</h2>
                    <p className="text-slate-400 italic">Cette partie a déjà commencé.</p>
                    <a href="/" className="mt-8 inline-block px-8 py-3 border border-slate-800 rounded-xl text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all text-sm uppercase tracking-wider">← Retour</a>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 relative overflow-hidden font-sans">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-600/30 blur-[120px] rounded-full" />
                <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[100px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-4xl">
                <div className="text-center mb-10">
                    <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-500 via-rose-400 to-orange-500 uppercase tracking-tighter drop-shadow-lg">Mafia</h1>
                    <p className="text-purple-200/70 font-medium text-sm mt-2 tracking-[0.3em] uppercase">En attente des joueurs...</p>
                    {players.length >= 3 && (() => {
                        const m = getMafiaCount(players.length)
                        const hasDetective = players.length >= 4
                        const v = players.length - m - (hasDetective ? 2 : 1)
                        return (
                            <div className="flex justify-center gap-3 mt-6 flex-wrap text-sm font-bold">
                                <span className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)] backdrop-blur-md">🔪 {m} Mafia</span>
                                <span className="px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] backdrop-blur-md">💉 1 Docteur</span>
                                {hasDetective && <span className="px-4 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)] backdrop-blur-md">🕵️ 1 Détective</span>}
                                {v > 0 && <span className="px-4 py-2 rounded-xl border border-slate-500/30 bg-slate-500/10 text-slate-300 shadow-[0_0_15px_rgba(148,163,184,0.2)] backdrop-blur-md">🧑‍🌾 {v} Villageois</span>}
                            </div>
                        )
                    })()}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Players list */}
                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] flex flex-col relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                        <h3 className="text-sm text-purple-200/50 font-bold uppercase tracking-widest mb-6 flex items-center gap-3 relative z-10">
                            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                            Joueurs présents ({players.length})
                        </h3>
                        <ul className="flex-1 space-y-3 overflow-y-auto max-h-72 pr-2 custom-scrollbar relative z-10">
                            <AnimatePresence>
                                {players.map((p, i) => (
                                    <motion.li key={p.id}
                                        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                                        className={`flex items-center gap-4 px-4 py-3 rounded-2xl border ${p.user_id === currentUserId ? 'bg-purple-600/20 border-purple-500/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-black/40 border-white/10 text-slate-200'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black shadow-inner ${p.user_id === currentUserId ? 'bg-gradient-to-br from-purple-500 to-red-500 text-white' : 'bg-gradient-to-br from-slate-700 to-slate-900 text-slate-400'}`}>
                                            {p.username[0].toUpperCase()}
                                        </div>
                                        <span className="flex-1 font-bold text-base tracking-wide">{p.username}</span>
                                        {i === 0 && <span className="text-[10px] uppercase font-black tracking-widest bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full">Hôte</span>}
                                        {p.user_id === currentUserId && i !== 0 && <span className="text-[10px] uppercase font-bold tracking-widest text-purple-300/70 border border-purple-500/30 rounded-full px-3 py-1">Vous</span>}
                                    </motion.li>
                                ))}
                            </AnimatePresence>
                            {players.length === 0 && <li className="text-white/30 text-sm font-medium text-center py-8">La salle est vide...</li>}
                        </ul>
                        <div className="mt-8 relative z-10">
                            {isHost ? (
                                players.length >= 3 ? (
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onStart}
                                        className="w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-base bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-500 hover:to-red-500 text-white shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all"
                                    >🎭 Lancer la Partie</motion.button>
                                ) : (
                                    <p className="text-red-400/80 text-xs font-bold uppercase tracking-widest text-center bg-red-950/30 border border-red-900/50 py-3 rounded-xl">
                                        {3 - players.length} joueur{3 - players.length > 1 ? 's' : ''} manquant{3 - players.length > 1 ? 's' : ''} (min. 3)
                                    </p>
                                )
                            ) : (
                                <div className="py-4 text-center rounded-2xl bg-black/40 border border-white/5">
                                    <p className="text-purple-300/60 font-medium text-sm tracking-widest uppercase animate-pulse">L'hôte va lancer la partie...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Invite panel */}
                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] flex flex-col items-center gap-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                        <h3 className="text-sm text-purple-200/50 font-bold uppercase tracking-widest self-start relative z-10 w-full flex justify-between">
                            <span>📡 Inviter des amis</span>
                            <span className="text-xl">🙌</span>
                        </h3>
                        <div className="relative z-10 p-1 bg-gradient-to-br from-purple-500 to-red-500 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                            <div className="bg-slate-950 rounded-xl overflow-hidden p-2">
                                <QRCode url={inviteUrl} />
                            </div>
                        </div>
                        <div className="w-full flex flex-col items-center gap-3 relative z-10">
                            <p className="text-white/40 font-bold text-[10px] uppercase tracking-[0.3em]">Code de la salle</p>
                            <span className="font-mono text-4xl font-black tracking-[0.4em] text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-purple-400 drop-shadow-md">{room?.code}</span>
                        </div>
                        <div className="w-full flex flex-col items-center gap-2 relative z-10">
                            <p className="text-white/40 font-bold text-[10px] uppercase tracking-[0.3em]">Lien d'invitation direct</p>
                            <CopyBadge text={inviteUrl} />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

// ─────────────────────────────────────────────
// ROLE REVEAL
// ─────────────────────────────────────────────
const RoleReveal = ({ role, mafiaTeam, onAcknowledge }) => {
    const [flipped, setFlipped] = useState(false)
    const r = ROLE_META[role] || ROLE_META.villager

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 font-sans relative overflow-hidden" style={{ perspective: 1200 }}>
            {/* Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }} className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-purple-700/20 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
            </div>

            <motion.p initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-white/40 uppercase tracking-[0.4em] font-bold text-sm mb-12 relative z-10 drop-shadow-md">
                Votre Identité Secrète
            </motion.p>
            <div className="relative w-72 h-[420px] cursor-pointer select-none z-10 group" onClick={() => setFlipped(true)}>
                {/* Glow effect that appears on hover/flip */}
                <motion.div
                    animate={{ opacity: flipped ? 1 : 0.4, scale: flipped ? 1.05 : 1 }}
                    className={`absolute inset-0 blur-2xl transition-colors duration-700 rounded-[2rem] ${flipped ? r.color.replace('text', 'bg').replace('500', '600') + '/40' : 'bg-purple-600/30 group-hover:bg-purple-500/50'}`}
                />

                <motion.div className="w-full h-full absolute" initial={false}
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.9, type: 'spring', stiffness: 200, damping: 25 }}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Back of Card */}
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-2xl rounded-[2rem] border border-white/20 flex flex-col items-center justify-center gap-6 shadow-2xl overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/40 to-transparent opacity-80" />
                        <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-5xl shadow-inner relative z-10 backdrop-blur-sm group-hover:scale-110 transition-transform duration-500">🂠</div>
                        <p className="text-white/60 text-sm font-medium tracking-widest uppercase relative z-10">Touchez pour révéler</p>
                    </div>

                    {/* Front of Card */}
                    <div className={`absolute inset-0 bg-white/10 backdrop-blur-3xl rounded-[2rem] border border-white/30 flex flex-col items-center justify-center p-8 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden`}
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                        {/* Dynamic background gradient based on role */}
                        <div className={`absolute inset-0 bg-gradient-to-b ${r.bg} to-transparent opacity-40`} />
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

                        <div className="text-7xl mb-6 relative z-10 drop-shadow-xl filter">{r.icon}</div>
                        <h3 className={`text-4xl font-black uppercase tracking-tighter mb-4 relative z-10 ${r.color} drop-shadow-md`}>{r.label}</h3>
                        <div className="w-16 h-1 rounded-full bg-white/20 mb-6 relative z-10" />
                        <p className="text-white/80 font-medium text-sm leading-relaxed relative z-10 px-2">
                            {role === 'mafia' && 'Éliminez les villageois la nuit. Mentez avec aplomb le jour.'}
                            {role === 'doctor' && 'Sauvez une vie chaque nuit. Utilisez votre pouvoir avec sagesse.'}
                            {role === 'detective' && 'Trouvez les coupables en enquêtant chaque nuit sur un suspect.'}
                            {role === 'villager' && 'Soyez attentif. Démasquez la Mafia avant qu\'il ne soit trop tard.'}
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Mafia Team Info */}
            <AnimatePresence>
                {flipped && role === 'mafia' && mafiaTeam && mafiaTeam.length > 1 && (
                    <motion.div initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.6, type: 'spring' }}
                        className="mt-8 bg-black/40 backdrop-blur-md border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)] rounded-2xl px-8 py-4 text-center z-10 relative"
                    >
                        <p className="text-red-400 font-bold text-[10px] uppercase tracking-[0.3em] mb-2">L'Ombre vous accompagne</p>
                        <p className="text-white font-medium text-base">{mafiaTeam.join(', ')}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ready Button */}
            <AnimatePresence>
                {flipped && (
                    <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.5 }}
                        onClick={onAcknowledge}
                        className="mt-12 group relative rounded-2xl z-10"
                    >
                        <span className="absolute inset-0 bg-gradient-to-r from-purple-500 to-red-500 rounded-2xl blur-md opacity-40 group-hover:opacity-80 transition-opacity"></span>
                        <div className="relative bg-white/5 border border-white/20 hover:bg-white/10 backdrop-blur-xl px-12 py-4 rounded-2xl transition-all">
                            <span className="text-white font-bold text-sm uppercase tracking-widest drop-shadow-md">
                                J'ai compris mon rôle
                            </span>
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    )
}

// ─────────────────────────────────────────────
// NIGHT OVERLAY
// ─────────────────────────────────────────────
const NightOverlay = ({ playerRole, players, currentPhase, currentUserId, onAction, detectiveResult }) => {
    const [selectedTarget, setSelectedTarget] = useState(null)
    const [acted, setActed] = useState(false)

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

    const handleConfirm = async () => {
        if (!selectedTarget || acted) return
        setActed(true)
        await onAction(selectedTarget)
    }

    // Phase label
    const phaseLabel = currentPhase === 'night_mafia' ? 'Phase Mafia'
        : currentPhase === 'night_doctor' ? 'Phase Docteur'
            : currentPhase === 'night_detective' ? 'Phase Détective'
                : 'Nuit'

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-300 p-4 font-sans relative overflow-hidden">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute top-[-10%] left-[-20%] w-[80%] h-[80%] bg-blue-900/40 blur-[150px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-xl w-full flex flex-col items-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
                    <div className="relative w-32 h-32 rounded-full bg-slate-900/80 backdrop-blur-md border border-blue-500/30 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(59,130,246,0.3)]">
                        <span className="text-7xl text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.8)] filter">☾</span>
                    </div>
                </div>
                <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-300 to-blue-800 uppercase tracking-widest mb-2 drop-shadow-md">Nuit</h2>
                <p className="text-blue-300/50 font-bold text-sm uppercase tracking-[0.3em] mb-10">{phaseLabel}</p>

                {isMyTurn && !acted ? (
                    <motion.div className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2rem] shadow-2xl" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                        <p className="text-center text-red-500 mb-8 font-bold text-[10px] uppercase tracking-[0.3em]">{instructions[playerRole]}</p>
                        <div className="grid grid-cols-2 gap-4">
                            {validTargets.map(p => (
                                <motion.button key={p.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                    onClick={() => setSelectedTarget(p.id)}
                                    className={`p-4 rounded-xl border-2 transition-all font-bold text-base ${selectedTarget === p.id
                                        ? 'bg-red-500/20 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                                        : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/30 hover:bg-white/5'}`}
                                >
                                    {p.username}
                                    {p.user_id === currentUserId && <span className="block text-[10px] uppercase tracking-widest text-slate-500 mt-1">(vous)</span>}
                                </motion.button>
                            ))}
                        </div>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            onClick={handleConfirm} disabled={!selectedTarget}
                            className="w-full mt-8 py-4 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold uppercase tracking-widest text-sm disabled:opacity-40 disabled:grayscale transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                        >
                            Confirmer
                        </motion.button>
                    </motion.div>
                ) : acted ? (
                    <div className="flex flex-col items-center mt-8 gap-6 bg-white/5 backdrop-blur-md border border-white/10 px-8 py-6 rounded-2xl w-full">
                        <p className="text-blue-200/60 font-medium tracking-wide">Action enregistrée. En attente...</p>
                        <div className="flex gap-3">
                            {[0, 0.2, 0.4].map((d, i) => (
                                <div key={i} className="w-3 h-3 bg-blue-500/50 rounded-full animate-bounce shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ animationDelay: `${d}s` }} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center mt-12 gap-8">
                        <p className="text-blue-300/40 font-medium tracking-widest uppercase">Les ombres agissent en secret...</p>
                        <div className="flex gap-3">
                            {[0, 0.2, 0.4].map((d, i) => (
                                <div key={i} className="w-3 h-3 bg-blue-800/60 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    )
}

// ─────────────────────────────────────────────
// DAY PHASE (Announcement + Voting)
// ─────────────────────────────────────────────
const DayPhase = ({ players, currentUserId, onVote, phase, events, playerRole, detectiveOwnResult }) => {
    const [selectedTarget, setSelectedTarget] = useState(null)
    const [voted, setVoted] = useState(false)
    const living = players.filter(p => p.is_alive)

    // Latest night result event
    const nightResult = [...events].reverse().find(e => e.event_type === 'night_result')

    const handleVote = async () => {
        if (!selectedTarget || voted) return
        setVoted(true)
        await onVote(selectedTarget)
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4 font-sans relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-orange-500/30 blur-[150px] rounded-full" />
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-yellow-500/20 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay"></div>
            </div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 max-w-xl w-full flex flex-col gap-6">

                {/* Night result announcement */}
                {nightResult && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                        <p className="text-white/40 font-bold text-[10px] uppercase tracking-[0.3em] mb-4 text-center relative z-10">📰 Rapport de la nuit</p>
                        {nightResult.payload.eliminated ? (
                            <div className="text-center relative z-10">
                                <p className="text-white text-lg font-medium leading-relaxed">
                                    <span className="text-red-400 font-bold text-xl px-2">{nightResult.payload.eliminated.username}</span> a été éliminé·e cette nuit.
                                </p>
                                <p className="mt-2 inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-bold uppercase tracking-widest shadow-inner">
                                    {ROLE_META[nightResult.payload.eliminated.role]?.label}
                                </p>
                            </div>
                        ) : (
                            <p className="text-center text-emerald-400 font-bold text-lg relative z-10 drop-shadow-md">✨ Personne n'a été éliminé cette nuit. Un miracle a eu lieu !</p>
                        )}

                        {/* Detective result */}
                        {playerRole === 'detective' && detectiveOwnResult !== null && detectiveOwnResult !== undefined && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                                className={`mt-6 px-6 py-4 rounded-xl border-2 text-center relative z-10 ${detectiveOwnResult ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'}`}
                            >
                                <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-2">Résultat de votre enquête</p>
                                <p className={`text-xl font-black ${detectiveOwnResult ? 'text-red-400' : 'text-emerald-400'} drop-shadow-md`}>
                                    {detectiveOwnResult ? '⚠️ C\'est un membre de la Mafia !' : '✅ Ce n\'est pas la Mafia.'}
                                </p>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* Voting area */}
                <div className="bg-white/5 backdrop-blur-3xl p-8 rounded-[2rem] border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                    <div className="text-7xl text-center mb-6 relative z-10 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">☀️</div>
                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-orange-500 text-center uppercase tracking-tighter mb-2 relative z-10 drop-shadow-lg">
                        {phase === 'day_discussion' ? 'Débat Public' : 'Le Jugement'}
                    </h2>
                    <p className="text-center text-white/60 font-medium text-sm mb-10 relative z-10">Votez pour éliminer un suspect.</p>

                    {voted ? (
                        <div className="text-center py-10 relative z-10 bg-black/20 rounded-2xl border border-white/5">
                            <p className="text-white/60 font-medium tracking-wide mb-6">Vote enregistré. Le village délibère...</p>
                            <div className="flex justify-center gap-3">
                                {[0, 0.2, 0.4].map((d, i) => (
                                    <div key={i} className="w-3 h-3 bg-yellow-500/60 rounded-full animate-bounce shadow-[0_0_10px_rgba(234,179,8,0.5)]" style={{ animationDelay: `${d}s` }} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="relative z-10">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                {living.map(p => (
                                    <motion.button key={p.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                        onClick={() => setSelectedTarget(p.id)}
                                        className={`flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition-all ${selectedTarget === p.id
                                            ? 'border-yellow-500 bg-yellow-500/20 text-white shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                                            : 'border-white/10 bg-black/40 text-slate-300 hover:border-white/30 hover:bg-white/5'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-black shadow-inner ${selectedTarget === p.id ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : 'bg-slate-800 text-yellow-500/70'}`}>
                                            {p.username[0].toUpperCase()}
                                        </div>
                                        <span className="font-bold text-base">{p.username}</span>
                                        {p.user_id === currentUserId && <span className="ml-auto text-[10px] uppercase font-bold text-white/40 tracking-widest bg-white/5 px-2 py-1 rounded-full">Vous</span>}
                                    </motion.button>
                                ))}
                            </div>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                onClick={handleVote} disabled={!selectedTarget}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-black uppercase tracking-widest shadow-[0_0_25px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:grayscale transition-all text-lg"
                            >
                                Voter
                            </motion.button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

// ─────────────────────────────────────────────
// WIN SCREEN
// ─────────────────────────────────────────────
const WinScreen = ({ winner, players }) => {
    const isMafia = winner === 'mafia'
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 relative overflow-hidden font-sans">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className={`absolute top-[10%] left-[20%] w-[60%] h-[60%] ${isMafia ? 'bg-red-700/40' : 'bg-emerald-600/40'} blur-[150px] rounded-full`} />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            </div>

            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, type: 'spring', damping: 20 }}
                className="relative z-10 flex flex-col items-center text-center max-w-2xl w-full"
            >
                <motion.div initial={{ rotate: -10, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.5, type: "spring", stiffness: 200 }} className="relative mb-8">
                    <div className={`absolute inset-0 ${isMafia ? 'bg-red-500/30' : 'bg-emerald-500/30'} blur-3xl rounded-full`} />
                    <span className="text-9xl drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] filter relative z-10">{isMafia ? '🔪' : '🏆'}</span>
                </motion.div>

                <h2 className={`text-6xl md:text-8xl font-black uppercase tracking-tighter mb-4 text-transparent bg-clip-text ${isMafia ? 'bg-gradient-to-br from-red-400 to-rose-700 drop-shadow-[0_0_20px_rgba(225,29,72,0.5)]' : 'bg-gradient-to-br from-emerald-300 to-teal-600 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]'}`}>
                    {isMafia ? 'La Mafia Règle' : 'Victoire du Village'}
                </h2>
                <p className="text-white/60 font-medium text-lg mb-12 tracking-wide">
                    {isMafia ? "L'ombre a englouti la ville pour toujours." : "La vérité a triomphé dans la lumière du jour."}
                </p>

                {/* Role reveals */}
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="w-full bg-white/5 backdrop-blur-3xl border border-white/20 rounded-[2rem] p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mb-6 relative z-10">Révélation des identités secrètes</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                        {players.map(p => {
                            const meta = ROLE_META[p.role] || ROLE_META.villager
                            return (
                                <div key={p.id} className={`flex items-center gap-4 px-5 py-4 rounded-2xl border ${!p.is_alive ? 'opacity-40 grayscale border-white/5 bg-black/40' : `bg-black/40 border-white/10 ${meta.border} shadow-[0_0_15px_rgba(255,255,255,0.05)]`}`}>
                                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-3xl shadow-inner border border-white/10">{meta.icon}</div>
                                    <div className="text-left flex-1">
                                        <p className="text-white font-bold text-base">{p.username}</p>
                                        <p className={`text-[10px] uppercase font-black tracking-widest ${meta.color}`}>{meta.label}</p>
                                    </div>
                                    {!p.is_alive && <span className="ml-auto text-2xl filter drop-shadow-md">💀</span>}
                                </div>
                            )
                        })}
                    </div>
                </motion.div>

                <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} href="/" className="mt-12 px-12 py-5 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-xl rounded-full text-white font-bold uppercase tracking-[0.2em] text-sm shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all z-10">
                    Jouer une nouvelle partie
                </motion.a>
            </motion.div>
        </div>
    )
}

// ─────────────────────────────────────────────
// DEAD SCREEN
// ─────────────────────────────────────────────
const DeadScreen = ({ phase, events }) => {
    const latestEvent = [...events].reverse().find(e => ['night_result', 'day_result'].includes(e.event_type))
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-center p-4 relative overflow-hidden font-sans">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-black/60 z-10" />
                <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-slate-700/20 blur-[100px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay z-0"></div>
            </div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="relative z-20 flex flex-col items-center">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full" />
                    <span className="text-9xl drop-shadow-2xl grayscale filter opacity-80">💀</span>
                </div>
                <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-slate-400 to-slate-700 uppercase tracking-tighter mb-4 drop-shadow-md">Vous êtes mort·e</h2>
                <p className="text-slate-500 font-medium text-lg mb-12 tracking-wide">Observez la chute de la ville en silence.</p>

                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl px-10 py-6 max-w-sm shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.4em] mb-2">Phase actuelle de la ville</p>
                    <p className="text-white/80 font-mono text-xl uppercase tracking-widest">{phase?.replace(/_/g, ' ')}</p>
                </div>
            </motion.div>
        </div>
    )
}

// ─────────────────────────────────────────────
// CHATBOX
// ─────────────────────────────────────────────
const ChatBox = ({ roomId, players, currentPlayerId, phase }) => {
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
    }

    useEffect(() => {
        if (isOpen) scrollToBottom()
    }, [messages, isOpen])

    useEffect(() => {
        if (!roomId) return

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('room_id', roomId)
                .order('created_at', { ascending: true })
                .limit(50)
            if (data) {
                setMessages(data)
                scrollToBottom()
            }
        }
        fetchMessages()

        const channel = supabase.channel(`chat_${roomId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, (payload) => {
                setMessages(prev => [...prev, payload.new])
            })
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [roomId])

    const sendMessage = async (e) => {
        e.preventDefault()
        if (!newMessage.trim() || !currentPlayerId) return
        const content = newMessage.trim()
        setNewMessage('')
        await supabase.from('chat_messages').insert([{
            room_id: roomId,
            player_id: currentPlayerId,
            content
        }])
    }

    const currentPlayer = players.find(p => p.id === currentPlayerId)
    // Everybody can see chat, but only alive players (or players in lobby/game over) can send
    const canSend = currentPlayer && (currentPlayer.is_alive || phase === 'lobby' || phase === 'game_over')

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none font-sans">
            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.3, type: "spring", stiffness: 250, damping: 25 }}
                        className="bg-black/60 backdrop-blur-3xl border border-white/20 rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.6)] w-[340px] h-[450px] flex flex-col overflow-hidden pointer-events-auto origin-bottom-right absolute bottom-20 right-0 mb-2"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                        <div className="bg-white/5 backdrop-blur-md px-5 py-4 border-b border-white/10 flex justify-between items-center shrink-0 relative z-10">
                            <h3 className="text-white font-bold text-sm flex items-center gap-3 uppercase tracking-widest">
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                                Chat Live
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all">
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar flex flex-col relative z-10 w-full">
                            {messages.length === 0 ? (
                                <p className="text-white/30 italic text-sm text-center my-auto font-medium">Rejoignez la conversation...</p>
                            ) : (
                                messages.map(msg => {
                                    const isMe = msg.player_id === currentPlayerId
                                    const author = players.find(p => p.id === msg.player_id)
                                    const authorName = author ? author.username : 'Inconnu'
                                    const roleColor = author?.role === 'mafia' ? 'text-red-400' : 'text-slate-300'
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full`}>
                                            <span className={`text-[10px] uppercase font-bold tracking-widest mb-1 px-1 ${isMe ? 'text-white/40' : roleColor}`}>
                                                {authorName} {!author?.is_alive && '💀'}
                                            </span>
                                            <div className={`px-4 py-2.5 rounded-2xl text-[13px] font-medium max-w-[85%] break-words shadow-md ${isMe
                                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-sm border border-white/20 shadow-[0_4px_15px_rgba(147,51,234,0.3)]'
                                                : 'bg-white/10 text-slate-100 border border-white/10 rounded-bl-sm backdrop-blur-md'
                                                }`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {canSend ? (
                            <form onSubmit={sendMessage} className="p-4 bg-black/40 border-t border-white/10 flex gap-2 shrink-0 relative z-10">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Message..."
                                    maxLength={120}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all backdrop-blur-md"
                                />
                                <button type="submit" disabled={!newMessage.trim()} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:grayscale text-white px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] flex items-center justify-center font-bold">
                                    ➤
                                </button>
                            </form>
                        ) : (
                            <div className="p-4 bg-black/40 border-t border-white/10 text-center shrink-0 relative z-10">
                                <p className="text-red-400/80 italic text-xs font-bold uppercase tracking-widest">Les morts ne parlent pas...</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white p-4 w-16 h-16 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative pointer-events-auto flex items-center justify-center group transition-all"
            >
                <span className="absolute inset-0 bg-gradient-to-tr from-purple-600/20 to-blue-600/20 rounded-[2rem] blur-md opacity-0 group-hover:opacity-100 transition-opacity"></span>
                <span className="text-2xl relative z-10 drop-shadow-md">💬</span>
                {!isOpen && messages.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-600 to-rose-500 text-white font-black text-[10px] w-6 h-6 flex items-center justify-center rounded-full border border-white/20 shadow-[0_0_15px_rgba(225,29,72,0.8)] animate-bounce z-20">
                        !
                    </span>
                )}
            </motion.button>
        </div>
    )
}

// ─────────────────────────────────────────────
// MAIN GAME ROOM COMPONENT
// ─────────────────────────────────────────────
export default function GameRoom({ roomId }) {
    const [me, setMe] = useState(null)
    const [room, setRoom] = useState(null)
    const [players, setPlayers] = useState([])
    const [phase, setPhase] = useState('lobby')
    const [roleAcknowledged, setRoleAcknowledged] = useState(false)
    const [events, setEvents] = useState([])
    const [detectiveOwnResult, setDetectiveOwnResult] = useState(null)

    // Keep me in sync with players list
    const meRef = useRef(null)
    meRef.current = me

    // ── Initial fetch + realtime subscription ──
    useEffect(() => {
        if (!roomId) return

        const fetchInitialData = async () => {
            const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single()
            if (roomData) { setRoom(roomData); setPhase(roomData.status) }

            const { data: playersData } = await supabase.from('players').select('*').eq('room_id', roomId).order('created_at', { ascending: true })
            if (playersData) setPlayers(playersData)

            const { data: eventsData } = await supabase.from('game_events').select('*').eq('room_id', roomId).order('created_at', { ascending: true })
            if (eventsData) setEvents(eventsData)
        }
        fetchInitialData()

        const channel = supabase.channel(`game_room_${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
                setRoom(payload.new)
                setPhase(payload.new.status)
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, (payload) => {
                setPlayers(prev => {
                    if (payload.eventType === 'INSERT') return [...prev, payload.new]
                    if (payload.eventType === 'UPDATE') return prev.map(p => p.id === payload.new.id ? payload.new : p)
                    if (payload.eventType === 'DELETE') return prev.filter(p => p.id !== payload.old.id)
                    return prev
                })
                if (meRef.current && payload.new?.user_id === meRef.current.user_id) {
                    setMe(payload.new)
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_events', filter: `room_id=eq.${roomId}` }, (payload) => {
                setEvents(prev => [...prev, payload.new])
                // Extract detective result for the detective player
                if (payload.new.event_type === 'night_result' && meRef.current?.role === 'detective') {
                    setDetectiveOwnResult(payload.new.payload?.detectiveResult ?? null)
                }
            })
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [roomId])

    // ── Handlers ──
    const handleJoinLobby = async (username) => {
        if (room && room.status !== 'lobby') return
        const mockUserId = 'user_' + Math.random().toString(36).substr(2, 9)
        if (players.length === 0 && room && !room.host_id) {
            await supabase.from('rooms').update({ host_id: mockUserId }).eq('id', roomId)
        }
        const { data } = await supabase.from('players').insert([{
            room_id: roomId, user_id: mockUserId, username,
            is_alive: true, is_protected: false, role: 'villager', is_ready: false,
        }]).select().single()
        if (data) setMe(data)
    }

    const handleStartGame = async () => {
        try {
            await api('/api/game/start', { roomId })
        } catch (err) {
            console.error('Start game error:', err.message)
            alert('Erreur au démarrage: ' + err.message)
        }
    }

    const handleRoleAcknowledge = async () => {
        setRoleAcknowledged(true)
        try {
            await api('/api/game/ready', { roomId, playerId: me.id })
        } catch (err) {
            console.error('Ready error:', err.message)
        }
    }

    const handleNightAction = async (targetId) => {
        if (!me) return
        let actionType = 'kill'
        if (me.role === 'doctor') actionType = 'save'
        else if (me.role === 'detective') actionType = 'check'
        try {
            await api('/api/game/night-action', { roomId, actorId: me.id, targetId, actionType })
        } catch (err) {
            console.error('Night action error:', err.message)
        }
    }

    const handleVote = async (targetId) => {
        if (!me) return
        try {
            await api('/api/game/vote', { roomId, actorId: me.id, targetId })
        } catch (err) {
            console.error('Vote error:', err.message)
        }
    }

    // ── Computed values ──
    const isHost = room?.host_id === me?.user_id || (!room?.host_id && players[0]?.id === me?.id)

    // Mafia team list (names, excluding self)
    const mafiaTeam = players
        .filter(p => p.role === 'mafia' && p.user_id !== me?.user_id)
        .map(p => p.username)

    // ── State machine rendering ──
    const renderPhase = () => {
        // Game over
        if (phase === 'game_over' && room?.winner) {
            return <WinScreen winner={room.winner} players={players} />
        }

        // Lobby / join
        if (phase === 'lobby' || !me) {
            return (
                <Lobby
                    room={room} players={players} isHost={isHost}
                    onStart={handleStartGame} onJoin={handleJoinLobby}
                    currentUserId={me?.user_id}
                />
            )
        }

        // Role reveal
        if (phase === 'roles') {
            if (!roleAcknowledged) {
                return (
                    <RoleReveal
                        role={me.role}
                        mafiaTeam={mafiaTeam}
                        onAcknowledge={handleRoleAcknowledge}
                    />
                )
            }
            return (
                <div className="min-h-screen bg-black flex flex-col items-center justify-center text-slate-500 font-serif">
                    <div className="w-8 h-8 border-4 border-slate-800 border-t-red-600 rounded-full animate-spin mb-6" />
                    <p className="animate-pulse">En attente des autres joueurs...</p>
                </div>
            )
        }

        // Dead player
        if (!me.is_alive) {
            if (phase === 'game_over' && room?.winner) {
                return <WinScreen winner={room.winner} players={players} />
            }
            return <DeadScreen phase={phase} events={events} />
        }

        // Night phases
        if (phase.startsWith('night')) {
            return (
                <NightOverlay
                    playerRole={me.role}
                    players={players}
                    currentPhase={phase}
                    currentUserId={me.user_id}
                    onAction={handleNightAction}
                    detectiveResult={detectiveOwnResult}
                />
            )
        }

        // Day phases
        if (phase === 'day_discussion' || phase === 'day_vote') {
            return (
                <DayPhase
                    players={players}
                    currentUserId={me.user_id}
                    onVote={handleVote}
                    phase={phase}
                    events={events}
                    playerRole={me.role}
                    detectiveOwnResult={detectiveOwnResult}
                />
            )
        }

        // Fallback
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-slate-500 font-serif">
                <div className="w-8 h-8 border-4 border-slate-800 border-t-red-600 rounded-full animate-spin mr-4" />
                Synchronisation ({phase})...
            </div>
        )
    }

    return (
        <>
            {renderPhase()}
            {me && phase !== 'roles' && <ChatBox roomId={roomId} players={players} currentPlayerId={me.id} phase={phase} />}
        </>
    )
}

