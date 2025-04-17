import { JiraClient } from '@atlassianlabs/jira-pi-client';
import { AxiosInstance } from 'axios';
import { Memento } from 'vscode';

import { forceCastTo } from '../../testsutil';
import * as analytics from '../analytics';
import { AnalyticsClient } from '../analytics-node-client/src/client.min.js';
import { Container } from '../container';
import * as jira_client_providers from '../jira/jira-client/providers';
import { SiteManager } from '../siteManager';
import {
    AuthInfoState,
    BasicAuthInfo,
    DetailedSiteInfo,
    OAuthProvider,
    OAuthResponse,
    PATAuthInfo,
    ProductBitbucket,
    ProductJira,
    SiteInfo,
    UserInfo,
} from './authInfo';
import * as authInfo from './authInfo';
import { CredentialManager } from './authStore';
import { LoginManager } from './loginManager';
import { OAuthDancer } from './oauthDancer';

jest.mock('./authStore');
jest.mock('../siteManager');
jest.mock('../analytics-node-client/src/client.min.js');

jest.mock('../analytics', () => ({
    authenticatedEvent: () => Promise.resolve(forceCastTo<TrackEvent>({})),
    editedEvent: () => Promise.resolve(forceCastTo<TrackEvent>({})),
}));

jest.mock('./oauthDancer', () => ({
    OAuthDancer: {
        Instance: {
            doDance: () => {},
            doInitRemoteDance: () => {},
            doFinishRemoteDance: () => {},
        },
    },
}));

jest.mock('../container', () => ({
    Container: {
        clientManager: {
            jiraClient: () => Promise.resolve(),
        },
    },
}));

const mockedAxiosInstance = forceCastTo<AxiosInstance>(() =>
    Promise.resolve({
        headers: { 'x-ausername': 'whoknows' },
        data: {
            name: 'nome',
            slug: 'lumaca',
            displayName: 'nome visualizzato',
            emailAddress: 'indirizzo@email',
            avatarUrl: 'avatarUrl',
            avatarUrls: { '48x48': '48x48' },
        },
    }),
);

describe('LoginManager', () => {
    let loginManager: LoginManager;
    let credentialManager: CredentialManager;
    let siteManager: SiteManager;
    let analyticsClient: AnalyticsClient;
    let oauthDancer: OAuthDancer;

    beforeEach(() => {
        credentialManager = new CredentialManager(forceCastTo<AnalyticsClient>(undefined));
        siteManager = new SiteManager(forceCastTo<Memento>(undefined));
        analyticsClient = new AnalyticsClient();
        oauthDancer = OAuthDancer.Instance;

        loginManager = new LoginManager(credentialManager, siteManager, analyticsClient);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('userInitiatedOAuthLogin', () => {
        it('should throw an error if no provider is found', async () => {
            const site: SiteInfo = { host: 'unknown.host.it', product: ProductJira };
            await expect(loginManager.userInitiatedOAuthLogin(site, 'callback')).rejects.toThrow(
                'No provider found for unknown.host.it',
            );
        });

        it('should call saveDetails with correct parameters', async () => {
            const site: SiteInfo = { host: 'jira.atlassian.com', product: ProductJira };
            const provider = OAuthProvider.JiraCloud;
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const resp: OAuthResponse = {
                access: 'access',
                refresh: 'refresh',
                iat: 123,
                expirationDate: 1234,
                receivedAt: 1234,
                user,
                accessibleResources: [],
            };

            jest.spyOn(oauthDancer, 'doDance').mockResolvedValue(resp);
            jest.spyOn(loginManager as any, 'saveDetails');
            jest.spyOn(authInfo, 'oauthProviderForSite').mockReturnValue(provider);

            await loginManager.userInitiatedOAuthLogin(site, 'callback');

            expect(oauthDancer.doDance).toHaveBeenCalledWith(provider, site, 'callback');
            expect(loginManager['saveDetails']).toHaveBeenCalledWith(provider, site, resp, undefined);
        });

        it('updateHasResolutionField is called for Jira', async () => {
            const site: SiteInfo = { host: 'jira.atlassian.com', product: ProductJira };
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const resp: OAuthResponse = {
                access: 'access',
                refresh: 'refresh',
                iat: 123,
                expirationDate: 1234,
                receivedAt: 1234,
                user,
                accessibleResources: [],
            };
            const siteDetails = forceCastTo<DetailedSiteInfo>({ host: 'jira.atlassian.com', product: ProductJira });

            jest.spyOn(authInfo, 'oauthProviderForSite').mockReturnValue(OAuthProvider.JiraCloud);
            jest.spyOn(oauthDancer, 'doDance').mockResolvedValue(resp);
            jest.spyOn(loginManager as any, 'getOAuthSiteDetails').mockResolvedValue([siteDetails]);
            jest.spyOn(credentialManager, 'saveAuthInfo').mockResolvedValue();
            jest.spyOn(loginManager as any, 'updateHasResolutionField').mockResolvedValue(undefined);
            jest.spyOn(siteManager as any, 'addSites');

            await loginManager.userInitiatedOAuthLogin(site, 'callback');

            expect(credentialManager.saveAuthInfo).toHaveBeenCalledWith(siteDetails, expect.anything());
            expect(loginManager['updateHasResolutionField']).toHaveBeenCalled();
            expect(siteManager.addSites).toHaveBeenCalled();
        });

        it('updateHasResolutionField is not called for Jira', async () => {
            const site: SiteInfo = { host: 'jira.atlassian.com', product: ProductBitbucket };
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const resp: OAuthResponse = {
                access: 'access',
                refresh: 'refresh',
                iat: 123,
                expirationDate: 1234,
                receivedAt: 1234,
                user,
                accessibleResources: [],
            };
            const siteDetails = forceCastTo<DetailedSiteInfo>({
                host: 'jira.atlassian.com',
                product: ProductBitbucket,
            });

            jest.spyOn(authInfo, 'oauthProviderForSite').mockReturnValue(OAuthProvider.BitbucketCloud);
            jest.spyOn(oauthDancer, 'doDance').mockResolvedValue(resp);
            jest.spyOn(loginManager as any, 'getOAuthSiteDetails').mockResolvedValue([siteDetails]);
            jest.spyOn(credentialManager, 'saveAuthInfo').mockResolvedValue();
            jest.spyOn(loginManager as any, 'updateHasResolutionField').mockResolvedValue(undefined);
            jest.spyOn(siteManager as any, 'addSites');

            await loginManager.userInitiatedOAuthLogin(site, 'callback');

            expect(credentialManager.saveAuthInfo).toHaveBeenCalledWith(siteDetails, expect.anything());
            expect(loginManager['updateHasResolutionField']).not.toHaveBeenCalled();
            expect(siteManager.addSites).toHaveBeenCalled();
        });
    });

    describe('initRemoteAuth', () => {
        it('should call doInitRemoteDance with correct state', async () => {
            const state = { key: 'value' };
            jest.spyOn(oauthDancer, 'doInitRemoteDance');

            await loginManager.initRemoteAuth(state);

            expect(oauthDancer.doInitRemoteDance).toHaveBeenCalledWith(state);
        });
    });

    describe('finishRemoteAuth', () => {
        it('should call saveDetails with correct parameters', async () => {
            const code = 'code';
            const provider = OAuthProvider.JiraCloudRemote;
            const site = { host: 'https://jira.atlassian.com', product: ProductJira };
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const resp: OAuthResponse = {
                access: 'access',
                refresh: 'refresh',
                iat: 123,
                expirationDate: 1235,
                receivedAt: 1235,
                user,
                accessibleResources: [],
            };

            jest.spyOn(oauthDancer, 'doFinishRemoteDance').mockResolvedValue(resp);
            jest.spyOn(loginManager as any, 'saveDetails');

            await loginManager.finishRemoteAuth(code);

            expect(oauthDancer.doFinishRemoteDance).toHaveBeenCalledWith(provider, site, code);
            expect(loginManager['saveDetails']).toHaveBeenCalledWith(provider, site, resp, false);
        });

        it('updateHasResolutionField is called', async () => {
            const code = 'code';
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const resp: OAuthResponse = {
                access: 'access',
                refresh: 'refresh',
                iat: 123,
                expirationDate: 1235,
                receivedAt: 1235,
                user,
                accessibleResources: [],
            };
            const siteDetails = forceCastTo<DetailedSiteInfo>({ host: 'jira.atlassian.com', product: ProductJira });

            jest.spyOn(oauthDancer, 'doFinishRemoteDance').mockResolvedValue(resp);
            jest.spyOn(loginManager as any, 'getOAuthSiteDetails').mockResolvedValue([siteDetails]);
            jest.spyOn(loginManager as any, 'updateHasResolutionField').mockResolvedValue(undefined);
            jest.spyOn(credentialManager, 'saveAuthInfo').mockResolvedValue();
            jest.spyOn(siteManager as any, 'addSites');

            await loginManager.finishRemoteAuth(code);

            expect(credentialManager.saveAuthInfo).toHaveBeenCalledWith(siteDetails, expect.anything());
            expect(loginManager['updateHasResolutionField']).toHaveBeenCalled();
            expect(siteManager.addSites).toHaveBeenCalled();
        });
    });

    describe('userInitiatedServerLogin', () => {
        it('should call saveDetailsForServerSite with correct parameters for BasicAuthInfo', async () => {
            const site: SiteInfo = { host: 'jira.atlassian.com', product: ProductJira };
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const authInfoData: BasicAuthInfo = {
                username: 'user',
                password: 'pass',
                user,
                state: AuthInfoState.Valid,
            };
            const siteDetails = forceCastTo<DetailedSiteInfo>({ host: 'jira.atlassian.com', product: ProductJira });

            jest.spyOn(loginManager as any, 'saveDetailsForServerSite').mockResolvedValue(Promise.resolve(siteDetails));
            jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(true);
            jest.spyOn(authInfo, 'isPATAuthInfo').mockReturnValue(false);
            jest.spyOn(loginManager['_analyticsClient'], 'sendTrackEvent');

            await loginManager.userInitiatedServerLogin(site, authInfoData);

            expect(loginManager['saveDetailsForServerSite']).toHaveBeenCalledWith(site, authInfoData);
            expect(loginManager['_analyticsClient'].sendTrackEvent).toHaveBeenCalled();
        });

        it('should call saveDetailsForServerSite with correct parameters for PATAuthInfo', async () => {
            const site: SiteInfo = { host: 'jira.atlassian.com', product: ProductJira };
            const authInfoData = { token: 'token' } as unknown as PATAuthInfo;
            const siteDetails = forceCastTo<DetailedSiteInfo>({ host: 'jira.atlassian.com', product: ProductJira });

            jest.spyOn(loginManager as any, 'saveDetailsForServerSite').mockResolvedValue(siteDetails);
            jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(false);
            jest.spyOn(authInfo, 'isPATAuthInfo').mockReturnValue(true);
            jest.spyOn(loginManager['_analyticsClient'], 'sendTrackEvent');

            await loginManager.userInitiatedServerLogin(site, authInfoData);

            expect(loginManager['saveDetailsForServerSite']).toHaveBeenCalledWith(site, authInfoData);
            expect(loginManager['_analyticsClient'].sendTrackEvent).toHaveBeenCalled();
        });

        it('should throw an error if authentication fails', async () => {
            const site: SiteInfo = { host: 'jira.atlassian.com', product: ProductJira };
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const authInfoData: BasicAuthInfo = {
                username: 'user',
                password: 'pass',
                user,
                state: AuthInfoState.Valid,
            };

            jest.spyOn(loginManager as any, 'saveDetailsForServerSite').mockRejectedValue(
                new Error('Authentication failed'),
            );
            jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(true);
            jest.spyOn(authInfo, 'isPATAuthInfo').mockReturnValue(false);

            await expect(loginManager.userInitiatedServerLogin(site, authInfoData)).rejects.toEqual(
                'Error authenticating with Jira: Error: Authentication failed',
            );
        });

        it("hasResolutionField is false if the Jira site doesn't contain a 'resolution' field", async () => {
            const site: SiteInfo = { host: 'jira.atlassian.com', product: ProductJira };
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const authInfoData: BasicAuthInfo = {
                username: 'user',
                password: 'pass',
                user,
                state: AuthInfoState.Valid,
            };

            jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(true);
            jest.spyOn(authInfo, 'isPATAuthInfo').mockReturnValue(false);
            jest.spyOn(analytics, 'authenticatedEvent');
            jest.spyOn(jira_client_providers, 'getAxiosInstance').mockReturnValue(mockedAxiosInstance);
            jest.spyOn(loginManager as any, 'updateHasResolutionField');

            const mockedFields = [{ id: 'field1' }, { id: 'field2' }, { id: 'field3' }];
            const clientMock = {
                getFields: jest.fn(() => Promise.resolve(mockedFields)),
            };
            jest.spyOn(Container.clientManager, 'jiraClient').mockResolvedValue(
                forceCastTo<JiraClient<DetailedSiteInfo>>(clientMock),
            );

            await loginManager.userInitiatedServerLogin(site, authInfoData);

            expect(loginManager['updateHasResolutionField']).toHaveBeenCalled();

            const siteDetails = (analytics.authenticatedEvent as jest.Mock).mock.calls[0][0];
            expect(siteDetails.hasResolutionField).toEqual(false);
        });

        it("hasResolutionField is true if the Jira site contains a 'resolution' field", async () => {
            const site: SiteInfo = { host: 'jira.atlassian.com', product: ProductJira };
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const authInfoData: BasicAuthInfo = {
                username: 'user',
                password: 'pass',
                user,
                state: AuthInfoState.Valid,
            };

            jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(true);
            jest.spyOn(authInfo, 'isPATAuthInfo').mockReturnValue(false);
            jest.spyOn(analytics, 'authenticatedEvent');
            jest.spyOn(jira_client_providers, 'getAxiosInstance').mockReturnValue(mockedAxiosInstance);
            jest.spyOn(loginManager as any, 'updateHasResolutionField');

            const mockedFields = [{ id: 'field1' }, { id: 'resolution' }, { id: 'field3' }];
            const clientMock = {
                getFields: jest.fn(() => Promise.resolve(mockedFields)),
            };
            jest.spyOn(Container.clientManager, 'jiraClient').mockResolvedValue(
                forceCastTo<JiraClient<DetailedSiteInfo>>(clientMock),
            );

            await loginManager.userInitiatedServerLogin(site, authInfoData);

            expect(loginManager['updateHasResolutionField']).toHaveBeenCalled();

            const siteDetails = (analytics.authenticatedEvent as jest.Mock).mock.calls[0][0];
            expect(siteDetails.hasResolutionField).toEqual(true);
        });

        it('updateHasResolutionField is not called for BitBucket', async () => {
            const site: SiteInfo = { host: 'jira.atlassian.com', product: ProductBitbucket };
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const authInfoData: BasicAuthInfo = {
                username: 'user',
                password: 'pass',
                user,
                state: AuthInfoState.Valid,
            };

            jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(true);
            jest.spyOn(authInfo, 'isPATAuthInfo').mockReturnValue(false);
            jest.spyOn(analytics, 'authenticatedEvent');
            jest.spyOn(jira_client_providers, 'getAxiosInstance').mockReturnValue(mockedAxiosInstance);
            jest.spyOn(loginManager as any, 'updateHasResolutionField');

            await loginManager.userInitiatedServerLogin(site, authInfoData);

            expect(loginManager['updateHasResolutionField']).not.toHaveBeenCalled();
        });
    });

    describe('updatedServerInfo', () => {
        it('should call saveDetailsForServerSite with correct parameters for BasicAuthInfo', async () => {
            const site: SiteInfo = { host: 'jira.atlassian.com', product: ProductJira };
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const authInfoData: BasicAuthInfo = {
                username: 'user',
                password: 'pass',
                user,
                state: AuthInfoState.Valid,
            };

            jest.spyOn(loginManager as any, 'saveDetailsForServerSite').mockResolvedValue(site);
            jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(true);
            jest.spyOn(loginManager['_analyticsClient'], 'sendTrackEvent');

            await loginManager.updatedServerInfo(site, authInfoData);

            expect(loginManager['saveDetailsForServerSite']).toHaveBeenCalledWith(site, authInfoData);
            expect(loginManager['_analyticsClient'].sendTrackEvent).toHaveBeenCalled();
        });

        it('should throw an error if authentication fails', async () => {
            const site: SiteInfo = { host: 'jira.atlassian.com', product: ProductJira };
            const user = forceCastTo<UserInfo>({ id: 'user' });
            const authInfoData: BasicAuthInfo = {
                username: 'user',
                password: 'pass',
                user,
                state: AuthInfoState.Valid,
            };

            jest.spyOn(loginManager as any, 'saveDetailsForServerSite').mockRejectedValue(
                new Error('Authentication failed'),
            );
            jest.spyOn(authInfo, 'isBasicAuthInfo').mockReturnValue(true);

            await expect(loginManager.updatedServerInfo(site, authInfoData)).rejects.toEqual(
                'Error authenticating with Jira: Error: Authentication failed',
            );
        });
    });
});
