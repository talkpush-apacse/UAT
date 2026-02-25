import Foundation

enum ResponseStatus: String, Codable {
    case pass = "Pass"
    case fail = "Fail"
    case notApplicable = "N/A"
    case blocked = "Blocked"
}

struct TesterResponse: Codable, Identifiable {
    let id: UUID
    let testerId: UUID
    let checklistItemId: UUID
    var status: ResponseStatus
    var comment: String?
    let createdAt: String
    var checklistItem: ChecklistItem?
    var attachments: [Attachment]?
    var adminReviews: [AdminReview]?

    enum CodingKeys: String, CodingKey {
        case id
        case testerId = "tester_id"
        case checklistItemId = "checklist_item_id"
        case status, comment
        case createdAt = "created_at"
        case checklistItem = "checklist_items"
        case attachments
        case adminReviews = "admin_reviews"
    }
}

struct Attachment: Codable, Identifiable {
    let id: UUID
    let responseId: UUID
    var fileName: String
    var fileUrl: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case responseId = "response_id"
        case fileName = "file_name"
        case fileUrl = "file_url"
        case createdAt = "created_at"
    }
}
