import Foundation
import Supabase

@MainActor
final class ChecklistViewModel: ObservableObject {
    @Published var items: [ChecklistItem] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    let projectId: UUID

    private var client: SupabaseClient? { SupabaseManager.shared.client }

    init(projectId: UUID) {
        self.projectId = projectId
    }

    func fetchItems() async {
        guard let client else {
            errorMessage = "Not connected to Supabase"
            return
        }
        isLoading = true
        errorMessage = nil

        do {
            let response: [ChecklistItem] = try await client
                .from("checklist_items")
                .select()
                .eq("project_id", value: projectId.uuidString)
                .order("sort_order")
                .execute()
                .value
            items = response
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func addItem(path: PathType?, actor: ActorType?, action: String, viewSample: String?, crmModule: String?, tip: String?) async -> Bool {
        guard let client else { return false }

        let nextStep = (items.map(\.stepNumber).max() ?? 0) + 1
        let nextSort = (items.map(\.sortOrder).max() ?? 0) + 1

        let insert = ChecklistItemInsert(
            projectId: projectId,
            stepNumber: nextStep,
            path: path,
            actor: actor,
            action: action,
            viewSample: viewSample,
            crmModule: crmModule,
            tip: tip,
            sortOrder: nextSort
        )

        do {
            try await client
                .from("checklist_items")
                .insert(insert)
                .execute()
            await fetchItems()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func updateItem(id: UUID, path: PathType?, actor: ActorType?, action: String, viewSample: String?, crmModule: String?, tip: String?) async -> Bool {
        guard let client else { return false }

        let update = ChecklistItemUpdate(
            path: path,
            actor: actor,
            action: action,
            viewSample: viewSample,
            crmModule: crmModule,
            tip: tip
        )

        do {
            try await client
                .from("checklist_items")
                .update(update)
                .eq("id", value: id.uuidString)
                .execute()
            await fetchItems()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func deleteItem(id: UUID) async -> Bool {
        guard let client else { return false }

        do {
            try await client
                .from("checklist_items")
                .delete()
                .eq("id", value: id.uuidString)
                .execute()
            // Renumber steps
            await renumberSteps()
            await fetchItems()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func duplicateItem(_ item: ChecklistItem) async -> Bool {
        await addItem(
            path: item.path,
            actor: item.actor,
            action: item.action,
            viewSample: item.viewSample,
            crmModule: item.crmModule,
            tip: item.tip
        )
    }

    func moveItem(from source: IndexSet, to destination: Int) async {
        var reordered = items
        reordered.move(fromOffsets: source, toOffset: destination)

        // Update sort_order for all items
        guard let client else { return }

        do {
            for (index, item) in reordered.enumerated() {
                let update = ChecklistItemUpdate(stepNumber: index + 1, sortOrder: index + 1)
                try await client
                    .from("checklist_items")
                    .update(update)
                    .eq("id", value: item.id.uuidString)
                    .execute()
            }
            await fetchItems()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func renumberSteps() async {
        guard let client else { return }

        do {
            let current: [ChecklistItem] = try await client
                .from("checklist_items")
                .select()
                .eq("project_id", value: projectId.uuidString)
                .order("sort_order")
                .execute()
                .value

            for (index, item) in current.enumerated() {
                let update = ChecklistItemUpdate(stepNumber: index + 1)
                try await client
                    .from("checklist_items")
                    .update(update)
                    .eq("id", value: item.id.uuidString)
                    .execute()
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
