import { NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabaseServer'

/**
 * POST /api/game/ready
 * Body: { roomId, playerId }
 * - Marks a player as ready after they acknowledge their role
 * - When ALL players are ready, transitions room to 'night_mafia'
 */
export async function POST(request) {
    try {
        const { roomId, playerId } = await request.json()
        if (!roomId || !playerId) {
            return NextResponse.json({ error: 'roomId and playerId required' }, { status: 400 })
        }

        const supabase = createServerClient()

        // Mark this player as ready
        const { error: updateError } = await supabase
            .from('players')
            .update({ is_ready: true })
            .eq('id', playerId)
            .eq('room_id', roomId)

        if (updateError) throw updateError

        // Fetch all players in this room
        const { data: players, error: playersError } = await supabase
            .from('players')
            .select('id, is_ready')
            .eq('room_id', roomId)

        if (playersError) throw playersError

        // If all players are ready → move to night_mafia
        const allReady = players.length > 0 && players.every(p => p.is_ready)
        if (allReady) {
            const { error: roomError } = await supabase
                .from('rooms')
                .update({ status: 'night_mafia' })
                .eq('id', roomId)
            if (roomError) throw roomError
        }

        return NextResponse.json({ success: true, allReady })
    } catch (err) {
        console.error('[/api/game/ready]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
