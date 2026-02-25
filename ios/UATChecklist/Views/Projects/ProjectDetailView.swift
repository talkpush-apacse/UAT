import SwiftUI

struct ProjectDetailView: View {
    let project: Project
    @State private var selectedTab = 0

    var body: some View {
        VStack(spacing: 0) {
            // Tab picker
            Picker("Section", selection: $selectedTab) {
                Text("Checklist").tag(0)
                Text("Testers").tag(1)
                Text("Signoffs").tag(2)
            }
            .pickerStyle(.segmented)
            .padding()

            // Tab content
            switch selectedTab {
            case 0:
                ChecklistListView(projectId: project.id)
            case 1:
                TestersListView(projectId: project.id)
            case 2:
                SignoffsView(projectId: project.id)
            default:
                EmptyView()
            }
        }
        .navigationTitle(project.companyName)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                NavigationLink {
                    EditProjectView(project: project)
                } label: {
                    Image(systemName: "pencil")
                }
            }
        }
    }
}

struct ProjectInfoSection: View {
    let project: Project

    var body: some View {
        Section("Project Details") {
            LabeledContent("Company", value: project.companyName)
            LabeledContent("Slug", value: project.slug)

            if let scenario = project.testScenario, !scenario.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Test Scenario")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(scenario)
                        .font(.body)
                }
            }

            if let link = project.talkpushLoginLink, !link.isEmpty {
                LabeledContent("Login Link", value: link)
            }
        }
    }
}
