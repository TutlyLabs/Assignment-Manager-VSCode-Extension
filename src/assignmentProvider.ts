import * as vscode from 'vscode';
import { AssignmentService } from './services/assignmentService';
import { ICourse, IAssignment } from './types';

export class AssignmentProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    private isLoggedIn: boolean = false;

    constructor(private assignmentService: AssignmentService) { }

    setLoggedIn(status: boolean) {
        this.isLoggedIn = status;
        this.refresh();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TreeItem): Promise<TreeItem[]> {
        if (!this.isLoggedIn) {
            return [
                new MessageItem(
                    "Please login to view assignments",
                    "$(sign-in) Click here to login",
                    {
                        command: "assignment-manager.login",
                        title: "Login"
                    }
                )
            ];
        }

        try {
            if (!element) {
                const email = await this.assignmentService.getUserEmail();
                const courses = await this.assignmentService.getCourses();
                
                return [
                    new ProfileItem(email, {
                        command: "assignment-manager.logout",
                        title: "Logout"
                    }),
                    ...courses.map(course => 
                        new CourseItem(course.title, course.id)
                    )
                ];
            }

            if (element instanceof CourseItem) {
                const assignments = await this.assignmentService.getCourseAssignments(element.id);
                return assignments.map(assignment => 
                    new AssignmentItem(
                        assignment.title,
                        assignment.id,
                        element.id,
                        assignment.description
                    )
                );
            }

            return [];
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load assignments: ${error}`);
            return [new MessageItem("Error loading assignments", "$(error) Try again")];
        }
    }
}

class TreeItem extends vscode.TreeItem {
    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        command?: vscode.Command
    ) {
        super(label, collapsibleState);
        if (command) {
            this.command = command;
        }
    }
}

class MessageItem extends TreeItem {
    constructor(
        message: string,
        description?: string,
        command?: vscode.Command
    ) {
        super(message, vscode.TreeItemCollapsibleState.None);
        this.contextValue = "message";
        if (description) {
            this.description = description;
        }
        if (command) {
            this.command = command;
        }
    }
}

class CourseItem extends TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = "course";
        this.iconPath = new vscode.ThemeIcon("folder");
        this.description = "Click to view assignments";
        this.tooltip = new vscode.MarkdownString(`**${this.label}**\n\n_Click to view assignments_`);
    }
}

export class AssignmentItem extends TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string,
        public readonly courseId: string,
        public readonly description: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = "assignment";
        this.tooltip = new vscode.MarkdownString(`**${this.label}**\n\n${this.description}`);
        this.iconPath = new vscode.ThemeIcon("notebook");
        this.description = "Click to open";
        this.command = {
            command: "assignment-manager.openAssignment",
            title: "Open Assignment",
            arguments: [this]
        };
    }
}

class ProfileItem extends TreeItem {
    constructor(email: string | null, command?: vscode.Command) {
        super(`👤 ${email || "Unknown User"}`, vscode.TreeItemCollapsibleState.None);
        this.contextValue = "profile";
        this.tooltip = new vscode.MarkdownString(`Logged in as **${email}**\n\n_Click to logout_`);
        this.description = "Click to logout";
        if (command) {
            this.command = command;
        }
    }
}