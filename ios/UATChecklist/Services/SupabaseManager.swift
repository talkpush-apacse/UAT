import Foundation
import Supabase

@MainActor
final class SupabaseManager: ObservableObject {
    static let shared = SupabaseManager()

    @Published private(set) var client: SupabaseClient?
    @Published var isConfigured = false

    private let supabaseURLKey = "supabase_url"
    private let supabaseKeyKey = "supabase_key"

    private init() {
        loadSavedConfiguration()
    }

    func configure(url: String, serviceRoleKey: String) {
        guard let supabaseURL = URL(string: url) else { return }

        client = SupabaseClient(
            supabaseURL: supabaseURL,
            supabaseKey: serviceRoleKey
        )

        UserDefaults.standard.set(url, forKey: supabaseURLKey)

        if let data = serviceRoleKey.data(using: .utf8) {
            KeychainHelper.save(data, forKey: supabaseKeyKey)
        }

        isConfigured = true
    }

    func disconnect() {
        client = nil
        isConfigured = false
        UserDefaults.standard.removeObject(forKey: supabaseURLKey)
        KeychainHelper.delete(forKey: supabaseKeyKey)
    }

    private func loadSavedConfiguration() {
        guard let url = UserDefaults.standard.string(forKey: supabaseURLKey),
              let keyData = KeychainHelper.load(forKey: supabaseKeyKey),
              let key = String(data: keyData, encoding: .utf8) else {
            return
        }
        configure(url: url, serviceRoleKey: key)
    }
}

enum KeychainHelper {
    static func save(_ data: Data, forKey key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    static func load(forKey key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)
        return result as? Data
    }

    static func delete(forKey key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}
