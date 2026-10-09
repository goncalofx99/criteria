import { useEffect, useState } from 'react'
import { avatarColorFor, initialsOf } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Member {
  id: string
  fullName: string | null
  avatarUrl: string | null
}

/** The name is adjacent to the avatar, so the image itself is decorative. */
export function MemberAvatar({ member, className }: { member: Member; className?: string }) {
  const [imageFailed, setImageFailed] = useState(false)
  useEffect(() => setImageFailed(false), [member.avatarUrl])
  return <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white', className)} style={{ backgroundColor: avatarColorFor(member.id) }}>
    {member.avatarUrl && !imageFailed
      ? <img src={member.avatarUrl} alt="" loading="lazy" decoding="async" onError={() => setImageFailed(true)} className="h-full w-full object-cover" />
      : initialsOf(member.fullName)}
  </span>
}
