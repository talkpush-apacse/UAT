import SwiftUI

struct ProjectsListView: View {
    @StateObject private var viewModel = ProjectsViewModel()
    @State private var showCreateSheet = false
    @State private var searchText = ""

    private var filteredProjects: [Project] {
        if searchText.isEmpty {
            return viewModel.projects
        }
        return viewModel.projects.filter {
            $0.companyName.localizedCaseInsensitiveContains(searchText) ||
            $0.slug.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.projects.isEmpty {
                    ProgressView("Loading projects...")
                } else if viewModel.projects.isEmpty {
                    ContentUnavailableView(
                        "No Projects",
                        systemImage: "folder.badge.questionmark",
                        description: Text("Create a project to get started.")
                    )
                } else {
                    List {
                        ForEach(filteredProjects) { project in
                            NavigationLink(value: project) {
                                ProjectRowView(project: project)
                            }
                        }
                        .onDelete(perform: deleteProjects)
                    }
                    .searchable(text: $searchText, prompt: "Search projects")
                }
            }
            .navigationTitle("Projects")
            .navigationDestination(for: Project.self) { project in
                ProjectDetailView(project: project)
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showCreateSheet = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .refreshable {
                await viewModel.fetchProjects()
            }
            .sheet(isPresented: $showCreateSheet) {
                CreateProjectView(viewModel: viewModel)
            }
            .task {
                await viewModel.fetchProjects()
            }
            .overlay {
                if let error = viewModel.errorMessage {
                    ErrorBanner(message: error) {
                        viewModel.errorMessage = nil
                    }
                }
            }
        }
    }

    private func deleteProjects(at offsets: IndexSet) {
        Task {
            for index in offsets {
                let project = filteredProjects[index]
                _ = await viewModel.deleteProject(id: project.id)
            }
        }
    }
}

struct ProjectRowView: View {
    let project: Project

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(project.companyName)
                .font(.headline)

            Text(project.slug)
                .font(.caption)
                .foregroundStyle(.secondary)

            if let scenario = project.testScenario, !scenario.isEmpty {
                Text(scenario)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 4)
    }
}
