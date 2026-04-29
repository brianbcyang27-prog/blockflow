import Foundation
import Combine
import SwiftUI

enum HealthAuthorizationState {
    case unknown
    case loading
    case authorized
    case notAuthorized
    case denied
}

final class BlockViewModel: ObservableObject {
    @Published var schedule: DaySchedule
    @Published var recommendation: DailyRecommendation
    @Published var isLoadingHealth: Bool = false
    @Published var healthAuthState: HealthAuthorizationState = .unknown

    @Published var healthSleepHours: Double? = nil
    @Published var healthSteps: Int? = nil
    @Published var healthCalories: Double? = nil
    @Published var healthHeartRate: Double? = nil
    @Published var healthOxygenSaturation: Double? = nil
    @Published var workouts: [WorkoutModel] = []
    @Published var screenTimeHours: Double? = nil

    private let storage = StorageService.shared
    private let recommendationEngine = RecommendationEngine.shared

    init() {
        let loadedSchedule = storage.loadTodaySchedule()
        self.schedule = loadedSchedule
        self.recommendation = recommendationEngine.generateRecommendation(for: loadedSchedule)
    }

    func initializeHealthData() {
        print("[BlockViewModel] initializeHealthData called")
        healthAuthState = .loading
        requestHealthAuthorization { [weak self] success in
            guard let self = self else { return }
            print("[BlockViewModel] Authorization result: \(success)")
            if success {
                self.healthAuthState = .authorized
                self.fetchAllHealthData()
            } else {
                self.healthAuthState = .notAuthorized
                print("[BlockViewModel] HealthKit not authorized, data fetch skipped")
            }
        }
    }

    func requestHealthAuthorization(completion: @escaping (Bool) -> Void) {
        print("[BlockViewModel] requestHealthAuthorization called")
        HealthService.shared.requestAuthorization { success in
            print("[BlockViewModel] HealthService authorization: \(success)")
            DispatchQueue.main.async {
                completion(success)
            }
        }
    }

    func fetchAllHealthData() {
        print("[BlockViewModel] fetchAllHealthData called")
        guard healthAuthState == .authorized else {
            print("[BlockViewModel] Cannot fetch - not authorized")
            return
        }
        isLoadingHealth = true

        let today = Date()

        HealthService.shared.fetchLastNightSleep { [weak self] hours in
            print("[BlockViewModel] Sleep fetch result: \(hours ?? -1)")
            if let hours = hours, hours > 0 {
                self?.updateSleepFromHealth(hours)
            }
        }

        HealthService.shared.fetchSteps(for: today) { [weak self] steps in
            print("[BlockViewModel] Steps fetch result: \(steps ?? -1)")
            if let steps = steps, steps > 0 {
                self?.updateSteps(steps)
            }
        }

        HealthService.shared.fetchCalories(for: today) { [weak self] calories in
            print("[BlockViewModel] Calories fetch result: \(calories ?? -1)")
            if let calories = calories, calories > 0 {
                self?.updateCalories(calories)
            }
        }

        HealthService.shared.fetchHeartRate(for: today) { [weak self] heartRate in
            print("[BlockViewModel] HeartRate fetch result: \(heartRate ?? -1)")
            if let heartRate = heartRate, heartRate > 0 {
                self?.updateHeartRate(heartRate)
            }
        }

        HealthService.shared.fetchOxygenSaturation(for: today) { [weak self] oxygen in
            print("[BlockViewModel] Oxygen fetch result: \(oxygen ?? -1)")
            if let oxygen = oxygen, oxygen > 0 {
                self?.updateOxygenSaturation(oxygen)
            }
        }

        HealthService.shared.fetchWorkouts(for: today) { [weak self] workoutData in
            print("[BlockViewModel] Workouts fetch result: \(workoutData?.hasWorkoutToday ?? false)")
            if let workoutData = workoutData {
                self?.updateWorkouts(workoutData)
            }
            DispatchQueue.main.async {
                self?.isLoadingHealth = false
            }
        }

        ScreenTimeService.shared.fetchTodayScreenTime { [weak self] hours in
            if let hours = hours {
                self?.updateScreenTime(hours)
            }
        }
    }

    func addBlock(title: String, type: BlockType, startTime: Date, duration: Int) {
        let block = BlockItem(title: title, type: type, startTime: startTime, duration: duration)
        storage.addBlock(block, to: &schedule)
        refreshRecommendation()
        objectWillChange.send()
    }

    func updateBlock(_ block: BlockItem) {
        storage.updateBlock(block, in: &schedule)
        refreshRecommendation()
        objectWillChange.send()
    }

    func deleteBlock(id: UUID) {
        storage.deleteBlock(id: id, from: &schedule)
        refreshRecommendation()
        objectWillChange.send()
    }

    func toggleCompletion(id: UUID) {
        storage.toggleBlockCompletion(id: id, in: &schedule)
        refreshRecommendation()
        objectWillChange.send()
    }

    func updateSleepHours(_ hours: Double) {
        storage.updateSleepHours(hours, for: &schedule)
        refreshRecommendation()
        objectWillChange.send()
    }

    func updateSleepFromHealth(_ hours: Double) {
        DispatchQueue.main.async {
            self.healthSleepHours = hours
            self.storage.updateSleepHours(hours, for: &self.schedule)
            self.refreshRecommendation()
            self.objectWillChange.send()
        }
    }

    func updateScreenTime(_ hours: Double) {
        DispatchQueue.main.async {
            self.screenTimeHours = hours
            self.refreshRecommendation()
            self.objectWillChange.send()
        }
    }

    func updateSteps(_ steps: Int) {
        DispatchQueue.main.async {
            self.healthSteps = steps
            self.refreshRecommendation()
            self.objectWillChange.send()
        }
    }

    func updateCalories(_ calories: Double) {
        DispatchQueue.main.async {
            self.healthCalories = calories
            self.refreshRecommendation()
            self.objectWillChange.send()
        }
    }

    func updateHeartRate(_ heartRate: Double) {
        DispatchQueue.main.async {
            self.healthHeartRate = heartRate
            self.refreshRecommendation()
            self.objectWillChange.send()
        }
    }

    func updateOxygenSaturation(_ oxygen: Double) {
        DispatchQueue.main.async {
            self.healthOxygenSaturation = oxygen
            self.refreshRecommendation()
            self.objectWillChange.send()
        }
    }

    func updateWorkouts(_ workoutData: WorkoutData) {
        DispatchQueue.main.async {
            if workoutData.hasWorkoutToday {
                let workout = WorkoutModel(
                    type: workoutData.workoutType,
                    duration: workoutData.duration,
                    calories: workoutData.calories,
                    date: Date()
                )
                if !self.workouts.contains(where: { $0.type == workout.type && Calendar.current.isDateInToday($0.date) }) {
                    self.workouts.insert(workout, at: 0)
                }
            }
            self.refreshRecommendation()
            self.objectWillChange.send()
        }
    }

    func resetDay() {
        schedule = storage.resetDay()
        refreshRecommendation()
        objectWillChange.send()
    }

    private func refreshRecommendation() {
        let hasWorkout = !workouts.isEmpty && workouts.contains { Calendar.current.isDateInToday($0.date) }
        recommendation = recommendationEngine.generateRecommendation(
            for: schedule,
            healthSleepHours: healthSleepHours,
            screenTimeHours: screenTimeHours,
            heartRate: healthHeartRate,
            oxygenSaturation: healthOxygenSaturation,
            hasWorkout: hasWorkout
        )
    }

    var totalFocusMinutes: Int {
        schedule.totalFocusMinutes
    }

    var completedBlocksCount: Int {
        schedule.completedBlocksCount
    }

    var totalBlocksCount: Int {
        schedule.totalBlocksCount
    }

    var todayWorkoutDuration: Int {
        workouts
            .filter { Calendar.current.isDateInToday($0.date) }
            .reduce(0) { $0 + $1.durationMinutes }
    }

    var hasWorkedOutToday: Bool {
        todayWorkoutDuration > 0
    }

    var sleepQualityLabel: String {
        guard let hours = healthSleepHours ?? schedule.sleepHours as Double? else {
            return "No data"
        }
        if hours < 6 { return "Low sleep" }
        if hours <= 8 { return "Good sleep" }
        return "Oversleeping"
    }

    var sleepQualityColor: Color {
        guard let hours = healthSleepHours ?? schedule.sleepHours as Double? else {
            return .gray
        }
        if hours < 6 { return .red }
        if hours <= 8 { return .green }
        return .blue
    }

    var activityLabel: String {
        guard let steps = healthSteps else { return "No data" }
        if steps >= 10000 { return "High activity" }
        if steps >= 5000 { return "Moderate" }
        return "Low activity"
    }

    var activityColor: Color {
        guard let steps = healthSteps else { return .gray }
        if steps >= 10000 { return .green }
        if steps >= 5000 { return .orange }
        return .red
    }

    var heartRateLabel: String {
        guard let hr = healthHeartRate, hr > 0 else { return "No data" }
        return "\(Int(hr)) bpm"
    }

    var oxygenLabel: String {
        guard let spo2 = healthOxygenSaturation, spo2 > 0 else { return "No data" }
        return "\(Int(spo2))%"
    }

    var stepsProgress: Double {
        guard let steps = healthSteps else { return 0 }
        return min(Double(steps) / 10000.0, 1.0)
    }

    var caloriesProgress: Double {
        guard let calories = healthCalories else { return 0 }
        return min(calories / 500.0, 1.0)
    }
}