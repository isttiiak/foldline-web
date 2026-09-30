# Foldline: Product Charter

Foldline is a free, public reading tracker for anyone in the world. It should feel like a
fresh, modern way to track reading: charming to use, genuinely motivating, and completely
private. Every feature is checked against this charter. When in doubt, leave it out.

## Who it is for

- Anyone, anywhere. Sign-up is open (Google now, email later) once the launch
  prerequisites on the roadmap are done.
- Readers of paper, ebooks and audiobooks who want advanced tracking without giving up
  their privacy.

## Motivation, the Foldline way

- **Opt-in goals.** Users may set goals (books or pages per year, month or custom) and see
  their progress. Goals are never on by default and can be hidden or removed any time.
- **Warm celebrations.** Finishing a book or reaching a goal gets a joyful, animated moment.
- **No guilt.** No "don't break the chain", no broken-streak states, no shaming copy, no
  missed-goal alerts. Falling behind a goal is shown neutrally, never as failure.
- **Dropping (DNF) and pausing ("resting") are normal, shame-free states.**
- Reminders exist only if the user creates them.

## Privacy

- Private by default. A user's data is visible only to that user (enforced by RLS).
- **No product analytics, telemetry or third-party trackers** on user behaviour. Not even
  aggregate site analytics. Stats exist only for the user, about their own reading.
- No ads. Data is never sold or shared.
- Full data export and account deletion are always one click away.
- AI features (later) are opt-in and explain what data they use.

## Sharing (later, opt-in only)

- Users may choose to share something they made, such as a finished-book card or a year
  summary link. Nothing is shared unless the user explicitly shares it.
- Never: public profiles by default, followers, feeds, likes, comments, "friends' activity".

## Never ship

- Leaderboards, percentiles or any comparison with other users
- Streak counters with a "broken" state, or any guilt or shame mechanics
- Push or email notifications the user did not schedule themselves
- Infinite feeds, "trending", engagement-optimised recommendations
- Behavioural tracking, third-party analytics, ad SDKs

## Design

- Charming, joyful and animated (see CLAUDE.md "Code style"), always honouring
  `prefers-reduced-motion`. Motion delights and encourages; it never pressures.
- Stats are descriptive and personal, never competitive, and can be hidden entirely.
