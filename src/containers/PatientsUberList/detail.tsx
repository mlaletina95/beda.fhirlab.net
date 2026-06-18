import { Bundle, Parameters, Patient, Questionnaire, QuestionnaireResponse } from 'fhir/r4b';
import { Link, Route, Routes, useParams } from 'react-router-dom';

import { PageContainer } from '@beda.software/emr/dist/components/BaseLayout/PageContainer/index';
import { RenderBundleResourceContext } from '@beda.software/emr/dist/components/RenderBundleResourceContext/index';
import { Tabs } from '@beda.software/emr/dist/components/Tabs/index';
import { PatientDashboardProvider } from '@beda.software/emr/dist/components/Dashboard/contexts';
import { PatientDocument } from '@beda.software/emr/dist/containers/PatientDetails/PatientDocument/index';
import { PatientDocumentDetails } from '@beda.software/emr/dist/containers/PatientDetails/PatientDocumentDetails/index';
import { PatientDocuments } from '@beda.software/emr/dist/containers/PatientDetails/PatientDocuments/index';
import { PatientOverview } from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/index';
import { compileAsFirst, selectCurrentUserRoleResource } from '@beda.software/emr/dist/utils/index';
import { WithId, extractBundleResources } from '@beda.software/fhir-react';
import { isFailure, isSuccess, mapSuccess } from '@beda.software/remote-data';

import { dashboard } from './dashboard';
import { patientDocumentLaunchContext } from './patientDocumentLaunchContext';
import { PatientOverviewResources } from './PatientOverviewResources';
import { getFHIRResources, service } from '@beda.software/emr/services';

const getName = compileAsFirst<Patient, string>("Patient.name.given.first() + ' ' + Patient.name.family");

function PatientDetailsTabs({ patientId, splat }: { patientId: string; splat: string }) {
    const basePath = `/patients-ph/${patientId}`;
    const activeKey = splat.startsWith('documents')
        ? 'documents'
        : splat.startsWith('resources/')
          ? 'overview'
          : 'overview';

    return (
        <Tabs
            type="card"
            boxShadow={false}
            activeKey={activeKey}
            items={[
                { key: 'overview', label: <Link to={basePath}>Overview</Link> },
                { key: 'documents', label: <Link to={`${basePath}/documents`}>Documents</Link> },
            ]}
        />
    );
}

function PatientDetailsContent({ resource, bundle }: { resource: WithId<Patient>; bundle: Bundle }) {
    const splat = useParams()['*'] ?? '';

    const content = (() => {
        if (splat.startsWith('resources/')) {
            const type = splat.slice('resources/'.length).split('/')[0];
            return <PatientOverviewResources patient={resource} type={type} />;
        }
        if (splat.startsWith('documents')) {
            return <Documents patient={resource} splat={splat} />;
        }
        return <PatientOverview patient={resource} />;
    })();

    return (
        <PageContainer
            title={getName(resource, { bundle })!}
            layoutVariant="with-tabs"
            headerContent={<PatientDetailsTabs patientId={resource.id} splat={splat} />}
        >
            {content}
        </PageContainer>
    );
}

const getResult = compileAsFirst<Parameters, Bundle>("Parameters.parameter.where(name='return').resource");

async function sdcExtact(qr: QuestionnaireResponse) {
    const questionnaire = mapSuccess(
        await getFHIRResources<Questionnaire>('Questionnaire', { url: qr.questionnaire }),
        (bundle) => extractBundleResources(bundle).Questionnaire[0]!,
    );
    if (isFailure(questionnaire)) {
        console.log('ERROR', questionnaire.error);
        return;
    }
    const extractParameters: Parameters = {
        resourceType: 'Parameters',
        parameter: [
            { name: 'questionnaire', resource: questionnaire.data },
            { name: 'questionnaire-response', resource: qr },
        ],
    };
    const sdcExtractResult = await service({
        url: 'QuestionnaireResponse/$extract',
        method: 'POST',
        data: extractParameters,
    });
    if (isSuccess(sdcExtractResult)) {
        const bundle = getResult(sdcExtractResult.data);
        const transactionResult = await service({
            url: '/',
            method: 'POST',
            data: bundle,
        });
        console.log(transactionResult);
    }
}

function Documents({ patient, splat }: { patient: WithId<Patient>; splat: string }) {
    const author = selectCurrentUserRoleResource();
    const rest = splat === 'documents' ? '' : splat.slice('documents/'.length);

    if (rest.startsWith('new/')) {
        const questionnaireId = rest.split('/')[1]!;
        return (
            <PatientDocument
                patient={patient}
                author={author}
                questionnaireId={questionnaireId}
                autoSave={true}
                onSuccess={async (result) => {
                    await sdcExtact(result.questionnaireResponse);
                    window.history.back();
                }}
                launchContextParameters={patientDocumentLaunchContext(patient)}
            />
        );
    }

    if (rest && !rest.startsWith('new/')) {
        return (
            <Routes>
                <Route
                    path="/patients-ph/:id/documents/:qrId/*"
                    element={
                        <PatientDocumentDetails
                            patient={patient}
                            launchContextParameters={patientDocumentLaunchContext(patient)}
                        />
                    }
                />
            </Routes>
        );
    }

    return <PatientDocuments patient={patient} />;
}

export function PatientDetails() {
    return (
        <PatientDashboardProvider dashboard={dashboard}>
            <RenderBundleResourceContext<Patient>
                resourceType="Patient"
                getSearchParams={({ id }) => ({ _id: id })}
                getTitle={({ resource, bundle }) => getName(resource, { bundle })!}
                tabs={[]}
            >
                {(context) => <PatientDetailsContent resource={context.resource} bundle={context.bundle} />}
            </RenderBundleResourceContext>
        </PatientDashboardProvider>
    );
}
