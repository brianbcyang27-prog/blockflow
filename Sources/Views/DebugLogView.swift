import SwiftUI

struct DebugLogView: View {
    @ObservedObject var logger = DebugLogManager.shared
    @State private var selectedCategory: LogCategory = .calendar

    var body: some View {
        VStack(spacing: 0) {
            Picker("Category", selection: $selectedCategory) {
                Text("Calendar").tag(LogCategory.calendar)
                Text("Health").tag(LogCategory.health)
                Text("General").tag(LogCategory.general)
            }
            .pickerStyle(.segmented)
            .padding()

            HStack {
                Button("Clear") {
                    logger.clear(category: selectedCategory)
                }
                .foregroundColor(.red)

                Spacer()

                Button("Refresh") {
                    if selectedCategory == .calendar {
                        _ = CalendarService.shared.fetchEventsDebug()
                    }
                }
                .foregroundColor(.blue)
            }
            .padding(.horizontal)
            .padding(.bottom, 8)

            ScrollView {
                LazyVStack(alignment: .leading, spacing: 4) {
                    ForEach(currentLogs, id: \.self) { log in
                        Text(log)
                            .font(.system(.caption, design: .monospaced))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color(.systemGray6))
                            .cornerRadius(4)
                    }
                }
                .padding(.horizontal)
            }
        }
        .navigationTitle("Debug Logs")
    }

    private var currentLogs: [String] {
        switch selectedCategory {
        case .calendar:
            return logger.calendarLogs
        case .health:
            return logger.healthLogs
        case .general:
            return logger.logs
        }
    }
}

#Preview {
    NavigationView {
        DebugLogView()
    }
}