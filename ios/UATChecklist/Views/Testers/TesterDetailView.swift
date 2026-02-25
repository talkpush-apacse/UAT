import SwiftUI

struct TesterDetailView: View {
    let tester: Tester
    let projectId: UUID
    @StateObject private var viewModel: ReviewViewModel
    @State private var selectedResponse: TesterResponse?

    init(tester: Tester, projectId: UUID) {
        self.tester = tester
        self.projectId = projectId
        _viewModel = StateObject(wrappedValue: ReviewViewModel(projectId: projectId))
    }

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.responses.isEmpty {
                ProgressView("Loading responses...")
            } else if viewModel.responses.isEmpty {
                ContentUnavailableView(
                    "No Responses",
                    systemImage: "doc.text",
                    description: Text("This tester hasn't submitted any responses yet.")
                )
            } else {
                List {
                    // Stats summary
                    Section("Summary") {
                        StatsGridView(viewModel: viewModel)
                    }

                    // Response list
                    Section("Responses (\(viewModel.totalResponses))") {
                        ForEach(viewModel.responses) { response in
                            ResponseRowView(response: response)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    selectedResponse = response
                                }
                        }
                    }
                }
            }
        }
        .navigationTitle(tester.name)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $selectedResponse) { response in
            ReviewSheet(response: response, viewModel: viewModel)
        }
        .refreshable {
            await viewModel.fetchResponses(testerId: tester.id)
        }
        .task {
            await viewModel.fetchResponses(testerId: tester.id)
        }
    }
}

struct StatsGridView: View {
    @ObservedObject var viewModel: ReviewViewModel

    var body: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible()),
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 12) {
            StatCell(label: "Pass", count: viewModel.passCount, color: .green)
            StatCell(label: "Fail", count: viewModel.failCount, color: .red)
            StatCell(label: "N/A", count: viewModel.naCount, color: .gray)
            StatCell(label: "Blocked", count: viewModel.blockedCount, color: .orange)
        }
        .padding(.vertical, 4)
    }
}

struct StatCell: View {
    let label: String
    let count: Int
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text("\(count)")
                .font(.title2.bold())
                .foregroundStyle(color)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}

struct ResponseRowView: View {
    let response: TesterResponse

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                if let item = response.checklistItem {
                    Text("#\(item.stepNumber)")
                        .font(.caption.bold())
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(.accent, in: Capsule())
                }

                StatusBadge(status: response.status)

                Spacer()

                if let reviews = response.adminReviews, !reviews.isEmpty {
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundStyle(.blue)
                        .font(.caption)
                } else {
                    Text("Needs Review")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                }
            }

            if let item = response.checklistItem {
                Text(item.action)
                    .font(.subheadline)
                    .lineLimit(2)
            }

            if let comment = response.comment, !comment.isEmpty {
                Text(comment)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            if let attachments = response.attachments, !attachments.isEmpty {
                Label("\(attachments.count) attachment(s)", systemImage: "paperclip")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}
