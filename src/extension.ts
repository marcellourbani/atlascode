'use strict';

import * as vscode from 'vscode';
import { BitbucketContext } from './bitbucket/context';
import { registerCommands } from './commands';
import { registerResources } from './resources';
import { Configuration } from './config/configuration';
import { Logger } from './logger';
import { GitExtension } from './typings/git';

export function activate(context: vscode.ExtensionContext) {

    Configuration.configure(context);
    Logger.configure(context);

    const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
    if (gitExtension) {
        const gitApi = gitExtension.exports.getAPI(1);
        const bbContext = new BitbucketContext(gitApi.repositories[0]);
        registerResources(context);
        registerCommands(context, bbContext);
    } else {
        Logger.error(new Error('vscode.git extension not found'));
    }

    Logger.debug('AtlasCode extension has been activated');

}

// this method is called when your extension is deactivated
export function deactivate() {
}
