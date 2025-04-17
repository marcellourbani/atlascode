import { isMinimalIssue, MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { Command, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';

import { DetailedSiteInfo, ProductJira } from '../../../atlclients/authInfo';
import { Commands } from '../../../commands';
import { JQLEntry } from '../../../config/model';
import { Container } from '../../../container';
import { issuesForJQL } from '../../../jira/issuesForJql';
import { Logger } from '../../../logger';
import { AbstractBaseNode } from '../../../views/nodes/abstractBaseNode';

export function createLabelItem(label: string, command?: Command): TreeItem {
    const item = new TreeItem(label);
    item.command = command;
    return item;
}

export interface TreeViewIssue extends MinimalIssue<DetailedSiteInfo> {
    jqlSource: JQLEntry;
    children: TreeViewIssue[];
}

/** This function returns a Promise that never rejects. */
export async function executeJqlQuery(jqlEntry: JQLEntry): Promise<TreeViewIssue[]> {
    try {
        if (jqlEntry) {
            const jqlSite = Container.siteManager.getSiteForId(ProductJira, jqlEntry.siteId);
            if (jqlSite) {
                const issues = (await issuesForJQL(jqlEntry.query, jqlSite)) as TreeViewIssue[];

                issues.forEach((i) => {
                    i.jqlSource = jqlEntry;
                    i.children = [];
                });

                return issues;
            }
        }
    } catch (e) {
        Logger.error(new Error(`Failed to execute default JQL query for site "${jqlEntry.siteId}": ${e}`));
    }

    return [];
}

export const loginToJiraMessageNode = createLabelItem('Please login to Jira', {
    command: Commands.ShowConfigPage,
    title: 'Login to Jira',
    arguments: [ProductJira],
});

export class JiraIssueNode extends TreeItem implements AbstractBaseNode {
    private children: JiraIssueNode[];

    constructor(
        nodeType: JiraIssueNode.NodeType,
        public issue: TreeViewIssue,
    ) {
        const collapsibleState = issue.children.length
            ? TreeItemCollapsibleState.Expanded
            : TreeItemCollapsibleState.None;
        super(issue.key, collapsibleState);

        // this id is constructed to ensure unique values for the same jira issue across multiple jql queries.
        // therefore, multiple jql entries must have a unique id for the same site.
        this.id = `${issue.key}_${issue.siteDetails.id}_${issue.jqlSource.id}`;

        this.description = isMinimalIssue(issue) && issue.isEpic ? issue.epicName : issue.summary;
        this.command = { command: Commands.ShowIssue, title: 'Show Issue', arguments: [issue] };
        this.iconPath = Uri.parse(issue.issuetype.iconUrl);
        this.contextValue = this.getIssueContextValue(nodeType, issue);
        this.tooltip = `${issue.key} - ${issue.summary}\n\n${issue.priority.name}    |    ${issue.status.name}`;
        this.resourceUri = Uri.parse(`${issue.siteDetails.baseLinkUrl}/browse/${issue.key}`);

        this.children = issue.children.map((x) => new JiraIssueNode(nodeType, x));
    }

    private getIssueContextValue(nodeType: JiraIssueNode.NodeType, issue: MinimalIssue<DetailedSiteInfo>): string {
        const TO_DO_ISSUE_POSTFIX = '_todo';
        const IN_PROGRESS_ISSUE_POSTFIX = '_inProgress';
        const DONE_ISSUE_POSTFIX = '_done';

        const statusCategory = issue.status.statusCategory.name;
        switch (statusCategory.toLowerCase()) {
            case 'to do':
                return nodeType + TO_DO_ISSUE_POSTFIX;
            case 'in progress':
                return nodeType + IN_PROGRESS_ISSUE_POSTFIX;
            case 'done':
                return nodeType + DONE_ISSUE_POSTFIX;
            default:
                return nodeType;
        }
    }

    getTreeItem(): Promise<TreeItem> | TreeItem {
        return this;
    }

    getChildren(): Promise<JiraIssueNode[]> {
        return Promise.resolve(this.children);
    }

    dispose(): void {}
}

export namespace JiraIssueNode {
    export enum NodeType {
        JiraAssignedIssuesNode = 'assignedJiraIssue',
        CustomJqlQueriesNode = 'jiraIssue',
        RelatedJiraIssueInBitbucketPR = 'relatedJiraIssueBB',
    }
}
