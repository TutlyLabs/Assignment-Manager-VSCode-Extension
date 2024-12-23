import * as vscode from 'vscode';
import * as path from 'path';
import { ICourse, IAssignment } from '../types';
import { API } from './api';
import { AuthService } from './authService';

const DEFAULT_SETTINGS = {
    "editor.formatOnSave": true,
    "editor.tabSize": 2,
    "files.autoSave": "afterDelay",
    "files.autoSaveDelay": 1000
};

export class AssignmentService {
    private authService: AuthService;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.authService = new AuthService(context);
        this.context = context;
    }

    async getUserEmail(): Promise<string | null> {
        return this.authService.getUserEmail();
    }

    async hasWorkspace(): Promise<boolean> {
        const workspacePath = await this.context.globalState.get<string>("mainWorkspacePath");
        return !!workspacePath;
    }

    async setupMainWorkspace(): Promise<void> {
        const folder = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: "Select Assignments Workspace",
            title: "Choose Workspace Folder",
        });

        if (!folder) {
            throw new Error("No folder selected");
        }

        const vscodeFolder = path.join(folder[0].fsPath, ".vscode");
        const settingsPath = path.join(vscodeFolder, "settings.json");

        await vscode.workspace.fs.createDirectory(vscode.Uri.file(vscodeFolder));
        
        const updatedSettings = {
            ...DEFAULT_SETTINGS
        };

        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(settingsPath),
            Buffer.from(JSON.stringify(updatedSettings, null, 2), "utf8")
        );

        await this.context.globalState.update("mainWorkspacePath", folder[0].fsPath);
        vscode.commands.executeCommand("setContext", "assignment-manager:hasWorkspace", true);
        
        const workspaceFolder = folder[0];
        await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(workspaceFolder.fsPath));
    }

    async getCourses(): Promise<ICourse[]> {
        try {
            return await API.getCourses();
        } catch (error) {
            throw new Error("Failed to fetch courses");
        }
    }

    async getCourseAssignments(courseId: string): Promise<IAssignment[]> {
        try {
            return await API.getCourseAssignments(courseId);
        } catch (error) {
            throw new Error("Failed to fetch course assignments");
        }
    }

    async getAssignmentFiles(assignmentId: string): Promise<Record<string, string>> {
        try {
            const response = await API.getAssignmentFiles(assignmentId);
            return response.files;
        } catch (error) {
            throw new Error("Failed to fetch assignment files");
        }
    }

    async saveAssignmentFiles(assignmentId: string, files: Record<string, string>): Promise<void> {
        try {
            await API.saveAssignmentFiles(assignmentId, files);
        } catch (error) {
            throw new Error("Failed to save assignment files");
        }
    }

    async submitAssignment(assignmentId: string): Promise<void> {
        try {
            await API.submitAssignment(assignmentId);
        } catch (error) {
            throw new Error("Failed to submit assignment");
        }
    }

    async openAssignment(courseId: string, assignmentId: string): Promise<void> {
        const workspacePath = await this.context.globalState.get<string>("mainWorkspacePath");
        if (!workspacePath) {
            throw new Error("Workspace not set up");
        }

        const assignmentPath = path.join(workspacePath, courseId, assignmentId);
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(assignmentPath));

        const vscodePath = path.join(assignmentPath, ".vscode");
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(vscodePath));

        const settings = {
            "editor.formatOnSave": true,
            "editor.tabSize": 2,
            "files.autoSave": "afterDelay",
            "files.autoSaveDelay": 1000,
            "editor.defaultFormatter": "esbenp.prettier-vscode",
            "javascript.updateImportsOnFileMove.enabled": "always",
            "typescript.updateImportsOnFileMove.enabled": "always"
        };

        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(path.join(vscodePath, "settings.json")),
            Buffer.from(JSON.stringify(settings, null, 2), "utf8")
        );

        const { files, config } = await API.getAssignmentFiles(assignmentId);

        for (const [filePath, content] of Object.entries(files)) {
            const fullPath = path.join(assignmentPath, filePath);
            const dirPath = path.dirname(fullPath);
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
            await vscode.workspace.fs.writeFile(vscode.Uri.file(fullPath), Buffer.from(content, "utf8"));
        }

        await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(assignmentPath), { forceNewWindow: true });
        await API.setWorkspaceConnected(assignmentId, true);

        if (config) {
            if (config.defaultOpenFiles) {
                for (const file of config.defaultOpenFiles) {
                    try {
                        const filePath = path.join(assignmentPath, file);
                        const doc = await vscode.workspace.openTextDocument(filePath);
                        await vscode.window.showTextDocument(doc, { preview: false });
                    } catch (error) {
                        console.error(`Failed to open file: ${file}`, error);
                    }
                }
            }

            if (config.terminals) {
                for (const command of config.terminals) {
                    const terminal = vscode.window.createTerminal();
                    terminal.show();
                    terminal.sendText(command);
                }
            }
        }
    }

    async resetCode(assignmentId: string): Promise<void> {
        const workspacePath = await this.context.globalState.get<string>("mainWorkspacePath");
        if (!workspacePath) {
            throw new Error("Workspace not set up");
        }

        const { files } = await API.getAssignmentFiles(assignmentId);
        await this.saveAssignmentFiles(assignmentId, files);
    }

    async syncCode(assignmentId: string): Promise<void> {
        const workspacePath = await this.context.globalState.get<string>("mainWorkspacePath");
        if (!workspacePath) {
            throw new Error("Workspace not set up");
        }

        const courses = await this.getCourses();
        const course = courses.find(c => 
            c.assignments.some(a => a.id === assignmentId)
        );
        
        if (!course) {
            throw new Error("Assignment not found");
        }

        const assignmentPath = path.join(workspacePath, course.id, assignmentId);
        
        const files: Record<string, string> = {};
        const { files: originalFiles } = await API.getAssignmentFiles(assignmentId);
        
        for (const [filePath, content] of Object.entries(originalFiles)) {
            const fullPath = path.join(assignmentPath, filePath);
            try {
                const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(fullPath));
                files[filePath] = Buffer.from(fileContent).toString("utf8");
            } catch (error) {
                files[filePath] = content;
            }
        }

        await this.saveAssignmentFiles(assignmentId, files);
    }

    async getMainWorkspacePath(): Promise<string> {
        const workspacePath = await this.context.globalState.get<string>("mainWorkspacePath");
        if (!workspacePath) {
            throw new Error("Workspace not set up");
        }
        return workspacePath;
    }

    async saveCode(assignmentId: string, filePath: string, content: string): Promise<void> {
        try {
            const { files } = await API.getAssignmentFiles(assignmentId);
            files[filePath] = content;
            await this.saveAssignmentFiles(assignmentId, files);
            
            const workspacePath = await this.context.globalState.get<string>("mainWorkspacePath");
            if (workspacePath) {
                const courses = await this.getCourses();
                const course = courses.find(c => 
                    c.assignments.some(a => a.id === assignmentId)
                );
                
                if (course) {
                    const fullPath = path.join(workspacePath, course.id, assignmentId, filePath);
                    await vscode.workspace.fs.writeFile(
                        vscode.Uri.file(fullPath),
                        Buffer.from(content, "utf8")
                    );
                }
            }
        } catch (error) {
            throw new Error("Failed to save code");
        }
    }
}