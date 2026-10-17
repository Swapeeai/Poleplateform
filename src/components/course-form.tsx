import { saveCourse } from "@/app/actions/courses"
import { CheckField, SelectField, TextArea, TextField, toOptions } from "@/components/fields"
import { FormShell } from "@/components/form-shell"
import { MediaUpload } from "@/components/media-upload"
import { MovePicker } from "@/components/move-picker"
import { CURRENCIES } from "@/lib/labels"
import type { MoveOption } from "@/lib/moves"
import { LEVELS, levelLabel } from "@/lib/profile"

export type CourseFormValues = {
  id: string
  title: string
  slug: string
  goal: string
  description: string
  level: string
  price_cents: number
  currency: string
  is_published: boolean
  cover_image_id: string | null
  trailer_video_id: string | null
  moveIds: string[]
}

/** Admin form for a course's details. Lessons are added on the course's admin page. */
export function CourseForm({
  ownerId,
  moves,
  course,
}: {
  ownerId: string
  moves: MoveOption[]
  course?: CourseFormValues
}) {
  return (
    <FormShell action={saveCourse} submitLabel={course ? "Save course" : "Create course"}>
      {course ? <input type="hidden" name="courseId" value={course.id} /> : null}
      <TextField name="title" label="Title" required maxLength={120} defaultValue={course?.title} />
      <TextField
        name="goal"
        label="Goal"
        hint="One sentence: what can people do after this course?"
        maxLength={500}
        defaultValue={course?.goal}
      />
      <TextArea name="description" label="Description" maxLength={6000} defaultValue={course?.description} />
      <SelectField
        name="level"
        label="Level"
        required
        blank="Choose a level"
        defaultValue={course?.level}
        options={toOptions(levelLabel, LEVELS)}
      />
      <div className="grid grid-cols-2 gap-2">
        <TextField
          name="price"
          label="Price"
          hint="0 means free."
          defaultValue={course ? (course.price_cents / 100).toFixed(2) : ""}
        />
        <SelectField
          name="currency"
          label="Currency"
          defaultValue={course?.currency ?? "EUR"}
          options={CURRENCIES.map((currency) => ({ value: currency, label: currency }))}
        />
      </div>
      <TextField
        name="slug"
        label="Web address"
        hint="Leave empty to make it from the title."
        maxLength={80}
        defaultValue={course?.slug}
      />
      <MovePicker moves={moves} label="Moves people should know first" initial={course?.moveIds} />
      <MediaUpload
        name="coverImageId"
        ownerId={ownerId}
        kind="image"
        label={course?.cover_image_id ? "Replace the cover picture" : "Cover picture"}
        visibilities={["course"]}
      />
      <MediaUpload
        name="trailerVideoId"
        ownerId={ownerId}
        kind="video"
        label={course?.trailer_video_id ? "Replace the trailer" : "Trailer video"}
        hint="A short preview everyone can watch once the course is published."
        visibilities={["course"]}
      />
      <CheckField
        name="published"
        label="Published"
        hint="Members only see published courses."
        defaultChecked={course?.is_published}
      />
    </FormShell>
  )
}
