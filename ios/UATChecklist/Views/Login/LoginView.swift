import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var password = ""
    @State private var showError = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 32) {
                Spacer()

                VStack(spacing: 12) {
                    Image(systemName: "checkmark.shield.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(.accent)

                    Text("UAT Checklist")
                        .font(.largeTitle.bold())

                    Text("Admin Dashboard")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                VStack(spacing: 16) {
                    SecureField("Admin Password", text: $password)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.password)
                        .submitLabel(.go)
                        .onSubmit(login)

                    Button(action: login) {
                        Text("Sign In")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(password.isEmpty)
                }
                .padding(.horizontal, 32)

                if showError {
                    Text("Incorrect password. Please try again.")
                        .font(.footnote)
                        .foregroundStyle(.red)
                }

                Spacer()
                Spacer()
            }
        }
    }

    private func login() {
        if authManager.authenticate(password: password) {
            showError = false
        } else {
            showError = true
            password = ""
        }
    }
}
