import SwiftUI

struct ChecklistItemRow: View {
    let item: ChecklistItem

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Header row: step number + path badge + actor badge
            HStack(spacing: 8) {
                Text("#\(item.stepNumber)")
                    .font(.caption.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(.accent, in: Capsule())

                if let path = item.path {
                    PathBadge(path: path)
                }

                if let actor = item.actor {
                    ActorBadge(actor: actor)
                }

                Spacer()
            }

            // Action text
            Text(item.action)
                .font(.body)
                .lineLimit(3)

            // Metadata row
            HStack(spacing: 12) {
                if let module = item.crmModule, !module.isEmpty {
                    Label(module, systemImage: "rectangle.grid.1x2")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                if let tip = item.tip, !tip.isEmpty {
                    Label("Has tip", systemImage: "lightbulb")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                }

                if let sample = item.viewSample, !sample.isEmpty {
                    Label("Sample", systemImage: "link")
                        .font(.caption2)
                        .foregroundStyle(.blue)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct PathBadge: View {
    let path: PathType

    var body: some View {
        Text(path.rawValue)
            .font(.caption2.bold())
            .foregroundStyle(path == .happy ? .green : .orange)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(
                (path == .happy ? Color.green : Color.orange).opacity(0.15),
                in: Capsule()
            )
    }
}

struct ActorBadge: View {
    let actor: ActorType

    var body: some View {
        Text(actor.rawValue)
            .font(.caption2)
            .foregroundStyle(actorColor)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(actorColor.opacity(0.12), in: Capsule())
    }

    private var actorColor: Color {
        switch actor {
        case .candidate: return .purple
        case .talkpush: return .blue
        case .recruiter: return .teal
        }
    }
}
