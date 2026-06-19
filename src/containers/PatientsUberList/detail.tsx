import { Bundle, Parameters, Patient, Questionnaire, QuestionnaireResponse } from 'fhir/r4b';
import { Route, Routes } from 'react-router-dom';

import { PatientDashboardProvider } from '@beda.software/emr/dist/components/Dashboard/contexts';
import { PatientDocument } from '@beda.software/emr/dist/containers/PatientDetails/PatientDocument/index';
import { PatientDocumentDetails } from '@beda.software/emr/dist/containers/PatientDetails/PatientDocumentDetails/index';
import { PatientDocuments } from '@beda.software/emr/dist/containers/PatientDetails/PatientDocuments/index';
import { PatientOverview } from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/index';
import { ResourceDetailPage, Tab } from '@beda.software/emr/dist/uberComponents/ResourceDetailPage/index';
import { compileAsFirst, selectCurrentUserRoleResource } from '@beda.software/emr/dist/utils/index';
import { WithId, extractBundleResources } from '@beda.software/fhir-react';
import { isFailure, isSuccess, mapSuccess } from '@beda.software/remote-data';

import { dashboard } from './dashboard';
import { connectathonDocumentLaunchContext } from './connectathonDocumentLaunchContext';
import { getFHIRResources, service } from '@beda.software/emr/services';

const getName = compileAsFirst<Patient, string>("Patient.name.given.first() + ' ' + Patient.name.family");

const tabs: Array<Tab<WithId<Patient>>> = [
    {
        path: '',
        label: 'Overview',
        component: ({ resource }) => <PatientOverview patient={resource} />,
    },
    {
        path: 'documents',
        label: 'Documents',
        component: ({ resource }) => <Documents patient={resource} />,
    },
];

const getResult = compileAsFirst<Parameters, Bundle>("Parameters.parameter.where(name='return').resource");

async function sdcExtact(qr: QuestionnaireResponse){
    const questionnaire = mapSuccess(
        await getFHIRResources<Questionnaire>('Questionnaire', { url: qr.questionnaire }),
        (bundle) => extractBundleResources(bundle).Questionnaire[0]!
    );
    if (isFailure(questionnaire)) {
        console.log("ERROR", questionnaire.error)
        return;
    }
    const extractParameters: Parameters = {
        resourceType: 'Parameters',
        parameter: [
            { name: 'questionnaire', resource: questionnaire.data },
            { name: 'questionnaire-response', resource: qr},
        ]
    }
    const sdcExtractResult = await service({
        url: 'QuestionnaireResponse/$extract',
        method: 'POST',
        data: extractParameters
    });
    if (isSuccess(sdcExtractResult)){
        const bundle = getResult(sdcExtractResult.data);
        const transactionResult = await service({
            url: '/',
            method: 'POST',
            data: bundle,
        })
        console.log(transactionResult);
    }
}

function Documents({ patient }: { patient: WithId<Patient> }) {
    const author = selectCurrentUserRoleResource();
    return (
        <Routes>
            <Route path="/" element={<PatientDocuments patient={patient} />} />
            <Route
                path="/new/:questionnaireId"
                element={
                    <PatientDocument
                        patient={patient}
                        author={author}
                        autoSave={true}
                        onSuccess={async (result) => {
                            await sdcExtact(result.questionnaireResponse);
                            window.history.back();
                        }}
                        launchContextParameters={connectathonDocumentLaunchContext(patient)}
                    />
                }
            />
            <Route
                path="/:qrId/*"
                element={
                    <PatientDocumentDetails
                        patient={patient}
                        launchContextParameters={connectathonDocumentLaunchContext(patient)}/>
                }
            />
        </Routes>
    );
}

export function PatientDetails() {
    return (
        <PatientDashboardProvider dashboard={dashboard}>
            <ResourceDetailPage<Patient>
                resourceType="Patient"
                getSearchParams={({ id }) => ({ _id: id })}
                getTitle={({ resource, bundle }) => getName(resource, { bundle })!}
                tabs={tabs}
            />
        </PatientDashboardProvider>
    );
}
