import SwiftUI
import EventKit

struct CalendarView: View {
    @ObservedObject var viewModel: BlockViewModel
    @State private var selectedDate = Date()
    @State private var showAddBlock = false
    @State private var selectedTime: Date = Date()
    @State private var editingBlock: BlockItem? = nil
    @State private var isMonthView = false

    @State private var isDragging = false
    @State private var dragStartY: CGFloat = 0
    @State private var dragCurrentY: CGFloat = 0
    @State private var previewBlock: PreviewBlock? = nil
    @State private var calendarEvents: [CalendarEvent] = []
    @State private var showQuickCreate = false
    @State private var quickCreateTime: Date = Date()
    @State private var quickCreateDuration: Int = 30
    @State private var isLoadingEvents = false
    @State private var hasLoadedEvents = false

    private let calendar = Calendar.current
    private let hourHeight: CGFloat = 80
    private let hours = Array(0..<24)
    private let snapInterval: Int = 15

    private let impactGenerator = UIImpactFeedbackGenerator(style: .medium)
    private let selectionGenerator = UISelectionFeedbackGenerator()

    var body: some View {
        NavigationView {
            ZStack {
                Color(.systemGroupedBackground).ignoresSafeArea()

                VStack(spacing: 0) {
                    viewToggle
                    dateHeader

                    if isMonthView {
                        monthView
                    } else {
                        timelineView
                    }
                }
            }
            .navigationTitle("Calendar")
            .navigationBarTitleDisplayMode(.inline)
.toolbar {
        ToolbarItem(placement: .navigationBarLeading) {
            Button(action: {
                _ = CalendarService.shared.fetchEventsDebug()
                loadCalendarEvents()
            }) {
                Image(systemName: "arrow.clockwise")
            }
        }
        ToolbarItem(placement: .navigationBarTrailing) {
            Button(action: { showAddBlock = true }) {
                Image(systemName: "plus.circle.fill")
                    .font(.title2)
            }
        }
    }
            .sheet(isPresented: $showAddBlock) {
                AddBlockView(viewModel: viewModel, preselectedTime: selectedTime)
            }
            .sheet(item: $editingBlock) { block in
                BlockDetailSheet(
                    block: block,
                    onToggle: { viewModel.toggleCompletion(id: block.id) },
                    onDelete: {
                        viewModel.deleteBlock(id: block.id)
                        editingBlock = nil
                    },
                    onDismiss: { editingBlock = nil }
                )
            }
            .sheet(isPresented: $showQuickCreate) {
                QuickCreateSheet(
                    startTime: quickCreateTime,
                    duration: quickCreateDuration,
                    onSave: { title, type, duration in
                        viewModel.addBlock(title: title, type: type, startTime: quickCreateTime, duration: duration)
                        impactGenerator.impactOccurred()
                    }
                )
            }
.onAppear {
        guard !hasLoadedEvents else { return }
        loadCalendarEvents()
    }
}
    }

    private var viewToggle: some View {
        Picker("View", selection: $isMonthView) {
            Text("Day").tag(false)
            Text("Month").tag(true)
        }
        .pickerStyle(SegmentedPickerStyle())
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
    }

    private var dateHeader: some View {
        VStack(spacing: 12) {
            HStack {
                Button(action: { changeDate(by: isMonthView ? -1 : -1) }) {
                    Image(systemName: "chevron.left")
                        .font(.title3)
                        .foregroundColor(.primary)
                }

                Spacer()

                VStack(spacing: 2) {
                    Text(dateTitle)
                        .font(.headline)
                    Text(dayOfWeek)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Button(action: { changeDate(by: isMonthView ? 1 : 1) }) {
                    Image(systemName: "chevron.right")
                        .font(.title3)
                        .foregroundColor(.primary)
                }
            }
            .padding(.horizontal)

            if !isMonthView {
                recommendationBar
            }
        }
        .padding(.vertical, 12)
        .background(Color(.systemBackground))
    }

    private var recommendationBar: some View {
        HStack {
            Image(systemName: "lightbulb.fill")
                .foregroundColor(workloadColor)

            Text(viewModel.recommendation.message)
                .font(.caption)
                .lineLimit(1)

            Spacer()

            Text("\(viewModel.recommendation.suggestedFocusMinutes)m")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(workloadColor)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(workloadColor.opacity(0.1))
        .cornerRadius(8)
        .padding(.horizontal)
    }

    private var workloadColor: Color {
        switch viewModel.recommendation.workloadLevel {
        case .low: return .green
        case .normal: return .blue
        case .high: return .orange
        }
    }

    private var timelineView: some View {
        Group {
            if isLoadingEvents {
                VStack {
                    Spacer()
                    ProgressView()
                        .scaleEffect(1.5)
                    Text("Loading events...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.top, 8)
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if calendarEvents.isEmpty {
                VStack(spacing: 16) {
                    Spacer()
                    Image(systemName: "calendar.badge.exclamationmark")
                        .font(.system(size: 50))
                        .foregroundColor(.secondary)
                    Text("No Events Today")
                        .font(.headline)
                    Text("Pull down to refresh or check your calendar settings")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                    Button(action: { loadCalendarEvents() }) {
                        Text("Refresh")
                            .font(.subheadline)
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 10)
                            .background(Color.blue)
                            .cornerRadius(20)
                    }
                    .padding(.top, 8)
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    ZStack(alignment: .topLeading) {
                        hourLines
                        blockSlots
                        calendarEventSlots
                        currentTimeIndicator
                        dragPreviewBlock
                        dragDurationLabel
                    }
                    .padding(.leading, 50)
                    .contentShape(Rectangle())
                    .gesture(timelineDragGesture)
                    .simultaneousGesture(timelineTapGesture)
                }
                .refreshable {
                    loadCalendarEvents()
                }
            }
        }
    }

    private var dragDurationLabel: some View {
        Group {
            if isDragging, let preview = previewBlock {
                VStack(spacing: 4) {
                    Text("\(preview.duration) min")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(blockColor(for: preview.type).opacity(0.9))
                        .cornerRadius(12)

                    Text(formatTime(preview.startTime))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                .position(x: 30, y: preview.offset + preview.height / 2)
            }
        }
    }

    private func blockColor(for type: BlockType) -> Color {
        switch type {
        case .focus: return .blue
        case .personal: return .green
        case .recovery: return .purple
        case .sleep: return .indigo
        }
    }

    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date)
    }

    private var hourLines: some View {
        VStack(spacing: 0) {
            ForEach(hours, id: \.self) { hour in
                HStack(alignment: .top, spacing: 8) {
                    Text(formatHour(hour))
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(width: 40, alignment: .trailing)

                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 1)
                }
                .frame(height: hourHeight)
            }
        }
    }

    private var blockSlots: some View {
        ZStack(alignment: .topLeading) {
            ForEach(viewModel.schedule.blocks) { block in
                BlockSlotView(block: block)
                    .offset(y: blockYOffset(for: block))
                    .frame(height: blockHeight(for: block))
                    .padding(.leading, 8)
                    .onTapGesture {
                        editingBlock = block
                    }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var calendarEventSlots: some View {
        ZStack(alignment: .topLeading) {
            ForEach(calendarEvents) { event in
                CalendarEventSlot(event: event)
                    .offset(y: eventYOffset(for: event))
                    .frame(height: eventHeight(for: event))
                    .padding(.leading, 8)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var dragPreviewBlock: some View {
        Group {
            if let preview = previewBlock {
                BlockSlotView(
                    block: BlockItem(
                        title: "New Block",
                        type: preview.type,
                        startTime: preview.startTime,
                        duration: preview.duration
                    ),
                    isPreview: true
                )
                .offset(y: preview.offset)
                .frame(height: preview.height)
                .padding(.leading, 8)
                .animation(.easeOut(duration: 0.1), value: preview.offset)
            }
        }
    }

    private var currentTimeIndicator: some View {
        GeometryReader { geometry in
            if isToday {
                ZStack(alignment: .leading) {
                    Circle()
                        .fill(Color.red)
                        .frame(width: 8, height: 8)
                        .offset(x: -4, y: currentTimeOffset - 4)

                    Rectangle()
                        .fill(Color.red)
                        .frame(height: 2)
                }
                .offset(y: currentTimeOffset)
            }
        }
}

    private var timelineDragGesture: some Gesture {
        DragGesture(minimumDistance: 5)
        .onChanged { value in
            if !isDragging {
                isDragging = true
                dragStartY = value.startLocation.y
                selectionGenerator.selectionChanged()
            }
            dragCurrentY = value.location.y

            let snappedStartTime = yToTime(dragStartY)
            let dragDelta = dragCurrentY - dragStartY
            let durationMinutes = max(snapInterval, Int((dragDelta / hourHeight) * 60))
            let snappedDuration = ((durationMinutes + snapInterval / 2) / snapInterval) * snapInterval

            let blockType = determineBlockType(from: snappedStartTime)

            let previewHeight = max(CGFloat(snappedDuration) * (hourHeight / 60), 30)

            previewBlock = PreviewBlock(
                startTime: snappedStartTime,
                duration: snappedDuration,
                type: blockType,
                offset: dragStartY,
                height: previewHeight
            )
        }
        .onEnded { value in
            if let preview = previewBlock, preview.duration >= snapInterval {
                quickCreateTime = preview.startTime
                quickCreateDuration = preview.duration
                showQuickCreate = true
                impactGenerator.impactOccurred()
            }

            isDragging = false
            dragStartY = 0
            dragCurrentY = 0
            previewBlock = nil
        }
    }

private var timelineTapGesture: some Gesture {
TapGesture()
.onEnded { _ in
let now = Date()
let snappedTime = yToTime(timeToY(now))

self.quickCreateTime = snappedTime
self.quickCreateDuration = 60
self.showQuickCreate = true
self.impactGenerator.impactOccurred()
}
}

    private func yToTime(_ y: CGFloat) -> Date {
        let totalMinutes = Int((y / hourHeight) * 60)
        let snappedMinutes = (totalMinutes / snapInterval) * snapInterval
        let hours = snappedMinutes / 60
        let minutes = snappedMinutes % 60

        var components = calendar.dateComponents([.year, .month, .day], from: selectedDate)
        components.hour = hours
        components.minute = minutes
        return calendar.date(from: components) ?? selectedDate
    }

    private func timeToY(_ time: Date) -> CGFloat {
        let components = calendar.dateComponents([.hour, .minute], from: time)
        let hour = components.hour ?? 0
        let minute = components.minute ?? 0
        return CGFloat(hour) * hourHeight + CGFloat(minute) * (hourHeight / 60)
    }

    private func determineBlockType(from time: Date) -> BlockType {
        let hour = calendar.component(.hour, from: time)
        if hour >= 22 || hour < 6 {
            return .sleep
        } else if hour >= 6 && hour < 10 {
            return .recovery
        } else {
            return .focus
        }
    }

    private func blockYOffset(for block: BlockItem) -> CGFloat {
        let components = calendar.dateComponents([.hour, .minute], from: block.startTime)
        let hour = components.hour ?? 0
        let minute = components.minute ?? 0
        return CGFloat(hour) * hourHeight + CGFloat(minute) * (hourHeight / 60)
    }

    private func blockHeight(for block: BlockItem) -> CGFloat {
        return max(CGFloat(block.duration) * (hourHeight / 60), 20)
    }

    private func eventYOffset(for event: CalendarEvent) -> CGFloat {
        let components = calendar.dateComponents([.hour, .minute], from: event.startTime)
        let hour = components.hour ?? 0
        let minute = components.minute ?? 0
        return CGFloat(hour) * hourHeight + CGFloat(minute) * (hourHeight / 60)
    }

    private func eventHeight(for event: CalendarEvent) -> CGFloat {
        return max(CGFloat(event.duration) * (hourHeight / 60), 20)
    }

    private func formatHour(_ hour: Int) -> String {
        let period = hour >= 12 ? "PM" : "AM"
        let displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour)
        return "\(displayHour) \(period)"
    }

    private var isToday: Bool {
        calendar.isDateInToday(selectedDate)
    }

    private var currentTimeOffset: CGFloat {
        let now = Date()
        let components = calendar.dateComponents([.hour, .minute], from: now)
        let hour = components.hour ?? 0
        let minute = components.minute ?? 0
        return CGFloat(hour) * hourHeight + CGFloat(minute) * (hourHeight / 60)
    }

    private var dateTitle: String {
        let formatter = DateFormatter()
        if isMonthView {
            formatter.dateFormat = "MMMM yyyy"
        } else {
            formatter.dateFormat = "MMMM d"
        }
        return formatter.string(from: selectedDate)
    }

    private var dayOfWeek: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE"
        return formatter.string(from: selectedDate)
    }

    private func changeDate(by days: Int) {
        if isMonthView {
            if let newDate = calendar.date(byAdding: .month, value: days, to: selectedDate) {
                selectedDate = newDate
                loadCalendarEvents()
            }
        } else {
            if let newDate = calendar.date(byAdding: .day, value: days, to: selectedDate) {
                selectedDate = newDate
                loadCalendarEvents()
            }
        }
    }

    private func loadCalendarEvents() {
        isLoadingEvents = true
        CalendarService.shared.fetchTodayEvents { events in
            self.calendarEvents = events
            self.isLoadingEvents = false
            self.hasLoadedEvents = true
        }
    }

    private var monthView: some View {
        MonthView(
            selectedDate: $selectedDate,
            viewModel: viewModel,
            onDaySelected: { date in
                selectedDate = date
                isMonthView = false
                loadCalendarEvents()
            }
        )
    }
}

struct PreviewBlock {
    let startTime: Date
    let duration: Int
    let type: BlockType
    let offset: CGFloat
    let height: CGFloat
}

struct QuickCreateSheet: View {
    let startTime: Date
    let duration: Int
    let onSave: (String, BlockType, Int) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var selectedType: BlockType = .focus
    @State private var selectedDuration: Int

    private let durationOptions = [15, 30, 45, 60, 90, 120]

    init(startTime: Date, duration: Int, onSave: @escaping (String, BlockType, Int) -> Void) {
        self.startTime = startTime
        self.duration = duration
        self.onSave = onSave
        _selectedDuration = State(initialValue: duration)
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Block Details") {
                    TextField("Title", text: $title)

                    Picker("Type", selection: $selectedType) {
                        ForEach(BlockType.allCases, id: \.self) { type in
                            Label(type.rawValue, systemImage: type.icon)
                                .tag(type)
                        }
                    }
                }

                Section("Time") {
                    HStack {
                        Text("Start Time")
                        Spacer()
                        Text(formatTime(startTime))
                            .foregroundColor(.secondary)
                    }

                    Picker("Duration", selection: $selectedDuration) {
                        ForEach(durationOptions, id: \.self) { mins in
                            Text("\(mins) min").tag(mins)
                        }
                    }
                }

                Section {
                    Button(action: save) {
                        Text("Add Block")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                    }
                    .disabled(title.isEmpty)
                }
            }
            .navigationTitle("New Block")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func save() {
        onSave(title, selectedType, selectedDuration)
        dismiss()
    }

    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date)
    }
}

struct CalendarEventSlot: View {
    let event: CalendarEvent

    private var timeFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter
    }

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(event.calendarColor)
                .frame(width: 8, height: 8)

            VStack(alignment: .leading, spacing: 2) {
                Text(event.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    Text(timeFormatter.string(from: event.startTime))
                        .font(.caption)
                        .foregroundColor(.secondary)

                    if !event.isAllDay {
                        Text("-")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Text(timeFormatter.string(from: event.endTime))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    } else {
                        Text("All Day")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Spacer()

            Text(event.calendarTitle)
                .font(.caption2)
                .foregroundColor(.secondary)
                .lineLimit(1)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(event.calendarColor.opacity(0.1))
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(event.calendarColor.opacity(0.3), lineWidth: 1)
        )
    }
}

extension View {
    func strokeStyle(style: StrokeStyle) -> some View {
        self.overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(style: style)
        )
    }
}

struct BlockSlotView: View {
    let block: BlockItem
    var isPreview: Bool = false

    @State private var isPressed = false

    private var blockColor: Color {
        switch block.type {
        case .focus: return .blue
        case .personal: return .green
        case .recovery: return .purple
        case .sleep: return .indigo
        }
    }

    private var timeFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter
    }

    var body: some View {
        HStack(spacing: 6) {
            Rectangle()
                .fill(isPreview ? blockColor.opacity(0.5) : blockColor)
                .frame(width: 3)
                .cornerRadius(2)

            VStack(alignment: .leading, spacing: 2) {
                Text(block.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(1)

                Text(timeFormatter.string(from: block.startTime))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            Spacer()

            if block.isCompleted && !isPreview {
                Image(systemName: "checkmark.circle.fill")
                    .font(.caption)
                    .foregroundColor(.green)
                    .scaleEffect(isPressed ? 1.3 : 1.0)
                    .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(isPreview ? blockColor.opacity(0.2) : blockColor.opacity(0.15))
        .cornerRadius(6)
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(isPreview ? blockColor : blockColor.opacity(0.5), lineWidth: isPreview ? 2 : 1)
        )
        .opacity(isPreview ? 0.8 : (isPressed ? 0.7 : 1.0))
        .scaleEffect(isPressed ? 0.98 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isPressed)
        .onLongPressGesture(minimumDuration: .infinity, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
    }
}

struct MonthView: View {
    @Binding var selectedDate: Date
    @ObservedObject var viewModel: BlockViewModel
    var onDaySelected: (Date) -> Void

    private let calendar = Calendar.current
    private let columns = Array(repeating: GridItem(.flexible()), count: 7)
    private let weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    var body: some View {
        VStack(spacing: 16) {
            weekdayHeader

LazyVGrid(columns: columns, spacing: 8) {
ForEach(Array(daysInMonth().enumerated()), id: \.offset) { index, date in
if let date = date {
DayCell(
date: date,
isSelected: calendar.isDate(date, inSameDayAs: selectedDate),
isToday: calendar.isDateInToday(date),
blockCount: blockCount(for: date)
)
.onTapGesture {
onDaySelected(date)
}
} else {
Color.clear
.frame(height: 44)
}
}
}
            .padding(.horizontal)
        }
    }

    private var weekdayHeader: some View {
        HStack {
            ForEach(weekdays, id: \.self) { day in
                Text(day)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal)
    }

    private func daysInMonth() -> [Date?] {
        var dates: [Date?] = []

        let range = calendar.range(of: .day, in: .month, for: selectedDate)!
        let firstDayOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: selectedDate))!
        let firstWeekday = calendar.component(.weekday, from: firstDayOfMonth)

        for _ in 1..<firstWeekday {
            dates.append(nil)
        }

        for day in range {
            if let date = calendar.date(byAdding: .day, value: day - 1, to: firstDayOfMonth) {
                dates.append(date)
            }
        }

        while dates.count % 7 != 0 {
            dates.append(nil)
        }

        return dates
    }

    private func blockCount(for date: Date) -> Int {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateString = formatter.string(from: date)

        if dateString == viewModel.schedule.date {
            return viewModel.schedule.blocks.count
        }
        return 0
    }
}

struct DayCell: View {
    let date: Date
    let isSelected: Bool
    let isToday: Bool
    let blockCount: Int

    private let calendar = Calendar.current

    var body: some View {
        VStack(spacing: 4) {
            Text("\(calendar.component(.day, from: date))")
                .font(.system(size: 16, weight: isToday ? .bold : .regular))
                .foregroundColor(isToday ? .white : (isSelected ? .blue : .primary))

            if blockCount > 0 {
                Circle()
                    .fill(isToday ? .white : .blue)
                    .frame(width: 6, height: 6)
            } else {
                Circle()
                    .fill(Color.clear)
                    .frame(width: 6, height: 6)
            }
        }
        .frame(height: 44)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isToday ? Color.blue : (isSelected ? Color.blue.opacity(0.1) : Color.clear))
        )
    }
}

struct BlockDetailSheet: View {
    let block: BlockItem
    let onToggle: () -> Void
    let onDelete: () -> Void
    let onDismiss: () -> Void

    private var timeFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter
    }

    private var blockColor: Color {
        switch block.type {
        case .focus: return .blue
        case .personal: return .green
        case .recovery: return .purple
        case .sleep: return .indigo
        }
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Image(systemName: block.type.icon)
                        .font(.largeTitle)
                        .foregroundColor(blockColor)

                    Text(block.title)
                        .font(.title2)
                        .fontWeight(.bold)

                    Text(block.type.rawValue)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 20)

                HStack(spacing: 32) {
                    VStack {
                        Text("Start")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(timeFormatter.string(from: block.startTime))
                            .font(.headline)
                    }

                    VStack {
                        Text("Duration")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("\(block.duration) min")
                            .font(.headline)
                    }

                    VStack {
                        Text("Status")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(block.isCompleted ? "Done" : "Pending")
                            .font(.headline)
                            .foregroundColor(block.isCompleted ? .green : .orange)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)

                Spacer()

                VStack(spacing: 12) {
                    Button(action: onToggle) {
                        Text(block.isCompleted ? "Mark Incomplete" : "Mark Complete")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(block.isCompleted ? Color.orange : Color.green)
                            .cornerRadius(12)
                    }

                    Button(action: onDelete) {
                        Text("Delete Block")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.red)
                            .cornerRadius(12)
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 20)
            }
            .navigationTitle("Block Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done", action: onDismiss)
                }
            }
        }
    }
}

#Preview {
    CalendarView(viewModel: BlockViewModel())
}