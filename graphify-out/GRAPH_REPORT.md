# Graph Report - /Users/brianyang/Desktop/programming/opencode/BlockFlow  (2026-06-28)

## Corpus Check
- Corpus is ~36,966 words - fits in a single context window. You may not need a graph.

## Summary
- 175 nodes · 246 edges · 41 communities (11 shown, 30 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_SwiftUI App Shell|SwiftUI App Shell]]
- [[_COMMUNITY_JS Local Storage|JS Local Storage]]
- [[_COMMUNITY_iOS Models & Firebase Config|iOS Models & Firebase Config]]
- [[_COMMUNITY_DataService Layer|DataService Layer]]
- [[_COMMUNITY_Timer View|Timer View]]
- [[_COMMUNITY_Calendar ViewModel|Calendar ViewModel]]
- [[_COMMUNITY_Web Manifest|Web Manifest]]
- [[_COMMUNITY_App Initialization|App Initialization]]
- [[_COMMUNITY_BlockData Models|BlockData Models]]
- [[_COMMUNITY_JS AI Assistant|JS AI Assistant]]
- [[_COMMUNITY_JS Google Calendar|JS Google Calendar]]
- [[_COMMUNITY_JS Timer|JS Timer]]
- [[_COMMUNITY_JS UI|JS UI]]
- [[_COMMUNITY_Service Worker|Service Worker]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]

## God Nodes (most connected - your core abstractions)
1. `DataService` - 15 edges
2. `DayData` - 9 edges
3. `DashboardView` - 9 edges
4. `getData()` - 9 edges
5. `Foundation` - 8 edges
6. `CalendarEvent` - 8 edges
7. `ViewModel` - 8 edges
8. `saveData()` - 8 edges
9. `SwiftUI` - 7 edges
10. `BlockType` - 7 edges

## Surprising Connections (you probably didn't know these)
- `BlockFlowApp` --implements--> `App`  [EXTRACTED]
  ios/BlockFlow/BlockFlowApp.swift → web/js/app.js
- `BlockFlowApp` --calls--> `DataService`  [INFERRED]
  ios/BlockFlow/BlockFlowApp.swift → ios/BlockFlow/Services/DataService.swift
- `DayData` --references--> `BlockData`  [EXTRACTED]
  ios/BlockFlow/Models/DayData.swift → ios/BlockFlow/Models/BlockData.swift

## Import Cycles
- None detected.

## Communities (41 total, 30 thin omitted)

### Community 0 - "SwiftUI App Shell"
Cohesion: 0.12
Nodes (11): ContentView, Theme, CGFloat, FirebaseService, String, SwiftUI, User, View (+3 more)

### Community 1 - "JS Local Storage"
Cohesion: 0.23
Nodes (20): addCalendarEvent(), addFocusTime(), checkAndResetDay(), deleteCalendarEvent(), getCalendarEvents(), getData(), getDefaultData(), getHistory() (+12 more)

### Community 2 - "iOS Models & Firebase Config"
Cohesion: 0.12
Nodes (10): Config, Combine, FirebaseAuth, FirebaseFirestore, Foundation, Identifiable, CalendarEvent, TimeInterval (+2 more)

### Community 3 - "DataService Layer"
Cohesion: 0.19
Nodes (5): Double, DayData, SleepData, DataService, SettingsView

### Community 4 - "Timer View"
Cohesion: 0.20
Nodes (5): ButtonStyle, Configuration, UIKit, BlockFlowButton, TimerView

### Community 5 - "Calendar ViewModel"
Cohesion: 0.20
Nodes (4): Calendar, ObservableObject, ViewModel, ViewModel

### Community 6 - "Web Manifest"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 7 - "App Initialization"
Cohesion: 0.22
Nodes (5): BlockFlowApp, Firebase, App, FirebaseApp, Scene

### Community 8 - "BlockData Models"
Cohesion: 0.29
Nodes (7): CaseIterable, Codable, BlockData, BlockType, focus, personal, recovery

## Knowledge Gaps
- **22 isolated node(s):** `Firebase`, `Config`, `focus`, `personal`, `recovery` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataService` connect `DataService Layer` to `SwiftUI App Shell`, `iOS Models & Firebase Config`, `Timer View`, `Calendar ViewModel`, `App Initialization`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `ViewModel` connect `Calendar ViewModel` to `SwiftUI App Shell`, `iOS Models & Firebase Config`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `BlockFlowApp` connect `App Initialization` to `DataService Layer`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `DataService` (e.g. with `BlockFlowApp` and `.blockRow()`) actually correct?**
  _`DataService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `DayData` (e.g. with `.resetToday()` and `.updateBlock()`) actually correct?**
  _`DayData` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Firebase`, `Config`, `focus` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SwiftUI App Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.12169312169312169 - nodes in this community are weakly interconnected._