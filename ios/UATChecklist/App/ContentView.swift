import SwiftUI

struct ContentView: View {
    @EnvironmentObject var supabaseManager: SupabaseManager
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        Group {
            if !authManager.isAuthenticated {
                LoginView()
            } else if !supabaseManager.isConfigured {
                SetupView()
            } else {
                MainTabView()
            }
        }
        .animation(.easeInOut, value: authManager.isAuthenticated)
        .animation(.easeInOut, value: supabaseManager.isConfigured)
    }
}
