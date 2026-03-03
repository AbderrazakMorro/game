import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Custom hook to manage media devices (microphone) access, state, and Voice Activity Detection (VAD).
 */
export function useMicrophone() {
    const [stream, setStream] = useState(null)
    const [error, setError] = useState(null)
    const [permissionStatus, setPermissionStatus] = useState('prompt') // 'granted' | 'denied' | 'prompt'
    const [isMuted, setIsMuted] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)

    const audioContextRef = useRef(null)
    const analyserRef = useRef(null)
    const sourceRef = useRef(null)
    const animationFrameRef = useRef(null)

    const stopVAD = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
            animationFrameRef.current = null
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect()
            sourceRef.current = null
        }
        if (analyserRef.current) {
            analyserRef.current.disconnect()
            analyserRef.current = null
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close()
            audioContextRef.current = null
        }
        setIsSpeaking(false)
    }, [])

    const startVAD = useCallback((mediaStream) => {
        stopVAD()
        try {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
            analyserRef.current = audioContextRef.current.createAnalyser()
            analyserRef.current.fftSize = 512
            analyserRef.current.smoothingTimeConstant = 0.1

            sourceRef.current = audioContextRef.current.createMediaStreamSource(mediaStream)
            sourceRef.current.connect(analyserRef.current)

            const bufferLength = analyserRef.current.frequencyBinCount
            const dataArray = new Uint8Array(bufferLength)

            const checkAudioLevel = () => {
                if (!analyserRef.current) return
                analyserRef.current.getByteFrequencyData(dataArray)

                let sum = 0
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i]
                }
                const average = sum / bufferLength

                // Threshold for speaking (adjust as needed, typically 10-30 for quiet rooms)
                if (average > 15) {
                    setIsSpeaking(true)
                } else {
                    setIsSpeaking(false)
                }

                animationFrameRef.current = requestAnimationFrame(checkAudioLevel)
            }

            checkAudioLevel()
        } catch (err) {
            console.error('Error starting VAD:', err)
        }
    }, [stopVAD])


    const getMicrophone = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
            setStream(mediaStream)
            setPermissionStatus('granted')
            setError(null)

            // Apply initial mute state to the new stream
            mediaStream.getAudioTracks().forEach(track => {
                track.enabled = !isMuted
            })

            startVAD(mediaStream)

            return mediaStream
        } catch (err) {
            console.error('Error accessing microphone:', err)
            setError(err.name)
            if (err.name === 'NotAllowedError') {
                setPermissionStatus('denied')
            }
            return null
        }
    }, [isMuted, startVAD])

    const stopStream = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
            stopVAD()
        }
    }, [stream, stopVAD])

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const nextMuted = !prev
            if (stream) {
                stream.getAudioTracks().forEach(track => {
                    track.enabled = !nextMuted
                })
            }
            if (nextMuted) {
                setIsSpeaking(false) // Force speaking to false when muted
            }
            return nextMuted
        })
    }, [stream])

    // Force Mute directly (e.g. from server or rules)
    const setMuted = useCallback((muted) => {
        setIsMuted(muted)
        if (stream) {
            stream.getAudioTracks().forEach(track => {
                track.enabled = !muted
            })
        }
        if (muted) {
            setIsSpeaking(false)
        }
    }, [stream])


    useEffect(() => {
        // Cleanup VAD and stream on unmount
        return () => {
            stopVAD()
        }
    }, [stopVAD])


    useEffect(() => {
        // Check initial permission status if supported
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'microphone' }).then((result) => {
                setPermissionStatus(result.state)
                result.onchange = () => setPermissionStatus(result.state)
            })
        }
    }, [])

    return {
        stream,
        error,
        permissionStatus,
        isMuted,
        isSpeaking: !isMuted && isSpeaking, // Double check we don't say we're speaking if muted
        getMicrophone,
        stopStream,
        toggleMute,
        setMuted
    }
}
