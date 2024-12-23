import { DB } from "../mockData";
import { ICourse, IAssignment } from "../types";

export class API {
    private static currentUser: string | null = null;

    static async login(email: string, password: string): Promise<{ token: string }> {
        const user = DB.users.find(u => u.email === email && u.password === password);
        if (!user) {
            throw new Error("Invalid credentials");
        }
        this.currentUser = user.id;
        return { token: "mock-token" };
    }

    static async getCourses(): Promise<ICourse[]> {
        if (!this.currentUser) {
            throw new Error("Not authenticated");
        }
        const user = DB.users.find(u => u.id === this.currentUser);
        if (!user) {
            throw new Error("User not found");
        }
        return DB.courses.filter(course => user.enrolledCourses.includes(course.id));
    }

    static async getCourseAssignments(courseId: string): Promise<IAssignment[]> {
        if (!this.currentUser) {
            throw new Error("Not authenticated");
        }
        const course = DB.courses.find(c => c.id === courseId);
        if (!course) {
            throw new Error("Course not found");
        }
        return course.assignments;
    }

    static async getAssignmentFiles(assignmentId: string): Promise<{ files: Record<string, string>, config?: any }> {
        if (!this.currentUser) {
            throw new Error("Not authenticated");
        }
        
        const assignment = DB.courses
            .flatMap(c => c.assignments)
            .find(a => a.id === assignmentId);

        if (!assignment) {
            throw new Error("Assignment not found");
        }

        let config = null;
        if (assignment.defaultFiles[".tlyrc"]) {
            try {
                config = JSON.parse(assignment.defaultFiles[".tlyrc"]);
            } catch (error) {
                console.error("Failed to parse .tlyrc:", error);
            }
        }

        return {
            files: assignment.defaultFiles,
            config
        };
    }

    static async saveAssignmentFiles(assignmentId: string, files: Record<string, string>): Promise<void> {
        if (!this.currentUser) {
            throw new Error("Not authenticated");
        }

        const user = DB.users.find(u => u.id === this.currentUser);
        if (!user) {
            throw new Error("User not found");
        }

        const course = DB.courses.find(c => c.assignments.some(a => a.id === assignmentId));
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
        } else {
            user.courseAssignments[course.id][assignmentId].files = files;
        }
    }

    static async submitAssignment(assignmentId: string): Promise<void> {
        if (!this.currentUser) {
            throw new Error("Not authenticated");
        }

        const user = DB.users.find(u => u.id === this.currentUser);
        if (!user) {
            throw new Error("User not found");
        }

        const course = DB.courses.find(c => c.assignments.some(a => a.id === assignmentId));
        if (!course || !user.courseAssignments[course.id]?.[assignmentId]) {
            throw new Error("Assignment not found");
        }

        user.courseAssignments[course.id][assignmentId].submitted = true;
        user.courseAssignments[course.id][assignmentId].submittedAt = new Date().toISOString();
    }

    static async setWorkspaceConnected(assignmentId: string, connected: boolean): Promise<void> {
        if (!this.currentUser) {
            throw new Error("Not authenticated");
        }

        const user = DB.users.find(u => u.id === this.currentUser);
        if (!user) {
            throw new Error("User not found");
        }

        const course = DB.courses.find(c => c.assignments.some(a => a.id === assignmentId));
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
        } else {
            user.courseAssignments[course.id][assignmentId].workspaceConnected = connected;
        }
    }

    static async isWorkspaceConnected(assignmentId: string): Promise<boolean> {
        if (!this.currentUser) {
            return false;
        }

        const user = DB.users.find(u => u.id === this.currentUser);
        if (!user) {
            return false;
        }

        const course = DB.courses.find(c => c.assignments.some(a => a.id === assignmentId));
        if (!course || !user.courseAssignments[course.id]?.[assignmentId]) {
            return false;
        }

        return !!user.courseAssignments[course.id][assignmentId].workspaceConnected;
    }
} 