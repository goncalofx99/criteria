import { Compass, MessageCircle, Plus, UserRound } from 'lucide-react'

export const tabs = [
  { to: '/feed', icon: Compass, label: 'Explore' },
  { to: '/create', icon: Plus, label: 'Create', primary: true },
  { to: '/inbox', icon: MessageCircle, label: 'Inbox' },
  { to: '/profile', icon: UserRound, label: 'Profile' },
]
