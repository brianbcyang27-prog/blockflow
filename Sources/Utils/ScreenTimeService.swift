import Foundation
import DeviceActivity

final class ScreenTimeService {
    static let shared = ScreenTimeService()
    
    private init() {}
    
    var isScreenTimeAvailable: Bool {
        return true
    }
    
    func fetchTodayScreenTime(completion: @escaping (Double?) -> Void) {
        let defaults = UserDefaults.standard
        let todayKey = "screen_time_\(Date().timeIntervalSince1970 / 86400)"
        
        if let storedTime = defaults.object(forKey: todayKey) as? Double {
            completion(storedTime)
            return
        }
        
        completion(nil)
    }
    
    func recordScreenTime(minutes: Double) {
        let defaults = UserDefaults.standard
        let todayKey = "screen_time_\(Int(Date().timeIntervalSince1970 / 86400))"
        let existingTime = defaults.double(forKey: todayKey)
        defaults.set(existingTime + minutes, forKey: todayKey)
    }
    
    func getWeeklyAverage(completion: @escaping (Double?) -> Void) {
        let defaults = UserDefaults.standard
        var totalMinutes: Double = 0
        var daysCount = 0
        
        for i in 0..<7 {
            let key = "screen_time_\(Int((Date().timeIntervalSince1970 / 86400) - Double(i)))"
            let time = defaults.double(forKey: key)
            if time > 0 {
                totalMinutes += time
                daysCount += 1
            }
        }
        
        completion(daysCount > 0 ? totalMinutes / Double(daysCount) : nil)
    }
    
    func getScreenTimeLevel(hours: Double) -> ScreenTimeLevel {
        if hours < 2 {
            return .low
        } else if hours < 4 {
            return .moderate
        } else {
            return .high
        }
    }
}

enum ScreenTimeLevel: String {
    case low = "Low"
    case moderate = "Moderate"
    case high = "High"
    
    var color: String {
        switch self {
        case .low: return "green"
        case .moderate: return "orange"
        case .high: return "red"
        }
    }
    
    var message: String {
        switch self {
        case .low: return "Great screen time balance!"
        case .moderate: return "Moderate screen usage"
        case .high: return "High screen usage today"
        }
    }
}