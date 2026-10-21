// TonightConditionsIntent.swift — injected by plugins/withSiriIntents.js.
// Fast, voice-only answer for "is tonight good?" — deliberately does NOT
// open the app, so a quick Siri check stays quick. Ends with a spoken nudge
// back to the app rather than forcing it open.

import AppIntents

struct TonightConditionsIntent: AppIntent {
    static var title: LocalizedStringResource = "Check Tonight's Stargazing Conditions"
    static var description = IntentDescription("Ask ClearNight for tonight's Go / Conditional / No-Go verdict at a saved spot.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Spot", description: "Which saved location to check. Defaults to your first saved spot.")
    var location: StargazingLocationEntity?

    static var parameterSummary: some ParameterSummary {
        Summary("Check tonight's conditions at \(\.$location)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let all = ClearNightForecastCache.readAll()
        guard !all.isEmpty else {
            return .result(dialog: "I don't have any saved spots synced yet — open ClearNight once so I can check conditions.")
        }
        guard let target = location.flatMap({ picked in all.first(where: { $0.name == picked.name }) }) ?? all.first else {
            return .result(dialog: "I couldn't find that spot in ClearNight.")
        }
        guard let tonight = target.nights.first else {
            return .result(dialog: "I don't have tonight's conditions for \(target.name) yet — open ClearNight to refresh.")
        }

        let prefix = ClearNightSpeech.freshnessPrefix(updatedAtMs: target.updatedAtMs)
        let summary = ClearNightSpeech.describe(tonight, locationName: target.name)
        let detail = "\(tonight.moonPhase) moon, \(tonight.seeingWord.lowercased()) seeing."
        return .result(dialog: "\(prefix)\(summary) \(detail) Open ClearNight for the full breakdown.")
    }
}
