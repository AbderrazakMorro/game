import React, { useState, useEffect } from 'react'
import { getCookieConsent, setCookieConsent } from '../utils/cookieUtils'

export default function ConsentBanner() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const consent = getCookieConsent()
        if (!consent) {
            setIsVisible(true)
        }
    }, [])

    const handleAccept = () => {
        setCookieConsent('granted')
        setIsVisible(false)
    }

    const handleDecline = () => {
        setCookieConsent('denied')
        setIsVisible(false)
    }

    if (!isVisible) return null

    return (
        <div className="fixed bottom-4 left-4 right-4 bg-gray-900 text-white p-6 rounded-2xl shadow-2xl border border-gray-700 z-50 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex-1">
                <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                    <span role="img" aria-label="cookie">🍪</span> Cookie Consent
                </h3>
                <p className="text-gray-400 text-sm">
                    We use cookies to save your game session and re-establish your voice connection if you refresh the page. This is optional but recommended for a smoother experience.
                </p>
            </div>
            <div className="flex gap-3 shrink-0">
                <button
                    onClick={handleDecline}
                    className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                    Decline
                </button>
                <button
                    onClick={handleAccept}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                >
                    Accept & Opt-in
                </button>
            </div>
        </div>
    )
}
