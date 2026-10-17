import { saveMove } from "@/app/actions/moves"
import { SelectField, TextArea, TextField, toOptions } from "@/components/fields"
import { FormShell } from "@/components/form-shell"
import { MediaUpload } from "@/components/media-upload"
import { MovePicker } from "@/components/move-picker"
import { MOVE_CATEGORIES, POLE_TYPES, categoryLabel, poleTypeLabel } from "@/lib/labels"
import type { MoveOption } from "@/lib/moves"
import { LEVELS, levelLabel } from "@/lib/profile"

export type MoveFormValues = {
  id: string
  name: string
  slug: string
  category: string
  level: string
  pole_type: string
  description: string
  common_mistakes: string
  safety_notes: string
  base_move_id: string | null
  demo_video_id: string | null
  image_id: string | null
  aliases: string[]
  prerequisiteIds: string[]
  exerciseIds: string[]
}

/** Admin form to add or edit a move. Used by /admin/moves/new and /admin/moves/[id]. */
export function MoveForm({
  ownerId,
  moves,
  exercises,
  move,
}: {
  ownerId: string
  moves: MoveOption[]
  exercises: { id: string; name: string }[]
  move?: MoveFormValues
}) {
  const others = moves.filter((option) => option.id !== move?.id)

  return (
    <FormShell action={saveMove} submitLabel={move ? "Save move" : "Add move"}>
      {move ? <input type="hidden" name="moveId" value={move.id} /> : null}
      <TextField name="name" label="Name" required maxLength={80} defaultValue={move?.name} />
      <TextArea
        name="aliases"
        label="Other names"
        hint="One per line. Search finds these too, e.g. Gemini for Outside leg hang."
        rows={3}
        defaultValue={move?.aliases.join("\n")}
      />
      <TextField
        name="slug"
        label="Web address"
        hint="Leave empty to make it from the name."
        maxLength={80}
        defaultValue={move?.slug}
      />
      <SelectField
        name="category"
        label="Type"
        required
        defaultValue={move?.category}
        blank="Choose"
        options={toOptions(categoryLabel, MOVE_CATEGORIES)}
      />
      <SelectField
        name="level"
        label="Level"
        required
        defaultValue={move?.level}
        blank="Choose"
        options={toOptions(levelLabel, LEVELS)}
      />
      <SelectField
        name="poleType"
        label="Pole"
        required
        defaultValue={move?.pole_type ?? "both"}
        options={toOptions(poleTypeLabel, POLE_TYPES)}
      />
      <SelectField
        name="baseMoveId"
        label="Variation of"
        blank="Not a variation"
        defaultValue={move?.base_move_id}
        options={others.map((option) => ({ value: option.id, label: option.name }))}
      />
      <TextArea name="description" label="How to do it" rows={5} maxLength={6000} defaultValue={move?.description} />
      <TextArea
        name="commonMistakes"
        label="Common mistakes"
        rows={3}
        maxLength={4000}
        defaultValue={move?.common_mistakes}
      />
      <TextArea name="safetyNotes" label="Safety" rows={3} maxLength={4000} defaultValue={move?.safety_notes} />
      <MovePicker
        moves={others}
        name="prerequisiteIds"
        label="Learn these first"
        initial={move?.prerequisiteIds}
      />
      <fieldset className="flex flex-col gap-1 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">Strength and flexibility that help</legend>
        {exercises.map((exercise) => (
          <label key={exercise.id} className="flex min-h-11 items-center gap-3 text-base">
            <input
              type="checkbox"
              name="exerciseIds"
              value={exercise.id}
              defaultChecked={move?.exerciseIds.includes(exercise.id)}
              className="size-5"
            />
            {exercise.name}
          </label>
        ))}
      </fieldset>
      <MediaUpload
        name="demoVideoId"
        ownerId={ownerId}
        kind="video"
        label={move?.demo_video_id ? "Replace the demo video" : "Demo video"}
        hint="Leave empty to keep the current one."
      />
      <MediaUpload
        name="imageId"
        ownerId={ownerId}
        kind="image"
        label={move?.image_id ? "Replace the picture" : "Picture"}
        hint="Leave empty to keep the current one."
      />
    </FormShell>
  )
}
