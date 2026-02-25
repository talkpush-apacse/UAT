import SwiftUI

@main
struct UATChecklistApp: App {
    @StateObject private var supabaseManager = SupabaseManager.shared
    @StateObject private var authManager = AuthManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(supabaseManager)
                .environmentObject(authManager)
        }
    }
}
