import { NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabaseServer'
import { resolveNightActions, checkWinCondition, getNextPhase } from '../../../../utils/gameLogic'

/**
 * POST /api/game/night-action
 * Body: { roomId, actorId, targetId, actionType }
 * actionType: 'kill' | 'save' | 'check'
 *
 * Records the night action. After recording:
 * - If actionType is 'kill' → advance to 'night_doctor'
 * - If actionType is 'save' → advance to 'night_detective' (if detective alive) or resolve night
 * - If actionType is 'check' → resolve the full night, broadcast event, advance to 'day_discussion'
 *
 * Night resolution order:
 *   1. Doctor protection applied
 *   2. Mafia kill resolved (blocked if protected)
 *   3. Detective result computed
 *   4. game_event broadcast
 *   5. Win condition check
 */
export async function POST(request) {
    try {
        const { roomId, actorId, targetId, actionType } = await request.json()
        if (!roomId || !actorId || !targetId || !actionType) {
            return NextResponse.json({ error: 'roomId, actorId, targetId, actionType required' }, { status: 400 })
        }

        const supabase = createServerClient()

        // Fetch room for phase_number
        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single()
        if (roomError) throw roomError

        // Prevent duplicate actions in same phase by actor
        const { data: existing } = await supabase
            .from('actions')
            .select('id')
            .eq('room_id', roomId)
            .eq('phase_number', room.phase_number)
            .eq('actor_id', actorId)
            .eq('action_type', actionType)
        if (existing && existing.length > 0) {
            return NextResponse.json({ error: 'Action already recorded' }, { status: 409 })
        }

        // Record the action
        const { error: insertError } = await supabase
            .from('actions')
            .insert([{ room_id: roomId, phase_number: room.phase_number, action_type: actionType, actor_id: actorId, target_id: targetId }])
        if (insertError) throw insertError

        // Fetch all players
        const { data: players, error: playersError } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', roomId)
        if (playersError) throw playersError

        const alivePlayers = players.filter(p => p.is_alive)
        const aliveDoctor = alivePlayers.find(p => p.role === 'doctor')
        const aliveDetective = alivePlayers.find(p => p.role === 'detective')

        // Phase transitions based on action type
        if (actionType === 'kill') {
            if (aliveDoctor) {
                // Move to doctor phase
                await supabase.from('rooms').update({ status: 'night_doctor' }).eq('id', roomId)
            } else if (aliveDetective) {
                // Move to detective phase
                await supabase.from('rooms').update({ status: 'night_detective' }).eq('id', roomId)
            } else {
                // Resolve night now
                await _resolveNightAndAdvance(supabase, roomId, room.phase_number, players)
            }
        }
        else if (actionType === 'save') {
            // Move to detective phase (if alive) or resolve night
            if (aliveDetective) {
                await supabase.from('rooms').update({ status: 'night_detective' }).eq('id', roomId)
            } else {
                // No detective — resolve night now
                await _resolveNightAndAdvance(supabase, roomId, room.phase_number, players)
            }
        }
        else if (actionType === 'check') {
            // Detective acted — resolve full night
            await _resolveNightAndAdvance(supabase, roomId, room.phase_number, players)
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[/api/game/night-action]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

/**
 * Internal helper: resolve all night actions and advance to day_discussion.
 * Applies eliminations, broadcasts game_event, checks win condition.
 */
async function _resolveNightAndAdvance(supabase, roomId, phaseNumber, players) {
    // Fetch all actions for this phase
    const { data: actions, error: actionsError } = await supabase
        .from('actions')
        .select('*')
        .eq('room_id', roomId)
        .eq('phase_number', phaseNumber)
    if (actionsError) throw actionsError

    const nightActions = actions.filter(a => ['kill', 'save', 'check'].includes(a.action_type))
    const { eliminatedId, savedId, detectiveResult, detectiveTargetId } = resolveNightActions(nightActions, players)

    // Apply elimination
    let updatedPlayers = [...players]
    if (eliminatedId) {
        const { error } = await supabase
            .from('players')
            .update({ is_alive: false, is_protected: false })
            .eq('id', eliminatedId)
        if (error) throw error
        updatedPlayers = updatedPlayers.map(p => p.id === eliminatedId ? { ...p, is_alive: false } : p)
    }
    // Reset protection flags
    if (savedId) {
        await supabase.from('players').update({ is_protected: true }).eq('id', savedId)
    }
    // Clear protection from previous night for all others
    await supabase.from('players').update({ is_protected: false }).eq('room_id', roomId).neq('id', savedId || '00000000-0000-0000-0000-000000000000')

    // Build event payload
    const eliminatedPlayer = players.find(p => p.id === eliminatedId)
    const detectiveTarget = players.find(p => p.id === detectiveTargetId)

    const eventPayload = {
        eliminated: eliminatedId ? { id: eliminatedId, username: eliminatedPlayer?.username, role: eliminatedPlayer?.role } : null,
        saved: savedId ? true : false,
        detectiveResult: detectiveResult, // true=mafia, false=not mafia, null=no detective
        detectiveTargetId,
        detectiveTargetUsername: detectiveTarget?.username || null,
    }

    // Broadcast game event
    await supabase.from('game_events').insert([{
        room_id: roomId,
        phase_number: phaseNumber,
        event_type: 'night_result',
        payload: eventPayload,
    }])

    // Check win condition
    const winner = checkWinCondition(updatedPlayers)
    if (winner) {
        await supabase.from('rooms').update({ status: 'game_over', winner }).eq('id', roomId)
        await supabase.from('game_events').insert([{
            room_id: roomId,
            phase_number: phaseNumber,
            event_type: 'game_over',
            payload: { winner },
        }])
    } else {
        await supabase.from('rooms').update({ status: 'day_discussion' }).eq('id', roomId)
    }
}
