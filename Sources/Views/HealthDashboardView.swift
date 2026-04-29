import SwiftUI

extension View {
    @ViewBuilder
    func numericTransition() -> some View {
        if #available(iOS 16.0, *) {
            self.contentTransition(.numericText())
        } else {
            self
        }
    }
}

struct HealthDashboardView: View {
    @ObservedObject var viewModel: BlockViewModel
    @State private var selectedHealthDetail: HealthDetailType?
    @State private var selectedWorkout: WorkoutModel?
    @State private var hasInitialized = false

    private let impactGenerator = UIImpactFeedbackGenerator(style: .medium)
    private let selectionGenerator = UISelectionFeedbackGenerator()

var body: some View {
        NavigationView {
            ZStack {
                scrollView

                if selectedHealthDetail != nil {
                    Color.clear
                }
                if selectedWorkout != nil {
                    Color.clear
                }
            }
            .background(
                Group {
                    if let detailType = selectedHealthDetail {
                        HealthDetailView(detailType: detailType, viewModel: viewModel)
                    }
                }
            )
            .background(
                Group {
                    if let workout = selectedWorkout {
                        WorkoutDetailView(workout: workout)
                    }
                }
            )
        }
        .navigationViewStyle(.stack)
    }

    private var scrollView: some View {
        ScrollView {
            VStack(spacing: 24) {
                headerSection
                healthOverviewSection
                activitySection
                focusSection
                screenTimeSection
            }
            .padding()
        }
        .navigationTitle("Health")
        .background(Color(.systemGroupedBackground))
        .onAppear {
            guard !hasInitialized else { return }
            hasInitialized = true
            print("[HealthDashboard] onAppear - calling initializeHealthData")
            viewModel.initializeHealthData()
            requestNotificationPermission()
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(greetingText)
                .font(.largeTitle)
                .fontWeight(.bold)

            Text(dateText)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var greetingText: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 {
            return "Good Morning"
        } else if hour < 17 {
            return "Good Afternoon"
        } else {
            return "Good Evening"
        }
    }

    private var dateText: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d"
        return formatter.string(from: Date())
    }

    private var healthOverviewSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(title: "Health Overview", icon: "heart.fill", color: .pink)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                tappableHealthCard(
                    type: .sleep,
                    card: HealthMetricCard(
                        title: "Sleep",
                        value: sleepValue,
                        unit: "hrs",
                        icon: "moon.zzz.fill",
                        color: .indigo,
                        label: viewModel.sleepQualityLabel,
                        labelColor: viewModel.sleepQualityColor,
                        progress: sleepProgress
                    )
                )

                tappableHealthCard(
                    type: .heartRate,
                    card: HealthMetricCard(
                        title: "Heart Rate",
                        value: heartRateValue,
                        unit: "bpm",
                        icon: "heart.fill",
                        color: .red,
                        label: heartRateStatus,
                        labelColor: heartRateColor,
                        progress: nil
                    )
                )

                tappableHealthCard(
                    type: .bloodOxygen,
                    card: HealthMetricCard(
                        title: "SpO2",
                        value: oxygenValue,
                        unit: "%",
                        icon: "lungs.fill",
                        color: .blue,
                        label: oxygenStatus,
                        labelColor: oxygenColor,
                        progress: oxygenProgress
                    )
                )

                tappableHealthCard(
                    type: .steps,
                    card: HealthMetricCard(
                        title: "Steps",
                        value: stepsValue,
                        unit: "",
                        icon: "figure.walk",
                        color: .green,
                        label: viewModel.activityLabel,
                        labelColor: viewModel.activityColor,
                        progress: viewModel.stepsProgress
                    )
                )
            }

            HStack(spacing: 12) {
                DashboardStatCard(
                    title: "Calories",
                    value: caloriesValue,
                    unit: "kcal",
                    icon: "flame.fill",
                    color: .orange,
                    progress: viewModel.caloriesProgress
                )

                DashboardStatCard(
                    title: "Focus Time",
                    value: "\(viewModel.totalFocusMinutes)",
                    unit: "min",
                    icon: "brain.head.profile",
                    color: .blue,
                    progress: focusProgress
                )
            }
        }
    }

    private var activitySection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(title: "Activity", icon: "figure.run", color: .green)

            if viewModel.hasWorkedOutToday {
                workoutCard
            } else {
                noWorkoutCard
            }
        }
    }

    private var workoutCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                    .font(.title2)

                VStack(alignment: .leading, spacing: 2) {
                    Text("You exercised today!")
                        .font(.headline)

                    Text("\(viewModel.todayWorkoutDuration) min total")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()
            }

            Divider()

            ForEach(viewModel.workouts.prefix(3)) { workout in
                HStack {
                    Image(systemName: workout.icon)
                        .foregroundColor(.green)
                        .frame(width: 24)

                    Text(workout.type)
                        .font(.subheadline)

                    Spacer()

                    Text(workout.formattedDuration)
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Text("\(Int(workout.calories)) kcal")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    selectionGenerator.selectionChanged()
                    selectedWorkout = workout
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
        }
    }

    var noWorkoutCard: some View {
        HStack {
            Image(systemName: "figure.walk")
                .font(.title)
                .foregroundColor(.gray)

            VStack(alignment: .leading, spacing: 2) {
                Text("No workout recorded")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Text("Start moving for better health")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    private var focusSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(title: "Focus & Productivity", icon: "brain.head.profile", color: .blue)

            HStack(spacing: 12) {
                DashboardStatCard(
                    title: "Blocks Done",
                    value: "\(viewModel.completedBlocksCount)",
                    unit: "/ \(viewModel.totalBlocksCount)",
                    icon: "checkmark.circle",
                    color: .green,
                    progress: blocksProgress
                )

                DashboardStatCard(
                    title: "Energy Level",
                    value: viewModel.recommendation.energyLevel.rawValue,
                    unit: "",
                    icon: "bolt.fill",
                    color: energyColor,
                    progress: nil
                )
            }

            recommendationCard
        }
    }

    private var recommendationCard: some View {
        HStack {
            Image(systemName: "lightbulb.fill")
                .foregroundColor(workloadColor)
                .font(.title2)

            VStack(alignment: .leading, spacing: 4) {
                Text(viewModel.recommendation.message)
                    .font(.subheadline)

                HStack(spacing: 8) {
                    Label("\(viewModel.recommendation.suggestedFocusMinutes)m", systemImage: "clock")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Label(viewModel.recommendation.recoveryStatus.rawValue, systemImage: "heart.text.square")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.systemBackground))
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)

            Spacer()
        }
        .padding()
        .background(workloadColor.opacity(0.1))
        .cornerRadius(16)
    }

    private var screenTimeSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(title: "Screen Time", icon: "iphone", color: .gray)

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    if let hours = viewModel.screenTimeHours {
                        Text(String(format: "%.1f hours", hours))
                            .font(.title2)
                            .fontWeight(.bold)

                        screenTimeLabel(hours: hours)
                    } else {
                        Text("No data")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.secondary)

                        Text("Enable in Settings")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "iphone.gen3")
                    .font(.system(size: 40))
                    .foregroundColor(.gray)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
        }
    }

    private func sectionHeader(title: String, icon: String, color: Color) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(color)

            Text(title)
                .font(.headline)
        }
    }

    private func tappableHealthCard(type: HealthDetailType, card: HealthMetricCard) -> some View {
        card
            .contentShape(Rectangle())
            .simultaneousGesture(
                LongPressGesture(minimumDuration: 0.01)
                    .onEnded { _ in
                        impactGenerator.impactOccurred()
                    }
            )
            .simultaneousGesture(
                TapGesture()
                    .onEnded {
                        selectedHealthDetail = type
                    }
            )
    }

    private func screenTimeLabel(hours: Double) -> some View {
        let level = ScreenTimeService.shared.getScreenTimeLevel(hours: hours)
        let color: Color

        switch level {
        case .low: color = .green
        case .moderate: color = .orange
        case .high: color = .red
        }

        return Text(level.message)
            .font(.caption)
            .foregroundColor(color)
    }

    private var sleepValue: String {
        if let hours = viewModel.healthSleepHours, hours > 0 {
            return String(format: "%.1f", hours)
        } else if viewModel.schedule.sleepHours > 0 {
            return String(format: "%.1f", viewModel.schedule.sleepHours)
        }
        return "--"
    }

    private var sleepProgress: Double? {
        guard let hours = viewModel.healthSleepHours ?? (viewModel.schedule.sleepHours > 0 ? viewModel.schedule.sleepHours : nil), hours > 0 else {
            return nil
        }
        return min(hours / 8.0, 1.0)
    }

    private var heartRateValue: String {
        guard let hr = viewModel.healthHeartRate, hr > 0 else { return "--" }
        return "\(Int(hr))"
    }

    private var heartRateStatus: String {
        guard let hr = viewModel.healthHeartRate, hr > 0 else { return "No data" }
        if hr < 60 { return "Resting" }
        if hr <= 100 { return "Normal" }
        return "Elevated"
    }

    private var heartRateColor: Color {
        guard let hr = viewModel.healthHeartRate, hr > 0 else { return .gray }
        if hr < 60 { return .blue }
        if hr <= 100 { return .green }
        return .orange
    }

    private var oxygenValue: String {
        guard let spo2 = viewModel.healthOxygenSaturation, spo2 > 0 else { return "--" }
        return "\(Int(spo2))"
    }

    private var oxygenProgress: Double? {
        guard let spo2 = viewModel.healthOxygenSaturation, spo2 > 0 else { return nil }
        return spo2 / 100.0
    }

    private var oxygenStatus: String {
        guard let spo2 = viewModel.healthOxygenSaturation, spo2 > 0 else { return "No data" }
        if spo2 >= 95 { return "Normal" }
        if spo2 >= 90 { return "Low" }
        return "Critical"
    }

    private var oxygenColor: Color {
        guard let spo2 = viewModel.healthOxygenSaturation, spo2 > 0 else { return .gray }
        if spo2 >= 95 { return .green }
        if spo2 >= 90 { return .orange }
        return .red
    }

    private var stepsValue: String {
        guard let steps = viewModel.healthSteps, steps > 0 else { return "--" }
        return "\(steps)"
    }

    private var caloriesValue: String {
        guard let calories = viewModel.healthCalories, calories > 0 else { return "--" }
        return "\(Int(calories))"
    }

    private var focusProgress: Double? {
        let progress = Double(viewModel.totalFocusMinutes) / 60.0
        return min(progress, 1.0)
    }

    private var blocksProgress: Double? {
        guard viewModel.totalBlocksCount > 0 else { return nil }
        return Double(viewModel.completedBlocksCount) / Double(viewModel.totalBlocksCount)
    }

    private var workloadColor: Color {
        switch viewModel.recommendation.workloadLevel {
        case .low: return .green
        case .normal: return .blue
        case .high: return .orange
        }
    }

    private var energyColor: Color {
        switch viewModel.recommendation.energyLevel {
        case .low: return .red
        case .medium: return .orange
        case .high: return .green
        }
    }

    private func requestNotificationPermission() {
        NotificationService.shared.requestAuthorization { granted in
            if granted {
                NotificationService.shared.setupSmartNotifications(
                    completedBlocks: self.viewModel.completedBlocksCount,
                    totalBlocks: self.viewModel.totalBlocksCount,
                    sleepHours: self.viewModel.healthSleepHours
                )
            }
        }
    }
}

struct HealthMetricCard: View {
    let title: String
    let value: String
    let unit: String
    let icon: String
    let color: Color
    let label: String
    let labelColor: Color
    let progress: Double?

    @State private var isPressed = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundColor(color)
                    .rotationEffect(.degrees(isPressed ? 10 : 0))
                    .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)

                Spacer()

                if let progress = progress {
                    CircularProgressView(progress: progress, color: color)
                        .frame(width: 20, height: 20)
                        .scaleEffect(isPressed ? 1.2 : 1.0)
                        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
                }
            }

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)

            HStack(alignment: .lastTextBaseline, spacing: 2) {
                Text(value)
                    .font(.title2)
                    .fontWeight(.bold)
                    .numericTransition()
                    .scaleEffect(isPressed ? 1.05 : 1.0)
                    .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)

                if !unit.isEmpty {
                    Text(unit)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Text(label)
                .font(.caption2)
                .foregroundColor(labelColor)
                .opacity(isPressed ? 0.7 : 1.0)
                .animation(.easeInOut(duration: 0.2), value: isPressed)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: isPressed ? 12 : 8, x: 0, y: isPressed ? 4 : 2)
        .scaleEffect(isPressed ? 0.98 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isPressed)
        .onLongPressGesture(minimumDuration: .infinity, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
    }
}

struct DashboardStatCard: View {
    let title: String
    let value: String
    let unit: String
    let icon: String
    let color: Color
    let progress: Double?

    @State private var isPressed = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                    .rotationEffect(.degrees(isPressed ? -10 : 0))
                    .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)

                Spacer()

                if let progress = progress {
                    CircularProgressView(progress: progress, color: color)
                        .frame(width: 24, height: 24)
                        .scaleEffect(isPressed ? 1.15 : 1.0)
                        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
                }
            }

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)

            HStack(alignment: .lastTextBaseline, spacing: 2) {
                Text(value)
                    .font(.title3)
                    .fontWeight(.bold)
                    .numericTransition()
                    .scaleEffect(isPressed ? 1.05 : 1.0)
                    .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)

                if !unit.isEmpty {
                    Text(unit)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: isPressed ? 12 : 8, x: 0, y: isPressed ? 4 : 2)
        .scaleEffect(isPressed ? 0.97 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isPressed)
        .onLongPressGesture(minimumDuration: .infinity, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
    }
}

struct CircularProgressView: View {
    let progress: Double
    let color: Color

    var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.2), lineWidth: 3)

            Circle()
                .trim(from: 0, to: progress)
                .stroke(color, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
    }
}

#Preview {
    HealthDashboardView(viewModel: BlockViewModel())
}
