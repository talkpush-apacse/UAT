import SwiftUI

struct CreateProjectView: View {
    @ObservedObject var viewModel: ProjectsViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var companyName = ""
    @State private var slug = ""
    @State private var testScenario = ""
    @State private var talkpushLoginLink = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Required") {
                    TextField("Company Name", text: $companyName)
                        .onChange(of: companyName) { _, newValue in
                            if slug.isEmpty || slug == generateSlug(from: String(companyName.dropLast())) {
                                slug = generateSlug(from: newValue)
                            }
                        }

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
            }
            .navigationTitle("New Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { save() }
                        .disabled(companyName.isEmpty || slug.isEmpty || isSaving)
                }
            }
        }
    }

    private func save() {
        isSaving = true
        let insert = ProjectInsert(
            companyName: companyName,
            slug: slug,
            testScenario: testScenario.isEmpty ? nil : testScenario,
            talkpushLoginLink: talkpushLoginLink.isEmpty ? nil : talkpushLoginLink
        )
        Task {
            if await viewModel.createProject(insert) {
                dismiss()
            }
            isSaving = false
        }
    }

    private func generateSlug(from name: String) -> String {
        name.lowercased()
            .replacingOccurrences(of: " ", with: "-")
            .filter { $0.isLetter || $0.isNumber || $0 == "-" }
    }
}
