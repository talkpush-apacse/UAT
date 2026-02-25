import Foundation

struct Signoff: Codable, Identifiable {
    let id: UUID
    let projectId: UUID
    var name: String
    var signedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case projectId = "project_id"
        case name
        case signedAt = "signed_at"
    }
}

struct SignoffInsert: Codable {
    var projectId: UUID
    var name: String

    enum CodingKeys: String, CodingKey {
        case projectId = "project_id"
        case name
    }
}
