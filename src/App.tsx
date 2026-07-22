import { AuthScreen } from './components/AuthScreen'
import { Shell } from './components/Shell'
import { useSession } from './lib/useSession'

export default function App() {
  const session = useSession()

  if (session === undefined) return null // loading — keep the void calm
  if (!session) return <AuthScreen />
  return <Shell email={session.user.email ?? ''} />
}
