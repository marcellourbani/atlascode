import { Message } from "./messaging";
import { IConfig, emptyConfig } from "../config/model";
import { DetailedSiteInfo } from "../atlclients/authInfo";

export interface FeedbackUser {
    userName: string;
    emailAddress: string;
}

export interface ConfigData extends Message {
    config: IConfig;
    jiraSites: DetailedSiteInfo[];
    bitbucketSites: DetailedSiteInfo[];
    feedbackUser: FeedbackUser;
}

export const emptyConfigData: ConfigData = {
    type: 'init',
    config: emptyConfig,
    jiraSites: [],
    bitbucketSites: [],
    feedbackUser: {
        userName: '',
        emailAddress: ''
    },
};

export interface ConfigUpdate extends Message {
    config: IConfig;
}

export interface JqlData extends Message {
    data: any;
}

export interface SitesAvailableUpdate extends Message {
    jiraSites: DetailedSiteInfo[];
    bitbucketSites: DetailedSiteInfo[];
}
