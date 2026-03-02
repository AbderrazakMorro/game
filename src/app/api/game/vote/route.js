import { NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabaseServer'
import { tallyVotes, checkWinCondition } from '../../../../utils/gameLogic'

/**
 * POST /api/game/vote
 * Body: { roomId, actorId, targetId }
 *
 * Records a day vote. Scoped by phase_number + revote_round to allow
 * multiple voting rounds within the same day phase on a tie.
 *
 * When ALL alive players have voted in the current round:
 *   • Clear winner  → eliminate, clear revote state, check win, advance to night_mafia / game_over
 *   • Tie           → store tiedIds into rooms.revote_candidates, increment revote_round,
 *                     broadcast 'revote' event, keep status = 'day_vote'
 */
export async function POST(request) {
    try {
        const { roomId, actorId, targetId } = await request.json()
        if (!roomId || !actorId || !targetId) {
            return NextResponse.json({ error: 'roomId, actorId, targetId required' }, { status: 400 })
        }

        if (actorId === targetId) {
            return NextResponse.json({ error: 'Players cannot vote for themselves.' }, { status: 400 })
        }

        const supabase = createServerClient()

        // --- Fetch room ---
        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single()
        if (roomError) throw roomError

        if (room.status !== 'day_vote' && room.status !== 'day_discussion') {
            return NextResponse.json({ error: 'Room is not in day_vote phase' }, { status: 409 })
        }

        const { phase_number, revote_round, revote_candidates } = room

        // --- Validate target is eligible in revote ---
        if (revote_candidates && revote_candidates.length > 0) {
            if (!revote_candidates.includes(targetId)) {
                return NextResponse.json({ error: 'Target is not eligible in this revote round' }, { status: 400 })
            }
        }

        // --- Prevent double voting within the same round ---
        const { data: existing } = await supabase
            .from('actions')
            .select('id')
            .eq('room_id', roomId)
            .eq('phase_number', phase_number)
            .eq('revote_round', revote_round)
            .eq('actor_id', actorId)
            .eq('action_type', 'vote')
        if (existing && existing.length > 0) {
            return NextResponse.json({ error: 'Already voted in this round' }, { status: 409 })
        }

        // --- Record the vote ---
        const { error: insertError } = await supabase
            .from('actions')
            .insert([{
                room_id: roomId,
                phase_number,
                revote_round,
                action_type: 'vote',
                actor_id: actorId,
                target_id: targetId,
            }])
        if (insertError) throw insertError

        // --- Fetch all players ---
        const { data: players, error: playersError } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', roomId)
        if (playersError) throw playersError

        const alivePlayers = players.filter(p => p.is_alive)

        // --- Fetch all votes for this round ---
        const { data: votes, error: votesError } = await supabase
            .from('actions')
            .select('*')
            .eq('room_id', roomId)
            .eq('phase_number', phase_number)
            .eq('revote_round', revote_round)
            .eq('action_type', 'vote')
        if (votesError) throw votesError

        // --- Check if all alive players have voted ---
        const votedActorIds = new Set(votes.map(v => v.actor_id))
        const allVoted = alivePlayers.every(p => votedActorIds.has(p.id))

        if (!allVoted) {
            // Still waiting for more votes — return current tally so UI can update
            const voteCounts = {}
            for (const v of votes) {
                voteCounts[v.target_id] = (voteCounts[v.target_id] || 0) + 1
            }
            return NextResponse.json({ success: true, allVoted: false, voteCounts })
        }

        // ========================
        // All players have voted — resolve
        // ========================
        const { winner, tiedIds, counts: voteCounts } = tallyVotes(votes)

        if (winner) {
            // --- Clear winner: eliminate player ---
            const { error: elimError } = await supabase
                .from('players')
                .update({ is_alive: false })
                .eq('id', winner)
            if (elimError) throw elimError

            const updatedPlayers = players.map(p =>
                p.id === winner ? { ...p, is_alive: false } : p
            )
            const eliminatedPlayer = players.find(p => p.id === winner)

            // Broadcast day result event
            await supabase.from('game_events').insert([{
                room_id: roomId,
                phase_number,
                event_type: 'day_result',
                payload: {
                    eliminated: {
                        id: winner,
                        username: eliminatedPlayer?.username,
                        role: eliminatedPlayer?.role,
                    },
                    tie: false,
                    voteCounts,
                },
            }])

            // Reset revote state on the room
            const roomUpdate = {
                revote_candidates: null,
                revote_round: 0,
            }

            // Check win condition
            const gameWinner = checkWinCondition(updatedPlayers)
            if (gameWinner) {
                await supabase
                    .from('rooms')
                    .update({ ...roomUpdate, status: 'game_over', winner: gameWinner })
                    .eq('id', roomId)

                await supabase.from('game_events').insert([{
                    room_id: roomId,
                    phase_number,
                    event_type: 'game_over',
                    payload: { winner: gameWinner },
                }])
            } else {
                // Advance to next night, increment phase counter
                await supabase
                    .from('rooms')
                    .update({ ...roomUpdate, status: 'night_mafia', phase_number: phase_number + 1 })
                    .eq('id', roomId)
            }

            return NextResponse.json({ success: true, allVoted: true, eliminated: winner, voteCounts })
        } else {
            // --- Tie: start a revote round ---
            const newRevoteRound = revote_round + 1

            await supabase
                .from('rooms')
                .update({ revote_candidates: tiedIds, revote_round: newRevoteRound })
                .eq('id', roomId)

            // Broadcast revote event so clients can show the banner
            const tiedPlayers = players
                .filter(p => tiedIds.includes(p.id))
                .map(p => ({ id: p.id, username: p.username }))

            await supabase.from('game_events').insert([{
                room_id: roomId,
                phase_number,
                event_type: 'revote',
                payload: {
                    tie: true,
                    tiedPlayers,
                    revoteRound: newRevoteRound,
                    voteCounts,
                },
            }])

            return NextResponse.json({ success: true, allVoted: true, tie: true, tiedIds, revoteRound: newRevoteRound })
        }
    } catch (err) {
        console.error('[/api/game/vote]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
