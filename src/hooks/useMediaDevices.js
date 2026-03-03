import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook to manage media devices (microphone) access and state.
 */
export function useMediaDevices() {
    const [stream, setStream] = useState(null)
    const [error, setError] = useState(null)
    const [permissionStatus, setPermissionStatus] = useState('prompt') // 'granted' | 'denied' | 'prompt'

    const getMicrophone = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
            setStream(mediaStream)
            setPermissionStatus('granted')
            setError(null)
            return mediaStream
        } catch (err) {
            console.error('Error accessing microphone:', err)
            setError(err.name)
            if (err.name === 'NotAllowedError') {
                setPermissionStatus('denied')
            }
            return null
        }
    }, [])

    const stopStream = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
        }
    }, [stream])

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
        getMicrophone,
        stopStream
    }
}
