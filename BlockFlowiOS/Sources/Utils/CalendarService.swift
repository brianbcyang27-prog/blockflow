import Foundation
import EventKit
import SwiftUI

enum CalendarSource: String {
case apple = "Apple"
case google = "Google"
}

struct CalendarEvent: Identifiable {
let id: String
let title: String
let startTime: Date
let endTime: Date
let isAllDay: Bool
let calendarTitle: String
let calendarColor: Color
var source: CalendarSource = .apple

var duration: Int {
Int(endTime.timeIntervalSince(startTime) / 60)
}
}

final class CalendarService {
    static let shared = CalendarService()

    private let eventStore = EKEventStore()
    private(set) var isAuthorized = false

    private init() {}

    func requestAccess(completion: @escaping (Bool) -> Void) {
        let status = EKEventStore.authorizationStatus(for: .event)
        DebugLogManager.shared.add("Current authorization status: \(statusString(status))", category: .calendar)

        if #available(iOS 17.0, *) {
            eventStore.requestFullAccessToEvents { [weak self] granted, error in
                if let error = error {
                    DebugLogManager.shared.add("Full access error: \(error.localizedDescription)", category: .calendar)
                }
                self?.isAuthorized = granted
                DebugLogManager.shared.add("Full access granted: \(granted)", category: .calendar)
                DispatchQueue.main.async {
                    completion(granted)
                }
            }
        } else {
            eventStore.requestAccess(to: .event) { [weak self] granted, error in
                if let error = error {
                    DebugLogManager.shared.add("Request access error: \(error.localizedDescription)", category: .calendar)
                }
                self?.isAuthorized = granted
                DebugLogManager.shared.add("Request access granted: \(granted)", category: .calendar)
                DispatchQueue.main.async {
                    completion(granted)
                }
            }
        }
    }

    func fetchEventsDebug() -> [EKEvent] {
        let store = EKEventStore()
        let calendars = store.calendars(for: .event)
        let calendarSys = Calendar.current
        let now = Date()
        let start = calendarSys.startOfDay(for: now)
        let end = calendarSys.date(byAdding: .day, value: 3, to: start)!

        DebugLogManager.shared.add("=== CALENDAR DEBUG START ===", category: .calendar)
        DebugLogManager.shared.add("Total calendars: \(calendars.count)", category: .calendar)

        var allEvents: [EKEvent] = []

        for cal in calendars {
            DebugLogManager.shared.add("Calendar: \(cal.title) | Source: \(cal.source.title) | Type: \(cal.type.rawValue)", category: .calendar)

            let predicate = store.predicateForEvents(withStart: start, end: end, calendars: [cal])
            let events = store.events(matching: predicate)

            DebugLogManager.shared.add("  Events found in \(cal.title): \(events.count)", category: .calendar)

            for event in events {
                let timeFormatter = DateFormatter()
                timeFormatter.dateStyle = .none
                timeFormatter.timeStyle = .short
                DebugLogManager.shared.add("    - \(event.title ?? "No title") | Start: \(timeFormatter.string(from: event.startDate)) | AllDay: \(event.isAllDay)", category: .calendar)
            }

            allEvents.append(contentsOf: events)
        }

        DebugLogManager.shared.add("=== TOTAL EVENTS FOUND: \(allEvents.count) ===", category: .calendar)
        return allEvents
    }

func fetchTodayEvents(completion: @escaping ([CalendarEvent]) -> Void) {
DebugLogManager.shared.add("fetchTodayEvents called | isAuthorized: \(isAuthorized)", category: .calendar)

guard isAuthorized else {
DebugLogManager.shared.add("Not authorized, requesting access", category: .calendar)
requestAccess { [weak self] granted in
if granted {
self?.fetchTodayEvents(completion: completion)
} else {
DebugLogManager.shared.add("Authorization denied", category: .calendar)
DispatchQueue.main.async {
completion([])
}
}
}
return
}

let calendarSys = Calendar.current
let now = Date()
let startOfDay = calendarSys.startOfDay(for: now)
let endOfDay = calendarSys.date(byAdding: .day, value: 3, to: startOfDay) ?? now

let dateFormatter = DateFormatter()
dateFormatter.dateStyle = .short
dateFormatter.timeStyle = .short
dateFormatter.timeZone = calendarSys.timeZone

DebugLogManager.shared.add("Current local time: \(dateFormatter.string(from: now))", category: .calendar)
DebugLogManager.shared.add("Searching from: \(dateFormatter.string(from: startOfDay)) to: \(dateFormatter.string(from: endOfDay))", category: .calendar)

let calendars = eventStore.calendars(for: .event)
DebugLogManager.shared.add("Found \(calendars.count) calendars", category: .calendar)

var allEkEvents: [EKEvent] = []

for cal in calendars {
let predicate = eventStore.predicateForEvents(withStart: startOfDay, end: endOfDay, calendars: [cal])
let ekEvents = eventStore.events(matching: predicate)
allEkEvents.append(contentsOf: ekEvents)
}

DebugLogManager.shared.add("Total events found: \(allEkEvents.count)", category: .calendar)

let events = allEkEvents.map { ekEvent in
CalendarEvent(
id: ekEvent.eventIdentifier ?? UUID().uuidString,
title: ekEvent.title ?? "Untitled",
startTime: ekEvent.startDate,
endTime: ekEvent.endDate,
isAllDay: ekEvent.isAllDay,
calendarTitle: ekEvent.calendar.title,
calendarColor: Color(ekEvent.calendar.cgColor)
)
}

let groupedEvents = Dictionary(grouping: events) { event in
calendarSys.startOfDay(for: event.startTime)
}

var sortedEvents: [CalendarEvent] = []
for (_, dayEvents) in groupedEvents.sorted(by: { $0.key < $1.key }) {
sortedEvents.append(contentsOf: dayEvents.sorted { $0.startTime < $1.startTime })
}

if sortedEvents.isEmpty {
DebugLogManager.shared.add("No events found for today", category: .calendar)
} else {
for event in sortedEvents {
DebugLogManager.shared.add("Event: \(event.title) | Time: \(dateFormatter.string(from: event.startTime)) | Calendar: \(event.calendarTitle)", category: .calendar)
}
}

DispatchQueue.main.async {
completion(sortedEvents)
}
    }

    func checkAuthorizationStatus() -> Bool {
        let status = EKEventStore.authorizationStatus(for: .event)
        DebugLogManager.shared.add("Check authorization status: \(statusString(status))", category: .calendar)

switch status {
case .fullAccess:
isAuthorized = true
case .authorized:
isAuthorized = true
case .denied, .restricted, .notDetermined, .writeOnly:
isAuthorized = false
@unknown default:
isAuthorized = false
}

        return isAuthorized
    }

    private func statusString(_ status: EKAuthorizationStatus) -> String {
        switch status {
        case .notDetermined: return "notDetermined"
        case .restricted: return "restricted"
        case .denied: return "denied"
        case .authorized: return "authorized"
        case .fullAccess: return "fullAccess"
        case .writeOnly: return "writeOnly"
        @unknown default: return "unknown"
        }
    }
}