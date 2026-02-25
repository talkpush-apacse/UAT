import SwiftUI

struct EditProjectView: View {
    let project: Project
    @StateObject private var viewModel = ProjectsViewModel()
    @Environment(\.dismiss) private var dismiss

    @State private var companyName: String
    @State private var slug: String
    @State private var testScenario: String
    @State private var talkpushLoginLink: String
    @State private var isSaving = false

    init(project: Project) {
        self.project = project
        _companyName = State(initialValue: project.companyName)
        _slug = State(initialValue: project.slug)
        _testScenario = State(initialValue: project.testScenario ?? "")
        _talkpushLoginLink = State(initialValue: project.talkpushLoginLink ?? "")
    }

    var body: some View {
        Form {
            Section("Required") {
                TextField("Company Name", text: $companyName)
                TextField("Slug", text: $slug)
                    .autocapitalization(.none)
                    .autocorrectionDisabled()
            }

            Section("Optional") {
                TextField("Test Scenario", text: $testScenario, axis: .vertical)
                    .lineLimit(3...6)

                TextField("Talkpush Login Link", text: $talkpushLoginLink)
                    .autocapitalization(.none)
                    .keyboardType(.URL)
            }

            if let error = viewModel.errorMessage {
                Section {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(.footnote)
                }
            }
        }
        .navigationTitle("Edit Project")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { save() }
                    .disabled(companyName.isEmpty || slug.isEmpty || isSaving)
            }
        }
    }

    private func save() {
        isSaving = true
        Task {
            let success = await viewModel.updateProject(
                id: project.id,
                companyName: companyName,
                slug: slug,
                testScenario: testScenario.isEmpty ? nil : testScenario,
                talkpushLoginLink: talkpushLoginLink.isEmpty ? nil : talkpushLoginLink
            )
            if success {
                dismiss()
            }
            isSaving = false
        }
    }
}
