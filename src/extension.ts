import { pid } from 'process';
import * as semver from 'semver';
import { commands, env, ExtensionContext, extensions, languages, Memento, window } from 'vscode';

import { installedEvent, launchedEvent, upgradedEvent } from './analytics';
import { DetailedSiteInfo, ProductBitbucket, ProductJira } from './atlclients/authInfo';
import { startListening } from './atlclients/negotiate';
import { BitbucketContext } from './bitbucket/bbContext';
import { activate as activateCodebucket } from './codebucket/command/registerCommands';
import { CommandContext, setCommandContext } from './commandContext';
import { Commands, registerCommands } from './commands';
import { Configuration, configuration, IConfig } from './config/configuration';
import { GlobalStateVersionKey } from './constants';
import { Container } from './container';
import { registerAnalyticsClient, registerErrorReporting, unregisterErrorReporting } from './errorReporting';
import { JQLManager } from './jira/jqlManager';
import { provideCodeLenses } from './jira/todoObserver';
import { Logger } from './logger';
import { api } from './normalize';
import { PipelinesYamlCompletionProvider } from './pipelines/yaml/pipelinesYamlCompletionProvider';
import {
    activateYamlExtension,
    addPipelinesSchemaToYamlConfig,
    BB_PIPELINES_FILENAME,
} from './pipelines/yaml/pipelinesYamlHelper';
import { registerResources } from './resources';
import { GitExtension } from './typings/git';
import { FeatureFlagClient, Features } from './util/featureFlags';

const AnalyticDelay = 5000;

export async function activate(context: ExtensionContext) {
    const start = process.hrtime();

    registerErrorReporting();

    const atlascode = extensions.getExtension('atlassian.atlascode')!;
    const atlascodeVersion = atlascode.packageJSON.version;
    const previousVersion = context.globalState.get<string>(GlobalStateVersionKey);

    /***
     * This is a workaround for the fact that the window object is not available but the Statsig client is reliant on a window object being defined
     */
    global.window = { document: {} } as any;

    registerResources(context);

    Configuration.configure(context);
    Logger.configure(context);

    // Mark ourselves as the PID in charge of refreshing credentials and start listening for pings.
    context.globalState.update('rulingPid', pid);

    try {
        await Container.initialize(context, configuration.get<IConfig>(), atlascodeVersion);

        activateErrorReporting();
        registerCommands(context);
        activateCodebucket(context);

        setCommandContext(
            CommandContext.IsJiraAuthenticated,
            Container.siteManager.productHasAtLeastOneSite(ProductJira),
        );
        setCommandContext(
            CommandContext.IsBBAuthenticated,
            Container.siteManager.productHasAtLeastOneSite(ProductBitbucket),
        );

        await JQLManager.backFillOldDetailedSiteInfos();
    } catch (e) {
        Logger.error(e, 'Error initializing atlascode!');
    }

    startListening((site: DetailedSiteInfo) => {
        Container.clientManager.requestSite(site);
    });

    // new user for auth exp
    if (previousVersion === undefined) {
        showOnboardingPage();
    } else {
        showWelcomePage(atlascodeVersion, previousVersion);
    }

    const delay = Math.floor(Math.random() * Math.floor(AnalyticDelay));
    setTimeout(() => {
        sendAnalytics(atlascodeVersion, context.globalState);
    }, delay);

    const duration = process.hrtime(start);
    context.subscriptions.push(languages.registerCodeLensProvider({ scheme: 'file' }, { provideCodeLenses }));

    // Following are async functions called without await so that they are run
    // in the background and do not slow down the time taken for the extension
    // icon to appear in the activity bar
    activateBitbucketFeatures();
    activateYamlFeatures(context);

    Logger.info(
        `Atlassian for VS Code (v${atlascodeVersion}) activated in ${
            duration[0] * 1000 + Math.floor(duration[1] / 1000000)
        } ms`,
    );
    return api;
}

function activateErrorReporting(): void {
    if (FeatureFlagClient.checkGate(Features.EnableErrorTelemetry)) {
        registerAnalyticsClient(Container.analyticsClient);
    } else {
        unregisterErrorReporting();
    }
}

async function activateBitbucketFeatures() {
    let gitExt: GitExtension;
    try {
        const gitExtension = extensions.getExtension<GitExtension>('vscode.git');
        if (!gitExtension) {
            throw new Error('vscode.git extension not found');
        }
        gitExt = await gitExtension.activate();
    } catch (e) {
        Logger.error(e, 'Error activating vscode.git extension');
        window.showWarningMessage(
            'Activating Bitbucket features failed. There was an issue activating vscode.git extension.',
        );
        return;
    }

    try {
        const gitApi = gitExt.getAPI(1);
        const bbContext = new BitbucketContext(gitApi);
        Container.initializeBitbucket(bbContext);
    } catch (e) {
        Logger.error(e, 'Activating Bitbucket features failed');
        window.showWarningMessage('Activating Bitbucket features failed');
    }
}

async function activateYamlFeatures(context: ExtensionContext) {
    context.subscriptions.push(
        languages.registerCompletionItemProvider(
            { scheme: 'file', language: 'yaml', pattern: `**/*${BB_PIPELINES_FILENAME}` },
            new PipelinesYamlCompletionProvider(),
        ),
    );
    await addPipelinesSchemaToYamlConfig();
    await activateYamlExtension();
}

async function showWelcomePage(version: string, previousVersion: string | undefined) {
    if (
        (previousVersion === undefined || semver.gt(version, previousVersion)) &&
        Container.config.showWelcomeOnInstall &&
        window.state.focused
    ) {
        window
            .showInformationMessage(`Jira and Bitbucket (Official) has been updated to v${version}`, 'Release notes')
            .then((userChoice) => {
                if (userChoice === 'Release notes') {
                    commands.executeCommand('extension.open', 'atlassian.atlascode', 'changelog');
                }
            });
    }
}

async function sendAnalytics(version: string, globalState: Memento) {
    const previousVersion = globalState.get<string>(GlobalStateVersionKey);
    globalState.update(GlobalStateVersionKey, version);

    if (previousVersion === undefined) {
        installedEvent(version).then((e) => {
            Container.analyticsClient.sendTrackEvent(e);
        });
        return;
    }

    if (semver.gt(version, previousVersion)) {
        Logger.info(`Atlassian for VS Code upgraded from v${previousVersion} to v${version}`);
        upgradedEvent(version, previousVersion).then((e) => {
            Container.analyticsClient.sendTrackEvent(e);
        });
    }

    launchedEvent(env.remoteName ? env.remoteName : 'local').then((e) => {
        Container.analyticsClient.sendTrackEvent(e);
    });
}

function showOnboardingPage() {
    commands.executeCommand(Commands.ShowOnboardingPage);
}

// this method is called when your extension is deactivated
export function deactivate() {
    unregisterErrorReporting();
    FeatureFlagClient.dispose();
}
