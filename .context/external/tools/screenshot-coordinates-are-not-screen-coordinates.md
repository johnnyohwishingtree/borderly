# Fact: Screenshot Coordinates Are Not Screen Coordinates

E2E screenshots are resized to 300px wide for low context cost. Tap coordinates use actual screen resolution (402px wide). Multiplying screenshot x by the scale factor (screen width / screenshot width) gives approximate screen x. For y, also account for safe area insets and component padding — the scale factor alone is not sufficient.

When precision matters, test coordinates interactively on the live simulator via mobile-mcp rather than estimating from screenshots.
