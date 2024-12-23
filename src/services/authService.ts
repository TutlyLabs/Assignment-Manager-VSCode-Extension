import * as vscode from 'vscode';
import { API } from './api';

export class AuthService {
    private token: string | null = null;
    private userEmail: string | null = null;
    private extensionContext: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.extensionContext = context;
        this.initializeSession();
    }

    private async initializeSession() {
        this.token = await this.retrieveToken();
        if (this.token) {
            const email = await this.extensionContext.globalState.get<string>("user-email");
            this.userEmail = email || null;
            if (this.userEmail) {
                vscode.commands.executeCommand("setContext", "assignment-manager:isLoggedIn", true);
            }
        }
    }

    async login(email: string, password: string): Promise<void> {
        try {
            const { token } = await API.login(email, password);
            this.token = token;
            this.userEmail = email;
            await this.storeToken(token);
            await this.extensionContext.globalState.update("user-email", email);
            vscode.commands.executeCommand("setContext", "assignment-manager:isLoggedIn", true);
        } catch (error: any) {
            throw new Error(error.message || "Authentication failed");
        }
    }

    async getToken(): Promise<string | null> {
        if (this.token) {
            return this.token;
        }
        return await this.retrieveToken();
    }

    private async storeToken(token: string): Promise<void> {
        await this.extensionContext.secrets.store('auth-token', token);
    }

    private async retrieveToken(): Promise<string | null> {
        return await this.extensionContext.secrets.get('auth-token') || null;
    }

    async logout(): Promise<void> {
        this.token = null;
        this.userEmail = null;
        await this.extensionContext.secrets.delete("auth-token");
        await this.extensionContext.globalState.update("user-email", undefined);
        vscode.commands.executeCommand("setContext", "assignment-manager:isLoggedIn", false);
        vscode.commands.executeCommand("setContext", "assignment-manager:hasWorkspace", false);
    }

    async getUserEmail(): Promise<string | null> {
        return this.userEmail;
    }

    async isLoggedIn(): Promise<boolean> {
        return !!(await this.getToken());
    }
}