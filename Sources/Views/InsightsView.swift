import SwiftUI

struct InsightsView: View {
    @ObservedObject var viewModel: BlockViewModel

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    statsSection
                    sleepSection
                    screenTimeSection
                    healthStatusSection
                }
                .padding()
            }
            .navigationTitle("Insights")
            .background(Color(.systemGroupedBackground))
        }
    }

    private var statsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Today's Progress")
                .font(.headline)
                .foregroundColor(.secondary)

            HStack(spacing: 16) {
                StatCard(
                    title: "Focus Time",
                    value: "\(viewModel.totalFocusMinutes)",
                    unit: "min",
                    icon: "brain.head.profile",
                    color: .blue
                )

                StatCard(
                    title: "Blocks Done",
                    value: "\(viewModel.completedBlocksCount)",
                    unit: "/ \(viewModel.totalBlocksCount)",
                    icon: "checkmark.circle",
                    color: .green
                )
            }
        }
    }

    private var sleepSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Sleep")
                .font(.headline)
                .foregroundColor(.secondary)

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Last Night's Sleep")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    if let hours = viewModel.healthSleepHours, hours > 0 {
                        Text(String(format: "%.1f hours", hours))
                            .font(.title2)
                            .fontWeight(.bold)

                        sleepQualityLabel(hours: hours)
                    } else if viewModel.schedule.sleepHours > 0 {
                        Text(String(format: "%.1f hours", viewModel.schedule.sleepHours))
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("Manual entry")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    } else {
                        Text("-- hours")
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("No data")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "moon.zzz.fill")
                    .font(.title)
                    .foregroundColor(.indigo)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
    }

    private func sleepQualityLabel(hours: Double) -> some View {
        let quality: String
        let color: Color

        if hours < 6 {
            quality = "Low sleep"
            color = .red
        } else if hours < 7 {
            quality = "Could be better"
            color = .orange
        } else if hours <= 8 {
            quality = "Good sleep"
            color = .green
        } else {
            quality = "Oversleeping"
            color = .blue
        }

        return Text(quality)
            .font(.caption)
            .foregroundColor(color)
    }

    private var screenTimeSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Screen Time")
                .font(.headline)
                .foregroundColor(.secondary)

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Today's Screen Time")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    if let hours = viewModel.screenTimeHours {
                        Text(String(format: "%.1f hours", hours))
                            .font(.title2)
                            .fontWeight(.bold)

                        screenTimeLabel(hours: hours)
                    } else {
                        Text("Not tracked")
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("Enable in Settings")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "iphone")
                    .font(.title)
                    .foregroundColor(.gray)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
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

    private var healthStatusSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Health Status")
                .font(.headline)
                .foregroundColor(.secondary)

            HStack(spacing: 16) {
                HealthStatusCard(
                    title: "Sleep",
                    icon: "moon.zzz.fill",
                    status: sleepStatus,
                    color: .indigo
                )

                HealthStatusCard(
                    title: "Focus",
                    icon: "brain.head.profile",
                    status: focusStatus,
                    color: .blue
                )
            }
        }
    }

    private var sleepStatus: String {
        guard let hours = viewModel.healthSleepHours ?? viewModel.schedule.sleepHours as Double? else {
            return "Unknown"
        }
        if hours < 6 { return "Low" }
        if hours <= 8 { return "Good" }
        return "High"
    }

    private var focusStatus: String {
        if viewModel.totalFocusMinutes >= 60 { return "Great" }
        if viewModel.totalFocusMinutes >= 30 { return "Good" }
        if viewModel.totalFocusMinutes > 0 { return "Low" }
        return "None"
    }
}

struct HealthStatusCard: View {
    let title: String
    let icon: String
    let status: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(status)
                .font(.subheadline)
                .fontWeight(.semibold)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let unit: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Spacer()
            }
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            HStack(alignment: .lastTextBaseline, spacing: 2) {
                Text(value)
                    .font(.title)
                    .fontWeight(.bold)
                Text(unit)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
}

#Preview {
    InsightsView(viewModel: BlockViewModel())
}