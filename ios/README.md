# UAT Checklist - iOS Admin App

A native SwiftUI iOS app for managing UAT (User Acceptance Testing) checklists on mobile. Connects to the same Supabase backend as the web application.

## Features

- **Projects**: Browse, create, edit, and delete UAT projects
- **Checklist Management**: View, add, edit, delete, duplicate, and reorder checklist steps
- **Tester Responses**: View tester submissions with pass/fail/N-A/blocked status
- **Admin Reviews**: Review individual responses with behavior classification (As Expected, Minor, Major, Critical)
- **Sign-offs**: Add project sign-offs
- **Secure**: App-level password protection + Keychain storage for credentials

## Requirements

- Xcode 15+
- iOS 17.0+
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) (for project generation)

## Setup

### 1. Install XcodeGen

```bash
brew install xcodegen
```

### 2. Generate Xcode Project

```bash
cd ios
xcodegen generate
```

This creates `UATChecklist.xcodeproj` from `project.yml`.

### 3. Open in Xcode

```bash
open UATChecklist.xcodeproj
```

### 4. Resolve Package Dependencies

Xcode will automatically fetch the Supabase Swift SDK. If not, go to **File > Packages > Resolve Package Versions**.

### 5. Configure Signing

Select the **UATChecklist** target, go to **Signing & Capabilities**, and set your development team.

### 6. Build & Run

Select your device or simulator and press **Cmd+R**.

## First Launch

1. **Set Admin Password** - On first launch, enter a password to protect the app. This is stored in your device's Keychain.
2. **Connect to Supabase** - Enter your Supabase project URL and **Service Role Key** (found in Supabase Dashboard > Settings > API).
3. You're ready to manage your UAT checklists!

## Architecture

```
UATChecklist/
├── App/              # App entry point and root navigation
├── Models/           # Codable structs matching Supabase tables
├── Services/         # SupabaseManager (client) + AuthManager
├── ViewModels/       # Observable view models for data operations
├── Views/
│   ├── Login/        # Authentication + Supabase setup
│   ├── Projects/     # Project CRUD + navigation
│   ├── Checklist/    # Checklist item management
│   ├── Testers/      # Tester list + response views
│   ├── Reviews/      # Admin review + sign-off views
│   └── Components/   # Shared UI components
└── Resources/        # Assets + Info.plist
```

## Alternative Setup (without XcodeGen)

If you prefer not to use XcodeGen:

1. Open Xcode and create a new **iOS App** project (SwiftUI, Swift)
2. Name it `UATChecklist`, set deployment target to iOS 17.0
3. Delete the auto-generated `ContentView.swift`
4. Drag all files from `UATChecklist/` into the Xcode project navigator
5. Add the Supabase Swift package: **File > Add Package Dependencies** and enter `https://github.com/supabase/supabase-swift`, select version 2.0.0+
6. Add the `Supabase` product to your target
7. Build & Run
