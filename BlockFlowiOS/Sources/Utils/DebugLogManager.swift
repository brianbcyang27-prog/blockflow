import Foundation
import SwiftUI

enum LogCategory {
    case general
    case calendar
    case health
}

final class DebugLogManager: ObservableObject {
    static let shared = DebugLogManager()

    @Published var logs: [String] = []
    @Published var calendarLogs: [String] = []
    @Published var healthLogs: [String] = []

    private let maxLogs = 500

    private init() {}

    func add(_ message: String, category: LogCategory = .general) {
        let timestamp = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
        let formattedMessage = "[\(timestamp)] \(message)"

        DispatchQueue.main.async {
            switch category {
            case .general:
                self.logs.append(formattedMessage)
            case .calendar:
                self.calendarLogs.append(formattedMessage)
            case .health:
                self.healthLogs.append(formattedMessage)
            }

            if self.logs.count > self.maxLogs {
                self.logs.removeFirst(100)
            }
            if self.calendarLogs.count > self.maxLogs {
                self.calendarLogs.removeFirst(100)
            }
            if self.healthLogs.count > self.maxLogs {
                self.healthLogs.removeFirst(100)
            }
        }

        print(formattedMessage)
    }

    func clear(category: LogCategory = .general) {
        DispatchQueue.main.async {
            switch category {
            case .general:
                self.logs.removeAll()
            case .calendar:
                self.calendarLogs.removeAll()
            case .health:
                self.healthLogs.removeAll()
            }
        }
    }

    func clearAll() {
        DispatchQueue.main.async {
            self.logs.removeAll()
            self.calendarLogs.removeAll()
            self.healthLogs.removeAll()
        }
    }
}