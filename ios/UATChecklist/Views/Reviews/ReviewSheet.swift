import SwiftUI

struct ReviewSheet: View {
    let response: TesterResponse
    @ObservedObject var viewModel: ReviewViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var behaviorType: BehaviorType = .asExpected
    @State private var comment = ""
    @State private var resolved = false
    @State private var isSaving = false

    init(response: TesterResponse, viewModel: ReviewViewModel) {
        self.response = response
        self.viewModel = viewModel

        // Pre-fill from existing review if available
        if let existing = response.adminReviews?.first {
            _behaviorType = State(initialValue: existing.behaviorType)
            _comment = State(initialValue: existing.comment ?? "")
            _resolved = State(initialValue: existing.resolved)
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                // Response details
                Section("Response") {
                    if let item = response.checklistItem {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Step #\(item.stepNumber)")
                                .font(.caption.bold())
                                .foregroundStyle(.accent)
                            Text(item.action)
                                .font(.body)
                        }
                    }

                    HStack {
                        Text("Status")
                        Spacer()
                        StatusBadge(status: response.status)
                    }

                    if let testerComment = response.comment, !testerComment.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Tester Comment")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(testerComment)
                                .font(.body)
                        }
                    }
                }

                // Attachments
                if let attachments = response.attachments, !attachments.isEmpty {
                    Section("Attachments (\(attachments.count))") {
                        ForEach(attachments) { attachment in
                            Label(attachment.fileName, systemImage: "doc")
                                .font(.subheadline)
                        }
                    }
                }

                // Review form
                Section("Admin Review") {
                    Picker("Behavior Type", selection: $behaviorType) {
                        ForEach(BehaviorType.allCases, id: \.self) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }

                    TextField("Review comment...", text: $comment, axis: .vertical)
                        .lineLimit(2...6)

                    Toggle("Resolved", isOn: $resolved)
                }
            }
            .navigationTitle("Review Response")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Submit") { submitReview() }
                        .disabled(isSaving)
                }
            }
        }
    }

    private func submitReview() {
        isSaving = true
        Task {
            let success = await viewModel.submitReview(
                responseId: response.id,
                behaviorType: behaviorType,
                comment: comment.isEmpty ? nil : comment,
                resolved: resolved
            )
            if success {
                dismiss()
            }
            isSaving = false
        }
    }
}
