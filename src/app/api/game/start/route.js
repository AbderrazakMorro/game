import { NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabaseServer'
import { distributeRoles } from '../../../../utils/gameLogic'

/**
 * POST /api/game/start
 * Body: { roomId }
 * - Distributes roles to all players in the room
 * - Sets room status to 'roles', phase_number to 1
 * - Only the host should call this
 */
export async function POST(request) {
    try {
        const { roomId } = await request.json()
        if (!roomId) return NextResponse.json({ error: 'roomId required' }, { status: 400 })

        const supabase = createServerClient()

        // Fetch current players
        const { data: players, error: playersError } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true })

        if (playersError) throw playersError
        if (!players || players.length < 3) {
            return NextResponse.json({ error: 'Minimum 3 players required' }, { status: 400 })
        }

        // Distribute roles
        const assigned = distributeRoles(players)

        // Bulk update roles using individual updates (Supabase JS v2 doesn't support bulk upsert by id easily)
        for (const p of assigned) {
            const { error } = await supabase
                .from('players')
                .update({ role: p.role, is_alive: true, is_protected: false, is_ready: false })
                .eq('id', p.id)
            if (error) throw error
        }

        // Advance room to 'roles' phase
        const { error: roomError } = await supabase
            .from('rooms')
            .update({ status: 'roles', phase_number: 1 })
            .eq('id', roomId)

        if (roomError) throw roomError

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[/api/game/start]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
