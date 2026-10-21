// WeeklyConditionsIntent.swift — injected by plugins/withSiriIntents.js.
// Handles "this week" / "this weekend" — richer than a spoken answer can
// carry well, so this one opens the app (openAppWhenRun = true) after a
// short spoken highlight, and leaves a pending-navigation marker so the app
// jumps straight to the spot that was asked about.

import AppIntents

struct WeeklyConditionsIntent: AppIntent {
    static var title: LocalizedStringResource = "Check This Week's Stargazing Conditions"
    static var description = IntentDescription("Ask ClearNight which nights this week or weekend look good for stargazing at a saved spot.")
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Spot", description: "Which saved location to check. Defaults to your first saved spot.")
    var location: StargazingLocationEntity?

    @Parameter(title: "When", default: .thisWeek)
    var timeframe: ForecastTimeframe

    static var parameterSummary: some ParameterSummary {
        Summary("Check \(\.$timeframe) conditions at \(\.$location)")
    }

    // Weekday indices (0 = Sun ... 6 = Sat) that count as "the weekend".
    private static let weekendDays: Set<Int> = [0, 5, 6]

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let all = ClearNightForecastCache.readAll()
        guard !all.isEmpty else {
            return .result(dialog: "I don't have any saved spots synced yet — open ClearNight once so I can check conditions.")
        }
        guard let target = location.flatMap({ picked in all.first(where: { $0.name == picked.name }) }) ?? all.first else {
            return .result(dialog: "I couldn't find that spot in ClearNight.")
        }

        // Regardless of outcome below, jump to this spot once the app opens.
        ClearNightForecastCache.setPendingNavigation(locationName: target.name)

        let candidates = timeframe == .thisWeekend
            ? target.nights.filter { Self.weekendDays.contains($0.weekdayIndex) }
            : target.nights

        guard let best = candidates.max(by: { $0.score < $1.score }) else {
            let scope = timeframe == .thisWeekend ? "this weekend" : "this week"
            return .result(dialog: "ClearNight only forecasts about six nights out, and \(scope) falls outside that window right now — opening the app so you can check back closer to the day.")
        }

        let prefix = ClearNightSpeech.freshnessPrefix(updatedAtMs: target.updatedAtMs)
        let scopeWord = timeframe == .thisWeekend ? "this weekend" : "this week"
        let bestLine = "Your best night \(scopeWord) at \(target.name) looks like \(best.day) — \(best.verdictWord)."
        let others = candidates
            .filter { $0.day != best.day }
            .map { "\($0.day) is \($0.verdictWord.lowercased())" }
            .joined(separator: ", ")
        let tail = others.isEmpty ? "" : " \(others)."

        return .result(dialog: "\(prefix)\(bestLine)\(tail) Opening ClearNight for the full week.")
    }
}
