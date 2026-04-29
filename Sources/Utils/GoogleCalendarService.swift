import Foundation
import SwiftUI

struct GoogleCalendarEvent: Identifiable {
let id: String
let title: String
let startTime: Date
let endTime: Date
let isAllDay: Bool
let calendarTitle: String
let calendarColor: Color
let source: CalendarSource = .google

var duration: Int {
Int(endTime.timeIntervalSince(startTime) / 60)
}
}

final class GoogleCalendarService {
static let shared = GoogleCalendarService()

var isEnabled: Bool {
get { UserDefaults.standard.bool(forKey: "googleCalendarEnabled") }
set { UserDefaults.standard.set(newValue, forKey: "googleCalendarEnabled") }
}

var isAuthorized: Bool = false

private init() {}

func requestAccess(completion: @escaping (Bool) -> Void) {
DebugLogManager.shared.add("Google Calendar access requested (placeholder)", category: .calendar)
isAuthorized = true
DebugLogManager.shared.add("Google Calendar access granted (placeholder)", category: .calendar)
completion(true)
}

func fetchUpcomingEvents(completion: @escaping ([GoogleCalendarEvent]) -> Void) {
DebugLogManager.shared.add("GoogleCalendarService: fetchUpcomingEvents called | isEnabled: \(isEnabled)", category: .calendar)

guard isEnabled else {
DebugLogManager.shared.add("Google Calendar sync is disabled", category: .calendar)
DispatchQueue.main.async {
completion([])
}
return
}

guard isAuthorized else {
DebugLogManager.shared.add("Google Calendar not authorized, requesting access", category: .calendar)
requestAccess { [weak self] granted in
if granted {
self?.fetchUpcomingEvents(completion: completion)
} else {
DebugLogManager.shared.add("Google Calendar authorization denied", category: .calendar)
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
let endDate = calendarSys.date(byAdding: .day, value: 7, to: startOfDay) ?? now

DebugLogManager.shared.add("Google Calendar: Searching from \(startOfDay) to \(endDate) (placeholder)", category: .calendar)

DispatchQueue.main.async {
completion([])
}
}

func checkAuthorizationStatus() -> Bool {
return isAuthorized
}
}

extension GoogleCalendarEvent {
func toCalendarEvent() -> CalendarEvent {
CalendarEvent(
id: "google_\(id)",
title: title,
startTime: startTime,
endTime: endTime,
isAllDay: isAllDay,
calendarTitle: calendarTitle,
calendarColor: calendarColor,
source: .google
)
}
}