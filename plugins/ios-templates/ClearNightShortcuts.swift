// ClearNightShortcuts.swift — injected by plugins/withSiriIntents.js.
// Donates both intents to Siri, Spotlight, and the Shortcuts app with
// sample phrases. AppShortcutsProvider types are picked up automatically at
// launch — nothing else needs to reference this file.

import AppIntents

struct ClearNightShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: TonightConditionsIntent(),
            phrases: [
                "Check tonight's stargazing conditions with \(.applicationName)",
                "Is tonight good for stargazing in \(.applicationName)",
                "Ask \(.applicationName) about tonight's sky",
            ],
            shortTitle: "Tonight's Conditions",
            systemImageName: "sparkles"
        )
        AppShortcut(
            intent: WeeklyConditionsIntent(),
            phrases: [
                "Check this week's stargazing conditions with \(.applicationName)",
                "Ask \(.applicationName) about this weekend's stargazing",
                "What's the best night to shoot this week in \(.applicationName)",
            ],
            shortTitle: "This Week's Conditions",
            systemImageName: "calendar"
        )
    }
}
