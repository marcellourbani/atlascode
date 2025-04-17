import { Disposable, Uri, UriHandler, window } from 'vscode';

import { CheckoutHelper } from '../bitbucket/interfaces';
import { Container } from '../container';
import { AnalyticsApi } from '../lib/analyticsApi';
import { Logger } from '../logger';
import { CheckoutBranchUriHandlerAction } from './actions/checkoutBranch';
import { CloneRepositoryUriHandlerAction } from './actions/cloneRepository';
import { OpenPullRequestUriHandlerAction } from './actions/openPullRequest';
import { SimpleCallbackAction } from './actions/simpleCallback';
import { UriHandlerAction } from './uriHandlerAction';

export class AtlascodeUriHandler implements Disposable, UriHandler {
    private disposables: Disposable;

    constructor(private actions: Array<UriHandlerAction>) {
        this.disposables = window.registerUriHandler(this);
    }

    async handleUri(uri: Uri) {
        Logger.debug(`Handling URI (new router): ${uri.toString()}`);

        // TODO: keeping the exact logic of the original code for now,
        //       since changing this would need a lot of manual E2E testing.
        //       We could probably simplify this to a route map?
        const action = this.actions.find((h) => h.isAccepted(uri));
        if (!action) {
            Logger.debug(`Unsupported URI path: ${uri.path}`);
            window.showErrorMessage(`Handler not found for URI: ${uri.toString()}`);
            return;
        }

        try {
            await action.handle(uri);
        } catch (e) {
            Logger.debug('Error handling URI:', e);
            window.showErrorMessage(`Error handling URI: ${uri.toString()}. Check log for details`);
        }
    }

    dispose(): void {
        this.disposables.dispose();
    }

    static create(analyticsApi: AnalyticsApi, bitbucketHelper: CheckoutHelper) {
        return new AtlascodeUriHandler([
            new SimpleCallbackAction('auth', async (uri) => {
                const params = new URLSearchParams(uri.query);
                Container.loginManager.finishRemoteAuth(params.get('code')!);
            }),
            new SimpleCallbackAction('openSettings', () => Container.settingsWebviewFactory.createOrShow()),
            new SimpleCallbackAction('openOnboarding', () => Container.onboardingWebviewFactory.createOrShow()),
            new CheckoutBranchUriHandlerAction(bitbucketHelper, analyticsApi),
            new OpenPullRequestUriHandlerAction(analyticsApi, bitbucketHelper),
            new CloneRepositoryUriHandlerAction(bitbucketHelper, analyticsApi),
        ]);
    }
}
