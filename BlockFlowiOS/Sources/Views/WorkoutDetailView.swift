import SwiftUI

struct WorkoutDetailView: View {
    let workout: WorkoutModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                headerSection
                statsSection
                timeSection
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Workout Details")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var headerSection: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(workoutColor.opacity(0.15))
                    .frame(width: 120, height: 120)

                Image(systemName: workout.icon)
                    .font(.system(size: 50))
                    .foregroundColor(workoutColor)
            }

            Text(workout.type)
                .font(.title)
                .fontWeight(.bold)

            Text(workoutSubtitle)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }

    private var workoutColor: Color {
        switch workout.type.lowercased() {
        case "running": return .green
        case "walking": return .blue
        case "cycling": return .orange
        case "swimming": return .cyan
        case "yoga": return .purple
        case "hiit": return .red
        default: return .indigo
        }
    }

    private var workoutSubtitle: String {
        let intensity = calculateIntensity()
        return intensity.isEmpty ? "Cardio" : intensity
    }

    private func calculateIntensity() -> String {
        let durationMinutes = workout.durationMinutes
        if durationMinutes >= 60 {
            return "High Intensity"
        } else if durationMinutes >= 30 {
            return "Moderate Intensity"
        }
        return "Low Intensity"
    }

    private var statsSection: some View {
        HStack(spacing: 16) {
            statCard(
                title: "Duration",
                value: workout.formattedDuration,
                icon: "clock.fill",
                color: .blue
            )

            statCard(
                title: "Calories",
                value: "\(Int(workout.calories))",
                icon: "flame.fill",
                color: .orange
            )
        }
    }

    private func statCard(title: String, value: String, icon: String, color: Color) -> some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)

            Text(value)
                .font(.title2)
                .fontWeight(.bold)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }

    private var timeSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("When")
                .font(.headline)

            HStack {
                Image(systemName: "calendar")
                    .foregroundColor(.secondary)

                Text(formattedDate)
                    .font(.subheadline)

                Spacer()

                Text(formattedTime)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
    }

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: workout.date)
    }

    private var formattedTime: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: workout.date)
    }
}

struct WorkoutSummaryView: View {
    let workouts: [WorkoutModel]

    private var weeklyWorkouts: [WorkoutModel] {
        let calendar = Calendar.current
        let weekAgo = calendar.date(byAdding: .day, value: -7, to: Date()) ?? Date()
        return workouts.filter { $0.date >= weekAgo }
    }

    private var totalDuration: Int {
        weeklyWorkouts.reduce(0) { $0 + $1.durationMinutes }
    }

    private var totalCalories: Double {
        weeklyWorkouts.reduce(0) { $0 + $1.calories }
    }

    private var bestWorkout: WorkoutModel? {
        weeklyWorkouts.max { $0.calories < $1.calories }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Weekly Summary")
                .font(.headline)

            HStack(spacing: 16) {
                summaryItem(
                    title: "Workouts",
                    value: "\(weeklyWorkouts.count)",
                    icon: "figure.run",
                    color: .green
                )

                summaryItem(
                    title: "Total Time",
                    value: formatDuration(totalDuration),
                    icon: "clock.fill",
                    color: .blue
                )

                summaryItem(
                    title: "Calories",
                    value: "\(Int(totalCalories))",
                    icon: "flame.fill",
                    color: .orange
                )
            }

            if let best = bestWorkout {
                bestWorkoutCard(best)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }

    private func summaryItem(title: String, value: String, icon: String, color: Color) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)

            Text(value)
                .font(.headline)

            Text(title)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    private func bestWorkoutCard(_ workout: WorkoutModel) -> some View {
        HStack {
            Image(systemName: "trophy.fill")
                .foregroundColor(.yellow)

            VStack(alignment: .leading, spacing: 2) {
                Text("Best Workout")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text("\(workout.type) - \(Int(workout.calories)) kcal")
                    .font(.subheadline)
                    .fontWeight(.medium)
            }

            Spacer()
        }
        .padding()
        .background(Color.yellow.opacity(0.1))
        .cornerRadius(12)
    }

    private func formatDuration(_ minutes: Int) -> String {
        if minutes >= 60 {
            let hours = minutes / 60
            let mins = minutes % 60
            return mins > 0 ? "\(hours)h \(mins)m" : "\(hours)h"
        }
        return "\(minutes)m"
    }
}

#Preview {
    NavigationView {
        WorkoutDetailView(workout: WorkoutModel(
            type: "Running",
            duration: 3600,
            calories: 350,
            date: Date()
        ))
    }
}