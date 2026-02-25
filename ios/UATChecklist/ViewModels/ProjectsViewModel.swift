import Foundation
import Supabase

@MainActor
final class ProjectsViewModel: ObservableObject {
    @Published var projects: [Project] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private var client: SupabaseClient? { SupabaseManager.shared.client }

    func fetchProjects() async {
        guard let client else {
            errorMessage = "Not connected to Supabase"
            return
        }
        isLoading = true
        errorMessage = nil

        do {
            let response: [Project] = try await client
                .from("projects")
                .select()
                .order("created_at", ascending: false)
                .execute()
                .value
            projects = response
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func createProject(_ insert: ProjectInsert) async -> Bool {
        guard let client else { return false }

        do {
            try await client
                .from("projects")
                .insert(insert)
                .execute()
            await fetchProjects()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func updateProject(id: UUID, companyName: String, slug: String, testScenario: String?, talkpushLoginLink: String?) async -> Bool {
        guard let client else { return false }

        do {
            let update = ProjectInsert(
                companyName: companyName,
                slug: slug,
                testScenario: testScenario,
                talkpushLoginLink: talkpushLoginLink
            )
            try await client
                .from("projects")
                .update(update)
                .eq("id", value: id.uuidString)
                .execute()
            await fetchProjects()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func deleteProject(id: UUID) async -> Bool {
        guard let client else { return false }

        do {
            try await client
                .from("projects")
                .delete()
                .eq("id", value: id.uuidString)
                .execute()
            await fetchProjects()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
}
