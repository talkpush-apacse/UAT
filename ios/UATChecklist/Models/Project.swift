import Foundation

struct Project: Codable, Identifiable, Hashable {
    let id: UUID
    var companyName: String
    var slug: String
    var testScenario: String?
    var talkpushLoginLink: String?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case companyName = "company_name"
        case slug
        case testScenario = "test_scenario"
        case talkpushLoginLink = "talkpush_login_link"
        case createdAt = "created_at"
    }
}

struct ProjectInsert: Codable {
    var companyName: String
    var slug: String
    var testScenario: String?
    var talkpushLoginLink: String?

    enum CodingKeys: String, CodingKey {
        case companyName = "company_name"
        case slug
        case testScenario = "test_scenario"
        case talkpushLoginLink = "talkpush_login_link"
    }
}
