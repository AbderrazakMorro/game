'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

export default function Home() {
    const router = useRouter()
    const [isCreating, setIsCreating] = useState(false)
    const [joinCode, setJoinCode] = useState('')

    const createRoom = async () => {
        setIsCreating(true)

        // Génère un code court de 6 caractères
        const code = Math.random().toString(36).substring(2, 8).toUpperCase()

        const { data, error } = await supabase.from('rooms').insert([{
            code,
            status: 'lobby'
        }]).select().single()

        if (error) {
            console.error("Erreur création room:", error)
            setIsCreating(false)
            return
        }

        router.push(`/room/${data.id}`)
    }

    const joinRoom = async (e) => {
        e.preventDefault()
        if (!joinCode.trim()) return

        const { data, error } = await supabase
            .from('rooms')
            .select('id')
            .eq('code', joinCode.toUpperCase())
            .single()

        if (error || !data) {
            alert("Code invalide ou salle introuvable.")
            return
        }

        router.push(`/room/${data.id}`)
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-950 relative overflow-hidden font-sans">
            {/* Vibrant Animated Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-600/30 blur-[120px] rounded-full"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-600/20 blur-[100px] rounded-full"
                />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
                className="w-full max-w-md z-10 flex flex-col items-center"
            >
                {/* Stunning Title */}
                <div className="relative mb-2">
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute inset-0 blur-2xl bg-gradient-to-r from-red-600 to-purple-600 opacity-50"
                    />
                    <h1 className="relative text-7xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-red-500 via-rose-400 to-orange-500 uppercase drop-shadow-lg text-center">
                        Mafia
                    </h1>
                </div>
                <p className="text-purple-200/70 font-medium mb-10 text-center tracking-[0.3em] text-sm uppercase">
                    La ville s'endort...
                </p>

                {/* Glassmorphic Panel */}
                <div className="w-full bg-white/5 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] flex flex-col gap-6 relative overflow-hidden">
                    {/* Inner highlight */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={createRoom}
                        disabled={isCreating}
                        className="relative w-full group rounded-2xl p-[2px] overflow-hidden"
                    >
                        <span className="absolute inset-0 bg-gradient-to-r from-red-500 via-purple-500 to-red-500 rounded-2xl opacity-70 group-hover:opacity-100 transition-opacity blur-sm"></span>
                        <div className="relative bg-slate-900/90 group-hover:bg-slate-900/70 transition-colors backdrop-blur-sm rounded-2xl px-8 py-5 flex items-center justify-center">
                            <span className="text-white font-bold text-lg uppercase tracking-widest drop-shadow-md flex items-center gap-3">
                                {isCreating ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Création...
                                    </>
                                ) : (
                                    <>
                                        <span className="text-2xl">🎭</span> Créer une partie
                                    </>
                                )}
                            </span>
                        </div>
                    </motion.button>

                    <div className="relative flex items-center py-2 opacity-50">
                        <div className="flex-grow border-t border-white/20"></div>
                        <span className="flex-shrink-0 mx-4 text-white/50 font-medium text-xs tracking-widest uppercase">ou rejoindre</span>
                        <div className="flex-grow border-t border-white/20"></div>
                    </div>

                    <form onSubmit={joinRoom} className="flex flex-col gap-4 relative z-10">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Code de la salle"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-center text-white text-xl font-bold tracking-[0.2em] uppercase focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-white/20 placeholder:normal-case placeholder:tracking-normal placeholder:font-normal placeholder:text-base backdrop-blur-md"
                                maxLength={6}
                            />
                        </div>
                        <motion.button
                            whileHover={{ scale: joinCode.length >= 3 ? 1.02 : 1 }}
                            whileTap={{ scale: joinCode.length >= 3 ? 0.98 : 1 }}
                            type="submit"
                            disabled={joinCode.length < 3}
                            className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold py-5 rounded-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-widest text-sm backdrop-blur-md shadow-lg"
                        >
                            Rejoindre la salle
                        </motion.button>
                    </form>
                </div>
            </motion.div>
        </main>
    )
}
