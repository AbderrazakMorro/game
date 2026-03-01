import { NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabaseServer'
import { tallyVotes, checkWinCondition } from '../../../../utils/gameLogic'

/**
 * POST /api/game/vote
 * Body: { roomId, actorId, targetId }
 *
 * Records a day vote. When ALL alive players have voted:
 * - Tally votes → eliminate player with majority
 * - Reveal eliminated player's role in game_event
 * - Check win condition
 * - Advance to next night (night_mafia) or game_over
 */
export async function POST(request) {
    try {
        const { roomId, actorId, targetId } = await request.json()
        if (!roomId || !actorId || !targetId) {
            return NextResponse.json({ error: 'roomId, actorId, targetId required' }, { status: 400 })
        }

        const supabase = createServerClient()

        // Fetch room
        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single()
        if (roomError) throw roomError

        // Prevent double voting
        const { data: existing } = await supabase
            .from('actions')
            .select('id')
            .eq('room_id', roomId)
            .eq('phase_number', room.phase_number)
            .eq('actor_id', actorId)
            .eq('action_type', 'vote')
        if (existing && existing.length > 0) {
            return NextResponse.json({ error: 'Already voted' }, { status: 409 })
        }

        // Record vote
        const { error: insertError } = await supabase
            .from('actions')
            .insert([{ room_id: roomId, phase_number: room.phase_number, action_type: 'vote', actor_id: actorId, target_id: targetId }])
        if (insertError) throw insertError

        // Fetch all alive players
        const { data: players, error: playersError } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', roomId)
        if (playersError) throw playersError

        const alivePlayers = players.filter(p => p.is_alive)

        // Check if all alive players have voted
        const { data: votes } = await supabase
            .from('actions')
            .select('*')
            .eq('room_id', roomId)
            .eq('phase_number', room.phase_number)
            .eq('action_type', 'vote')

        const alreadyVotedIds = new Set(votes.map(v => v.actor_id))
        const allVoted = alivePlayers.every(p => alreadyVotedIds.has(p.id))

        if (allVoted) {
            // Tally and eliminate
            const eliminatedId = tallyVotes(votes)
            let updatedPlayers = [...players]

            if (eliminatedId) {
                const { error } = await supabase
                    .from('players')
                    .update({ is_alive: false })
                    .eq('id', eliminatedId)
                if (error) throw error
                updatedPlayers = updatedPlayers.map(p => p.id === eliminatedId ? { ...p, is_alive: false } : p)
            }

            const eliminatedPlayer = players.find(p => p.id === eliminatedId)

            // Broadcast day result event
            await supabase.from('game_events').insert([{
                room_id: roomId,
                phase_number: room.phase_number,
                event_type: 'day_result',
                payload: {
                    eliminated: eliminatedId
                        ? { id: eliminatedId, username: eliminatedPlayer?.username, role: eliminatedPlayer?.role }
                        : null,
                    tie: !eliminatedId,
                },
            }])

            // Check win condition
            const winner = checkWinCondition(updatedPlayers)
            if (winner) {
                await supabase.from('rooms').update({ status: 'game_over', winner }).eq('id', roomId)
                await supabase.from('game_events').insert([{
                    room_id: roomId,
                    phase_number: room.phase_number,
                    event_type: 'game_over',
                    payload: { winner },
                }])
            } else {
                // Next cycle: increment phase_number, go to night_mafia
                await supabase.from('rooms')
                    .update({ status: 'night_mafia', phase_number: room.phase_number + 1 })
                    .eq('id', roomId)
            }
        }

        return NextResponse.json({ success: true, allVoted })
    } catch (err) {
        console.error('[/api/game/vote]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
