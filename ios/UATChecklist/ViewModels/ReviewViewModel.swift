import Foundation
import Supabase

@MainActor
final class ReviewViewModel: ObservableObject {
    @Published var testers: [Tester] = []
    @Published var responses: [TesterResponse] = []
    @Published var signoffs: [Signoff] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    let projectId: UUID

    private var client: SupabaseClient? { SupabaseManager.shared.client }

    init(projectId: UUID) {
        self.projectId = projectId
    }

    func fetchTesters() async {
        guard let client else {
            errorMessage = "Not connected to Supabase"
            return
        }
        isLoading = true
        errorMessage = nil

        do {
            let result: [Tester] = try await client
                .from("testers")
                .select()
                .eq("project_id", value: projectId.uuidString)
                .order("created_at", ascending: false)
                .execute()
                .value
            testers = result
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func fetchResponses(testerId: UUID) async {
        guard let client else { return }
        isLoading = true
        errorMessage = nil

        do {
            let result: [TesterResponse] = try await client
                .from("responses")
                .select("*, checklist_items(*), attachments(*), admin_reviews(*)")
                .eq("tester_id", value: testerId.uuidString)
                .order("created_at")
                .execute()
                .value
            responses = result
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func submitReview(responseId: UUID, behaviorType: BehaviorType, comment: String?, resolved: Bool) async -> Bool {
        guard let client else { return false }

        let review = AdminReviewUpsert(
            responseId: responseId,
            behaviorType: behaviorType,
            comment: comment,
            resolved: resolved
        )

        do {
            try await client
                .from("admin_reviews")
                .upsert(review)
                .execute()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func fetchSignoffs() async {
        guard let client else { return }

        do {
            let result: [Signoff] = try await client
                .from("signoffs")
                .select()
                .eq("project_id", value: projectId.uuidString)
                .order("signed_at", ascending: false)
                .execute()
                .value
            signoffs = result
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func addSignoff(name: String) async -> Bool {
        guard let client else { return false }

        let insert = SignoffInsert(projectId: projectId, name: name)

        do {
            try await client
                .from("signoffs")
                .insert(insert)
                .execute()
            await fetchSignoffs()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    // Computed stats
    var totalResponses: Int { responses.count }
    var passCount: Int { responses.filter { $0.status == .pass }.count }
    var failCount: Int { responses.filter { $0.status == .fail }.count }
    var blockedCount: Int { responses.filter { $0.status == .blocked }.count }
    var naCount: Int { responses.filter { $0.status == .notApplicable }.count }

    var reviewedCount: Int {
        responses.filter { ($0.adminReviews?.isEmpty == false) }.count
    }
}
