# UX Writing Conventions

## Button labels
Use outcome-focused language — verb + object, not vague commands.

| Instead of | Use |
|-----------|-----|
| Submit | Submit declaration |
| OK | Got it / Continue |
| Cancel | Discard changes |
| Delete | Delete trip |
| Yes | Remove companion |

For destructive actions, name what's being destroyed: "Delete 3 trips" not "Delete selected."

## Error messages
Every error answers three questions: What failed? Why? How to fix it?

| Instead of | Use |
|-----------|-----|
| Invalid date | Enter a date in DD/MM/YYYY format |
| Something went wrong | Couldn't save your trip. Check your connection and try again. |
| Error | Passport expiry date must be after your travel date |

Never blame the user ("You entered an invalid..."). Reframe as guidance.

## Empty states
Empty states are onboarding moments, not dead ends. Structure: brief message + value prop + action.

| Instead of | Use |
|-----------|-----|
| No trips | No trips yet. Create your first trip to start auto-filling forms. |
| No QR codes | QR codes from immigration portals will appear here. |
| No family members | Traveling with others? Add a companion to fill forms for everyone. |

## Tone
- **Success**: Celebratory but brief ("Trip created" not "Congratulations! Your trip has been successfully created!")
- **Errors**: Empathetic and constructive (what to do next)
- **Loading/waiting**: Reassuring ("Scanning passport..." not "Please wait")
- **Destructive confirmations**: Serious and specific ("This will permanently delete all form data for Japan")
- **Never use humor in error states** — users are already frustrated

## Consistency
- Pick one term per concept and stick with it: "Delete" or "Remove", not both
- Pick one term for people: "companion" or "traveler" or "family member" — be consistent
- Don't explain what the UI already shows — if a button says "Add trip," the label above it doesn't need to say "Click the button below to add a trip"

## Anti-patterns
- **Generic "Submit" buttons** — always say what's being submitted
- **"Click here" or "Tap here"** — the label should describe the destination
- **"Are you sure?" dialogs without context** — say what will happen: "Delete Japan trip? This removes all form data."
- **Technical jargon in user-facing text** — "JSON parse error" means nothing to users
- **Abbreviations** (`govt`, `dept`, `addr`) — spell out for clarity and translation
- **Walls of text** — if it's more than 2 sentences, most users won't read it
