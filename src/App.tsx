import { AuthScreen } from './components/AuthScreen'
import { Paper } from './components/paper/Paper'
import { useSession } from './lib/useSession'

export default function App() {
  const session = useSession()

  if (session === undefined) return null // loading — keep the void calm
  if (!session) return <AuthScreen />
  // THE PAPER (July 29 ruling): the app is one page. The V1 Shell is
  // retired from the tree; its organs live on inside the Paper until
  // P2–P6 replace them (the components retire for good in P7).
  return <Paper />
}
