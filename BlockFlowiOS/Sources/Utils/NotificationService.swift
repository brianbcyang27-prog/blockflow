import Foundation
import UserNotifications

final class NotificationService {
    static let shared = NotificationService()

    private let notificationCenter = UNUserNotificationCenter.current()

    private init() {}

    func requestAuthorization(completion: @escaping (Bool) -> Void) {
        notificationCenter.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error = error {
                print("[NotificationService] Authorization error: \(error.localizedDescription)")
            }
            print("[NotificationService] Authorization granted: \(granted)")
            DispatchQueue.main.async {
                completion(granted)
            }
        }
    }

    func checkAuthorizationStatus(completion: @escaping (Bool) -> Void) {
        notificationCenter.getNotificationSettings { settings in
            let authorized = settings.authorizationStatus == .authorized
            DispatchQueue.main.async {
                completion(authorized)
            }
        }
    }

    func scheduleFocusReminder(at hour: Int, minute: Int, message: String) {
        let content = UNMutableNotificationContent()
        content.title = "Time to Focus"
        content.body = message
        content.sound = .default
        content.categoryIdentifier = "FOCUS_REMINDER"

        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        let request = UNNotificationRequest(identifier: "focusReminder", content: content, trigger: trigger)

        notificationCenter.add(request) { error in
            if let error = error {
                print("[NotificationService] Failed to schedule focus reminder: \(error.localizedDescription)")
            } else {
                print("[NotificationService] Focus reminder scheduled for \(hour):\(minute)")
            }
        }
    }

    func scheduleSleepWarning(ifHoursLessThan hours: Double) {
        guard hours < 7 else { return }

        let content = UNMutableNotificationContent()
        content.title = "Sleep Insight"
        if hours < 5 {
            content.body = "You slept only \(Int(hours)) hours. Consider going to bed earlier tonight."
        } else {
            content.body = "You slept \(Int(hours)) hours. Try to get more rest for better recovery."
        }
        content.sound = .default
        content.categoryIdentifier = "SLEEP_WARNING"

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 5, repeats: false)
        let request = UNNotificationRequest(identifier: "sleepWarning", content: content, trigger: trigger)

        notificationCenter.add(request) { error in
            if let error = error {
                print("[NotificationService] Failed to schedule sleep warning: \(error.localizedDescription)")
            } else {
                print("[NotificationService] Sleep warning scheduled")
            }
        }
    }

    func scheduleInactivityReminder(afterMinutes minutes: Int) {
        let content = UNMutableNotificationContent()
        content.title = "Move Your Body"
        content.body = "You haven't logged any activity in a while. Take a short walk or stretch!"
        content.sound = .default
        content.categoryIdentifier = "INACTIVITY_REMINDER"

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: TimeInterval(minutes * 60), repeats: false)
        let request = UNNotificationRequest(identifier: "inactivityReminder", content: content, trigger: trigger)

        notificationCenter.add(request) { error in
            if let error = error {
                print("[NotificationService] Failed to schedule inactivity reminder: \(error.localizedDescription)")
            } else {
                print("[NotificationService] Inactivity reminder scheduled for \(minutes) minutes")
            }
        }
    }

    func scheduleBlockReminder(blockTitle: String, at date: Date) {
        let content = UNMutableNotificationContent()
        content.title = "BlockFlow Reminder"
        content.body = "Time for: \(blockTitle)"
        content.sound = .default
        content.categoryIdentifier = "BLOCK_REMINDER"

        let triggerDate = date.addingTimeInterval(-5 * 60)
        guard triggerDate > Date() else { return }

        let trigger = UNCalendarNotificationTrigger(
            dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: triggerDate),
            repeats: false
        )
        let request = UNNotificationRequest(identifier: "blockReminder_\(UUID().uuidString)", content: content, trigger: trigger)

        notificationCenter.add(request) { error in
            if let error = error {
                print("[NotificationService] Failed to schedule block reminder: \(error.localizedDescription)")
            }
        }
    }

    func cancelAllNotifications() {
        notificationCenter.removeAllPendingNotificationRequests()
        print("[NotificationService] All notifications cancelled")
    }

    func cancelNotification(identifier: String) {
        notificationCenter.removePendingNotificationRequests(withIdentifiers: [identifier])
    }

    func scheduleDailySummary(at hour: Int, minute: Int) {
        let content = UNMutableNotificationContent()
        content.title = "Daily Summary"
        content.body = "Check your BlockFlow summary for today!"
        content.sound = .default
        content.categoryIdentifier = "DAILY_SUMMARY"

        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        let request = UNNotificationRequest(identifier: "dailySummary", content: content, trigger: trigger)

        notificationCenter.add(request) { error in
            if let error = error {
                print("[NotificationService] Failed to schedule daily summary: \(error.localizedDescription)")
            } else {
                print("[NotificationService] Daily summary scheduled for \(hour):\(minute)")
            }
        }
    }

    func setupSmartNotifications(completedBlocks: Int, totalBlocks: Int, sleepHours: Double?) {
        cancelAllNotifications()

        if completedBlocks == 0 && totalBlocks > 0 {
            scheduleInactivityReminder(afterMinutes: 60)
        }

        if completedBlocks < totalBlocks / 2 && totalBlocks > 2 {
            scheduleFocusReminder(at: 14, minute: 0, message: "You have unfinished blocks. Time to focus!")
        }

        if let sleep = sleepHours {
            scheduleSleepWarning(ifHoursLessThan: sleep)
        }

        scheduleDailySummary(at: 20, minute: 0)
    }
}