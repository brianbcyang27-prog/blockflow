import Foundation

enum BlockType: String, CaseIterable, Codable {
    case focus = "Focus"
    case personal = "Personal"
    case recovery = "Recovery"
    case sleep = "Sleep"

    var icon: String {
        switch self {
        case .focus: return "brain.head.profile"
        case .personal: return "person.fill"
        case .recovery: return "leaf.fill"
        case .sleep: return "moon.zzz.fill"
        }
    }

    var color: String {
        switch self {
        case .focus: return "FocusColor"
        case .personal: return "PersonalColor"
        case .recovery: return "RecoveryColor"
        case .sleep: return "SleepColor"
        }
    }
}

struct BlockItem: Codable, Identifiable {
    let id: UUID
    var title: String
    var type: BlockType
    var startTime: Date
    var duration: Int
    var isCompleted: Bool

    init(id: UUID = UUID(), title: String, type: BlockType, startTime: Date, duration: Int, isCompleted: Bool = false) {
        self.id = id
        self.title = title
        self.type = type
        self.startTime = startTime
        self.duration = duration
        self.isCompleted = isCompleted
    }

    var endTime: Date {
        Calendar.current.date(byAdding: .minute, value: duration, to: startTime) ?? startTime
    }
}

struct WorkoutModel: Identifiable, Equatable, Hashable {
    let id: UUID
    let type: String
    let duration: TimeInterval
    let calories: Double
    let date: Date

    init(id: UUID = UUID(), type: String, duration: TimeInterval, calories: Double, date: Date) {
        self.id = id
        self.type = type
        self.duration = duration
        self.calories = calories
        self.date = date
    }

    var durationMinutes: Int {
        Int(duration / 60)
    }

    var formattedDuration: String {
        let minutes = durationMinutes
        if minutes >= 60 {
            let hours = minutes / 60
            let mins = minutes % 60
            return mins > 0 ? "\(hours)h \(mins)m" : "\(hours)h"
        }
        return "\(minutes)m"
    }

    var icon: String {
        switch type.lowercased() {
        case "running": return "figure.run"
        case "walking": return "figure.walk"
        case "cycling": return "figure.outdoor.cycle"
        case "swimming": return "figure.pool.swim"
        case "yoga": return "figure.yoga"
        case "strength training", "strength": return "dumbbell.fill"
        case "hiit": return "bolt.heart.fill"
        case "rowing", "rowmachine": return "figure.rowing"
        case "elliptical": return "figure.elliptical"
        case "stair climber", "stairs": return "figure.stairs"
        default: return "figure.mixed.cardio"
        }
    }

    static func == (lhs: WorkoutModel, rhs: WorkoutModel) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

struct DaySchedule: Codable {
    var date: String
    var blocks: [BlockItem]
    var sleepHours: Double

    init(date: String = "", blocks: [BlockItem] = [], sleepHours: Double = 7.0) {
        self.date = date
        self.blocks = blocks
        self.sleepHours = sleepHours
    }

    static func createNew() -> DaySchedule {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return DaySchedule(date: formatter.string(from: Date()), blocks: [], sleepHours: 7.0)
    }

    var totalFocusMinutes: Int {
        blocks.filter { $0.type == .focus && $0.isCompleted }.reduce(0) { $0 + $1.duration }
    }

    var completedBlocksCount: Int {
        blocks.filter { $0.isCompleted }.count
    }

    var totalBlocksCount: Int {
        blocks.count
    }
}

struct WeeklySchedule: Codable {
    var weekStartDate: String
    var days: [DaySchedule]

    static func createNew() -> WeeklySchedule {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let today = Date()
        let calendar = Calendar.current
        let weekStart = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: today)) ?? today
        let weekStartString = formatter.string(from: weekStart)

        var days: [DaySchedule] = []
        for i in 0..<7 {
            if let dayDate = calendar.date(byAdding: .day, value: i, to: weekStart) {
                var schedule = DaySchedule(date: formatter.string(from: dayDate))
                days.append(schedule)
            }
        }

        return WeeklySchedule(weekStartDate: weekStartString, days: days)
    }
}
