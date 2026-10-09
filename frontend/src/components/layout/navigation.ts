import { Compass, MessageCircle, Plus, UserRound } from 'lucide-react'

export const tabs = [
  { to: '/feed', icon: Compass, label: 'Explore' },
  { to: '/create', icon: Plus, label: 'Create', primary: true },
  { to: '/inbox', icon: MessageCircle, label: 'Inbox' },
  { to: '/profile', icon: UserRound, label: 'Profile' },
]

// Profile has a persistent destination in the phone header so the primary
// creation action occupies the center of the three bottom navigation slots.
export const mobileTabs = tabs.filter(tab => tab.to !== '/profile')
