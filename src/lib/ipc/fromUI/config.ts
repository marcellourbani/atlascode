import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { AuthInfo, DetailedSiteInfo, SiteInfo } from '../../../atlclients/authInfo';
import { ConfigTarget } from '../models/config';
import { CommonAction } from './common';

export enum ConfigActionType {
    Login = 'login',
    Logout = 'logout',
    SaveSettings = 'saveSettings',
    OpenJSON = 'openJson',
    JQLOptionsRequest = 'jqlOptionsRequest',
    JQLSuggestionsRequest = 'JQLSuggestionsRequest',
    FilterSearchRequest = 'filterSearchRequest',
    ValidateJqlRequest = 'validateJqlRequest',
    SetTarget = 'setTarget',
}

export type ConfigAction =
    | ReducerAction<ConfigActionType.Login, LoginAuthAction>
    | ReducerAction<ConfigActionType.Logout, LogoutAuthAction>
    | ReducerAction<ConfigActionType.SaveSettings, SaveSettingsAction>
    | ReducerAction<ConfigActionType.OpenJSON, OpenJsonAction>
    | ReducerAction<ConfigActionType.JQLOptionsRequest, JQLOptionsRequestAction>
    | ReducerAction<ConfigActionType.JQLSuggestionsRequest, JQLSuggestionsRequestAction>
    | ReducerAction<ConfigActionType.FilterSearchRequest, FilterSearchRequestAction>
    | ReducerAction<ConfigActionType.ValidateJqlRequest, ValidateJqlRequestAction>
    | ReducerAction<ConfigActionType.SetTarget, TargetUpdateAction>
    | CommonAction;

export interface AuthAction {
    siteInfo: SiteInfo;
}

export interface LoginAuthAction extends AuthAction {
    authInfo: AuthInfo;
}

export interface LogoutAuthAction extends AuthAction {
    siteInfo: DetailedSiteInfo;
}

export interface SaveSettingsAction {
    target: ConfigTarget;
    changes: {
        [key: string]: any;
    };
    removes?: string[];
}

export interface OpenJsonAction {
    target: ConfigTarget;
}

export interface TargetUpdateAction {
    target: ConfigTarget;
}

export interface JQLOptionsRequestAction {
    site: DetailedSiteInfo;
}

export interface FilterSearchRequestAction {
    site: DetailedSiteInfo;
    query: string;
    maxResults?: number;
    startAt?: number;
    abortSignal?: AbortSignal;
}

export interface JQLSuggestionsRequestAction {
    site: DetailedSiteInfo;
    fieldName: string;
    userInput: string;
    predicateName?: string;
    abortSignal?: AbortSignal;
}

export interface ValidateJqlRequestAction {
    site: DetailedSiteInfo;
    jql: string;
    abortSignal?: AbortSignal;
}
