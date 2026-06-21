import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PackOpener } from '../components/PackOpener'

export function PackPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const set = location.state?.set

  useEffect(() => {
    if (!set) navigate('/packs', { replace: true })
  }, [set, navigate])

  if (!set) return null

  return <PackOpener set={set} onBack={() => navigate('/packs')} />
}
