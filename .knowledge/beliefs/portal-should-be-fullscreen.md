# Belief: Portal Submission Should Be a Full-Screen Experience

The portal WebView should hide the tab bar and present as a full-screen modal. The auto-fill pill and close button are the only controls — no risk of accidentally switching tabs.

Rationale:
- Tab bar caused actual mistaps in E2E testing (pill tap hit Profile tab)
- Government portals need the user's full attention — tab bar is a distraction
- Full-screen presentation matches the mental model of "I'm on the government website now"

Certainty: High — the mistap bug alone justifies this.
