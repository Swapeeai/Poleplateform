import { createReport } from "@/app/actions/community"
import { FormShell } from "@/components/form-shell"

/** A small "Report" link that opens a one-line form. Reports go to the admin. */
export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "question" | "answer" | "comment" | "combo" | "challenge_entry" | "media"
  targetId: string
}) {
  return (
    <details className="text-sm">
      <summary className="inline-flex h-11 cursor-pointer items-center text-muted-foreground">
        Report
      </summary>
      <FormShell action={createReport} submitLabel="Send report" variant="outline" className="pt-2">
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <textarea
          name="reason"
          required
          minLength={3}
          maxLength={500}
          rows={2}
          placeholder="What is wrong? For example: unsafe advice, rude, spam."
          className="w-full rounded-lg border border-input bg-transparent p-2.5 text-base"
        />
      </FormShell>
    </details>
  )
}
