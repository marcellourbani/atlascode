import { MinimalIssue } from "./jira-client/model/entities";
import { Container } from "../container";
import { ProductJira } from "../atlclients/authInfo";
import pAny from "p-any";
import pTimeout from "p-timeout";
import { Time } from "../util/time";
import { fetchMinimalIssue } from "./fetchIssue";

export async function issueForKey(issueKey: string): Promise<MinimalIssue> {
    const emptyPromises: Promise<MinimalIssue>[] = [];

    Container.siteManager.getSitesAvailable(ProductJira).forEach(site => {
        emptyPromises.push(
            (async () => {
                return await fetchMinimalIssue(issueKey, site);
            })()
        );
    });
    const promise = pAny(emptyPromises);

    const foundSite = await pTimeout(promise, 1 * Time.MINUTES).catch(() => undefined);
    return (foundSite) ? foundSite : Promise.reject(`no issue found with key ${issueKey}`);
}