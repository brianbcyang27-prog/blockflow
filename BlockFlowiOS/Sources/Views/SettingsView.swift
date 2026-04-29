import SwiftUI
import HealthKit

struct SettingsView: View {
@ObservedObject var viewModel: BlockViewModel
@State private var healthStatus: HealthKitStatus = HealthKitStatus()
@State private var showDebugLog = false
@State private var googleCalendarEnabled: Bool = false

var body: some View {
NavigationView {
Form {
// MARK: - Calendar Status Section
Section {
VStack(alignment: .leading, spacing: 12) {
HStack {
Text("Calendar Status")
.font(.headline)
Spacer()
Button(action: refreshCalendarStatus) {
Image(systemName: "arrow.clockwise")
}
}

HStack {
Text("Authorized")
Spacer()
Text(CalendarService.shared.isAuthorized ? "Yes" : "No")
.foregroundColor(CalendarService.shared.isAuthorized ? .green : .red)
}

HStack {
Text("Calendars")
Spacer()
Text("\(CalendarService.shared.fetchEventsDebug().count) events found")
.foregroundColor(.secondary)
.font(.caption)
}

Toggle("Use Google Calendar Sync (Beta)", isOn: $googleCalendarEnabled)
.foregroundColor(googleCalendarEnabled ? .blue : .secondary)
}
} header: {
Text("Calendar")
}

// MARK: - HealthKit Status Section
Section {
VStack(alignment: .leading, spacing: 12) {
HStack {
Text("HealthKit Status")
.font(.headline)
Spacer()
Button(action: refreshHealthStatus) {
Image(systemName: "arrow.clockwise")
}
}

// Availability
HStack {
Text("Available")
Spacer()
Text(healthStatus.isAvailable ? "Yes" : "No")
.foregroundColor(healthStatus.isAvailable ? .green : .red)
}

// Authorization
HStack {
Text("Authorized")
Spacer()
Text(healthStatus.isAuthorized ? "Yes" : "No")
.foregroundColor(healthStatus.isAuthorized ? .green : .orange)
}
}
} header: {
Text("HealthKit")
}

                // MARK: - Authorization Status per Data Type
                Section {
                    authStatusRow("Sleep Analysis", status: healthStatus.sleepStatus)
                    authStatusRow("Step Count", status: healthStatus.stepsStatus)
                    authStatusRow("Active Energy", status: healthStatus.caloriesStatus)
                    authStatusRow("Heart Rate", status: healthStatus.heartRateStatus)
                } header: {
                    Text("Data Authorization")
                } footer: {
                    Text("0=Not Determined, 1=Denied, 2=Authorized")
                }

// MARK: - Debug Log
        Section {
            if showDebugLog {
                ForEach(healthStatus.debugLog.reversed(), id: \.self) { log in
                    Text(log)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundColor(.secondary)
                }
            } else {
                Button(action: { showDebugLog.toggle() }) {
                    HStack {
                        Text("Show Debug Log")
                        Spacer()
                        Image(systemName: "chevron.down")
                    }
                }
            }
        } header: {
            Text("Debug Log (\(healthStatus.debugLog.count) entries)")
        }

        // MARK: - Calendar Debug Logs
        Section {
            NavigationLink(destination: DebugLogView()) {
                HStack {
                    Image(systemName: "calendar.badge.clock")
                        .foregroundColor(.blue)
                    Text("Calendar Debug Logs")
                }
            }
        } header: {
            Text("Debug Tools")
        } footer: {
            Text("View detailed calendar and health data fetch logs")
        }

                // MARK: - Last Error
                if !healthStatus.lastError.isEmpty {
                    Section("Last Error") {
                        Text(healthStatus.lastError)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }

// MARK: - Data
                Section("Data") {
                    Button(action: {
                        viewModel.resetDay()
                    }) {
                        Text("Reset Today")
                            .foregroundColor(.red)
                    }
                }

                // MARK: - About
                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Text("Build")
                        Spacer()
                        Text("1")
                            .foregroundColor(.secondary)
                    }
                }
            }
.navigationTitle("Settings")
        .onAppear {
            refreshHealthStatus()
        }
        }
    }

    // MARK: - Helper Views
    @ViewBuilder
    private func authStatusRow(_ name: String, status: Int) -> some View {
        HStack {
            Text(name)
            Spacer()
            Text(authStatusText(status))
                .foregroundColor(authStatusColor(status))
        }
    }

    private func authStatusText(_ status: Int) -> String {
        switch status {
        case 0: return "Not Determined"
        case 1: return "Denied"
        case 2: return "Authorized"
        default: return "Unknown"
        }
    }

    private func authStatusColor(_ status: Int) -> Color {
        switch status {
        case 0: return .orange
        case 1: return .red
        case 2: return .green
        default: return .gray
        }
    }

// MARK: - Actions
private func refreshHealthStatus() {
healthStatus = HealthService.shared.getDetailedStatus()
print("[SettingsView] Refreshed HealthKit status")
print("[SettingsView] isAvailable: \(healthStatus.isAvailable)")
print("[SettingsView] isAuthorized: \(healthStatus.isAuthorized)")
print("[SettingsView] sleepStatus: \(healthStatus.sleepStatus)")
print("[SettingsView] stepsStatus: \(healthStatus.stepsStatus)")
print("[SettingsView] caloriesStatus: \(healthStatus.caloriesStatus)")
print("[SettingsView] heartRateStatus: \(healthStatus.heartRateStatus)")
}

private func refreshCalendarStatus() {
_ = CalendarService.shared.fetchEventsDebug()
}
}

#Preview {
    SettingsView(viewModel: BlockViewModel())
}