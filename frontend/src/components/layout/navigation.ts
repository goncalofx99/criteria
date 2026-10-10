import { ClipboardList, House, MessageCircle, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavigationTab {
  to: string
  icon: LucideIcon
  label: string
  labelPt: string
  desktopLabel?: string
  primary?: boolean
}

const commonTabs: NavigationTab[] = [
  { to: '/', icon: House, label: 'Home', labelPt: 'Início' },
  { to: '/create', icon: Plus, label: 'Create', labelPt: 'Criar', primary: true },
  { to: '/inbox', icon: MessageCircle, label: 'Inbox', labelPt: 'Mensagens' },
]

export const mobileTabs = commonTabs

/** Criteria are only discoverable by members with a seller role. */
export function navigationTabs(canViewCriteria: boolean) {
  return canViewCriteria
    ? [commonTabs[0], { to: '/requests', icon: ClipboardList, label: 'Criteria', labelPt: 'Critérios', desktopLabel: 'Criteria' }, ...commonTabs.slice(1)]
    : commonTabs
}
