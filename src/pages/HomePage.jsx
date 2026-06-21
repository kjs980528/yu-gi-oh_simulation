import { useNavigate } from 'react-router-dom'
import { PackSelector } from '../components/PackSelector'

export function HomePage() {
  const navigate = useNavigate()
  return (
    <PackSelector onSelect={set => navigate(`/packs/${set.set_code}`, { state: { set } })} />
  )
}
