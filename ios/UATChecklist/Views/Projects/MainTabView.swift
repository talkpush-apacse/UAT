import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            ProjectsListView()
                .tabItem {
                    Label("Projects", systemImage: "folder.fill")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
        }
    }
}

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var supabaseManager: SupabaseManager
    @State private var showDisconnectAlert = false
    @State private var showResetAlert = false

    var body: some View {
        NavigationStack {
            List {
                Section("Connection") {
                    HStack {
                        Label("Supabase", systemImage: "server.rack")
                        Spacer()
                        Text("Connected")
                            .foregroundStyle(.green)
                            .font(.footnote)
                    }

                    Button("Disconnect", role: .destructive) {
                        showDisconnectAlert = true
                    }
                }

                Section("Security") {
                    Button("Reset Password", role: .destructive) {
                        showResetAlert = true
                    }

                    Button("Lock App") {
                        authManager.logout()
                    }
                }

                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
            .alert("Disconnect?", isPresented: $showDisconnectAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Disconnect", role: .destructive) {
                    supabaseManager.disconnect()
                }
            } message: {
                Text("This will remove your Supabase credentials. You'll need to re-enter them to reconnect.")
            }
            .alert("Reset Password?", isPresented: $showResetAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Reset", role: .destructive) {
                    authManager.resetPassword()
                }
            } message: {
                Text("This will clear your admin password. You'll set a new one on next login.")
            }
        }
    }
}
