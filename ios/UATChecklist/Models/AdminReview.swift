import Foundation

enum BehaviorType: String, Codable, CaseIterable {
    case asExpected = "As Expected"
    case minor = "Minor"
    case major = "Major"
    case critical = "Critical"
}

struct AdminReview: Codable, Identifiable {
    let id: UUID
    let responseId: UUID
    var behaviorType: BehaviorType
    var comment: String?
    var resolved: Bool
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case responseId = "response_id"
        case behaviorType = "behavior_type"
        case comment, resolved
        case createdAt = "created_at"
    }
}

struct AdminReviewUpsert: Codable {
    var responseId: UUID
    var behaviorType: BehaviorType
    var comment: String?
    var resolved: Bool

    enum CodingKeys: String, CodingKey {
        case responseId = "response_id"
        case behaviorType = "behavior_type"
        case comment, resolved
    }
}
