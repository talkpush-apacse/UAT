import SwiftUI

struct ChecklistListView: View {
    let projectId: UUID
    @StateObject private var viewModel: ChecklistViewModel
    @State private var showAddSheet = false
    @State private var editingItem: ChecklistItem?

    init(projectId: UUID) {
        self.projectId = projectId
        _viewModel = StateObject(wrappedValue: ChecklistViewModel(projectId: projectId))
    }

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.items.isEmpty {
                ProgressView("Loading checklist...")
                    .frame(maxHeight: .infinity)
            } else if viewModel.items.isEmpty {
                ContentUnavailableView(
                    "No Checklist Items",
                    systemImage: "checklist",
                    description: Text("Tap + to add your first step.")
                )
            } else {
                List {
                    ForEach(viewModel.items) { item in
                        ChecklistItemRow(item: item)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                editingItem = item
                            }
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                Button(role: .destructive) {
                                    deleteItem(item)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }

                                Button {
                                    duplicateItem(item)
                                } label: {
                                    Label("Duplicate", systemImage: "doc.on.doc")
                                }
                                .tint(.blue)
                            }
                    }
                    .onMove(perform: moveItems)
                }
                .listStyle(.plain)
            }
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showAddSheet = true
                } label: {
                    Image(systemName: "plus")
                }
            }
            ToolbarItem(placement: .secondaryAction) {
                EditButton()
            }
        }
        .sheet(isPresented: $showAddSheet) {
            AddEditItemView(viewModel: viewModel, mode: .add)
        }
        .sheet(item: $editingItem) { item in
            AddEditItemView(viewModel: viewModel, mode: .edit(item))
        }
        .refreshable {
            await viewModel.fetchItems()
        }
        .task {
            await viewModel.fetchItems()
        }
        .overlay {
            if let error = viewModel.errorMessage {
                ErrorBanner(message: error) {
                    viewModel.errorMessage = nil
                }
            }
        }
    }

    private func deleteItem(_ item: ChecklistItem) {
        Task { _ = await viewModel.deleteItem(id: item.id) }
    }

    private func duplicateItem(_ item: ChecklistItem) {
        Task { _ = await viewModel.duplicateItem(item) }
    }

    private func moveItems(from source: IndexSet, to destination: Int) {
        Task { await viewModel.moveItem(from: source, to: destination) }
    }
}
