import SwiftUI

@main
struct BlockFlowApp: App {
    @StateObject private var viewModel = BlockViewModel()
    @State private var showSplash = true

    var body: some Scene {
        WindowGroup {
            ZStack {
                if showSplash {
                    SplashView(isShowing: $showSplash)
                        .transition(.opacity)
                } else {
                    MainTabView(viewModel: viewModel)
                        .environmentObject(viewModel)
                        .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.5), value: showSplash)
        }
    }
}

struct MainTabView: View {
    @ObservedObject var viewModel: BlockViewModel
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            HealthDashboardView(viewModel: viewModel)
                .tabItem {
                    Label("Health", systemImage: "heart.fill")
                }
                .tag(0)

            CalendarView(viewModel: viewModel)
                .tabItem {
                    Label("Calendar", systemImage: "calendar")
                }
                .tag(1)

            AddBlockView(viewModel: viewModel)
                .tabItem {
                    Label("Add", systemImage: "plus.circle")
                }
                .tag(2)

            SettingsView(viewModel: viewModel)
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
                .tag(3)
        }
        .accentColor(.pink)
    }
}