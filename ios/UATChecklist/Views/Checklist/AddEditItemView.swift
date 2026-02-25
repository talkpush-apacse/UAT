import SwiftUI

enum ItemFormMode: Identifiable {
    case add
    case edit(ChecklistItem)

    var id: String {
        switch self {
        case .add: return "add"
        case .edit(let item): return item.id.uuidString
        }
    }
}

struct AddEditItemView: View {
    @ObservedObject var viewModel: ChecklistViewModel
    let mode: ItemFormMode
    @Environment(\.dismiss) private var dismiss

    @State private var path: PathType?
    @State private var actor: ActorType?
    @State private var action = ""
    @State private var viewSample = ""
    @State private var crmModule = ""
    @State private var tip = ""
    @State private var isSaving = false

    private var isEditing: Bool {
        if case .edit = mode { return true }
        return false
    }

    private var title: String {
        isEditing ? "Edit Step" : "Add Step"
    }

    init(viewModel: ChecklistViewModel, mode: ItemFormMode) {
        self.viewModel = viewModel
        self.mode = mode

        if case .edit(let item) = mode {
            _path = State(initialValue: item.path)
            _actor = State(initialValue: item.actor)
            _action = State(initialValue: item.action)
            _viewSample = State(initialValue: item.viewSample ?? "")
            _crmModule = State(initialValue: item.crmModule ?? "")
            _tip = State(initialValue: item.tip ?? "")
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Classification") {
                    Picker("Path", selection: $path) {
                        Text("None").tag(PathType?.none)
                        ForEach(PathType.allCases, id: \.self) { p in
                            Text(p.rawValue).tag(Optional(p))
                        }
                    }

                    Picker("Actor", selection: $actor) {
                        Text("None").tag(ActorType?.none)
                        ForEach(ActorType.allCases, id: \.self) { a in
                            Text(a.rawValue).tag(Optional(a))
                        }
                    }
                }

                Section("Action") {
                    TextField("Describe the test step...", text: $action, axis: .vertical)
                        .lineLimit(3...10)
                }

                Section("Additional Details") {
                    TextField("View Sample (URL or reference)", text: $viewSample)
                        .autocapitalization(.none)
                        .keyboardType(.URL)

                    TextField("CRM Module", text: $crmModule)

                    TextField("Tip / Helper text", text: $tip, axis: .vertical)
                        .lineLimit(2...4)
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(action.isEmpty || isSaving)
                }
            }
        }
    }

    private func save() {
        isSaving = true
        Task {
            let success: Bool
            switch mode {
            case .add:
                success = await viewModel.addItem(
                    path: path,
                    actor: actor,
                    action: action,
                    viewSample: viewSample.isEmpty ? nil : viewSample,
                    crmModule: crmModule.isEmpty ? nil : crmModule,
                    tip: tip.isEmpty ? nil : tip
                )
            case .edit(let item):
                success = await viewModel.updateItem(
                    id: item.id,
                    path: path,
                    actor: actor,
                    action: action,
                    viewSample: viewSample.isEmpty ? nil : viewSample,
                    crmModule: crmModule.isEmpty ? nil : crmModule,
                    tip: tip.isEmpty ? nil : tip
                )
            }

            if success {
                dismiss()
            }
            isSaving = false
        }
    }
}
