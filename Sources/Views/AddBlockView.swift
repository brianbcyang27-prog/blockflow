import SwiftUI

struct AddBlockView: View {
    @ObservedObject var viewModel: BlockViewModel
    @Environment(\.dismiss) private var dismiss
    var preselectedTime: Date? = nil
    
    @State private var title = ""
    @State private var selectedType: BlockType = .focus
    @State private var startTime = Date()
    @State private var duration = 30
    
    private let durationOptions = [15, 30, 45, 60, 90, 120]
    
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
                    
                    Section("Time") {
                        DatePicker("Start Time", selection: $startTime, displayedComponents: .hourAndMinute)
                        
                        Picker("Duration", selection: $duration) {
                            ForEach(durationOptions, id: \.self) { mins in
                                Text("\(mins) min").tag(mins)
                            }
                        }
                        
                        Section {
                            Button(action: saveBlock) {
                                Text("Add Block")
                                    .font(.headline)
                                    .frame(maxWidth: .infinity)
                            }
                            .disabled(title.isEmpty)
                        }
                    }
                }
            }
            .navigationTitle("Add Block")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                if let time = preselectedTime {
                    startTime = time
                }
            }
        }
    }
    
    private func saveBlock() {
        viewModel.addBlock(title: title, type: selectedType, startTime: startTime, duration: duration)
        dismiss()
    }
}

#Preview {
    AddBlockView(viewModel: BlockViewModel())
}
