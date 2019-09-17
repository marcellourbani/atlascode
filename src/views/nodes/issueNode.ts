import * as vscode from "vscode";
import { AbstractBaseNode } from "./abstractBaseNode";
import { Commands } from "../../commands";
import { isMinimalIssue, MinimalORIssueLink } from "../../jira/jira-client/model/entities";

const IssueNodeContextValue = 'jiraIssue';

export class IssueNode extends AbstractBaseNode {
    public issue: MinimalORIssueLink;

    constructor(_issue: MinimalORIssueLink) {
        super();
        this.issue = _issue;
    }

    getTreeItem(): vscode.TreeItem {
        let title = (isMinimalIssue(this.issue) && this.issue.isEpic) ? this.issue.epicName : this.issue.summary;
        let treeItem = new vscode.TreeItem(`${this.issue.key} ${title}`, (isMinimalIssue(this.issue) && (this.issue.subtasks.length > 0 || this.issue.epicChildren.length > 0)) ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
        treeItem.command = { command: Commands.ShowIssue, title: "Show Issue", arguments: [this.issue], };
        treeItem.iconPath = vscode.Uri.parse(this.issue.issuetype.iconUrl);
        treeItem.contextValue = IssueNodeContextValue;
        treeItem.tooltip = `${this.issue.key} - ${this.issue.summary}`;
        treeItem.resourceUri = vscode.Uri.parse(`${this.issue.siteDetails.baseLinkUrl}/browse/${this.issue.key}`);
        return treeItem;
    }

    async getChildren(element?: IssueNode): Promise<IssueNode[]> {
        if (element) {
            return element.getChildren();
        }
        if (isMinimalIssue(this.issue) && this.issue.subtasks.length > 0) {
            return this.issue.subtasks.map(subtask => new IssueNode(subtask));
        }

        if (isMinimalIssue(this.issue) && this.issue.epicChildren.length > 0) {
            return this.issue.epicChildren.map(epicChild => new IssueNode(epicChild));
        }
        return [];
    }
}