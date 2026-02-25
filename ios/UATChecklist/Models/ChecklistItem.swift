import Foundation

enum PathType: String, Codable, CaseIterable {
    case happy = "Happy"
    case nonHappy = "Non-Happy"
}

enum ActorType: String, Codable, CaseIterable {
    case candidate = "Candidate"
    case talkpush = "Talkpush"
    case recruiter = "Recruiter"
}

struct ChecklistItem: Codable, Identifiable {
    let id: UUID
    let projectId: UUID
    var stepNumber: Int
    var path: PathType?
    var actor: ActorType?
    var action: String
    var viewSample: String?
    var crmModule: String?
    var tip: String?
    var sortOrder: Int

    enum CodingKeys: String, CodingKey {
        case id
        case projectId = "project_id"
        case stepNumber = "step_number"
        case path, actor, action
        case viewSample = "view_sample"
        case crmModule = "crm_module"
        case tip
        case sortOrder = "sort_order"
    }
}

struct ChecklistItemInsert: Codable {
    var projectId: UUID
    var stepNumber: Int
    var path: PathType?
    var actor: ActorType?
    var action: String
    var viewSample: String?
    var crmModule: String?
    var tip: String?
    var sortOrder: Int

    enum CodingKeys: String, CodingKey {
        case projectId = "project_id"
        case stepNumber = "step_number"
        case path, actor, action
        case viewSample = "view_sample"
        case crmModule = "crm_module"
        case tip
        case sortOrder = "sort_order"
    }
}

struct ChecklistItemUpdate: Codable {
    var stepNumber: Int?
    var path: PathType?
    var actor: ActorType?
    var action: String?
    var viewSample: String?
    var crmModule: String?
    var tip: String?
    var sortOrder: Int?

    enum CodingKeys: String, CodingKey {
        case stepNumber = "step_number"
        case path, actor, action
        case viewSample = "view_sample"
        case crmModule = "crm_module"
        case tip
        case sortOrder = "sort_order"
    }
}
