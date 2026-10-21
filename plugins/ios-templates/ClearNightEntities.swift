// ClearNightEntities.swift — injected by plugins/withSiriIntents.js.
// AppEntity/AppEnum types shared by both stargazing intents.

import AppIntents

struct StargazingLocationEntity: AppEntity {
    let id: String       // the location's name, used as a stable identifier
    let name: String
    let region: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Stargazing Spot"
    static var defaultQuery = StargazingLocationQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)", subtitle: "\(region)")
    }
}

struct StargazingLocationQuery: EntityQuery, EntityStringQuery {
    func entities(for identifiers: [StargazingLocationEntity.ID]) async throws -> [StargazingLocationEntity] {
        ClearNightForecastCache.readAll()
            .filter { identifiers.contains($0.name) }
            .map { StargazingLocationEntity(id: $0.name, name: $0.name, region: $0.region) }
    }

    func suggestedEntities() async throws -> [StargazingLocationEntity] {
        ClearNightForecastCache.readAll()
            .map { StargazingLocationEntity(id: $0.name, name: $0.name, region: $0.region) }
    }

    // Lets Siri/Shortcuts match a saved spot by spoken/typed name, e.g.
    // "ask ClearNight about Joshua Tree".
    func entities(matching string: String) async throws -> [StargazingLocationEntity] {
        let lower = string.lowercased()
        return ClearNightForecastCache.readAll()
            .filter { $0.name.lowercased().contains(lower) }
            .map { StargazingLocationEntity(id: $0.name, name: $0.name, region: $0.region) }
    }
}

enum ForecastTimeframe: String, AppEnum {
    case thisWeek
    case thisWeekend

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Timeframe"
    static var caseDisplayRepresentations: [ForecastTimeframe: DisplayRepresentation] = [
        .thisWeek: "This Week",
        .thisWeekend: "This Weekend",
    ]
}

// Shared dialog-building helpers used by both intents.
enum ClearNightSpeech {
    static func freshnessPrefix(updatedAtMs: Double) -> String {
        let ageSeconds = Date().timeIntervalSince1970 - (updatedAtMs / 1000)
        return ageSeconds > 6 * 3600 ? "As of my last check, " : ""
    }

    static func describe(_ night: CachedNight, locationName: String) -> String {
        let subject = night.day == "Tonight" ? "Tonight at \(locationName)" : "\(night.day) at \(locationName)"
        if let window = night.windowLabel {
            return "\(subject) looks \(night.verdictWord) — clear skies from \(window)."
        }
        return "\(subject) looks \(night.verdictWord) — not much of a clear window expected."
    }
}
