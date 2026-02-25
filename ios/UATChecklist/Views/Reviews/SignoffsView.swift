import SwiftUI

struct SignoffsView: View {
    let projectId: UUID
    @StateObject private var viewModel: ReviewViewModel
    @State private var showAddSheet = false
    @State private var signoffName = ""

    init(projectId: UUID) {
        self.projectId = projectId
        _viewModel = StateObject(wrappedValue: ReviewViewModel(projectId: projectId))
    }

    var body: some View {
        Group {
            if viewModel.signoffs.isEmpty {
                ContentUnavailableView(
                    "No Sign-offs",
                    systemImage: "signature",
                    description: Text("No one has signed off on this project yet.")
                )
            } else {
                List(viewModel.signoffs) { signoff in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(signoff.name)
                                .font(.headline)
                            Text(signoff.signedAt)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        Image(systemName: "checkmark.seal.fill")
                            .foregroundStyle(.green)
                    }
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
        }
        .alert("Add Sign-off", isPresented: $showAddSheet) {
            TextField("Your Name", text: $signoffName)
            Button("Cancel", role: .cancel) {
                signoffName = ""
            }
            Button("Sign Off") {
                Task {
                    _ = await viewModel.addSignoff(name: signoffName)
                    signoffName = ""
                }
            }
        } message: {
            Text("Enter your name to sign off on this project.")
        }
        .refreshable {
            await viewModel.fetchSignoffs()
        }
        .task {
            await viewModel.fetchSignoffs()
        }
    }
}
