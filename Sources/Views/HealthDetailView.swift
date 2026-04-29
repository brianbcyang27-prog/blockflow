import SwiftUI

enum HealthDetailType: String, CaseIterable {
    case sleep = "Sleep"
    case heartRate = "Heart Rate"
    case bloodOxygen = "Blood Oxygen"
    case steps = "Steps"
    case calories = "Calories"

    var icon: String {
        switch self {
        case .sleep: return "moon.zzz.fill"
        case .heartRate: return "heart.fill"
        case .bloodOxygen: return "lungs.fill"
        case .steps: return "figure.walk"
        case .calories: return "flame.fill"
        }
    }

    var color: Color {
        switch self {
        case .sleep: return .indigo
        case .heartRate: return .red
        case .bloodOxygen: return .blue
        case .steps: return .green
        case .calories: return .orange
        }
    }

    var unit: String {
        switch self {
        case .sleep: return "hrs"
        case .heartRate: return "bpm"
        case .bloodOxygen: return "%"
        case .steps: return "steps"
        case .calories: return "kcal"
        }
    }
}

struct HealthDetailView: View {
    let detailType: HealthDetailType
    @ObservedObject var viewModel: BlockViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var dataPoints: [HealthDataPoint] = []
    @State private var sleepDataPoints: [SleepDataPoint] = []
    @State private var isLoading = true
    @State private var currentValue: Double = 0
    @State private var trend: TrendDirection = .stable
    @State private var dragOffset: CGFloat = 0

    enum TrendDirection {
        case up, down, stable

        var icon: String {
            switch self {
            case .up: return "arrow.up.right"
            case .down: return "arrow.down.right"
            case .stable: return "arrow.right"
            }
        }

        var color: Color {
            switch self {
            case .up: return .green
            case .down: return .red
            case .stable: return .gray
            }
        }
    }

    private var allTypes: [HealthDetailType] {
        HealthDetailType.allCases
    }

    private var currentIndex: Int {
        allTypes.firstIndex(of: detailType) ?? 0
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                headerSection
                currentValueSection
                chartSection
                weeklySummarySection
                swipeHintSection
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle(detailType.rawValue)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            loadData()
        }
        .offset(x: dragOffset)
        .gesture(
            DragGesture()
                .onChanged { value in
                    dragOffset = value.translation.width
                }
                .onEnded { value in
                    let threshold: CGFloat = 50
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        dragOffset = 0
                    }
                    if value.translation.width > threshold {
                        navigateToPrevious()
                    } else if value.translation.width < -threshold {
                        navigateToNext()
                    }
                }
        )
    }

    private var swipeHintSection: some View {
        HStack {
            Image(systemName: "chevron.left")
                .font(.caption)
            Text("Swipe to navigate")
                .font(.caption)
            Image(systemName: "chevron.right")
                .font(.caption)
        }
        .foregroundColor(.secondary)
        .padding(.top, 8)
    }

    private func navigateToPrevious() {
        let newIndex = max(0, currentIndex - 1)
        if newIndex != currentIndex {
            navigateToDetailType(allTypes[newIndex])
        }
    }

    private func navigateToNext() {
        let newIndex = min(allTypes.count - 1, currentIndex + 1)
        if newIndex != currentIndex {
            navigateToDetailType(allTypes[newIndex])
        }
    }

    private func navigateToDetailType(_ type: HealthDetailType) {
        let impactGenerator = UIImpactFeedbackGenerator(style: .light)
        impactGenerator.impactOccurred()
    }

    private var headerSection: some View {
        HStack {
            Image(systemName: detailType.icon)
                .font(.title)
                .foregroundColor(detailType.color)

            VStack(alignment: .leading, spacing: 4) {
                Text("Last 7 Days")
                    .font(.headline)

                Text("Health Trend")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            trendBadge
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }

    private var trendBadge: some View {
        HStack(spacing: 4) {
            Image(systemName: trend.icon)
                .font(.caption)
            Text(trendText)
                .font(.caption)
                .fontWeight(.medium)
        }
        .foregroundColor(trend.color)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(trend.color.opacity(0.15))
        .cornerRadius(20)
    }

    private var trendText: String {
        switch trend {
        case .up: return "Increasing"
        case .down: return "Decreasing"
        case .stable: return "Stable"
        }
    }

    private var currentValueSection: some View {
        VStack(spacing: 8) {
            Text("Today's Value")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack(alignment: .lastTextBaseline, spacing: 4) {
                if #available(iOS 16.0, *) {
                    Text(formattedCurrentValue)
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .contentTransition(.numericText())
                } else {
                    Text(formattedCurrentValue)
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                }
                Text(detailType.unit)
                    .font(.title3)
                    .foregroundColor(.secondary)
            }

            Text(statusText)
                .font(.subheadline)
                .foregroundColor(statusColor)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }

    private var formattedCurrentValue: String {
        switch detailType {
        case .sleep:
            if let hours = viewModel.healthSleepHours, hours > 0 {
                return String(format: "%.1f", hours)
            }
            return "--"
        case .heartRate:
            if let hr = viewModel.healthHeartRate, hr > 0 {
                return "\(Int(hr))"
            }
            return "--"
        case .bloodOxygen:
            if let spo2 = viewModel.healthOxygenSaturation, spo2 > 0 {
                return "\(Int(spo2))"
            }
            return "--"
        case .steps:
            if let steps = viewModel.healthSteps, steps > 0 {
                return "\(steps)"
            }
            return "--"
        case .calories:
            if let cal = viewModel.healthCalories, cal > 0 {
                return "\(Int(cal))"
            }
            return "--"
        }
    }

    private var statusText: String {
        switch detailType {
        case .sleep:
            return viewModel.sleepQualityLabel
        case .heartRate:
            guard let hr = viewModel.healthHeartRate, hr > 0 else { return "No data" }
            if hr < 60 { return "Resting" }
            if hr <= 100 { return "Normal" }
            return "Elevated"
        case .bloodOxygen:
            guard let spo2 = viewModel.healthOxygenSaturation, spo2 > 0 else { return "No data" }
            if spo2 >= 95 { return "Normal" }
            if spo2 >= 90 { return "Low" }
            return "Critical"
        case .steps:
            return viewModel.activityLabel
        case .calories:
            return "Active calories"
        }
    }

    private var statusColor: Color {
        switch detailType {
        case .sleep: return viewModel.sleepQualityColor
        case .heartRate: return heartRateColor
        case .bloodOxygen: return oxygenColor
        case .steps: return viewModel.activityColor
        case .calories: return .orange
        }
    }

    private var heartRateColor: Color {
        guard let hr = viewModel.healthHeartRate, hr > 0 else { return .gray }
        if hr < 60 { return .blue }
        if hr <= 100 { return .green }
        return .orange
    }

    private var oxygenColor: Color {
        guard let spo2 = viewModel.healthOxygenSaturation, spo2 > 0 else { return .gray }
        if spo2 >= 95 { return .green }
        if spo2 >= 90 { return .orange }
        return .red
    }

    private var chartSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("7-Day Trend")
                .font(.headline)

            if isLoading {
                ProgressView()
                    .frame(height: 200)
                    .frame(maxWidth: .infinity)
            } else if dataPoints.isEmpty && sleepDataPoints.isEmpty {
                Text("No historical data available")
                    .foregroundColor(.secondary)
                    .frame(height: 200)
                    .frame(maxWidth: .infinity)
            } else {
                SimpleLineChart(
                    dataPoints: detailType == .sleep ? sleepDataPoints.map { HealthDataPoint(date: $0.date, value: $0.hours) } : dataPoints,
                    color: detailType.color,
                    unit: detailType.unit
                )
                .frame(height: 200)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }

    private var weeklySummarySection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Weekly Summary")
                .font(.headline)

            HStack(spacing: 16) {
                summaryItem(title: "Average", value: averageValue, unit: detailType.unit)
                summaryItem(title: "Highest", value: maxValue, unit: detailType.unit)
                summaryItem(title: "Lowest", value: minValue, unit: detailType.unit)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }

    private func summaryItem(title: String, value: Double, unit: String) -> some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)

            Text(formattedValue(value))
                .font(.title3)
                .fontWeight(.bold)

            Text(unit)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    private func formattedValue(_ value: Double) -> String {
        if value >= 1000 {
            return String(format: "%.1fk", value / 1000)
        }
        if value == 0 {
            return "--"
        }
        return String(format: "%.0f", value)
    }

    private func loadData() {
        isLoading = true

        switch detailType {
        case .sleep:
            HealthService.shared.fetchSleepHistory { points in
                self.sleepDataPoints = points
                self.calculateTrend(from: points.map { HealthDataPoint(date: $0.date, value: $0.hours) })
                self.isLoading = false
            }
        case .heartRate:
            HealthService.shared.fetchHeartRateHistory { points in
                self.dataPoints = points
                self.calculateTrend(from: points)
                self.isLoading = false
            }
        case .bloodOxygen:
            HealthService.shared.fetchOxygenHistory { points in
                self.dataPoints = points
                self.calculateTrend(from: points)
                self.isLoading = false
            }
        case .steps:
            HealthService.shared.fetchStepsHistory { points in
                self.dataPoints = points
                self.calculateTrend(from: points)
                self.isLoading = false
            }
        case .calories:
            HealthService.shared.fetchCaloriesHistory { points in
                self.dataPoints = points
                self.calculateTrend(from: points)
                self.isLoading = false
            }
        }
    }

    private func calculateTrend(from points: [HealthDataPoint]) {
        guard points.count >= 2 else {
            trend = .stable
            return
        }

        let recentHalf = Array(points.suffix(points.count / 2))
        let olderHalf = Array(points.prefix(points.count / 2))

        let recentAvg = recentHalf.map { $0.value }.reduce(0, +) / Double(recentHalf.count)
        let olderAvg = olderHalf.map { $0.value }.reduce(0, +) / Double(olderHalf.count)

        let percentChange = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0

        if percentChange > 5 {
            trend = .up
        } else if percentChange < -5 {
            trend = .down
        } else {
            trend = .stable
        }
    }

    private var averageValue: Double {
        let points = detailType == .sleep ? sleepDataPoints.map { HealthDataPoint(date: $0.date, value: $0.hours) } : dataPoints
        guard !points.isEmpty else { return 0 }
        return points.map { $0.value }.reduce(0, +) / Double(points.count)
    }

    private var maxValue: Double {
        let points = detailType == .sleep ? sleepDataPoints.map { HealthDataPoint(date: $0.date, value: $0.hours) } : dataPoints
        return points.map { $0.value }.max() ?? 0
    }

    private var minValue: Double {
        let points = detailType == .sleep ? sleepDataPoints.map { HealthDataPoint(date: $0.date, value: $0.hours) } : dataPoints
        return points.map { $0.value }.min() ?? 0
    }
}

struct SimpleLineChart: View {
    let dataPoints: [HealthDataPoint]
    let color: Color
    let unit: String

    var body: some View {
        GeometryReader { geometry in
            if dataPoints.isEmpty {
                Text("No data")
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ZStack {
                    gridLines(in: geometry)
                    linePath(in: geometry)
                    dataPointsView(in: geometry)
                }
            }
        }
    }

    private func gridLines(in geometry: GeometryProxy) -> some View {
        VStack(spacing: 0) {
            ForEach(0..<5) { i in
                Rectangle()
                    .fill(Color.gray.opacity(0.2))
                    .frame(height: 1)
                if i < 4 {
                    Spacer()
                }
            }
        }
    }

    private func linePath(in geometry: GeometryProxy) -> some View {
        let width = geometry.size.width
        let height = geometry.size.height
        let minValue = dataPoints.map { $0.value }.min() ?? 0
        let maxValue = dataPoints.map { $0.value }.max() ?? 1
        let range = max(maxValue - minValue, 1)

        return Path { path in
            guard dataPoints.count > 1 else { return }

            for (index, point) in dataPoints.enumerated() {
                let x = width * CGFloat(index) / CGFloat(dataPoints.count - 1)
                let normalizedY = (point.value - minValue) / range
                let y = height * (1 - normalizedY)

                if index == 0 {
                    path.move(to: CGPoint(x: x, y: y))
                } else {
                    path.addLine(to: CGPoint(x: x, y: y))
                }
            }
        }
        .stroke(color, style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))
    }

    private func dataPointsView(in geometry: GeometryProxy) -> some View {
        let width = geometry.size.width
        let height = geometry.size.height
        let minValue = dataPoints.map { $0.value }.min() ?? 0
        let maxValue = dataPoints.map { $0.value }.max() ?? 1
        let range = max(maxValue - minValue, 1)

        return ZStack {
            ForEach(Array(dataPoints.enumerated()), id: \.element.id) { index, point in
                let x = width * CGFloat(index) / CGFloat(max(dataPoints.count - 1, 1))
                let normalizedY = (point.value - minValue) / range
                let y = height * (1 - normalizedY)

                Circle()
                    .fill(color)
                    .frame(width: 8, height: 8)
                    .position(x: x, y: y)
            }
        }
    }
}

#Preview {
    NavigationView {
        HealthDetailView(detailType: .heartRate, viewModel: BlockViewModel())
    }
}
