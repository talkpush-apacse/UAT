import Foundation

struct Tester: Codable, Identifiable {
    let id: UUID
    let projectId: UUID
    var name: String
    var email: String
    var mobile: String?
    var testCompleted: Bool
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case projectId = "project_id"
        case name, email, mobile
        case testCompleted = "test_completed"
        case createdAt = "created_at"
    }
}
