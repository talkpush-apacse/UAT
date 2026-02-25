import SwiftUI

struct TestersListView: View {
    let projectId: UUID
    @StateObject private var viewModel: ReviewViewModel

    init(projectId: UUID) {
        self.projectId = projectId
        _viewModel = StateObject(wrappedValue: ReviewViewModel(projectId: projectId))
    }

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.testers.isEmpty {
                ProgressView("Loading testers...")
                    .frame(maxHeight: .infinity)
            } else if viewModel.testers.isEmpty {
                ContentUnavailableView(
                    "No Testers",
                    systemImage: "person.3",
                    description: Text("No testers have been assigned to this project yet.")
                )
            } else {
                List(viewModel.testers) { tester in
                    NavigationLink {
                        TesterDetailView(tester: tester, projectId: projectId)
                    } label: {
                        TesterRowView(tester: tester)
                    }
                }
                .listStyle(.plain)
            }
        }
        .refreshable {
            await viewModel.fetchTesters()
        }
        .task {
            await viewModel.fetchTesters()
        }
    }
}

struct TesterRowView: View {
    let tester: Tester

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(tester.name)
                    .font(.headline)

                Text(tester.email)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if let mobile = tester.mobile, !mobile.isEmpty {
                    Text(mobile)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            if tester.testCompleted {
                Label("Complete", systemImage: "checkmark.circle.fill")
                    .font(.caption)
                    .foregroundStyle(.green)
            } else {
                Label("In Progress", systemImage: "clock")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }
        }
        .padding(.vertical, 4)
    }
}
