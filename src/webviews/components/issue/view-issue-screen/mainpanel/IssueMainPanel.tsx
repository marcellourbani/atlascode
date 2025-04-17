import Button from '@atlaskit/button';
import AddIcon from '@atlaskit/icon/glyph/add';
import InlineDialog from '@atlaskit/inline-dialog';
import Tooltip from '@atlaskit/tooltip';
import { IssueType, MinimalIssueOrKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, FieldUIs, FieldValues, IssueLinkTypeSelectOption } from '@atlassianlabs/jira-pi-meta-models';
import { Box } from '@material-ui/core';
import React from 'react';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

import { RenderedContent } from '../../../RenderedContent';
import { AttachmentList } from '../../AttachmentList';
import { AttachmentsModal } from '../../AttachmentsModal';
import JiraIssueTextAreaEditor from '../../common/JiraIssueTextArea';
import WorklogForm from '../../WorklogForm';
import Worklogs from '../../Worklogs';
import { AddContentDropdown } from './AddContentDropDown';
import { ChildIssuesComponent } from './ChildIssuesComponent';
import { LinkedIssuesComponent } from './LinkedIssuesComponent';

type Props = {
    fields: FieldUIs;
    fieldValues: FieldValues;
    handleAddAttachments: (files: File[]) => void;
    siteDetails: DetailedSiteInfo;
    onDeleteAttachment: (attachment: any) => void;
    loadingField?: string;
    isEpic: boolean;
    handleInlineEdit: (field: FieldUI, edit: any) => void;
    subtaskTypes: IssueType[];
    linkTypes: IssueLinkTypeSelectOption[];
    handleOpenIssue: (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => void;
    onDelete: (issueLink: any) => void;
    onFetchIssues: (input: string) => Promise<any>;
    fetchUsers: (input: string) => Promise<any[]>;
    fetchImage: (url: string) => Promise<string>;
};

const IssueMainPanel: React.FC<Props> = ({
    fields,
    fieldValues,
    handleAddAttachments,
    siteDetails,
    onDeleteAttachment,
    loadingField,
    isEpic,
    handleInlineEdit,
    subtaskTypes,
    linkTypes,
    handleOpenIssue,
    onDelete,
    onFetchIssues,
    fetchUsers,
    fetchImage,
}) => {
    //field values
    const attachments = fields['attachment'] && fieldValues['attachment'] ? fieldValues['attachment'] : undefined;
    const subtasks =
        fields['subtasks'] && fieldValues['subtasks'] && !isEpic && !fieldValues['issuetype'].subtask
            ? fieldValues['subtasks']
            : undefined;
    const originalEstimate: string = fieldValues['timetracking'] ? fieldValues['timetracking'].originalEstimate : '';
    const issuelinks = fields['issuelinks'] && fieldValues['issuelinks'] ? fieldValues['issuelinks'] : undefined;
    const defaultDescription = fieldValues['description'] ? fieldValues['description'] : '';
    const renderedDescription = fieldValues['description.rendered'] ? fieldValues['description.rendered'] : undefined;

    //states
    const [enableSubtasks, setEnableSubtasks] = React.useState(false);
    const [enableLinkedIssues, setEnableLinkedIssues] = React.useState(false);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [isInlineDialogOpen, setIsInlineDialogOpen] = React.useState(false);
    const [descriptionText, setDescriptionText] = React.useState(defaultDescription);
    const [isEditingDescription, setIsEditingDescription] = React.useState(false);

    const addContentDropDown = (
        <Tooltip content="Add content">
            <AddContentDropdown
                handleAttachmentClick={() => setIsModalOpen(true)}
                handleChildIssueClick={() => {
                    setEnableSubtasks(true);
                }}
                handleLinkedIssueClick={() => {
                    setEnableLinkedIssues(true);
                }}
                handleLogWorkClick={() => {
                    setIsInlineDialogOpen(true);
                }}
                loading={loadingField === 'attachment'}
            />
        </Tooltip>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '16px' }}>
            {fields['attachment'] && (
                <AttachmentsModal
                    isOpen={isModalOpen}
                    onSave={(f: File[]) => {
                        handleAddAttachments(f);
                        setIsModalOpen(false);
                    }}
                    onCancel={() => setIsModalOpen(false)}
                />
            )}
            <Box style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center', paddingTop: '8px' }}>
                {fields['worklog'] ? (
                    <Box
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '8px',
                            alignItems: 'center',
                        }}
                    >
                        <div className={`ac-inline-dialog ${isInlineDialogOpen ? 'active' : ''}`}>
                            <InlineDialog
                                content={
                                    <WorklogForm
                                        onSave={(val: any) => handleInlineEdit(fields['worklog'], val)}
                                        onCancel={() => setIsInlineDialogOpen(false)}
                                        originalEstimate={originalEstimate}
                                    />
                                }
                                isOpen={isInlineDialogOpen}
                                onClose={() => setIsInlineDialogOpen(false)}
                                placement="top"
                            >
                                {addContentDropDown}
                            </InlineDialog>
                        </div>
                    </Box>
                ) : (
                    { addContentDropDown }
                )}
            </Box>
            {fields['description'] && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexDirection: 'row', alignItems: 'flex-start' }}>
                        <label className="ac-field-label">Description</label>
                        {loadingField === 'description' ? <p>Saving...</p> : null}
                    </div>
                    {isEditingDescription || loadingField === 'description' ? (
                        <JiraIssueTextAreaEditor
                            value={descriptionText}
                            onChange={(e: string) => setDescriptionText(e)}
                            onSave={() => {
                                handleInlineEdit(fields['description'], descriptionText);
                                setIsEditingDescription(false);
                            }}
                            onCancel={() => {
                                setDescriptionText(defaultDescription);
                                setIsEditingDescription(false);
                            }}
                            fetchUsers={fetchUsers}
                            isDescription
                            saving={loadingField === 'description'}
                        />
                    ) : (
                        <Box
                            css={{
                                ':hover': {
                                    backgroundColor: 'var(--vscode-editor-selectionHighlightBackground)!important',
                                    cursor: 'pointer !important',
                                },
                                paddingLeft: 0,
                                paddingBottom: '4px',
                                display: 'flex',
                                alignItems: 'flex-start',
                            }}
                            onClick={() => setIsEditingDescription(true)}
                            className="ac-inline-input-view-p"
                        >
                            {renderedDescription ? (
                                <RenderedContent html={renderedDescription} fetchImage={fetchImage} />
                            ) : (
                                <p style={{ margin: 0 }}>{descriptionText}</p>
                            )}
                        </Box>
                    )}
                </div>
            )}
            {attachments && attachments.length > 0 && (
                <div>
                    <label className="ac-field-label">Attachments</label>
                    <AttachmentList
                        attachments={attachments}
                        baseLinkUrl={siteDetails.baseLinkUrl}
                        onDelete={onDeleteAttachment}
                        fetchImage={fetchImage}
                    />
                </div>
            )}
            {subtasks && (subtasks.length > 0 || enableSubtasks) && (
                <div>
                    <ChildIssuesComponent
                        subtaskTypes={subtaskTypes}
                        label="Child issues"
                        loading={loadingField === 'subtasks'}
                        onSave={(e: any) => handleInlineEdit(fields['subtasks'], e)}
                        enableSubtasks={{ enable: enableSubtasks, setEnableSubtasks }}
                        handleOpenIssue={handleOpenIssue}
                        issues={subtasks}
                    />
                </div>
            )}
            {issuelinks && (issuelinks.length > 0 || enableLinkedIssues) && (
                <div>
                    <LinkedIssuesComponent
                        linkTypes={linkTypes}
                        onIssueClick={handleOpenIssue}
                        onSave={(e: any) => handleInlineEdit(fields['issuelinks'], e)}
                        label="Linked issues"
                        loading={loadingField === 'issuelinks'}
                        issuelinks={issuelinks}
                        onFetchIssues={onFetchIssues}
                        onDelete={onDelete}
                        enableLinkedIssues={{ enable: enableLinkedIssues, setEnableLinkedIssues }}
                    />
                </div>
            )}
            {fields['worklog'] &&
                Array.isArray(fieldValues['worklog']?.worklogs) &&
                fieldValues['worklog'].worklogs.length > 0 && (
                    <div className="ac-vpadding">
                        <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="ac-field-label">Work log</label>
                            <Button
                                className="ac-button-secondary"
                                appearance="subtle"
                                iconBefore={<AddIcon size="small" label="Add" />}
                                onClick={() => setIsInlineDialogOpen(true)}
                            ></Button>
                        </Box>
                        <Worklogs worklogs={fieldValues['worklog']} />
                    </div>
                )}
        </div>
    );
};

export default IssueMainPanel;
