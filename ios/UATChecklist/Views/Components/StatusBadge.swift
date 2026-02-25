import SwiftUI

struct StatusBadge: View {
    let status: ResponseStatus

    var body: some View {
        Text(status.displayText)
            .font(.caption2.bold())
            .foregroundStyle(statusColor)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(statusColor.opacity(0.15), in: Capsule())
    }

    private var statusColor: Color {
        switch status {
        case .pass: return .green
        case .fail: return .red
        case .notApplicable: return .gray
        case .blocked: return .orange
        }
    }
}

extension ResponseStatus {
    var displayText: String {
        switch self {
        case .pass: return "Pass"
        case .fail: return "Fail"
        case .notApplicable: return "N/A"
        case .blocked: return "Up For Review"
        }
    }
}
