# Fact: Test Complexity Mirrors User Complexity

If an E2E test is hard to write for a screen or flow, the user experience is equally hard. Signals:
- Many fields requiring scroll → user must scroll to complete the task
- Coordinate taps needed → elements aren't clearly accessible
- Try/catch blocks → UI flow is unpredictable or conditional
- Excessive sleeps → slow or unpredictable interactions
- Long test functions → long user journeys

When the test is fighting the UI, question the UI design — not just the test approach.
