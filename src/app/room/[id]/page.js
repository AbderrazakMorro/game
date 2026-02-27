import GameRoom from '../../../components/GameRoom'

export default async function RoomPage({ params }) {
    const { id } = await params
    return <GameRoom roomId={id} />
}
