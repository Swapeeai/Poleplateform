/**
 * English copy for this step. APP_NAME is the placeholder until a real name
 * is chosen. Later languages can replace this file.
 */
export const APP_NAME = "APP_NAME"

export const copy = {
  metaDescription:
    "Ask the Pole for feedback on your moves, explore the move dictionary and combos, and take mini-courses.",
  me: "Me",
  admin: "Admin",
  signInTitle: "Sign in",
  signUpTitle: "Create an account",
  signInLead: "You need an account to use the app.",
  signUpLead: "New accounts start as students. An admin can change that later.",
  continueWithGoogle: "Continue with Google",
  orEmail: "or use email",
  email: "Email",
  password: "Password",
  displayName: "Display name",
  createAccount: "Create account",
  signIn: "Sign in",
  signOut: "Sign out",
  needAccount: "New here?",
  haveAccount: "Already have an account?",
  createOne: "Create an account",
  goToSignIn: "Sign in",
  home: "Home",
  profile: "Profile",
  editProfile: "Edit profile",
  members: "Members",
  loading: "Loading…",
  save: "Save",
  saving: "Saving…",
  country: "Country",
  level: "Level",
  yearsDancing: "Years dancing",
  teacherStudio: "Studio",
  instagram: "Instagram",
  avatar: "Avatar link",
  reputation: "Reputation",
  role: "Role",
  verifiedTeacher: "Verified teacher",
  notSet: "Not set",
  chooseLevel: "Choose a level",
  optional: "Optional",
  avatarHint: "Paste a link to a picture. Uploading a file comes later.",
  studioHint: "Only if you teach at a studio.",
  instagramHint: "Your handle, without the @.",
  yearsHint: "How many years you have been dancing. 0 is fine.",
  reputationHint: "Starts at 0. Points come later. You cannot edit this.",
  finishProfileTitle: "Finish your profile",
  finishProfileBody:
    "Add your country, level, and how long you have been dancing. Other people will see this.",
  homeLead: "Three things to do here.",
  profileMissing:
    "There is no profile for this login. The signup step in the database may not have run. Apply the migration in supabase/migrations, then sign up again.",
  adminTitle: "Members",
  adminLead:
    "Change a person's role, or mark a teacher as verified. The database rejects this unless you are an admin.",
  adminDenied: "Only an admin can open this page.",
  adminDeniedBody:
    "Your account is not an admin yet. Sign up, then run the SQL in the README with your own email.",
  adminEmpty: "No members yet.",
  thisIsYou: "This is you. You cannot change your own role on this page.",
  verifiedHint: "Only a teacher can be verified.",
  setupTitle: "This app needs a Supabase project before sign-in will work.",
  setupBody:
    "Copy .env.example to .env.local and add your project URL and anon key. The README lists every step, including Google.",
  checkEmail:
    "Check your email and open the link to finish creating the account. Then come back and sign in.",
  googleFailed:
    "Google sign-in did not start. In Supabase, turn on the Google provider and allow the callback address.",
  linkFailed: "That sign-in link did not work. Request a new one and try again.",
  badCredentials: "That email and password did not match.",
  supabaseUnreachable:
    "Could not reach Supabase. Check the project URL and anon key in .env.local, then restart the app.",
  emailTaken: "An account with that email already exists. Sign in instead.",
  saved: "Saved.",
  notAllowed: "That change was not saved. You are not allowed to do it.",
  ownRoleBlocked:
    "You cannot change your own role here. If you really mean to, use the SQL in the README.",
} as const
