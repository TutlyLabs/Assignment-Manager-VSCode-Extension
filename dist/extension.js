/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
const vscode = __importStar(__webpack_require__(1));
const assignmentProvider_1 = __webpack_require__(2);
const authService_1 = __webpack_require__(3);
const assignmentService_1 = __webpack_require__(6);
const path = __importStar(__webpack_require__(7));
function activate(context) {
    const authService = new authService_1.AuthService(context);
    const assignmentService = new assignmentService_1.AssignmentService(context);
    const assignmentProvider = new assignmentProvider_1.AssignmentProvider(assignmentService);
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
            }
            catch (error) {
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
        }
        catch (error) {
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
        }
        catch (error) {
            vscode.window.showErrorMessage('Failed to save code');
        }
    });
    // Open file command
    let openFileCommand = vscode.commands.registerCommand("assignment-manager.openFile", async (assignmentId, filePath) => {
        try {
            const files = await assignmentService.getAssignmentFiles(assignmentId);
            const fileContent = files[filePath];
            const document = await vscode.workspace.openTextDocument({
                content: fileContent,
                language: getLanguageFromPath(filePath)
            });
            await vscode.window.showTextDocument(document);
        }
        catch (error) {
            vscode.window.showErrorMessage("Failed to open file");
        }
    });
    // Submit assignment command
    let submitAssignmentCommand = vscode.commands.registerCommand("assignment-manager.submitAssignment", async (item) => {
        try {
            const response = await vscode.window.showWarningMessage("Are you sure you want to submit this assignment?", { modal: true }, "Yes, Submit", "Cancel");
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
        }
        catch (error) {
            vscode.window.showErrorMessage("Failed to submit assignment. Please try again.");
        }
    });
    // Setup main workspace command
    let setupMainWorkspaceCommand = vscode.commands.registerCommand("assignment-manager.setupMainWorkspace", async () => {
        try {
            await assignmentService.setupMainWorkspace();
            vscode.window.showInformationMessage("Workspace setup successfully!");
            assignmentProvider.refresh();
        }
        catch (error) {
            const message = error.message || "Failed to setup workspace";
            vscode.window.showErrorMessage(message, "Try Again").then(selection => {
                if (selection === "Try Again") {
                    vscode.commands.executeCommand("assignment-manager.setupMainWorkspace");
                }
            });
        }
    });
    // Sync code command
    let syncCodeCommand = vscode.commands.registerCommand("assignment-manager.syncAssignment", async (item) => {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Syncing code...",
                cancellable: false
            }, async () => {
                await assignmentService.syncCode(item.id);
            });
            vscode.window.showInformationMessage("Code synced successfully!");
        }
        catch (error) {
            vscode.window.showErrorMessage("Failed to sync code. Please try again.");
        }
    });
    // Reset code command
    let resetCodeCommand = vscode.commands.registerCommand("assignment-manager.resetCode", async (item) => {
        const response = await vscode.window.showWarningMessage("This will reset all local changes. Are you sure?", "Yes", "No");
        if (response === "Yes") {
            try {
                await assignmentService.resetCode(item.id);
                vscode.window.showInformationMessage("Code reset successfully!");
                assignmentProvider.refresh();
            }
            catch (error) {
                vscode.window.showErrorMessage("Failed to reset code");
            }
        }
    });
    // Open assignment command
    let openAssignmentCommand = vscode.commands.registerCommand("assignment-manager.openAssignment", async (item) => {
        try {
            await assignmentService.openAssignment(item.courseId, item.id);
        }
        catch (error) {
            vscode.window.showErrorMessage("Failed to open assignment");
        }
    });
    // Update context after login
    context.subscriptions.push(vscode.commands.registerCommand("setContext", (key, value) => {
        return vscode.commands.executeCommand("setContext", key, value);
    }));
    // Set initial contexts
    vscode.commands.executeCommand("setContext", "assignment-manager:isLoggedIn", false);
    vscode.commands.executeCommand("setContext", "assignment-manager:hasWorkspace", false);
    // Check for existing session
    authService.isLoggedIn().then(async (isLoggedIn) => {
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
    context.subscriptions.push(loginCommand, logoutCommand, viewAssignmentsCommand, saveCodeCommand, openFileCommand, submitAssignmentCommand, setupMainWorkspaceCommand, syncCodeCommand, resetCodeCommand, statusBarItem);
}
function getLanguageFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap = {
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


/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AssignmentItem = exports.AssignmentProvider = void 0;
const vscode = __importStar(__webpack_require__(1));
class AssignmentProvider {
    constructor(assignmentService) {
        this.assignmentService = assignmentService;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.isLoggedIn = false;
    }
    setLoggedIn(status) {
        this.isLoggedIn = status;
        this.refresh();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!this.isLoggedIn) {
            return [
                new MessageItem("Please login to view assignments", "$(sign-in) Click here to login", {
                    command: "assignment-manager.login",
                    title: "Login"
                })
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
                    ...courses.map(course => new CourseItem(course.title, course.id))
                ];
            }
            if (element instanceof CourseItem) {
                const assignments = await this.assignmentService.getCourseAssignments(element.id);
                return assignments.map(assignment => new AssignmentItem(assignment.title, assignment.id, element.id, assignment.description));
            }
            return [];
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to load assignments: ${error}`);
            return [new MessageItem("Error loading assignments", "$(error) Try again")];
        }
    }
}
exports.AssignmentProvider = AssignmentProvider;
class TreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, command) {
        super(label, collapsibleState);
        if (command) {
            this.command = command;
        }
    }
}
class MessageItem extends TreeItem {
    constructor(message, description, command) {
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
    constructor(label, id) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.label = label;
        this.id = id;
        this.contextValue = "course";
        this.iconPath = new vscode.ThemeIcon("folder");
        this.description = "Click to view assignments";
        this.tooltip = new vscode.MarkdownString(`**${this.label}**\n\n_Click to view assignments_`);
    }
}
class AssignmentItem extends TreeItem {
    constructor(label, id, courseId, description) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.label = label;
        this.id = id;
        this.courseId = courseId;
        this.description = description;
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
exports.AssignmentItem = AssignmentItem;
class ProfileItem extends TreeItem {
    constructor(email, command) {
        super(`👤 ${email || "Unknown User"}`, vscode.TreeItemCollapsibleState.None);
        this.contextValue = "profile";
        this.tooltip = new vscode.MarkdownString(`Logged in as **${email}**\n\n_Click to logout_`);
        this.description = "Click to logout";
        if (command) {
            this.command = command;
        }
    }
}


/***/ }),
/* 3 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthService = void 0;
const vscode = __importStar(__webpack_require__(1));
const api_1 = __webpack_require__(4);
class AuthService {
    constructor(context) {
        this.token = null;
        this.userEmail = null;
        this.extensionContext = context;
        this.initializeSession();
    }
    async initializeSession() {
        this.token = await this.retrieveToken();
        if (this.token) {
            const email = await this.extensionContext.globalState.get("user-email");
            this.userEmail = email || null;
            if (this.userEmail) {
                vscode.commands.executeCommand("setContext", "assignment-manager:isLoggedIn", true);
            }
        }
    }
    async login(email, password) {
        try {
            const { token } = await api_1.API.login(email, password);
            this.token = token;
            this.userEmail = email;
            await this.storeToken(token);
            await this.extensionContext.globalState.update("user-email", email);
            vscode.commands.executeCommand("setContext", "assignment-manager:isLoggedIn", true);
        }
        catch (error) {
            throw new Error(error.message || "Authentication failed");
        }
    }
    async getToken() {
        if (this.token) {
            return this.token;
        }
        return await this.retrieveToken();
    }
    async storeToken(token) {
        await this.extensionContext.secrets.store('auth-token', token);
    }
    async retrieveToken() {
        return await this.extensionContext.secrets.get('auth-token') || null;
    }
    async logout() {
        this.token = null;
        this.userEmail = null;
        await this.extensionContext.secrets.delete("auth-token");
        await this.extensionContext.globalState.update("user-email", undefined);
        vscode.commands.executeCommand("setContext", "assignment-manager:isLoggedIn", false);
        vscode.commands.executeCommand("setContext", "assignment-manager:hasWorkspace", false);
    }
    async getUserEmail() {
        return this.userEmail;
    }
    async isLoggedIn() {
        return !!(await this.getToken());
    }
}
exports.AuthService = AuthService;


/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.API = void 0;
const mockData_1 = __webpack_require__(5);
class API {
    static async login(email, password) {
        const user = mockData_1.DB.users.find(u => u.email === email && u.password === password);
        if (!user) {
            throw new Error("Invalid credentials");
        }
        this.currentUser = user.id;
        return { token: "mock-token" };
    }
    static async getCourses() {
        if (!this.currentUser) {
            throw new Error("Not authenticated");
        }
        const user = mockData_1.DB.users.find(u => u.id === this.currentUser);
        if (!user) {
            throw new Error("User not found");
        }
        return mockData_1.DB.courses.filter(course => user.enrolledCourses.includes(course.id));
    }
    static async getCourseAssignments(courseId) {
        if (!this.currentUser) {
            throw new Error("Not authenticated");
        }
        const course = mockData_1.DB.courses.find(c => c.id === courseId);
        if (!course) {
            throw new Error("Course not found");
        }
        return course.assignments;
    }
    static async getAssignmentFiles(assignmentId) {
        if (!this.currentUser) {
            throw new Error("Not authenticated");
        }
        const assignment = mockData_1.DB.courses
            .flatMap(c => c.assignments)
            .find(a => a.id === assignmentId);
        if (!assignment) {
            throw new Error("Assignment not found");
        }
        let config = null;
        if (assignment.defaultFiles[".tlyrc"]) {
            try {
                config = JSON.parse(assignment.defaultFiles[".tlyrc"]);
            }
            catch (error) {
                console.error("Failed to parse .tlyrc:", error);
            }
        }
        return {
            files: assignment.defaultFiles,
            config
        };
    }
    static async saveAssignmentFiles(assignmentId, files) {
        if (!this.currentUser) {
            throw new Error("Not authenticated");
        }
        const user = mockData_1.DB.users.find(u => u.id === this.currentUser);
        if (!user) {
            throw new Error("User not found");
        }
        const course = mockData_1.DB.courses.find(c => c.assignments.some(a => a.id === assignmentId));
        if (!course) {
            throw new Error("Assignment not found");
        }
        // Initialize course assignments if not exists
        if (!user.courseAssignments[course.id]) {
            user.courseAssignments[course.id] = {};
        }
        // Save files to user's assignments
        if (!user.courseAssignments[course.id][assignmentId]) {
            user.courseAssignments[course.id][assignmentId] = {
                files: files,
                submitted: false,
                submittedAt: null,
                workspaceConnected: false
            };
        }
        else {
            user.courseAssignments[course.id][assignmentId].files = files;
        }
    }
    static async submitAssignment(assignmentId) {
        if (!this.currentUser) {
            throw new Error("Not authenticated");
        }
        const user = mockData_1.DB.users.find(u => u.id === this.currentUser);
        if (!user) {
            throw new Error("User not found");
        }
        const course = mockData_1.DB.courses.find(c => c.assignments.some(a => a.id === assignmentId));
        if (!course || !user.courseAssignments[course.id]?.[assignmentId]) {
            throw new Error("Assignment not found");
        }
        user.courseAssignments[course.id][assignmentId].submitted = true;
        user.courseAssignments[course.id][assignmentId].submittedAt = new Date().toISOString();
    }
    static async setWorkspaceConnected(assignmentId, connected) {
        if (!this.currentUser) {
            throw new Error("Not authenticated");
        }
        const user = mockData_1.DB.users.find(u => u.id === this.currentUser);
        if (!user) {
            throw new Error("User not found");
        }
        const course = mockData_1.DB.courses.find(c => c.assignments.some(a => a.id === assignmentId));
        if (!course) {
            throw new Error("Assignment not found");
        }
        if (!user.courseAssignments[course.id]) {
            user.courseAssignments[course.id] = {};
        }
        if (!user.courseAssignments[course.id][assignmentId]) {
            user.courseAssignments[course.id][assignmentId] = {
                files: {},
                submitted: false,
                submittedAt: null,
                workspaceConnected: connected
            };
        }
        else {
            user.courseAssignments[course.id][assignmentId].workspaceConnected = connected;
        }
    }
    static async isWorkspaceConnected(assignmentId) {
        if (!this.currentUser) {
            return false;
        }
        const user = mockData_1.DB.users.find(u => u.id === this.currentUser);
        if (!user) {
            return false;
        }
        const course = mockData_1.DB.courses.find(c => c.assignments.some(a => a.id === assignmentId));
        if (!course || !user.courseAssignments[course.id]?.[assignmentId]) {
            return false;
        }
        return !!user.courseAssignments[course.id][assignmentId].workspaceConnected;
    }
}
exports.API = API;
API.currentUser = null;


/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DB = void 0;
exports.DB = {
    users: [
        {
            id: "user1",
            email: "test@example.com",
            password: "password123",
            enrolledCourses: ["course1", "course2"],
            courseAssignments: {}
        },
        {
            id: "user2",
            email: "student@example.com",
            password: "student123",
            enrolledCourses: ["course3", "course4"],
            courseAssignments: {}
        },
        {
            id: "user3",
            email: "dev@example.com",
            password: "dev123",
            enrolledCourses: ["course1", "course2", "course4"],
            courseAssignments: {}
        }
    ],
    courses: [
        {
            id: "course1",
            title: "React Fundamentals",
            assignments: [
                {
                    id: "assignment1",
                    title: "Todo App",
                    description: "Create a Todo application using React",
                    defaultFiles: {
                        ".tlyrc": JSON.stringify({
                            terminals: ["npm install", "npm start"],
                            defaultOpenFiles: ["/App.js", "/components/TodoList.js"]
                        }),
                        "App.js": "import React from 'react';\n\nfunction App() {\n  return (\n    <div>Todo App</div>\n  );\n}\n\nexport default App;",
                        "components/TodoList.js": "import React from 'react';\n\nfunction TodoList() {\n  return (\n    <div>Todo List Component</div>\n  );\n}"
                    }
                }
            ]
        },
        {
            id: "course2",
            title: "Backend Development",
            assignments: [
                {
                    id: "assignment2",
                    title: "REST API",
                    description: "Build a RESTful API using Express.js",
                    defaultFiles: {
                        ".tlyrc": JSON.stringify({
                            terminals: ["npm install", "npm run dev", "curl http://localhost:3000"],
                            defaultOpenFiles: ["/server.js", "/routes/users.js"]
                        }),
                        "server.js": "const express = require('express');\nconst app = express();",
                        "routes/users.js": "const router = express.Router();\n\nrouter.get('/', (req, res) => {\n  res.json([]);\n});"
                    }
                }
            ]
        }
    ]
};


/***/ }),
/* 6 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AssignmentService = void 0;
const vscode = __importStar(__webpack_require__(1));
const path = __importStar(__webpack_require__(7));
const api_1 = __webpack_require__(4);
const authService_1 = __webpack_require__(3);
const DEFAULT_SETTINGS = {
    "editor.formatOnSave": true,
    "editor.tabSize": 2,
    "files.autoSave": "afterDelay",
    "files.autoSaveDelay": 1000
};
class AssignmentService {
    constructor(context) {
        this.authService = new authService_1.AuthService(context);
        this.context = context;
    }
    async getUserEmail() {
        return this.authService.getUserEmail();
    }
    async hasWorkspace() {
        const workspacePath = await this.context.globalState.get("mainWorkspacePath");
        return !!workspacePath;
    }
    async setupMainWorkspace() {
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
        await vscode.workspace.fs.writeFile(vscode.Uri.file(settingsPath), Buffer.from(JSON.stringify(updatedSettings, null, 2), "utf8"));
        await this.context.globalState.update("mainWorkspacePath", folder[0].fsPath);
        vscode.commands.executeCommand("setContext", "assignment-manager:hasWorkspace", true);
        const workspaceFolder = folder[0];
        await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(workspaceFolder.fsPath));
    }
    async getCourses() {
        try {
            return await api_1.API.getCourses();
        }
        catch (error) {
            throw new Error("Failed to fetch courses");
        }
    }
    async getCourseAssignments(courseId) {
        try {
            return await api_1.API.getCourseAssignments(courseId);
        }
        catch (error) {
            throw new Error("Failed to fetch course assignments");
        }
    }
    async getAssignmentFiles(assignmentId) {
        try {
            const response = await api_1.API.getAssignmentFiles(assignmentId);
            return response.files;
        }
        catch (error) {
            throw new Error("Failed to fetch assignment files");
        }
    }
    async saveAssignmentFiles(assignmentId, files) {
        try {
            await api_1.API.saveAssignmentFiles(assignmentId, files);
        }
        catch (error) {
            throw new Error("Failed to save assignment files");
        }
    }
    async submitAssignment(assignmentId) {
        try {
            await api_1.API.submitAssignment(assignmentId);
        }
        catch (error) {
            throw new Error("Failed to submit assignment");
        }
    }
    async openAssignment(courseId, assignmentId) {
        const workspacePath = await this.context.globalState.get("mainWorkspacePath");
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
        await vscode.workspace.fs.writeFile(vscode.Uri.file(path.join(vscodePath, "settings.json")), Buffer.from(JSON.stringify(settings, null, 2), "utf8"));
        const { files, config } = await api_1.API.getAssignmentFiles(assignmentId);
        for (const [filePath, content] of Object.entries(files)) {
            const fullPath = path.join(assignmentPath, filePath);
            const dirPath = path.dirname(fullPath);
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
            await vscode.workspace.fs.writeFile(vscode.Uri.file(fullPath), Buffer.from(content, "utf8"));
        }
        await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(assignmentPath), { forceNewWindow: true });
        await api_1.API.setWorkspaceConnected(assignmentId, true);
        if (config) {
            if (config.defaultOpenFiles) {
                for (const file of config.defaultOpenFiles) {
                    try {
                        const filePath = path.join(assignmentPath, file);
                        const doc = await vscode.workspace.openTextDocument(filePath);
                        await vscode.window.showTextDocument(doc, { preview: false });
                    }
                    catch (error) {
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
    async resetCode(assignmentId) {
        const workspacePath = await this.context.globalState.get("mainWorkspacePath");
        if (!workspacePath) {
            throw new Error("Workspace not set up");
        }
        const { files } = await api_1.API.getAssignmentFiles(assignmentId);
        await this.saveAssignmentFiles(assignmentId, files);
    }
    async syncCode(assignmentId) {
        const workspacePath = await this.context.globalState.get("mainWorkspacePath");
        if (!workspacePath) {
            throw new Error("Workspace not set up");
        }
        const courses = await this.getCourses();
        const course = courses.find(c => c.assignments.some(a => a.id === assignmentId));
        if (!course) {
            throw new Error("Assignment not found");
        }
        const assignmentPath = path.join(workspacePath, course.id, assignmentId);
        const files = {};
        const { files: originalFiles } = await api_1.API.getAssignmentFiles(assignmentId);
        for (const [filePath, content] of Object.entries(originalFiles)) {
            const fullPath = path.join(assignmentPath, filePath);
            try {
                const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(fullPath));
                files[filePath] = Buffer.from(fileContent).toString("utf8");
            }
            catch (error) {
                files[filePath] = content;
            }
        }
        await this.saveAssignmentFiles(assignmentId, files);
    }
    async getMainWorkspacePath() {
        const workspacePath = await this.context.globalState.get("mainWorkspacePath");
        if (!workspacePath) {
            throw new Error("Workspace not set up");
        }
        return workspacePath;
    }
    async saveCode(assignmentId, filePath, content) {
        try {
            const { files } = await api_1.API.getAssignmentFiles(assignmentId);
            files[filePath] = content;
            await this.saveAssignmentFiles(assignmentId, files);
            const workspacePath = await this.context.globalState.get("mainWorkspacePath");
            if (workspacePath) {
                const courses = await this.getCourses();
                const course = courses.find(c => c.assignments.some(a => a.id === assignmentId));
                if (course) {
                    const fullPath = path.join(workspacePath, course.id, assignmentId, filePath);
                    await vscode.workspace.fs.writeFile(vscode.Uri.file(fullPath), Buffer.from(content, "utf8"));
                }
            }
        }
        catch (error) {
            throw new Error("Failed to save code");
        }
    }
}
exports.AssignmentService = AssignmentService;


/***/ }),
/* 7 */
/***/ ((module) => {

module.exports = require("path");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map