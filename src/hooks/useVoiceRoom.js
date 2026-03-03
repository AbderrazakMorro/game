import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const ICE_SERVERS = [
    { urls: 'stun:free.expressturn.com:3478' },
    {
        urls: 'turn:free.expressturn.com:3478',
        username: '000000002087928581',
        credential: '7fBsTEZdZTKhfX+gg+mnzAVIIZE='
    }
]

export function useVoiceRoom({ roomId, playerId, roomStatus, playerRole, isAlive, localStream }) {
    const [participants, setParticipants] = useState([])
    const [remoteStreams, setRemoteStreams] = useState({}) // { playerId: MediaStream }
    const [isConnected, setIsConnected] = useState(false)
    const [isMuted, setIsMuted] = useState(false)

    const peerConnections = useRef({}) // { remotePlayerId: RTCPeerConnection }
    const channelRef = useRef(null)
    const voiceRoomIdRef = useRef(null)

    const cleanupPeer = useCallback((pid) => {
        if (peerConnections.current[pid]) {
            peerConnections.current[pid].close()
            delete peerConnections.current[pid]
        }
        setRemoteStreams(prev => {
            const next = { ...prev }
            delete next[pid]
            return next
        })
    }, [])

    const createPeerConnection = useCallback((remotePlayerId, isInitiator) => {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
        peerConnections.current[remotePlayerId] = pc

        // Add local tracks
        if (localStream) {
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream)
            })
        }

        pc.onicecandidate = (event) => {
            if (event.candidate && channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'ice-candidate',
                    payload: {
                        from: playerId,
                        to: remotePlayerId,
                        candidate: event.candidate
                    }
                })
            }
        }

        pc.ontrack = (event) => {
            setRemoteStreams(prev => ({
                ...prev,
                [remotePlayerId]: event.streams[0]
            }))
        }

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                cleanupPeer(remotePlayerId)
            }
        }

        if (isInitiator) {
            pc.createOffer().then(offer => {
                return pc.setLocalDescription(offer)
            }).then(() => {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'sdp-offer',
                    payload: {
                        from: playerId,
                        to: remotePlayerId,
                        sdp: pc.localDescription
                    }
                })
            })
        }

        return pc
    }, [playerId, localStream, cleanupPeer])

    // Join or Switch Voice Room
    const joinVoiceRoom = useCallback(async (type) => {
        // 1. Cleanup old connections
        Object.keys(peerConnections.current).forEach(cleanupPeer)
        if (channelRef.current) supabase.removeChannel(channelRef.current)

        // 2. Find or create voice room in DB
        const { data: vRoom, error: vError } = await supabase
            .from('voice_rooms')
            .select('id')
            .eq('room_id', roomId)
            .eq('type', type)
            .maybeSingle()

        let currentVoiceRoomId = vRoom?.id

        if (!currentVoiceRoomId) {
            const { data: newVRoom, error: insError } = await supabase
                .from('voice_rooms')
                .insert({ room_id: roomId, type })
                .select()
                .maybeSingle()
            if (newVRoom) currentVoiceRoomId = newVRoom.id
        }

        if (!currentVoiceRoomId) return

        voiceRoomIdRef.current = currentVoiceRoomId

        // 3. Sync Presence/Participants in DB
        await supabase
            .from('voice_participants')
            .upsert({
                voice_room_id: currentVoiceRoomId,
                player_id: playerId,
                is_connected: true,
                is_muted: isMuted
            }, { onConflict: 'voice_room_id,player_id' })

        // 4. Setup Signaling Channel
        const channel = supabase.channel(`voice:${currentVoiceRoomId}`, {
            config: {
                broadcast: { self: false }
            }
        })

        channel
            .on('broadcast', { event: 'sdp-offer' }, async ({ payload }) => {
                if (payload.to !== playerId) return
                const pc = createPeerConnection(payload.from, false)
                await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
                const answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                channel.send({
                    type: 'broadcast',
                    event: 'sdp-answer',
                    payload: { from: playerId, to: payload.from, sdp: answer }
                })
            })
            .on('broadcast', { event: 'sdp-answer' }, async ({ payload }) => {
                if (payload.to !== playerId) return
                const pc = peerConnections.current[payload.from]
                if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            })
            .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
                if (payload.to !== playerId) return
                const pc = peerConnections.current[payload.from]
                if (pc) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true)
                    // Let others know we've joined
                    channel.send({
                        type: 'broadcast',
                        event: 'peer-joined',
                        payload: { from: playerId }
                    })
                }
            })

        channel.on('broadcast', { event: 'peer-joined' }, ({ payload }) => {
            // New peer joined, initiate connection
            createPeerConnection(payload.from, true)
        })

        channelRef.current = channel
    }, [roomId, playerId, isMuted, createPeerConnection, cleanupPeer])

    // Routing Logic based on roomStatus and playerRole
    useEffect(() => {
        if (!isAlive || !roomId || !playerId) {
            // Immediately disconnect
            Object.keys(peerConnections.current).forEach(cleanupPeer)
            if (channelRef.current) supabase.removeChannel(channelRef.current)
            setIsConnected(false)
            return
        }

        // Logic sync: night_mafia -> mafia-only voice room
        const isNightMafia = roomStatus === 'night_mafia'
        const targetType = (isNightMafia && playerRole === 'mafia') ? 'mafia' : 'global'

        if (isNightMafia && playerRole !== 'mafia') {
            setIsMuted(true)
        } else {
            setIsMuted(false)
        }

        joinVoiceRoom(targetType)

        return () => {
            Object.keys(peerConnections.current).forEach(cleanupPeer)
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
                // Call cleanup API
                fetch('/api/voice/cleanup', {
                    method: 'POST',
                    body: JSON.stringify({ playerId, voiceRoomId: voiceRoomIdRef.current })
                }).catch(console.error)
            }
        }
    }, [roomStatus, playerRole, isAlive, roomId, playerId, joinVoiceRoom, cleanupPeer])

    const toggleMute = useCallback(async () => {
        const nextMuted = !isMuted
        setIsMuted(nextMuted)
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !nextMuted
            })
        }
        // Sync with DB
        if (voiceRoomIdRef.current) {
            await supabase
                .from('voice_participants')
                .update({ is_muted: nextMuted })
                .match({ voice_room_id: voiceRoomIdRef.current, player_id: playerId })
        }
    }, [isMuted, playerId, localStream])

    return {
        isConnected,
        isMuted,
        toggleMute,
        remoteStreams,
        participants
    }
}
