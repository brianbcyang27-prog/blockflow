import Foundation
import HealthKit

struct HealthKitStatus {
    var isAvailable: Bool = false
    var isAuthorized: Bool = false
    var sleepStatus: Int = 0
    var stepsStatus: Int = 0
    var caloriesStatus: Int = 0
    var heartRateStatus: Int = 0
    var oxygenStatus: Int = 0
    var workoutStatus: Int = 0
    var lastError: String = ""
    var debugLog: [String] = []
}

struct WorkoutData {
    let hasWorkoutToday: Bool
    let workoutType: String
    let duration: TimeInterval
    let calories: Double
}

struct HealthDataPoint: Identifiable {
    let id = UUID()
    let date: Date
    let value: Double
}

struct SleepDataPoint: Identifiable {
    let id = UUID()
    let date: Date
    let hours: Double
}

final class HealthService {
static let shared = HealthService()

private let healthStore = HKHealthStore()
private(set) var isAuthorized = false
private(set) var lastStatus: HealthKitStatus = HealthKitStatus()

private init() {}

var isHealthKitAvailable: Bool {
return HKHealthStore.isHealthDataAvailable()
}

func getDetailedStatus() -> HealthKitStatus {
var status = HealthKitStatus()
status.isAvailable = isHealthKitAvailable
status.isAuthorized = isAuthorized

let types: [(String, HKObjectType)] = [
            ("sleepAnalysis", HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!),
            ("stepCount", HKObjectType.quantityType(forIdentifier: .stepCount)!),
            ("activeEnergyBurned", HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!),
            ("heartRate", HKObjectType.quantityType(forIdentifier: .heartRate)!),
            ("oxygenSaturation", HKObjectType.quantityType(forIdentifier: .oxygenSaturation)!),
            ("workout", HKObjectType.workoutType())
        ]

        for (name, type) in types {
            let authStatus = healthStore.authorizationStatus(for: type)
            switch name {
            case "sleepAnalysis": status.sleepStatus = authStatus.rawValue
            case "stepCount": status.stepsStatus = authStatus.rawValue
            case "activeEnergyBurned": status.caloriesStatus = authStatus.rawValue
            case "heartRate": status.heartRateStatus = authStatus.rawValue
            case "oxygenSaturation": status.oxygenStatus = authStatus.rawValue
            case "workout": status.workoutStatus = authStatus.rawValue
            default: break
            }
        }

return status
}

func requestAuthorization(completion: @escaping (Bool) -> Void) {
log("requestAuthorization called")
log("isHealthKitAvailable: \(isHealthKitAvailable)")

if isAuthorized {
log("Already authorized")
completion(true)
return
}

guard isHealthKitAvailable else {
log("HealthKit NOT available on this device")
lastStatus.lastError = "HealthKit not available"
completion(false)
return
}

let typesToRead: Set<HKObjectType> = [
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!,
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .oxygenSaturation)!,
            HKObjectType.workoutType()
        ]

log("Requesting authorization for \(typesToRead.count) types")

healthStore.requestAuthorization(toShare: nil, read: typesToRead) { [weak self] success, error in
if let error = error {
self?.log("Authorization error: \(error.localizedDescription)")
self?.lastStatus.lastError = error.localizedDescription
}

self?.isAuthorized = success
self?.log("Authorization result: \(success)")
self?.lastStatus.isAuthorized = success

if success {
self?.checkAuthorizationStatus()
}

DispatchQueue.main.async {
completion(success)
}
}
}

private func checkAuthorizationStatus() {
        let types: [(String, HKObjectType)] = [
            ("sleepAnalysis", HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!),
            ("stepCount", HKObjectType.quantityType(forIdentifier: .stepCount)!),
            ("activeEnergyBurned", HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!),
            ("heartRate", HKObjectType.quantityType(forIdentifier: .heartRate)!),
            ("oxygenSaturation", HKObjectType.quantityType(forIdentifier: .oxygenSaturation)!),
            ("workout", HKObjectType.workoutType())
        ]

        for (name, type) in types {
            let status = healthStore.authorizationStatus(for: type)
            log("\(name) status: \(status.rawValue) (\(self.authStatusString(status)))")
        }
    }

private func authStatusString(_ status: HKAuthorizationStatus) -> String {
switch status {
case .notDetermined: return "notDetermined"
case .sharingDenied: return "sharingDenied"
case .sharingAuthorized: return "sharingAuthorized"
@unknown default: return "unknown"
}
}

func fetchLastNightSleep(completion: @escaping (Double?) -> Void) {
        log("fetchLastNightSleep called")

        guard isHealthKitAvailable else {
            log("HealthKit not available")
            completion(nil)
            return
        }

        guard isAuthorized else {
            log("Not authorized for HealthKit")
            completion(nil)
            return
        }

        let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
        log("Sleep type: \(sleepType)")

        let now = Date()
        let calendar = Calendar.current
        let startOfToday = calendar.startOfDay(for: now)

        let bedtimeLastNight: Date
        let wakeTimeThisMorning: Date

        if let bedtime = calendar.date(bySettingHour: 21, minute: 0, second: 0, of: startOfToday) {
            bedtimeLastNight = calendar.date(byAdding: .day, value: -1, to: bedtime) ?? startOfToday
        } else {
            bedtimeLastNight = calendar.date(byAdding: .hour, value: -12, to: now) ?? startOfToday
        }

        if let wake = calendar.date(bySettingHour: 7, minute: 0, second: 0, of: startOfToday) {
            wakeTimeThisMorning = wake
        } else {
            wakeTimeThisMorning = calendar.date(byAdding: .hour, value: -5, to: now) ?? now
        }

        let queryStart = bedtimeLastNight
        let queryEnd = wakeTimeThisMorning

        log("Querying sleep from \(queryStart) to \(queryEnd)")

        let predicate = HKQuery.predicateForSamples(
            withStart: queryStart,
            end: queryEnd,
            options: .strictStartDate
        )

let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

let query = HKSampleQuery(
sampleType: sleepType,
predicate: predicate,
limit: HKObjectQueryNoLimit,
sortDescriptors: [sortDescriptor]
) { [weak self] _, samples, error in
if let error = error {
self?.log("Sleep query error: \(error.localizedDescription)")
self?.lastStatus.lastError = error.localizedDescription
DispatchQueue.main.async {
completion(nil)
}
return
}

guard let samples = samples as? [HKCategorySample] else {
self?.log("No sleep samples found")
DispatchQueue.main.async {
completion(nil)
}
return
}

self?.log("Found \(samples.count) sleep samples")

var totalSleepMinutes: Double = 0

for sample in samples {
let sleepValue = sample.value
if self?.isAsleepValue(sleepValue) == true {
let duration = sample.endDate.timeIntervalSince(sample.startDate)
totalSleepMinutes += duration / 60
self?.log("Sleep sample: \(sample.startDate) - \(sample.endDate), duration: \(duration/60) min, value: \(sleepValue)")
}
}

let sleepHours = totalSleepMinutes / 60
self?.log("Total sleep hours calculated: \(sleepHours)")

DispatchQueue.main.async {
completion(sleepHours > 0 ? sleepHours : nil)
}
}

healthStore.execute(query)
}

func fetchSteps(for date: Date, completion: @escaping (Int?) -> Void) {
log("fetchSteps called for \(date)")

guard isHealthKitAvailable else {
log("HealthKit not available")
completion(nil)
return
}

guard isAuthorized else {
log("Not authorized for HealthKit")
completion(nil)
return
}

guard let stepsType = HKObjectType.quantityType(forIdentifier: .stepCount) else {
log("Steps type not available")
completion(nil)
return
}

let startOfDay = Calendar.current.startOfDay(for: date)
let now = Date()

log("Querying steps from \(startOfDay) to \(now)")

let predicate = HKQuery.predicateForSamples(
withStart: startOfDay,
end: now,
options: .strictStartDate
)

let query = HKStatisticsQuery(
quantityType: stepsType,
quantitySamplePredicate: predicate,
options: .cumulativeSum
) { [weak self] _, result, error in
if let error = error {
self?.log("Steps query error: \(error.localizedDescription)")
self?.lastStatus.lastError = error.localizedDescription
DispatchQueue.main.async {
completion(nil)
}
return
}

guard let sum = result?.sumQuantity() else {
self?.log("No steps data found")
DispatchQueue.main.async {
completion(nil)
}
return
}

let steps = Int(sum.doubleValue(for: HKUnit.count()))
self?.log("Steps today: \(steps)")

DispatchQueue.main.async {
completion(steps)
}
}

healthStore.execute(query)
}

func fetchCalories(for date: Date, completion: @escaping (Double?) -> Void) {
log("fetchCalories called for \(date)")

guard isHealthKitAvailable else {
log("HealthKit not available")
completion(nil)
return
}

guard isAuthorized else {
log("Not authorized for HealthKit")
completion(nil)
return
}

guard let caloriesType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) else {
log("Calories type not available")
completion(nil)
return
}

let startOfDay = Calendar.current.startOfDay(for: date)
let now = Date()

log("Querying calories from \(startOfDay) to \(now)")

let predicate = HKQuery.predicateForSamples(
withStart: startOfDay,
end: now,
options: .strictStartDate
)

let query = HKStatisticsQuery(
quantityType: caloriesType,
quantitySamplePredicate: predicate,
options: .cumulativeSum
) { [weak self] _, result, error in
if let error = error {
self?.log("Calories query error: \(error.localizedDescription)")
self?.lastStatus.lastError = error.localizedDescription
DispatchQueue.main.async {
completion(nil)
}
return
}

guard let sum = result?.sumQuantity() else {
self?.log("No calories data found")
DispatchQueue.main.async {
completion(nil)
}
return
}

let calories = sum.doubleValue(for: HKUnit.kilocalorie())
self?.log("Calories today: \(calories)")

DispatchQueue.main.async {
completion(calories)
}
}

healthStore.execute(query)
}

func fetchHeartRate(for date: Date, completion: @escaping (Double?) -> Void) {
log("fetchHeartRate called for \(date)")

guard isHealthKitAvailable else {
log("HealthKit not available")
completion(nil)
return
}

guard isAuthorized else {
log("Not authorized for HealthKit")
completion(nil)
return
}

guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
log("Heart rate type not available")
completion(nil)
return
}

let startOfDay = Calendar.current.startOfDay(for: date)
let now = Date()

log("Querying heart rate from \(startOfDay) to \(now)")

let predicate = HKQuery.predicateForSamples(
withStart: startOfDay,
end: now,
options: .strictStartDate
)

let query = HKStatisticsQuery(
quantityType: heartRateType,
quantitySamplePredicate: predicate,
options: .discreteAverage
) { [weak self] _, result, error in
if let error = error {
self?.log("Heart rate query error: \(error.localizedDescription)")
self?.lastStatus.lastError = error.localizedDescription
DispatchQueue.main.async {
completion(nil)
}
return
}

guard let average = result?.averageQuantity() else {
self?.log("No heart rate data found")
DispatchQueue.main.async {
completion(nil)
}
return
}

let heartRateUnit = HKUnit.count().unitDivided(by: HKUnit.minute())
let heartRate = average.doubleValue(for: heartRateUnit)
self?.log("Average heart rate today: \(heartRate)")

DispatchQueue.main.async {
completion(heartRate)
}
}

healthStore.execute(query)
    }

    func fetchOxygenSaturation(for date: Date, completion: @escaping (Double?) -> Void) {
        log("fetchOxygenSaturation called for \(date)")

        guard isHealthKitAvailable else {
            log("HealthKit not available")
            completion(nil)
            return
        }

        guard isAuthorized else {
            log("Not authorized for HealthKit")
            completion(nil)
            return
        }

        guard let oxygenType = HKObjectType.quantityType(forIdentifier: .oxygenSaturation) else {
            log("Oxygen saturation type not available")
            completion(nil)
            return
        }

        let startOfDay = Calendar.current.startOfDay(for: date)
        let now = Date()

        log("Querying oxygen from \(startOfDay) to \(now)")

        let predicate = HKQuery.predicateForSamples(
            withStart: startOfDay,
            end: now,
            options: .strictStartDate
        )

        let query = HKStatisticsQuery(
            quantityType: oxygenType,
            quantitySamplePredicate: predicate,
            options: .discreteAverage
        ) { [weak self] _, result, error in
            if let error = error {
                self?.log("Oxygen query error: \(error.localizedDescription)")
                self?.lastStatus.lastError = error.localizedDescription
                DispatchQueue.main.async {
                    completion(nil)
                }
                return
            }

            guard let average = result?.averageQuantity() else {
                self?.log("No oxygen data found")
                DispatchQueue.main.async {
                    completion(nil)
                }
                return
            }

            let oxygen = average.doubleValue(for: HKUnit.percent())
            let oxygenPercent = oxygen * 100
            self?.log("Average oxygen saturation today: \(oxygenPercent)%")

            DispatchQueue.main.async {
                completion(oxygenPercent)
            }
        }

        healthStore.execute(query)
    }

    func fetchWorkouts(for date: Date, completion: @escaping (WorkoutData?) -> Void) {
        log("fetchWorkouts called for \(date)")

        guard isHealthKitAvailable else {
            log("HealthKit not available")
            completion(nil)
            return
        }

        guard isAuthorized else {
            log("Not authorized for HealthKit")
            completion(nil)
            return
        }

        let startOfDay = Calendar.current.startOfDay(for: date)
        let now = Date()

        log("Querying workouts from \(startOfDay) to \(now)")

        let predicate = HKQuery.predicateForSamples(
            withStart: startOfDay,
            end: now,
            options: .strictStartDate
        )

        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        let query = HKSampleQuery(
            sampleType: HKObjectType.workoutType(),
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sortDescriptor]
        ) { [weak self] _, samples, error in
            if let error = error {
                self?.log("Workout query error: \(error.localizedDescription)")
                self?.lastStatus.lastError = error.localizedDescription
                DispatchQueue.main.async {
                    completion(nil)
                }
                return
            }

            guard let workouts = samples as? [HKWorkout] else {
                self?.log("No workouts found")
                DispatchQueue.main.async {
                    completion(nil)
                }
                return
            }

            self?.log("Found \(workouts.count) workouts")

            guard let mostRecent = workouts.first else {
                DispatchQueue.main.async {
                    completion(WorkoutData(hasWorkoutToday: false, workoutType: "", duration: 0, calories: 0))
                }
                return
            }

            let workoutTypeName = self?.workoutTypeName(from: mostRecent.workoutActivityType) ?? "Exercise"
            let duration = mostRecent.duration
            let calories = mostRecent.totalEnergyBurned?.doubleValue(for: HKUnit.kilocalorie()) ?? 0

            self?.log("Most recent workout: \(workoutTypeName), duration: \(duration/60) min, calories: \(calories)")

            DispatchQueue.main.async {
                completion(WorkoutData(
                    hasWorkoutToday: true,
                    workoutType: workoutTypeName,
                    duration: duration,
                    calories: calories
                ))
            }
        }

        healthStore.execute(query)
    }

    func fetchHeartRateHistory(days: Int = 7, completion: @escaping ([HealthDataPoint]) -> Void) {
        log("fetchHeartRateHistory called for \(days) days")
        guard isHealthKitAvailable && isAuthorized else {
            completion([])
            return
        }
        guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
            completion([])
            return
        }

        let calendar = Calendar.current
        let endDate = Date()
        guard let startDate = calendar.date(byAdding: .day, value: -days, to: endDate) else {
            completion([])
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let interval = DateComponents(day: 1)
        let anchorDate = calendar.startOfDay(for: startDate)

        let query = HKStatisticsCollectionQuery(
            quantityType: heartRateType,
            quantitySamplePredicate: predicate,
            options: .discreteAverage,
            anchorDate: anchorDate,
            intervalComponents: interval
        )

        query.initialResultsHandler = { [weak self] _, results, error in
            if let error = error {
                self?.log("Heart rate history error: \(error.localizedDescription)")
                DispatchQueue.main.async { completion([]) }
                return
            }

            var dataPoints: [HealthDataPoint] = []
            results?.enumerateStatistics(from: startDate, to: endDate) { statistics, _ in
                if let average = statistics.averageQuantity() {
                    let heartRate = average.doubleValue(for: HKUnit.count().unitDivided(by: HKUnit.minute()))
                    dataPoints.append(HealthDataPoint(date: statistics.startDate, value: heartRate))
                }
            }

            self?.log("Heart rate history: \(dataPoints.count) points")
            DispatchQueue.main.async { completion(dataPoints) }
        }

        healthStore.execute(query)
    }

    func fetchOxygenHistory(days: Int = 7, completion: @escaping ([HealthDataPoint]) -> Void) {
        log("fetchOxygenHistory called for \(days) days")
        guard isHealthKitAvailable && isAuthorized else {
            completion([])
            return
        }
        guard let oxygenType = HKObjectType.quantityType(forIdentifier: .oxygenSaturation) else {
            completion([])
            return
        }

        let calendar = Calendar.current
        let endDate = Date()
        guard let startDate = calendar.date(byAdding: .day, value: -days, to: endDate) else {
            completion([])
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let interval = DateComponents(day: 1)
        let anchorDate = calendar.startOfDay(for: startDate)

        let query = HKStatisticsCollectionQuery(
            quantityType: oxygenType,
            quantitySamplePredicate: predicate,
            options: .discreteAverage,
            anchorDate: anchorDate,
            intervalComponents: interval
        )

        query.initialResultsHandler = { [weak self] _, results, error in
            if let error = error {
                self?.log("Oxygen history error: \(error.localizedDescription)")
                DispatchQueue.main.async { completion([]) }
                return
            }

            var dataPoints: [HealthDataPoint] = []
            results?.enumerateStatistics(from: startDate, to: endDate) { statistics, _ in
                if let average = statistics.averageQuantity() {
                    let oxygen = average.doubleValue(for: HKUnit.percent()) * 100
                    dataPoints.append(HealthDataPoint(date: statistics.startDate, value: oxygen))
                }
            }

            self?.log("Oxygen history: \(dataPoints.count) points")
            DispatchQueue.main.async { completion(dataPoints) }
        }

        healthStore.execute(query)
    }

    func fetchStepsHistory(days: Int = 7, completion: @escaping ([HealthDataPoint]) -> Void) {
        log("fetchStepsHistory called for \(days) days")
        guard isHealthKitAvailable && isAuthorized else {
            completion([])
            return
        }
        guard let stepsType = HKObjectType.quantityType(forIdentifier: .stepCount) else {
            completion([])
            return
        }

        let calendar = Calendar.current
        let endDate = Date()
        guard let startDate = calendar.date(byAdding: .day, value: -days, to: endDate) else {
            completion([])
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let interval = DateComponents(day: 1)
        let anchorDate = calendar.startOfDay(for: startDate)

        let query = HKStatisticsCollectionQuery(
            quantityType: stepsType,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum,
            anchorDate: anchorDate,
            intervalComponents: interval
        )

        query.initialResultsHandler = { [weak self] _, results, error in
            if let error = error {
                self?.log("Steps history error: \(error.localizedDescription)")
                DispatchQueue.main.async { completion([]) }
                return
            }

            var dataPoints: [HealthDataPoint] = []
            results?.enumerateStatistics(from: startDate, to: endDate) { statistics, _ in
                if let sum = statistics.sumQuantity() {
                    let steps = sum.doubleValue(for: HKUnit.count())
                    dataPoints.append(HealthDataPoint(date: statistics.startDate, value: steps))
                }
            }

            self?.log("Steps history: \(dataPoints.count) points")
            DispatchQueue.main.async { completion(dataPoints) }
        }

        healthStore.execute(query)
    }

    func fetchCaloriesHistory(days: Int = 7, completion: @escaping ([HealthDataPoint]) -> Void) {
        log("fetchCaloriesHistory called for \(days) days")
        guard isHealthKitAvailable && isAuthorized else {
            completion([])
            return
        }
        guard let caloriesType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) else {
            completion([])
            return
        }

        let calendar = Calendar.current
        let endDate = Date()
        guard let startDate = calendar.date(byAdding: .day, value: -days, to: endDate) else {
            completion([])
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let interval = DateComponents(day: 1)
        let anchorDate = calendar.startOfDay(for: startDate)

        let query = HKStatisticsCollectionQuery(
            quantityType: caloriesType,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum,
            anchorDate: anchorDate,
            intervalComponents: interval
        )

        query.initialResultsHandler = { [weak self] _, results, error in
            if let error = error {
                self?.log("Calories history error: \(error.localizedDescription)")
                DispatchQueue.main.async { completion([]) }
                return
            }

            var dataPoints: [HealthDataPoint] = []
            results?.enumerateStatistics(from: startDate, to: endDate) { statistics, _ in
                if let sum = statistics.sumQuantity() {
                    let calories = sum.doubleValue(for: HKUnit.kilocalorie())
                    dataPoints.append(HealthDataPoint(date: statistics.startDate, value: calories))
                }
            }

            self?.log("Calories history: \(dataPoints.count) points")
            DispatchQueue.main.async { completion(dataPoints) }
        }

        healthStore.execute(query)
    }

    func fetchSleepHistory(days: Int = 7, completion: @escaping ([SleepDataPoint]) -> Void) {
        log("fetchSleepHistory called for \(days) days")
        guard isHealthKitAvailable && isAuthorized else {
            completion([])
            return
        }
        guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            completion([])
            return
        }

        let calendar = Calendar.current
        let endDate = Date()
        guard let startDate = calendar.date(byAdding: .day, value: -days, to: endDate) else {
            completion([])
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        let query = HKSampleQuery(
            sampleType: sleepType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sortDescriptor]
        ) { [weak self] _, samples, error in
            if let error = error {
                self?.log("Sleep history error: \(error.localizedDescription)")
                DispatchQueue.main.async { completion([]) }
                return
            }

            guard let sleepSamples = samples as? [HKCategorySample] else {
                DispatchQueue.main.async { completion([]) }
                return
            }

            var dailySleep: [Date: Double] = [:]
            for sample in sleepSamples {
                if self?.isAsleepValue(sample.value) == true {
                    let duration = sample.endDate.timeIntervalSince(sample.startDate) / 3600
                    let dayStart = calendar.startOfDay(for: sample.startDate)
                    dailySleep[dayStart, default: 0] += duration
                }
            }

            let dataPoints = dailySleep.map { SleepDataPoint(date: $0.key, hours: $0.value) }
                .sorted { $0.date < $1.date }

            self?.log("Sleep history: \(dataPoints.count) points")
            DispatchQueue.main.async { completion(dataPoints) }
        }

        healthStore.execute(query)
    }

    private func workoutTypeName(from activityType: HKWorkoutActivityType) -> String {
        switch activityType {
        case .running: return "Running"
        case .walking: return "Walking"
        case .cycling: return "Cycling"
        case .swimming: return "Swimming"
        case .yoga: return "Yoga"
        case .functionalStrengthTraining: return "Strength Training"
        case .highIntensityIntervalTraining: return "HIIT"
        case .dance: return "Dance"
        case .snowSports: return "Snow Sports"
        case .martialArts: return "Martial Arts"
        case .boxing: return "Boxing"
        case .crossTraining: return "Cross Training"
        case .coreTraining: return "Core Training"
        case .flexibility: return "Flexibility"
        case .pilates: return "Pilates"
        case .barre: return "Barre"
        case .stepTraining: return "Step Training"
        case .waterSports: return "Water Sports"
        case .handball: return "Handball"
        case .rugby: return "Rugby"
        case .lacrosse: return "Lacrosse"
        case .hockey: return "Hockey"
        case .volleyball: return "Volleyball"
        case .basketball: return "Basketball"
        case .soccer: return "Soccer"
        case .baseball: return "Baseball"
        case .softball: return "Softball"
        case .americanFootball: return "Football"
        case .tennis: return "Tennis"
        case .badminton: return "Badminton"
        case .squash: return "Squash"
        case .tableTennis: return "Table Tennis"
        case .racquetball: return "Racquetball"
        case .handCycling: return "Hand Cycling"
        case .wheelchairWalkPace: return "Wheelchair Walk"
        case .wheelchairRunPace: return "Wheelchair Run"
        case .elliptical: return "Elliptical"
        case .rowing: return "Rowing"
        case .stairClimbing: return "Stair Climber"
        case .stairs: return "Stairs"
        case .crossCountrySkiing: return "Cross Country Skiing"
        case .curling: return "Curling"
        case .paddleSports: return "Paddle Sports"
        case .sailing: return "Sailing"
        case .fishing: return "Fishing"
        case .hunting: return "Hunting"
        case .equestrianSports: return "Horseback Riding"
        case .fencing: return "Fencing"
        case .gymnastics: return "Gymnastics"
        case .trackAndField: return "Track & Field"
        case .wrestling: return "Wrestling"
        case .other: return "Exercise"
        @unknown default: return "Exercise"
        }
    }

    private func isAsleepValue(_ value: Int) -> Bool {
if #available(iOS 16.0, *) {
return value == HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue ||
value == HKCategoryValueSleepAnalysis.asleepCore.rawValue ||
value == HKCategoryValueSleepAnalysis.asleepDeep.rawValue ||
value == HKCategoryValueSleepAnalysis.asleepREM.rawValue ||
value == HKCategoryValueSleepAnalysis.asleep.rawValue
} else {
return value == HKCategoryValueSleepAnalysis.asleep.rawValue
}
}

private func log(_ message: String) {
let timestamp = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
let logMessage = "[\(timestamp)] \(message)"
print("[HealthService] \(logMessage)")
lastStatus.debugLog.append(logMessage)
if lastStatus.debugLog.count > 50 {
lastStatus.debugLog.removeFirst()
}
}

func getAuthorizationStatus() -> Bool {
return isAuthorized
}

func resetAuthorization() {
isAuthorized = false
lastStatus = HealthKitStatus()
}
}
