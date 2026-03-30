# Fact: NativeWind border Shorthand Crashes on Navigation Transitions

Using `border` (without a width number) in NativeWind className causes a runtime crash when React Navigation unmounts/remounts navigator stacks. The crash manifests as "Couldn't find a navigation context" — misleading because the real issue is a NativeWind style compilation error.

Always use `border-2` or `border-0` — never the bare `border` shorthand.

Discovered: 2026-03-30, while changing Button outline variant from `border-2` to `border`.
