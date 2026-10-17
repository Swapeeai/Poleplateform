import { RoleBadge } from "@/components/role-badge"
import { copy } from "@/lib/copy"
import { initials, levelLabel, type Profile } from "@/lib/profile"

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-3 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}

export function ProfileSummary({ profile }: { profile: Profile }) {
  const instagram = profile.instagram
    ? `https://instagram.com/${encodeURIComponent(profile.instagram)}`
    : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          // The picture host is whatever the member pasted, so this is a plain image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="size-16 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="flex size-16 items-center justify-center rounded-full bg-muted text-lg font-medium"
          >
            {initials(profile.display_name)}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold">{profile.display_name}</h2>
          <div className="mt-2">
            <RoleBadge role={profile.role} verified={profile.is_verified_teacher} />
          </div>
        </div>
      </div>
      <dl className="text-base">
        <Row label={copy.country} value={profile.country ?? copy.notSet} />
        <Row label={copy.level} value={profile.level ? levelLabel[profile.level] : copy.notSet} />
        <Row
          label={copy.yearsDancing}
          value={profile.years_dancing === null ? copy.notSet : String(profile.years_dancing)}
        />
        <Row label={copy.teacherStudio} value={profile.teacher_studio ?? copy.notSet} />
        <div className="flex items-baseline justify-between gap-4 border-b py-3">
          <dt className="text-muted-foreground">{copy.instagram}</dt>
          <dd className="text-right font-medium">
            {instagram ? (
              <a className="underline" href={instagram} target="_blank" rel="noreferrer">
                @{profile.instagram}
              </a>
            ) : (
              copy.notSet
            )}
          </dd>
        </div>
        <Row label={copy.reputation} value={String(profile.reputation)} />
      </dl>
    </div>
  )
}
