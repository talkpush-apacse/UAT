import SwiftUI

struct SetupView: View {
    @EnvironmentObject var supabaseManager: SupabaseManager
    @State private var supabaseURL = ""
    @State private var serviceRoleKey = ""
    @State private var showError = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(spacing: 8) {
                        Image(systemName: "server.rack")
                            .font(.system(size: 40))
                            .foregroundStyle(.accent)
                        Text("Connect to Supabase")
                            .font(.title2.bold())
                        Text("Enter your Supabase project credentials to connect the app to your UAT database.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .listRowBackground(Color.clear)
                }

                Section("Supabase Configuration") {
                    TextField("Project URL", text: $supabaseURL)
                        .textContentType(.URL)
                        .autocapitalization(.none)
                        .keyboardType(.URL)

                    SecureField("Service Role Key", text: $serviceRoleKey)
                        .autocapitalization(.none)
                }

                Section {
                    Button(action: connect) {
                        Text("Connect")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(supabaseURL.isEmpty || serviceRoleKey.isEmpty)
                    .listRowBackground(Color.clear)
                }

                if showError {
                    Section {
                        Text("Invalid URL. Please enter a valid Supabase project URL.")
                            .foregroundStyle(.red)
                            .font(.footnote)
                    }
                }
            }
            .navigationTitle("Setup")
        }
    }

    private func connect() {
        guard supabaseURL.hasPrefix("https://") else {
            showError = true
            return
        }
        showError = false
        supabaseManager.configure(url: supabaseURL, serviceRoleKey: serviceRoleKey)
    }
}
