-- Starter move dictionary: 20 base moves, 4 variations, aliases, prerequisites
-- and conditioning exercises. Text is a short starting point for the founder
-- to edit in the app. No logins are created here.
--
-- Run it once in the Supabase SQL editor after the migrations. Running it again
-- is safe: existing moves are left as they are.

insert into public.moves (name, slug, category, level, pole_type, description, common_mistakes, safety_notes)
values
  ('Fireman Spin', 'fireman-spin', 'spin', 'beginner', 'both',
   'Both hands on the pole, legs together and slightly bent, spinning around the pole.',
   'Gripping with the arms only; legs opening apart.',
   'Warm up wrists and shoulders. Keep the bottom arm engaged.'),
  ('Front Hook Spin', 'front-hook-spin', 'spin', 'beginner', 'both',
   'The inside leg hooks the pole in front while you spin forward.',
   'Hooking with a straight leg; leaning away from the pole.',
   'Start slow on static before trying spin mode.'),
  ('Back Hook Spin', 'back-hook-spin', 'spin', 'beginner', 'both',
   'Swing the outside leg round and hook the pole behind the knee as you spin.',
   'Kicking too hard; letting the shoulders collapse.',
   'Keep the top arm straight but active.'),
  ('Chair Spin', 'chair-spin', 'spin', 'beginner', 'both',
   'Knees bent and together, as if sitting in a chair, while spinning.',
   'Dropping the knees; pulling with the top arm only.',
   'Engage the core before lifting the legs.'),
  ('Attitude Spin', 'attitude-spin', 'spin', 'beginner', 'both',
   'Spin with the inside leg hooked and the outside leg lifted behind in attitude.',
   'Sickled foot on the back leg; hips turning away.',
   'Warm up hip flexors and hamstrings.'),
  ('Basic Climb', 'basic-climb', 'climb', 'beginner', 'both',
   'Grip with the shin and the top of the foot, then step up with the hands.',
   'Climbing with the arms only; skin not touching the pole.',
   'Bare legs are needed for grip. Climb only as high as you can come down safely.'),
  ('Pole Sit', 'pole-sit', 'hold', 'beginner', 'both',
   'Sit on the pole by squeezing the upper thighs, ankles crossed.',
   'Gripping with the knees instead of the upper thighs.',
   'Keep one hand on the pole until the grip feels solid.'),
  ('Crucifix', 'crucifix', 'hold', 'beginner', 'both',
   'From a pole sit, release both hands and open the arms.',
   'Thighs too low on the pole; leaning back too early.',
   'Practise low, with a crash mat.'),
  ('Basic Invert', 'basic-invert', 'invert', 'intermediate', 'both',
   'Tuck from the floor, lift the hips above the head and open into an inverted V.',
   'Kicking up instead of lifting with the core; bent arms collapsing.',
   'Learn the tuck first. Always with a spotter or a mat at first.'),
  ('Outside Leg Hang', 'outside-leg-hang', 'invert', 'intermediate', 'both',
   'Inverted, hook the outside knee on the pole and release the hands.',
   'Weak knee hook; releasing the hands before the leg is locked.',
   'Exit slowly. Use a mat.'),
  ('Inside Leg Hang', 'inside-leg-hang', 'invert', 'intermediate', 'both',
   'Inverted, hook the inside knee and release the hands.',
   'Hips falling away from the pole.',
   'Only release the hands once the knee pit is locked.'),
  ('Butterfly', 'butterfly', 'invert', 'intermediate', 'both',
   'Inverted, one leg hooks the pole with the foot, the other extends; hands in split grip.',
   'Hooking with the ankle instead of the knee pit and foot.',
   'Build split grip strength first.'),
  ('Brass Monkey', 'brass-monkey', 'invert', 'intermediate', 'both',
   'Inverted hold on one knee hook with the body angled away and the hand on the floor side.',
   'Twisting the knee; forgetting to engage the hooked leg.',
   'Very knee-heavy. Warm up the knees and do not force the angle.'),
  ('Superman', 'superman', 'hold', 'intermediate', 'both',
   'Lying horizontally with the pole between the thighs, one arm holding, the body stretched out.',
   'Thigh grip too low; letting the hips sag.',
   'Thigh grip carries the weight. Build up from a pole sit.'),
  ('Shoulder Mount', 'shoulder-mount', 'invert', 'advanced', 'both',
   'The pole rests on one shoulder, hands in grip, and the legs lift over into an invert.',
   'Pressure on the neck; shoulders shrugging up.',
   'The pole sits on the shoulder, never the neck. Condition the shoulders first.'),
  ('Ayesha', 'ayesha', 'invert', 'advanced', 'both',
   'Inverted with split grip or cup grip, the body away from the pole, legs extended.',
   'Elbows bending; arching the lower back too much.',
   'High strength demand. Train it with a spotter.'),
  ('Iron X', 'iron-x', 'invert', 'advanced', 'both',
   'A sideways flag held in split grip with the legs open in a wide V.',
   'Bottom arm not pushing; hips dropping.',
   'Very demanding on shoulders and wrists. Progress slowly.'),
  ('Jade Split', 'jade-split', 'invert', 'advanced', 'both',
   'Inverted split with one leg against the pole and the other leg extended away.',
   'Not enough flexibility, so the split is forced.',
   'Warm up splits fully before attempting.'),
  ('Body Wave', 'body-wave', 'floorwork', 'beginner', 'both',
   'Standing at the pole, roll the body from the chest down through the hips.',
   'Moving only the hips; holding the breath.',
   'Gentle on the lower back. Keep the knees soft.'),
  ('Fan Kick', 'fan-kick', 'transition', 'intermediate', 'both',
   'From the pole, swing both legs over in a wide arc and land on the other side.',
   'Bending the arms; leaning back too far.',
   'Keep the arms straight and strong. Learn it low first.')
on conflict (slug) do nothing;

-- Variations point at their base move.
insert into public.moves (name, slug, category, level, pole_type, description, base_move_id)
select v.name, v.slug, v.category, v.level, 'both', v.description, base.id
from (values
  ('Aerial Invert', 'aerial-invert', 'invert', 'advanced', 'Invert from a hold in the air instead of the floor.', 'basic-invert'),
  ('Extended Butterfly', 'extended-butterfly', 'invert', 'advanced', 'Butterfly with the free leg fully extended away from the pole.', 'butterfly'),
  ('Aerial Shoulder Mount', 'aerial-shoulder-mount', 'invert', 'advanced', 'Shoulder mount entered from mid-pole, without the floor.', 'shoulder-mount'),
  ('Elbow Grip Ayesha', 'elbow-grip-ayesha', 'invert', 'advanced', 'Ayesha with the top arm in elbow grip.', 'ayesha')
) as v (name, slug, category, level, description, base_slug)
join public.moves as base on base.slug = v.base_slug
on conflict (slug) do nothing;

insert into public.move_aliases (move_id, alias)
select m.id, a.alias
from (values
  ('fireman-spin', 'Fireman'),
  ('front-hook-spin', 'Front Spin'),
  ('front-hook-spin', 'Hook Spin'),
  ('back-hook-spin', 'Back Spin'),
  ('chair-spin', 'Chair'),
  ('basic-climb', 'Climb'),
  ('basic-climb', 'Pole Climb'),
  ('pole-sit', 'Basic Sit'),
  ('pole-sit', 'Thigh Sit'),
  ('basic-invert', 'Invert'),
  ('basic-invert', 'Inversion'),
  ('outside-leg-hang', 'Outside Knee Hang'),
  ('outside-leg-hang', 'Gemini'),
  ('inside-leg-hang', 'Inside Knee Hang'),
  ('brass-monkey', 'Monkey'),
  ('superman', 'Superwoman'),
  ('shoulder-mount', 'Shouldermount'),
  ('ayesha', 'Aysha'),
  ('iron-x', 'Iron-X'),
  ('jade-split', 'Jade'),
  ('body-wave', 'Pole Wave'),
  ('fan-kick', 'Fan')
) as a (slug, alias)
join public.moves as m on m.slug = a.slug
on conflict do nothing;

insert into public.move_prerequisites (move_id, prerequisite_move_id)
select m.id, p.id
from (values
  ('pole-sit', 'basic-climb'),
  ('crucifix', 'pole-sit'),
  ('superman', 'pole-sit'),
  ('basic-invert', 'chair-spin'),
  ('outside-leg-hang', 'basic-invert'),
  ('inside-leg-hang', 'basic-invert'),
  ('butterfly', 'basic-invert'),
  ('brass-monkey', 'basic-invert'),
  ('shoulder-mount', 'basic-invert'),
  ('ayesha', 'butterfly'),
  ('iron-x', 'ayesha'),
  ('jade-split', 'butterfly'),
  ('aerial-invert', 'basic-invert'),
  ('extended-butterfly', 'butterfly'),
  ('aerial-shoulder-mount', 'shoulder-mount'),
  ('elbow-grip-ayesha', 'ayesha')
) as r (slug, prereq)
join public.moves as m on m.slug = r.slug
join public.moves as p on p.slug = r.prereq
on conflict do nothing;

insert into public.conditioning_exercises (name, description)
values
  ('Hollow Body Hold', 'Lie on your back, lift shoulders and legs, lower back pressed down. Hold 20 to 40 seconds.'),
  ('Pole Tuck Hold', 'Hands on the pole, lift the knees to the chest and hold.'),
  ('Scapular Pulls', 'Hang from the pole and pull the shoulder blades down without bending the arms.'),
  ('Hanging Knee Raises', 'Hang from the pole and lift the knees towards the chest, slowly.'),
  ('Wrist Conditioning', 'Wrist circles and palm presses before pole work.'),
  ('Split Grip Press', 'Practise pushing with the bottom hand and pulling with the top hand, feet on the floor.')
on conflict (name) do nothing;

insert into public.move_conditioning (move_id, exercise_id)
select m.id, e.id
from (values
  ('basic-climb', 'Scapular Pulls'),
  ('basic-invert', 'Pole Tuck Hold'),
  ('basic-invert', 'Hollow Body Hold'),
  ('basic-invert', 'Hanging Knee Raises'),
  ('aerial-invert', 'Hanging Knee Raises'),
  ('butterfly', 'Split Grip Press'),
  ('ayesha', 'Split Grip Press'),
  ('iron-x', 'Split Grip Press'),
  ('shoulder-mount', 'Scapular Pulls'),
  ('shoulder-mount', 'Hollow Body Hold'),
  ('fireman-spin', 'Wrist Conditioning')
) as r (slug, exercise)
join public.moves as m on m.slug = r.slug
join public.conditioning_exercises as e on e.name = r.exercise
on conflict do nothing;
