import { getSupabase } from '../../../../lib/supabase'

export async function POST(request) {
    try {
        const { playerId, voiceRoomId } = await request.json()
        const supabase = getSupabase()

        if (!playerId) {
            return new Response(JSON.stringify({ error: 'playerId is required' }), { status: 400 })
        }

        const { error } = await supabase
            .from('voice_participants')
            .delete()
            .match({ player_id: playerId, ...(voiceRoomId ? { voice_room_id: voiceRoomId } : {}) })

        if (error) throw error

        return new Response(JSON.stringify({ success: true }), { status: 200 })
    } catch (error) {
        console.error('Cleanup Error:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
}
