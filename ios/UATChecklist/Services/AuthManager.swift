import Foundation
import SwiftUI

@MainActor
final class AuthManager: ObservableObject {
    static let shared = AuthManager()

    @Published var isAuthenticated = false

    private let passwordKey = "admin_password_hash"

    private init() {
        if let _ = KeychainHelper.load(forKey: passwordKey) {
            // Password was set previously - require re-entry on launch
            isAuthenticated = false
        }
    }

    func setPassword(_ password: String) {
        if let data = password.data(using: .utf8) {
            KeychainHelper.save(data, forKey: passwordKey)
        }
    }

    func authenticate(password: String) -> Bool {
        guard let stored = KeychainHelper.load(forKey: passwordKey),
              let storedPassword = String(data: stored, encoding: .utf8) else {
            // First time - save and authenticate
            setPassword(password)
            isAuthenticated = true
            return true
        }

        if password == storedPassword {
            isAuthenticated = true
            return true
        }
        return false
    }

    func logout() {
        isAuthenticated = false
    }

    func resetPassword() {
        KeychainHelper.delete(forKey: passwordKey)
        isAuthenticated = false
    }

    var hasStoredPassword: Bool {
        KeychainHelper.load(forKey: passwordKey) != nil
    }
}
