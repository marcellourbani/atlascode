import { Box, Grid, IconButton, Link, TextField, Typography } from '@material-ui/core';
import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';
import React from 'react';
import { BasicAuthInfo } from 'src/atlclients/authInfo';
import { SiteWithAuthInfo } from 'src/lib/ipc/toUI/config';

import { AuthFormState } from './types';

type JiraBasicAuthFormProps = {
    defaultSiteWithAuth: SiteWithAuthInfo;
    errors: any;
    registerRequiredString: any;
    authFormState: AuthFormState;
    updateState: (state: AuthFormState) => void;
    preventClickDefault: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

export const JiraBasicAuthForm = ({
    defaultSiteWithAuth,
    errors,
    registerRequiredString,
    authFormState,
    updateState,
    preventClickDefault,
}: JiraBasicAuthFormProps) => {
    return (
        <React.Fragment>
            <Grid item>
                <Typography variant="body1">
                    <Box fontWeight="fontWeightBold">This looks like a Jira Cloud site ☁</Box>
                    <Box fontSize="small">
                        You can use an{' '}
                        <Link href="https://id.atlassian.com/manage-profile/security/api-tokens">API Token</Link> to
                        connect to this site. Read more about Atlassian API tokens{' '}
                        <Link href="https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/">
                            here
                        </Link>
                        .
                    </Box>
                </Typography>
            </Grid>
            <Grid item>
                <TextField
                    required
                    margin="dense"
                    id="username"
                    name="username"
                    label="Username"
                    defaultValue={(defaultSiteWithAuth.auth as BasicAuthInfo).username}
                    helperText={errors.username ? errors.username : undefined}
                    fullWidth
                    error={!!errors.username}
                    inputRef={registerRequiredString}
                />
            </Grid>
            <Grid item>
                <TextField
                    required
                    margin="dense"
                    id="password"
                    name="password"
                    label="Password (API token)"
                    defaultValue={(defaultSiteWithAuth.auth as BasicAuthInfo).password}
                    type={authFormState.showPassword ? 'text' : 'password'}
                    helperText={errors.password ? errors.password : undefined}
                    fullWidth
                    error={!!errors.password}
                    inputRef={registerRequiredString}
                    InputProps={{
                        endAdornment: (
                            <IconButton
                                onClick={() =>
                                    updateState({
                                        ...authFormState,
                                        showPassword: !authFormState.showPassword,
                                    })
                                }
                                onMouseDown={preventClickDefault}
                            >
                                {authFormState.showPassword ? (
                                    <Visibility fontSize="small" />
                                ) : (
                                    <VisibilityOff fontSize="small" />
                                )}
                            </IconButton>
                        ),
                    }}
                />
            </Grid>
        </React.Fragment>
    );
};
