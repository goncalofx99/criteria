import { Compass, MessageCircle, Plus } from 'lucide-react'

export const tabs = [
  { to: '/feed', icon: Compass, label: 'Explore' },
  { to: '/create', icon: Plus, label: 'Create', primary: true },
  { to: '/inbox', icon: MessageCircle, label: 'Inbox' },
]

// Profile is the account action in the header on every screen size.
export const mobileTabs = tabs
