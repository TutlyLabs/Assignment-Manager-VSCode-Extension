import * as vscode from 'vscode';
import { AssignmentProvider, AssignmentItem } from './assignmentProvider';
import { AuthService } from './services/authService';
import { AssignmentService } from './services/assignmentService';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const authService = new AuthService(context);
    const assignmentService = new AssignmentService(context);
    const assignmentProvider = new AssignmentProvider(assignmentService);

    vscode.window.registerTreeDataProvider('assignmentExplorer', assignmentProvider);

    // Login
    let loginCommand = vscode.commands.registerCommand("assignment-manager.login", async () => {
        const email = await vscode.window.showInputBox({
            prompt: "Enter your email",
            placeHolder: "email@example.com",
            validateInput: (value) => {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 
                    null : 
                    "Please enter a valid email address";
            }
        });

        if (!email) {
            return;
        }

        const password = await vscode.window.showInputBox({
            prompt: "Enter your password",
            password: true,
            validateInput: (value) => {
                return value.length >= 6 ? 
                    null : 
                    "Password must be at least 6 characters long";
            }
        });

        if (email && password) {
            try {
                await authService.login(email, password);
                vscode.window.showInformationMessage("Successfully logged in!");
                assignmentProvider.refresh();
                assignmentProvider.setLoggedIn(true);
            } catch (error: any) {
                const errorMessage = error instanceof Error ? error.message : "Failed to login";
                vscode.window.showErrorMessage(errorMessage, "Try Again").then(selection => {
                    if (selection === "Try Again") {
                        vscode.commands.executeCommand("assignment-manager.login");
                    }
                });
            }
        }
    });

    // View Assignments
    let viewAssignmentsCommand = vscode.commands.registerCommand('assignment-manager.viewAssignments', async () => {
        try {
            assignmentProvider.refresh();
        } catch (error) {
            vscode.window.showErrorMessage('Failed to fetch assignments');
        }
    });

    // Save Code
    let saveCodeCommand = vscode.commands.registerCommand('assignment-manager.saveCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const code = editor.document.getText();
        const filePath = editor.document.uri.path;
        const pathParts = filePath.split('/');
        const assignmentId = pathParts[pathParts.length - 2]; // Get the assignment ID from path
        const fileName = pathParts[pathParts.length - 1]; // Get the file name

        if (!assignmentId || !fileName) {
            vscode.window.showErrorMessage('Cannot determine assignment ID or file path');
            return;
        }

        try {
            await assignmentService.saveCode(assignmentId, fileName, code);
            vscode.window.showInformationMessage('Code saved successfully!');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to save code');
        }
    });

    // Open file command
    let openFileCommand = vscode.commands.registerCommand("assignment-manager.openFile", async (assignmentId: string, filePath: string) => {
        try {
            const files = await assignmentService.getAssignmentFiles(assignmentId);
            const fileContent = files[filePath];
            
            const document = await vscode.workspace.openTextDocument({
                content: fileContent,
                language: getLanguageFromPath(filePath)
            });
            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage("Failed to open file");
        }
    });

    // Submit assignment command
    let submitAssignmentCommand = vscode.commands.registerCommand("assignment-manager.submitAssignment", async (item: AssignmentItem) => {
        try {
            const response = await vscode.window.showWarningMessage(
                "Are you sure you want to submit this assignment?",
                { modal: true },
                "Yes, Submit",
                "Cancel"
            );

            if (response === "Yes, Submit") {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "Submitting assignment...",
                    cancellable: false
                }, async () => {
                    await assignmentService.submitAssignment(item.id);
                });
                vscode.window.showInformationMessage("Assignment submitted successfully!");
            }
        } catch (error) {
            vscode.window.showErrorMessage("Failed to submit assignment. Please try again.");
        }
    });

    // Setup main workspace command
    let setupMainWorkspaceCommand = vscode.commands.registerCommand("assignment-manager.setupMainWorkspace", async () => {
        try {
            await assignmentService.setupMainWorkspace();
            vscode.window.showInformationMessage("Workspace setup successfully!");
            assignmentProvider.refresh();
        } catch (error: any) {
            const message = error.message || "Failed to setup workspace";
            vscode.window.showErrorMessage(message, "Try Again").then(selection => {
                if (selection === "Try Again") {
                    vscode.commands.executeCommand("assignment-manager.setupMainWorkspace");
                }
            });
        }
    });

    // Sync code command
    let syncCodeCommand = vscode.commands.registerCommand("assignment-manager.syncAssignment", async (item: AssignmentItem) => {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Syncing code...",
                cancellable: false
            }, async () => {
                await assignmentService.syncCode(item.id);
            });
            vscode.window.showInformationMessage("Code synced successfully!");
        } catch (error) {
            vscode.window.showErrorMessage("Failed to sync code. Please try again.");
        }
    });

    // Reset code command
    let resetCodeCommand = vscode.commands.registerCommand("assignment-manager.resetCode", async (item: AssignmentItem) => {
        const response = await vscode.window.showWarningMessage(
            "This will reset all local changes. Are you sure?",
            "Yes",
            "No"
        );
        
        if (response === "Yes") {
            try {
                await assignmentService.resetCode(item.id);
                vscode.window.showInformationMessage("Code reset successfully!");
                assignmentProvider.refresh();
            } catch (error) {
                vscode.window.showErrorMessage("Failed to reset code");
            }
        }
    });

    // Open assignment command
    let openAssignmentCommand = vscode.commands.registerCommand("assignment-manager.openAssignment", async (item: AssignmentItem) => {
        try {
            await assignmentService.openAssignment(item.courseId, item.id);
        } catch (error) {
            vscode.window.showErrorMessage("Failed to open assignment");
        }
    });

    // Update context after login
    context.subscriptions.push(
        vscode.commands.registerCommand("setContext", (key: string, value: any) => {
            return vscode.commands.executeCommand("setContext", key, value);
        })
    );

    // Set initial contexts
    vscode.commands.executeCommand("setContext", "assignment-manager:isLoggedIn", false);
    vscode.commands.executeCommand("setContext", "assignment-manager:hasWorkspace", false);

    // Check for existing session
    authService.isLoggedIn().then(async isLoggedIn => {
        if (isLoggedIn) {
            assignmentProvider.setLoggedIn(true);
            vscode.commands.executeCommand("setContext", "assignment-manager:isLoggedIn", true);
            // Also check workspace status
            const hasWorkspace = await assignmentService.hasWorkspace();
            vscode.commands.executeCommand("setContext", "assignment-manager:hasWorkspace", hasWorkspace);
        }
    });

    // Logout command
    let logoutCommand = vscode.commands.registerCommand("assignment-manager.logout", async () => {
        await authService.logout();
        assignmentProvider.setLoggedIn(false);
        vscode.commands.executeCommand("setContext", "assignment-manager:isLoggedIn", false);
        vscode.commands.executeCommand("setContext", "assignment-manager:hasWorkspace", false);
        vscode.window.showInformationMessage("Successfully logged out");
    });

    // Register status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.text = "$(book) Assignment Manager";
    statusBarItem.command = "workbench.view.extension.assignment-explorer";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Auto-refresh on file changes
    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/*");
    fileSystemWatcher.onDidChange(() => assignmentProvider.refresh());
    fileSystemWatcher.onDidCreate(() => assignmentProvider.refresh());
    fileSystemWatcher.onDidDelete(() => assignmentProvider.refresh());
    context.subscriptions.push(fileSystemWatcher);

    // Register all commands
    context.subscriptions.push(
        loginCommand,
        logoutCommand,
        viewAssignmentsCommand,
        saveCodeCommand,
        openFileCommand,
        submitAssignmentCommand,
        setupMainWorkspaceCommand,
        syncCodeCommand,
        resetCodeCommand,
        statusBarItem
    );
}

function getLanguageFromPath(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
        ".js": "javascript",
        ".jsx": "javascriptreact",
        ".ts": "typescript",
        ".tsx": "typescriptreact",
        ".html": "html",
        ".css": "css",
        ".json": "json",
        ".md": "markdown"
    };
    return languageMap[ext] || "plaintext";
}