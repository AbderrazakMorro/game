'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getCookieConsent, setCookieConsent } from '../utils/cookieUtils'

export default function CookieConsentBanner({ onConsentChange }) {
    const [isVisible, setIsVisible] = useState(false)
    const [consentState, setConsentState] = useState(null) // 'granted', 'denied', or null

    useEffect(() => {
        // Run on client mount
        const currentConsent = getCookieConsent()
        setConsentState(currentConsent)

        // If they haven't decided yet, show the banner
        if (currentConsent === null) {
            // Small delay so it slides in after the user has a moment to read the main screen
            const timer = setTimeout(() => setIsVisible(true), 1500)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleAllow = () => {
        setCookieConsent('granted')
        setConsentState('granted')
        setIsVisible(false)
        if (onConsentChange) onConsentChange('granted')
    }

    const handleDecline = () => {
        setCookieConsent('denied')
        setConsentState('denied')
        setIsVisible(false)
        if (onConsentChange) onConsentChange('denied')
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:max-w-md z-[9999]"
                >
                    <div className="bg-slate-900/95 backdrop-blur-xl border border-white/20 p-5 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] overflow-hidden relative">
                        {/* Glow effect */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-purple-500 to-red-500 rounded-full blur-[2px]" />

                        <div className="flex items-start gap-4">
                            <div className="text-3xl shrink-0 mt-1">🍪</div>
                            <div className="flex-1">
                                <h3 className="text-white font-bold text-lg mb-1 tracking-wide">
                                    Sauvegarde de session
                                </h3>
                                <p className="text-slate-300 text-sm leading-relaxed mb-4 font-medium">
                                    Nous utilisons un cookie pour mémoriser votre identité afin que vous puissiez rafraîchir la page sans perdre votre place dans la salle.
                                </p>

                                <div className="flex gap-3 mt-4">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleAllow}
                                        className="flex-1 bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-500 hover:to-red-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] uppercase tracking-wider"
                                    >
                                        Accepter
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleDecline}
                                        className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-all uppercase tracking-wider"
                                    >
                                        Refuser
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
