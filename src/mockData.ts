import { IUser, ICourse } from "./types";

interface IDB {
    users: IUser[];
    courses: ICourse[];
}

export const DB: IDB = {
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