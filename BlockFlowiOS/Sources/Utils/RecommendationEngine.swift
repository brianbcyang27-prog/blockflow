import Foundation

struct DailyRecommendation {
    let suggestedFocusMinutes: Int
    let workloadLevel: WorkloadLevel
    let message: String
    let sleepHours: Double
    let screenTimeHours: Double
    let energyLevel: EnergyLevel
    let recoveryStatus: RecoveryStatus
    let suggestion: ActivitySuggestion
}

enum WorkloadLevel: String {
    case low = "Low"
    case normal = "Normal"
    case high = "High"
}

enum EnergyLevel: String {
    case low = "Low"
    case medium = "Medium"
    case high = "High"
}

enum RecoveryStatus: String, Comparable {
    case poor = "Poor"
    case needsRest = "Needs Rest"
    case good = "Good"
    case excellent = "Excellent"

    var priority: Int {
        switch self {
        case .poor: return 0
        case .needsRest: return 1
        case .good: return 2
        case .excellent: return 3
        }
    }

    static func < (lhs: RecoveryStatus, rhs: RecoveryStatus) -> Bool {
        lhs.priority < rhs.priority
    }
}

enum ActivitySuggestion: String {
    case rest = "Rest"
    case lightWork = "Light Work"
    case focus = "Focus"
    case intenseWork = "Intense Work"
}

final class RecommendationEngine {
    static let shared = RecommendationEngine()

    private init() {}

    func generateRecommendation(
        for schedule: DaySchedule,
        healthSleepHours: Double? = nil,
        screenTimeHours: Double? = nil,
        heartRate: Double? = nil,
        oxygenSaturation: Double? = nil,
        hasWorkout: Bool = false
    ) -> DailyRecommendation {
        let sleepHours = healthSleepHours ?? schedule.sleepHours
        let completedBlocks = schedule.completedBlocksCount
        let totalFocusMinutes = schedule.totalFocusMinutes
        let screenTime = screenTimeHours ?? 0

        let (energyLevel, recoveryStatus, suggestion) = analyzeHealth(
            sleepHours: sleepHours,
            heartRate: heartRate,
            oxygenSaturation: oxygenSaturation,
            hasWorkout: hasWorkout
        )

        let suggestedMinutes: Int
        var workload: WorkloadLevel

        switch suggestion {
        case .rest:
            suggestedMinutes = 0
            workload = .low
        case .lightWork:
            suggestedMinutes = 15
            workload = .low
        case .focus:
            if sleepHours < 6 {
                suggestedMinutes = 25
                workload = .normal
            } else if sleepHours < 7 {
                suggestedMinutes = 35
                workload = .normal
            } else {
                suggestedMinutes = 45
                workload = .normal
            }
        case .intenseWork:
            suggestedMinutes = 60
            workload = .high
        }

        if screenTime > 4 {
            workload = .low
        }

        let message = generateMessage(
            sleepHours: sleepHours,
            completedBlocks: completedBlocks,
            totalFocusMinutes: totalFocusMinutes,
            screenTimeHours: screenTime,
            workload: workload,
            energyLevel: energyLevel,
            hasWorkout: hasWorkout
        )

        return DailyRecommendation(
            suggestedFocusMinutes: suggestedMinutes,
            workloadLevel: workload,
            message: message,
            sleepHours: sleepHours,
            screenTimeHours: screenTime,
            energyLevel: energyLevel,
            recoveryStatus: recoveryStatus,
            suggestion: suggestion
        )
    }

    private func analyzeHealth(
        sleepHours: Double,
        heartRate: Double?,
        oxygenSaturation: Double?,
        hasWorkout: Bool
    ) -> (EnergyLevel, RecoveryStatus, ActivitySuggestion) {
        var energyScore = 0
        var recoveryScore = 0

        if sleepHours < 5 {
            energyScore -= 2
            recoveryScore -= 2
        } else if sleepHours < 6 {
            energyScore -= 1
            recoveryScore -= 1
        } else if sleepHours >= 7 && sleepHours <= 8 {
            energyScore += 2
            recoveryScore += 2
        } else if sleepHours > 8 {
            energyScore += 1
            recoveryScore += 1
        }

        if let hr = heartRate {
            if hr < 60 {
                energyScore += 1
                recoveryScore += 1
            } else if hr > 100 {
                energyScore -= 1
            } else {
                energyScore += 1
            }
        }

        if let spo2 = oxygenSaturation {
            if spo2 >= 95 {
                energyScore += 1
                recoveryScore += 1
            } else if spo2 < 90 {
                energyScore -= 2
            }
        }

        if hasWorkout {
            recoveryScore -= 1
            energyScore += 1
        }

        let energy: EnergyLevel
        let recovery: RecoveryStatus
        let suggestion: ActivitySuggestion

        if energyScore <= -1 {
            energy = .low
        } else if energyScore >= 2 {
            energy = .high
        } else {
            energy = .medium
        }

        if recoveryScore <= -1 {
            recovery = .poor
        } else if recoveryScore == 0 {
            recovery = .needsRest
        } else if recoveryScore == 1 {
            recovery = .good
        } else {
            recovery = .excellent
        }

        if recovery == .poor || energy == .low {
            suggestion = .rest
        } else if recovery == .needsRest || energy == .medium {
            suggestion = .lightWork
        } else if energy == .high && recovery >= .good {
            suggestion = .intenseWork
        } else {
            suggestion = .focus
        }

        return (energy, recovery, suggestion)
    }

    private func generateMessage(
        sleepHours: Double,
        completedBlocks: Int,
        totalFocusMinutes: Int,
        screenTimeHours: Double,
        workload: WorkloadLevel,
        energyLevel: EnergyLevel,
        hasWorkout: Bool
    ) -> String {
        if sleepHours < 6 {
            return "You slept less than 6 hours. Take it easy today."
        }

        if screenTimeHours > 5 {
            return "High screen time yesterday. Consider more offline activities."
        }

        if hasWorkout {
            if completedBlocks == 0 && totalFocusMinutes == 0 {
                return "Great job on your workout! Start with light tasks today."
            }
        }

        if completedBlocks == 0 && totalFocusMinutes == 0 {
            switch workload {
            case .low: return "Start with one small task today."
            case .normal: return "Ready for a productive day?"
            case .high: return "Great energy today! Tackle big tasks."
            }
        }

        if totalFocusMinutes >= 60 {
            return "Amazing focus today! You're on fire."
        } else if totalFocusMinutes >= 30 {
            return "Great progress! Keep it up."
        } else if totalFocusMinutes > 0 {
            return "Good start. Every minute counts."
        }

        switch workload {
        case .low: return "Focus on quality over quantity."
        case .normal: return "Steady progress leads to results."
        case .high: return "You have the energy for deep work."
        }
    }
}
