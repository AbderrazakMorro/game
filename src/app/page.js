'use client'

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
        <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/10 blur-[100px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-900/10 blur-[80px] rounded-full"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-md z-10 flex flex-col items-center"
            >
                <h1 className="text-6xl md:text-7xl font-serif text-red-700 font-bold tracking-[0.2em] uppercase mb-2 drop-shadow-[0_0_15px_rgba(185,28,28,0.5)] text-center">
                    Mafia
                </h1>
                <p className="text-slate-400 font-serif italic mb-12 text-center tracking-widest text-sm uppercase">
                    La ville s'endort...
                </p>

                <div className="w-full bg-slate-900/80 backdrop-blur-md p-8 rounded-2xl border border-slate-800 shadow-2xl flex flex-col gap-6">
                    <button
                        onClick={createRoom}
                        disabled={isCreating}
                        className="w-full group relative overflow-hidden rounded-xl bg-red-800 p-[1px] transition-all hover:bg-red-700 disabled:opacity-50"
                    >
                        <div className="relative flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-8 py-4 transition-all group-hover:bg-slate-950/50">
                            <span className="text-red-500 font-bold uppercase tracking-wider group-hover:text-red-400 transition-colors">
                                {isCreating ? 'Création...' : 'Créer une partie'}
                            </span>
                        </div>
                    </button>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-800"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-600 font-serif text-sm italic">ou rejoindre</span>
                        <div className="flex-grow border-t border-slate-800"></div>
                    </div>

                    <form onSubmit={joinRoom} className="flex flex-col gap-4">
                        <input
                            type="text"
                            placeholder="Code de la salle (ex: A1B2C3)"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-center text-white text-lg tracking-[0.2em] uppercase focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all placeholder:text-slate-700 placeholder:normal-case placeholder:tracking-normal placeholder:text-sm"
                            maxLength={6}
                        />
                        <button
                            type="submit"
                            disabled={joinCode.length < 3}
                            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide text-sm"
                        >
                            Rejoindre
                        </button>
                    </form>
                </div>
            </motion.div>
        </main>
    )
}
