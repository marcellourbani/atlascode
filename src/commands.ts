import * as vscode from 'vscode';
import { fetchPullRequestsCommand } from './commands/bitbucket/fetchPullRequests';
import { authenticateBitbucket } from './commands/authenticate';
import { authenticateJira } from './commands/authenticate';
import { BitbucketContext } from './bitbucket/context';
import { PullRequestNodeDataProvider } from './views/pullRequestNodeDataProvider';
import { BaseNode } from './views/nodes/baseNode';

enum Commands {
    BitbucketFetchPullRequests = 'atlascode.bb.fetchPullRequests',
    BitbucketRefreshPullRequests = 'atlascode.bb.refreshPullRequests',
    AuthenticateBitbucket = 'atlascode.bb.authenticate',
    AuthenticateJira = 'atlascode.jira.authenticate'
}

export function registerCommands(vscodeContext: vscode.ExtensionContext, bbContext: BitbucketContext) {
    let prNodeDataProvider = new PullRequestNodeDataProvider(bbContext);
    vscodeContext.subscriptions.push(vscode.window.registerTreeDataProvider<BaseNode>('atlascode.views.bb.pullrequestsTreeView', prNodeDataProvider));

    vscodeContext.subscriptions.push(
        vscode.commands.registerCommand(Commands.BitbucketFetchPullRequests, fetchPullRequestsCommand, bbContext),
        vscode.commands.registerCommand(Commands.BitbucketRefreshPullRequests, prNodeDataProvider.refresh, prNodeDataProvider),
        vscode.commands.registerCommand(Commands.AuthenticateBitbucket, authenticateBitbucket),
        vscode.commands.registerCommand(Commands.AuthenticateJira, authenticateJira)
    );
}
