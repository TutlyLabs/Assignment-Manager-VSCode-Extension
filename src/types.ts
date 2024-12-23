export interface IUser {
    id: string;
    email: string;
    password: string;
    enrolledCourses: string[];
    courseAssignments: {
        [courseId: string]: {
            [assignmentId: string]: {
                files: Record<string, string>;
                submitted: boolean;
                submittedAt: string | null;
                workspaceConnected: boolean;
            };
        };
    };
}

export interface IAssignment {
    id: string;
    title: string;
    description: string;
    defaultFiles: Record<string, string>;
}

export interface ICourse {
    id: string;
    title: string;
    assignments: IAssignment[];
} 