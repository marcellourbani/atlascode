import * as vscode from 'vscode';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';
import { PullRequest, PaginatedComments } from '../bitbucket/model';
import { PullRequestApi } from '../bitbucket/pullRequests';
import { getCurrentUser } from '../bitbucket/user';
import { PRData, CheckoutResult } from '../ipc/prMessaging';
import { Action } from '../ipc/messaging';
import { Logger } from '../logger';
import { Repository, Remote } from "../typings/git";
import { isPostComment, isCheckout } from '../ipc/prActions';
import { isOpenJiraIssue } from '../ipc/issueActions';
import * as gup from 'git-url-parse';
import { fetchIssue } from '../jira/fetchIssue';
import { Commands } from '../commands';
import { Issue } from '../jira/jiraModel';
import { extractIssueKeys } from '../bitbucket/issueKeysExtractor';
import { prCheckoutEvent, prApproveEvent, prMergeEvent } from '../analytics';
import { Container } from '../container';

interface PRState {
    prData: PRData;
    remote?: Remote;
    sourceRemote?: Remote;
    repository?: Repository;
}

const emptyState: PRState = { prData: { type: '', currentBranch: '', relatedJiraIssues: [] } };

export class PullRequestWebview extends AbstractReactWebview<PRData | CheckoutResult, Action> implements InitializingWebview<PullRequest> {
    private _state: PRState = emptyState;

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Pull Request";
    }
    public get id(): string {
        return "pullRequestDetailsScreen";
    }

    initialize(data: PullRequest) {
        this.updatePullRequest(data);
    }

    public invalidate() {
        if (this._state.repository && this._state.remote && this._state.prData.pr) {
            this.forceUpdatePullRequest();
        }
    }

    private validatePRState(s: PRState): boolean {
        return !!s.repository
            && !!s.remote
            && !!s.prData.pr
            && !!s.prData.currentUser
            && !!s.prData.commits
            && !!s.prData.comments;
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);

        if (!handled) {
            switch (e.action) {
                case 'approve': {
                    handled = true;
                    this.approve().catch((e: any) => {
                        Logger.error(new Error(`error approving pull request: ${e}`));
                        vscode.window.showErrorMessage('Pull reqeust could not be approved');
                    });
                    break;
                }
                case 'merge': {
                    handled = true;
                    this.merge().catch((e: any) => {
                        Logger.error(new Error(`error merging pull request: ${e}`));
                        vscode.window.showErrorMessage('Pull reqeust could not be merged');
                    });
                    break;
                }
                case 'comment': {
                    if (isPostComment(e)) {
                        handled = true;
                        this.postComment(e.content, e.parentCommentId).catch((e: any) => {
                            Logger.error(new Error(`error posting comment on the pull request: ${e}`));
                            vscode.window.showErrorMessage('Pull reqeust comment could not be posted');
                        });
                    }
                    break;
                }
                case 'checkout': {
                    if (isCheckout(e)) {
                        handled = true;
                        this.checkout(e.branch, e.isSourceBranch).catch((e: any) => {
                            Logger.error(new Error(`error checking out the branch: ${e}`));
                            vscode.window.showErrorMessage('Branch could not be checked out');
                        });
                    }
                    break;
                }
                case 'refreshPR': {
                    handled = true;
                    this.forceUpdatePullRequest();
                    break;
                }
                case 'openJiraIssue': {
                    if (isOpenJiraIssue(e)) {
                        handled = true;
                        vscode.commands.executeCommand(Commands.ShowIssue, e.issue);
                        break;
                    }
                }
            }
        }

        return handled;
    }

    private async updatePullRequest(pr: PullRequest) {
        if (this._panel) { this._panel.title = `Pull Request #${pr.data.id}`; }

        if (this.validatePRState(this._state)) {
            this._state.prData.type = 'update';
            this._state.prData.currentBranch = pr.repository.state.HEAD!.name!;
            this.postMessage(this._state.prData);
            return;
        }

        await this.postInitialState(pr);
        await this.postAugmentedState(pr);
    }

    private async postInitialState(pr: PullRequest) {
        const isStagingRepo = pr.remote && pr.remote.fetchUrl!.indexOf('bb-inf.net') !== -1;
        const currentUser = this._state.prData.currentUser || await getCurrentUser(isStagingRepo);
        this._state = {
            repository: pr.repository,
            remote: pr.remote,
            sourceRemote: pr.sourceRemote || pr.remote,
            prData: {
                type: 'update',
                pr: pr.data,
                currentUser: currentUser,
                currentBranch: pr.repository.state.HEAD!.name!,
                commits: undefined,
                comments: undefined,
                relatedJiraIssues: undefined,
                errors: undefined
            }
        };

        this.postMessage(this._state.prData);
    }

    private async postAugmentedState(pr: PullRequest) {
        let promises = Promise.all([
            PullRequestApi.getCommits(pr),
            PullRequestApi.getComments(pr),
            PullRequestApi.getBuildStatuses(pr)
        ]);
        const [commits, comments, buildStatuses] = await promises;
        const issues = await this.fetchRelatedIssues(pr, comments);
        this._state.prData = {
            ...this._state.prData,
            ...{
                type: 'update',
                commits: commits.data,
                comments: comments.data,
                relatedJiraIssues: issues,
                buildStatuses: buildStatuses,
                errors: (commits.next || comments.next) ? 'You may not seeing the complete pull request. This PR contains more items (commits/comments) than what this extension supports.' : undefined
            }
        };

        this.postMessage(this._state.prData);
    }

    private async fetchRelatedIssues(pr: PullRequest, comments: PaginatedComments): Promise<Issue[]> {
        let result: Issue[] = [];
        try {
            const issueKeys = await extractIssueKeys(pr, comments.data);
            result = await Promise.all(issueKeys.map(async (issueKey) => await fetchIssue(issueKey)));
        }
        catch (e) {
            result = [];
            Logger.debug('error fetching related pull requests: ', e);
        }
        return result;
    }

    private async approve() {
        await PullRequestApi.approve({ repository: this._state.repository!, remote: this._state.remote!, sourceRemote: this._state.sourceRemote, data: this._state.prData.pr! });
        prApproveEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });
        await this.forceUpdatePullRequest();
    }

    private async merge() {
        await PullRequestApi.merge({ repository: this._state.repository!, remote: this._state.remote!, sourceRemote: this._state.sourceRemote, data: this._state.prData.pr! });
        prMergeEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });
        await this.forceUpdatePullRequest();
    }

    private async checkout(branch: string, isSourceBranch: boolean) {
        if (isSourceBranch && this._state.sourceRemote && this._state.sourceRemote !== this._state.remote) {
            // pull request is from a fork repository
            await this._state.repository!.getConfig(`remote.${this._state.sourceRemote!.name}.url`)
                .then(async url => {
                    if (!url) {
                        await this._state.repository!.addRemote(this._state.sourceRemote!.name, gup(this._state.sourceRemote!.fetchUrl!).toString("ssh"));
                    }
                })
                .catch(async _ => {
                    await this._state.repository!.addRemote(this._state.sourceRemote!.name, gup(this._state.sourceRemote!.fetchUrl!).toString("ssh"));
                });
        }
        await this._state.repository!.fetch(this._state.sourceRemote!.name, this._state.prData.pr!.source!.branch!.name);
        this._state.repository!.checkout(branch || this._state.prData.pr!.source!.branch!.name!)
            .then(() => {
                this.postMessage({
                    type: 'checkout',
                    currentBranch: this._state.repository!.state.HEAD!.name!
                });
                prCheckoutEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });
            })
            .catch((e: any) => {
                Logger.error(new Error(`error checking out the pull request branch: ${e}`));
                vscode.window.showErrorMessage('Pull request branch could not be checked out');
                this.postMessage({
                    type: 'checkout',
                    error: e.stderr || e,
                    currentBranch: this._state.repository!.state.HEAD!.name!
                });
            });
    }

    private async postComment(text: string, parentId?: number) {
        await PullRequestApi.postComment(this._state.remote!, this._state.prData.pr!.id!, text, parentId);
        await this.forceUpdateComments();
    }

    private async forceUpdatePullRequest() {
        const result = await PullRequestApi.get({ repository: this._state.repository!, remote: this._state.remote!, sourceRemote: this._state.sourceRemote, data: this._state.prData.pr! });
        this._state.prData.pr = result.data;
        this._state.prData.currentBranch = result.repository.state.HEAD!.name!;
        await this.updatePullRequest(result).catch(reason => {
            Logger.debug("update rejected", reason);
        });
    }

    private async forceUpdateComments() {
        const pr = { repository: this._state.repository!, remote: this._state.remote!, sourceRemote: this._state.sourceRemote, data: this._state.prData.pr! };
        const paginatedComments = await PullRequestApi.getComments(pr);
        this._state.prData.comments = paginatedComments.data;
        await this.updatePullRequest(pr);
    }
}
