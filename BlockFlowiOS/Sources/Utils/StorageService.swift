import Foundation

final class StorageService {
    static let shared = StorageService()
    private let defaults = UserDefaults.standard
    private let scheduleKey = "blockflow_schedule"
    private let sleepHoursKey = "blockflow_sleep_hours"
    
    private init() {}
    
    func getTodayDateString() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }
    
    func loadTodaySchedule() -> DaySchedule {
        guard let data = defaults.data(forKey: scheduleKey) else {
            return DaySchedule.createNew()
        }
        
        do {
            let schedule = try JSONDecoder().decode(DaySchedule.self, from: data)
if schedule.date != getTodayDateString() {
            var newSchedule = DaySchedule.createNew()
            newSchedule.sleepHours = schedule.sleepHours
            saveSchedule(newSchedule)
            return newSchedule
        }
            return schedule
        } catch {
            return DaySchedule.createNew()
        }
    }
    
    func saveSchedule(_ schedule: DaySchedule) {
        do {
            let data = try JSONEncoder().encode(schedule)
            defaults.set(data, forKey: scheduleKey)
        } catch {
            print("Failed to save schedule: \(error)")
        }
    }
    
    func addBlock(_ block: BlockItem, to schedule: inout DaySchedule) {
        schedule.blocks.append(block)
        schedule.blocks.sort { $0.startTime < $1.startTime }
        saveSchedule(schedule)
    }
    
    func updateBlock(_ block: BlockItem, in schedule: inout DaySchedule) {
        if let index = schedule.blocks.firstIndex(where: { $0.id == block.id }) {
            schedule.blocks[index] = block
            schedule.blocks.sort { $0.startTime < $1.startTime }
            saveSchedule(schedule)
        }
    }
    
    func deleteBlock(id: UUID, from schedule: inout DaySchedule) {
        schedule.blocks.removeAll { $0.id == id }
        saveSchedule(schedule)
    }
    
    func toggleBlockCompletion(id: UUID, in schedule: inout DaySchedule) {
        if let index = schedule.blocks.firstIndex(where: { $0.id == id }) {
            schedule.blocks[index].isCompleted.toggle()
            saveSchedule(schedule)
        }
    }
    
    func updateSleepHours(_ hours: Double, for schedule: inout DaySchedule) {
        schedule.sleepHours = hours
        defaults.set(hours, forKey: sleepHoursKey)
        saveSchedule(schedule)
    }
    
    func loadSleepHours() -> Double {
        return defaults.double(forKey: sleepHoursKey)
    }
    
    func resetDay() -> DaySchedule {
        let currentSchedule = loadTodaySchedule()
        var newSchedule = DaySchedule.createNew()
        newSchedule.sleepHours = currentSchedule.sleepHours
        saveSchedule(newSchedule)
        return newSchedule
    }
}