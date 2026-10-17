import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { copy } from "@/lib/copy"

export function SetupNeeded() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.setupTitle}</CardTitle>
        <CardDescription>{copy.setupBody}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="list-decimal space-y-2 pl-5 text-base leading-6">
          <li>Create a Supabase project.</li>
          <li>Run the SQL files in supabase/migrations, in name order, then supabase/seed.sql.</li>
          <li>Copy the project URL and anon key into .env.local.</li>
          <li>Restart the app.</li>
        </ol>
      </CardContent>
    </Card>
  )
}
